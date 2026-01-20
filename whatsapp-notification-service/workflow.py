"""
Temporal Workflows for Beauty Salon WhatsApp Notifications
"""

from datetime import datetime, timedelta
from typing import Optional

from temporalio import workflow
from temporalio.common import RetryPolicy

with workflow.unsafe.imports_passed_through():
    from dataclasses import dataclass


@dataclass
class BookingWorkflowInput:
    """Input for appointment booking workflow"""

    booking_id: int
    client_id: int
    appointment_datetime: datetime
    client_phone: str
    client_name: str
    treatment_name: str
    staff_name: str


@dataclass
class CancellationInput:
    """Input for cancellation workflow"""

    booking_id: int
    client_phone: str
    client_name: str
    appointment_datetime: datetime
    cancellation_reason: Optional[str] = None


@dataclass
class RescheduleInput:
    """Input for rescheduling workflow"""

    booking_id: int
    old_workflow_id: str
    new_appointment_datetime: datetime
    client_phone: str
    client_name: str
    treatment_name: str
    staff_name: str


@workflow.defn
class AppointmentBookingWorkflow:
    """
    Long-running workflow that manages all notifications for a single booking.

    Timeline:
    1. Immediate: Confirmation message
    2. Wait until 24h before appointment: 24h reminder
    3. Wait until 1h before appointment: 1h reminder
    4. Wait until appointment ends: Completion
    5. Wait 24h after completion: Aftercare message

    Can be cancelled or modified via signals.
    """

    def __init__(self) -> None:
        self._cancelled = False
        self._rescheduled = False
        self._new_appointment_time: Optional[datetime] = None

    @workflow.run
    async def run(self, input: BookingWorkflowInput) -> dict:
        """Main workflow execution"""

        # Step 1: Send immediate confirmation
        confirmation_result = await workflow.execute_activity(
            "send_confirmation_message",
            input,
            start_to_close_timeout=timedelta(minutes=5),
            retry_policy=RetryPolicy(
                initial_interval=timedelta(seconds=1),
                maximum_interval=timedelta(minutes=5),
                maximum_attempts=5,
                backoff_coefficient=2.0,
            ),
        )

        workflow.logger.info(
            f"Confirmation sent for booking {input.booking_id}: {confirmation_result}"
        )

        # Step 2: Wait until 24 hours before appointment
        time_until_24h_reminder = input.appointment_datetime - timedelta(hours=24)

        if await self._wait_until_with_cancellation_check(time_until_24h_reminder):
            return {"status": "cancelled", "stage": "before_24h_reminder"}

        # Send 24-hour reminder
        reminder_24h_result = await workflow.execute_activity(
            "send_24h_reminder_message",
            input,
            start_to_close_timeout=timedelta(minutes=5),
            retry_policy=RetryPolicy(
                initial_interval=timedelta(seconds=1),
                maximum_interval=timedelta(minutes=5),
                maximum_attempts=5,
                backoff_coefficient=2.0,
            ),
        )

        workflow.logger.info(
            f"24h reminder sent for booking {input.booking_id}: {reminder_24h_result}"
        )

        # Step 3: Wait until 1 hour before appointment
        time_until_1h_reminder = input.appointment_datetime - timedelta(hours=1)

        if await self._wait_until_with_cancellation_check(time_until_1h_reminder):
            return {"status": "cancelled", "stage": "before_1h_reminder"}

        # Send 1-hour reminder
        reminder_1h_result = await workflow.execute_activity(
            "send_1h_reminder_message",
            input,
            start_to_close_timeout=timedelta(minutes=5),
            retry_policy=RetryPolicy(
                initial_interval=timedelta(seconds=1),
                maximum_interval=timedelta(minutes=5),
                maximum_attempts=5,
                backoff_coefficient=2.0,
            ),
        )

        workflow.logger.info(
            f"1h reminder sent for booking {input.booking_id}: {reminder_1h_result}"
        )

        # Step 4: Wait until appointment ends (appointment time + duration)
        # Query duration from database
        appointment_end = await workflow.execute_activity(
            "get_appointment_end_time",
            input.booking_id,
            start_to_close_timeout=timedelta(minutes=2),
        )

        if await self._wait_until_with_cancellation_check(appointment_end):
            return {"status": "cancelled", "stage": "before_aftercare"}

        # Step 5: Wait 24 hours after appointment, then send aftercare
        aftercare_time = appointment_end + timedelta(hours=24)

        if await self._wait_until_with_cancellation_check(aftercare_time):
            return {"status": "cancelled", "stage": "before_aftercare"}

        # Send aftercare message
        aftercare_result = await workflow.execute_activity(
            "send_aftercare_message",
            input,
            start_to_close_timeout=timedelta(minutes=5),
            retry_policy=RetryPolicy(
                initial_interval=timedelta(seconds=1),
                maximum_interval=timedelta(minutes=5),
                maximum_attempts=5,
                backoff_coefficient=2.0,
            ),
        )

        workflow.logger.info(
            f"Aftercare sent for booking {input.booking_id}: {aftercare_result}"
        )

        return {
            "status": "completed",
            "booking_id": input.booking_id,
            "messages_sent": {
                "confirmation": confirmation_result,
                "reminder_24h": reminder_24h_result,
                "reminder_1h": reminder_1h_result,
                "aftercare": aftercare_result,
            },
        }

    async def _wait_until_with_cancellation_check(self, target_time: datetime) -> bool:
        """
        Wait until target time, checking for cancellation signals periodically.
        Returns True if cancelled, False if wait completed normally.
        """
        now = workflow.now()

        if target_time <= now:
            # Target time already passed
            return self._cancelled

        # Wait in chunks to check for cancellation
        remaining = target_time - now

        while remaining > timedelta(0):
            # Wait for up to 1 hour at a time
            wait_duration = min(remaining, timedelta(hours=1))

            await workflow.wait_condition(
                lambda: self._cancelled, timeout=wait_duration
            )

            if self._cancelled:
                workflow.logger.info(f"Workflow cancelled during wait")
                return True

            now = workflow.now()
            remaining = target_time - now

        return False

    @workflow.signal
    async def cancel(self) -> None:
        """Signal to cancel the workflow"""
        self._cancelled = True
        workflow.logger.info("Cancellation signal received")

    @workflow.signal
    async def reschedule(self, new_appointment_time: datetime) -> None:
        """Signal to reschedule the appointment"""
        self._rescheduled = True
        self._new_appointment_time = new_appointment_time
        self._cancelled = True  # Cancel current timeline
        workflow.logger.info(f"Reschedule signal received: {new_appointment_time}")

    @workflow.query
    def get_status(self) -> dict:
        """Query current workflow status"""
        return {
            "cancelled": self._cancelled,
            "rescheduled": self._rescheduled,
            "current_time": workflow.now().isoformat(),
        }


@workflow.defn
class CancellationWorkflow:
    """
    Simple workflow to handle booking cancellations.
    Sends immediate cancellation notification.
    """

    @workflow.run
    async def run(self, input: CancellationInput) -> dict:
        """Send cancellation notification"""

        result = await workflow.execute_activity(
            "send_cancellation_message",
            input,
            start_to_close_timeout=timedelta(minutes=5),
            retry_policy=RetryPolicy(
                initial_interval=timedelta(seconds=1),
                maximum_interval=timedelta(minutes=5),
                maximum_attempts=5,
                backoff_coefficient=2.0,
            ),
        )

        workflow.logger.info(
            f"Cancellation sent for booking {input.booking_id}: {result}"
        )

        return {"status": "completed", "result": result}


@workflow.defn
class RescheduleWorkflow:
    """
    Workflow to handle rescheduling.
    1. Cancels old workflow
    2. Sends reschedule notification
    3. Starts new booking workflow
    """

    @workflow.run
    async def run(self, input: RescheduleInput) -> dict:
        """Handle reschedule process"""

        # Step 1: Cancel old workflow (done externally before starting this)

        # Step 2: Send reschedule notification
        reschedule_result = await workflow.execute_activity(
            "send_reschedule_message",
            input,
            start_to_close_timeout=timedelta(minutes=5),
            retry_policy=RetryPolicy(
                initial_interval=timedelta(seconds=1),
                maximum_interval=timedelta(minutes=5),
                maximum_attempts=5,
                backoff_coefficient=2.0,
            ),
        )

        workflow.logger.info(
            f"Reschedule notification sent for booking {input.booking_id}"
        )

        return {
            "status": "completed",
            "reschedule_notification": reschedule_result,
            "message": "New booking workflow should be started separately",
        }


@workflow.defn
class MarketingCampaignWorkflow:
    """
    Workflow for marketing campaigns.

    Queries eligible clients and sends promotional messages
    while respecting rate limits (60 messages/minute).
    """

    @workflow.run
    async def run(self, campaign_id: int, message_template: str) -> dict:
        """Execute marketing campaign"""

        # Step 1: Get eligible clients from database
        eligible_clients = await workflow.execute_activity(
            "get_eligible_marketing_clients",
            campaign_id,
            start_to_close_timeout=timedelta(minutes=5),
        )

        workflow.logger.info(
            f"Found {len(eligible_clients)} eligible clients for campaign {campaign_id}"
        )

        # Step 2: Send messages with rate limiting
        sent_count = 0
        failed_count = 0

        for i, client in enumerate(eligible_clients):
            # Rate limit: 60 messages per minute = 1 per second
            if i > 0 and i % 60 == 0:
                # Wait 1 minute after every 60 messages
                await workflow.wait_condition(
                    lambda: False, timeout=timedelta(minutes=1)
                )

            try:
                result = await workflow.execute_activity(
                    "send_marketing_message",
                    {
                        "client_id": client["id"],
                        "phone": client["phone"],
                        "name": client["name"],
                        "message_template": message_template,
                        "campaign_id": campaign_id,
                    },
                    start_to_close_timeout=timedelta(minutes=2),
                    retry_policy=RetryPolicy(
                        initial_interval=timedelta(seconds=1),
                        maximum_interval=timedelta(minutes=2),
                        maximum_attempts=3,
                        backoff_coefficient=2.0,
                    ),
                )

                if result.get("success"):
                    sent_count += 1
                else:
                    failed_count += 1

            except Exception as e:
                workflow.logger.error(f"Failed to send to client {client['id']}: {e}")
                failed_count += 1

        return {
            "status": "completed",
            "campaign_id": campaign_id,
            "total_clients": len(eligible_clients),
            "sent": sent_count,
            "failed": failed_count,
        }
