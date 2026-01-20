"""
Temporal Activities for WhatsApp Notifications
Activities handle all external interactions (database, WhatsApp API)
"""

from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional

import structlog
from database import Booking, Client, NotificationLog, get_db_session
from services.message_templates import MessageTemplates

# Import your existing services
from services.whatsapp_provider import WhatsAppProvider
from sqlalchemy import and_, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from temporalio import activity

logger = structlog.get_logger()


class NotificationActivities:
    """Activities for sending WhatsApp notifications"""

    def __init__(
        self,
        whatsapp_provider: WhatsAppProvider,
        message_templates: MessageTemplates,
    ):
        self.whatsapp = whatsapp_provider
        self.templates = message_templates

    @activity.defn(name="send_confirmation_message")
    async def send_confirmation_message(self, input: dict) -> dict:
        """Send booking confirmation message"""

        activity.logger.info(f"Sending confirmation for booking {input['booking_id']}")

        # Get full booking details from database
        async with get_db_session() as session:
            booking_data = await self._get_booking_details(session, input["booking_id"])

            if not booking_data:
                raise ValueError(f"Booking {input['booking_id']} not found")

            # Check if client can receive messages
            if not await self._can_send_to_client(session, booking_data["client_id"]):
                activity.logger.warning(
                    f"Client {booking_data['client_id']} cannot receive messages"
                )
                return {"success": False, "reason": "client_preferences"}

            # Generate message
            message = self.templates.confirmation_message(
                client_name=booking_data["client_name"],
                appointment_date=booking_data["appointment_date"],
                appointment_time=booking_data["appointment_time"],
                treatment_name=booking_data["treatment_name"],
                staff_name=booking_data["staff_name"],
                location=booking_data.get("location", "Our Salon"),
            )

            # Format phone number
            phone = self._format_phone_number(booking_data["client_phone"])

            # Send via WhatsApp provider
            result = await self.whatsapp.send_message(
                to=phone,
                message=message,
            )

            # Log to database
            await self._log_notification(
                session=session,
                booking_id=input["booking_id"],
                client_id=booking_data["client_id"],
                phone_number=phone,
                message_type="confirmation",
                message_content=message,
                status="sent" if result.get("success") else "failed",
                provider_message_id=result.get("message_id"),
                error_message=result.get("error"),
            )

            # Update booking confirmation timestamp
            await self._update_booking_confirmation(session, input["booking_id"])

            return result

    @activity.defn(name="send_24h_reminder_message")
    async def send_24h_reminder_message(self, input: dict) -> dict:
        """Send 24-hour reminder message"""

        activity.logger.info(f"Sending 24h reminder for booking {input['booking_id']}")

        async with get_db_session() as session:
            booking_data = await self._get_booking_details(session, input["booking_id"])

            if not booking_data:
                raise ValueError(f"Booking {input['booking_id']} not found")

            # Check booking is still active
            if booking_data["status"] not in ["confirmed", "pending"]:
                return {"success": False, "reason": "booking_not_active"}

            if not await self._can_send_to_client(session, booking_data["client_id"]):
                return {"success": False, "reason": "client_preferences"}

            message = self.templates.reminder_24h_message(
                client_name=booking_data["client_name"],
                appointment_date=booking_data["appointment_date"],
                appointment_time=booking_data["appointment_time"],
                treatment_name=booking_data["treatment_name"],
                staff_name=booking_data["staff_name"],
            )

            phone = self._format_phone_number(booking_data["client_phone"])
            result = await self.whatsapp.send_message(to=phone, message=message)

            await self._log_notification(
                session=session,
                booking_id=input["booking_id"],
                client_id=booking_data["client_id"],
                phone_number=phone,
                message_type="reminder_24h",
                message_content=message,
                status="sent" if result.get("success") else "failed",
                provider_message_id=result.get("message_id"),
                error_message=result.get("error"),
            )

            await self._update_booking_reminder(session, input["booking_id"])

            return result

    @activity.defn(name="send_1h_reminder_message")
    async def send_1h_reminder_message(self, input: dict) -> dict:
        """Send 1-hour reminder message"""

        activity.logger.info(f"Sending 1h reminder for booking {input['booking_id']}")

        async with get_db_session() as session:
            booking_data = await self._get_booking_details(session, input["booking_id"])

            if not booking_data:
                raise ValueError(f"Booking {input['booking_id']} not found")

            if booking_data["status"] not in ["confirmed", "pending"]:
                return {"success": False, "reason": "booking_not_active"}

            if not await self._can_send_to_client(session, booking_data["client_id"]):
                return {"success": False, "reason": "client_preferences"}

            message = self.templates.reminder_1h_message(
                client_name=booking_data["client_name"],
                appointment_time=booking_data["appointment_time"],
                treatment_name=booking_data["treatment_name"],
            )

            phone = self._format_phone_number(booking_data["client_phone"])
            result = await self.whatsapp.send_message(to=phone, message=message)

            await self._log_notification(
                session=session,
                booking_id=input["booking_id"],
                client_id=booking_data["client_id"],
                phone_number=phone,
                message_type="reminder_1h",
                message_content=message,
                status="sent" if result.get("success") else "failed",
                provider_message_id=result.get("message_id"),
                error_message=result.get("error"),
            )

            return result

    @activity.defn(name="send_aftercare_message")
    async def send_aftercare_message(self, input: dict) -> dict:
        """Send aftercare message 24 hours after appointment"""

        activity.logger.info(f"Sending aftercare for booking {input['booking_id']}")

        async with get_db_session() as session:
            booking_data = await self._get_booking_details(session, input["booking_id"])

            if not booking_data:
                raise ValueError(f"Booking {input['booking_id']} not found")

            # Only send if appointment was completed
            if booking_data["status"] != "completed":
                return {"success": False, "reason": "appointment_not_completed"}

            if not await self._can_send_to_client(session, booking_data["client_id"]):
                return {"success": False, "reason": "client_preferences"}

            message = self.templates.aftercare_message(
                client_name=booking_data["client_name"],
                treatment_name=booking_data["treatment_name"],
            )

            phone = self._format_phone_number(booking_data["client_phone"])
            result = await self.whatsapp.send_message(to=phone, message=message)

            await self._log_notification(
                session=session,
                booking_id=input["booking_id"],
                client_id=booking_data["client_id"],
                phone_number=phone,
                message_type="aftercare",
                message_content=message,
                status="sent" if result.get("success") else "failed",
                provider_message_id=result.get("message_id"),
                error_message=result.get("error"),
            )

            return result

    @activity.defn(name="send_cancellation_message")
    async def send_cancellation_message(self, input: dict) -> dict:
        """Send cancellation notification"""

        activity.logger.info(f"Sending cancellation for booking {input['booking_id']}")

        async with get_db_session() as session:
            booking_data = await self._get_booking_details(session, input["booking_id"])

            if not booking_data:
                raise ValueError(f"Booking {input['booking_id']} not found")

            if not await self._can_send_to_client(session, booking_data["client_id"]):
                return {"success": False, "reason": "client_preferences"}

            message = self.templates.cancellation_message(
                client_name=booking_data["client_name"],
                appointment_date=booking_data["appointment_date"],
                appointment_time=booking_data["appointment_time"],
                cancellation_reason=input.get("cancellation_reason"),
            )

            phone = self._format_phone_number(booking_data["client_phone"])
            result = await self.whatsapp.send_message(to=phone, message=message)

            await self._log_notification(
                session=session,
                booking_id=input["booking_id"],
                client_id=booking_data["client_id"],
                phone_number=phone,
                message_type="cancellation",
                message_content=message,
                status="sent" if result.get("success") else "failed",
                provider_message_id=result.get("message_id"),
                error_message=result.get("error"),
            )

            return result

    @activity.defn(name="send_reschedule_message")
    async def send_reschedule_message(self, input: dict) -> dict:
        """Send reschedule notification"""

        activity.logger.info(f"Sending reschedule for booking {input['booking_id']}")

        async with get_db_session() as session:
            booking_data = await self._get_booking_details(session, input["booking_id"])

            if not booking_data:
                raise ValueError(f"Booking {input['booking_id']} not found")

            if not await self._can_send_to_client(session, booking_data["client_id"]):
                return {"success": False, "reason": "client_preferences"}

            message = self.templates.reschedule_message(
                client_name=booking_data["client_name"],
                new_appointment_date=booking_data["appointment_date"],
                new_appointment_time=booking_data["appointment_time"],
                treatment_name=booking_data["treatment_name"],
            )

            phone = self._format_phone_number(booking_data["client_phone"])
            result = await self.whatsapp.send_message(to=phone, message=message)

            await self._log_notification(
                session=session,
                booking_id=input["booking_id"],
                client_id=booking_data["client_id"],
                phone_number=phone,
                message_type="reschedule",
                message_content=message,
                status="sent" if result.get("success") else "failed",
                provider_message_id=result.get("message_id"),
                error_message=result.get("error"),
            )

            return result

    @activity.defn(name="get_appointment_end_time")
    async def get_appointment_end_time(self, booking_id: int) -> datetime:
        """Get appointment end time from database"""

        async with get_db_session() as session:
            result = await session.execute(
                select(
                    Booking.booking_date, Booking.start_time, Booking.duration_minutes
                ).where(Booking.id == booking_id)
            )
            row = result.first()

            if not row:
                raise ValueError(f"Booking {booking_id} not found")

            booking_date, start_time, duration = row

            # Combine date and time
            appointment_start = datetime.combine(booking_date, start_time)
            appointment_end = appointment_start + timedelta(minutes=duration or 60)

            return appointment_end

    @activity.defn(name="get_eligible_marketing_clients")
    async def get_eligible_marketing_clients(
        self, campaign_id: int
    ) -> List[Dict[str, Any]]:
        """Get clients eligible for marketing campaign"""

        async with get_db_session() as session:
            # Query clients who:
            # - Have marketing consent
            # - Are active
            # - Not blocked
            # - Haven't visited in 60+ days
            # - Have valid WhatsApp number

            sixty_days_ago = datetime.utcnow() - timedelta(days=60)

            result = await session.execute(
                select(
                    Client.id,
                    Client.first_name,
                    Client.last_name,
                    Client.whatsapp,
                    Client.phone,
                ).where(
                    and_(
                        Client.marketing_consent == True,
                        Client.is_active == True,
                        Client.status != "blocked",
                        or_(
                            Client.last_visit_date < sixty_days_ago,
                            Client.last_visit_date.is_(None),
                        ),
                        or_(
                            Client.whatsapp.isnot(None),
                            Client.phone.isnot(None),
                        ),
                    )
                )
            )

            clients = []
            for row in result:
                phone = row.whatsapp or row.phone
                if phone:
                    clients.append(
                        {
                            "id": row.id,
                            "name": f"{row.first_name} {row.last_name}",
                            "phone": phone,
                        }
                    )

            return clients

    @activity.defn(name="send_marketing_message")
    async def send_marketing_message(self, input: dict) -> dict:
        """Send marketing message to a client"""

        async with get_db_session() as session:
            message = self.templates.marketing_message(
                client_name=input["name"],
                custom_message=input["message_template"],
            )

            phone = self._format_phone_number(input["phone"])
            result = await self.whatsapp.send_message(to=phone, message=message)

            await self._log_notification(
                session=session,
                booking_id=None,
                client_id=input["client_id"],
                phone_number=phone,
                message_type="marketing",
                message_content=message,
                status="sent" if result.get("success") else "failed",
                provider_message_id=result.get("message_id"),
                error_message=result.get("error"),
            )

            return result

    # Helper methods

    async def _get_booking_details(
        self, session: AsyncSession, booking_id: int
    ) -> Optional[dict]:
        """Fetch booking details with client and treatment info"""

        result = await session.execute(
            select(
                Booking,
                Client.first_name,
                Client.last_name,
                Client.whatsapp,
                Client.phone,
            )
            .join(Client, Booking.client_id == Client.id)
            .where(Booking.id == booking_id)
        )

        row = result.first()
        if not row:
            return None

        booking, first_name, last_name, whatsapp, phone = row

        return {
            "booking_id": booking.id,
            "client_id": booking.client_id,
            "client_name": f"{first_name} {last_name}",
            "client_phone": whatsapp or phone,
            "appointment_date": booking.booking_date.strftime("%Y-%m-%d"),
            "appointment_time": booking.start_time.strftime("%H:%M"),
            "treatment_name": "Treatment",  # Join with treatment table if needed
            "staff_name": "Staff",  # Join with staff table if needed
            "status": booking.status,
        }

    async def _can_send_to_client(self, session: AsyncSession, client_id: int) -> bool:
        """Check if client can receive messages"""

        result = await session.execute(
            select(Client.is_active, Client.status, Client.whatsapp_verified).where(
                Client.id == client_id
            )
        )

        row = result.first()
        if not row:
            return False

        is_active, status, whatsapp_verified = row

        return is_active and status != "blocked"

    def _format_phone_number(self, phone: str) -> str:
        """Format phone number to E.164 (South Africa +27)"""

        if not phone:
            raise ValueError("Phone number is required")

        # Remove all non-numeric characters
        phone = "".join(filter(str.isdigit, phone))

        # Add country code if not present
        if not phone.startswith("27"):
            if phone.startswith("0"):
                phone = "27" + phone[1:]
            else:
                phone = "27" + phone

        return "+" + phone

    async def _log_notification(
        self,
        session: AsyncSession,
        booking_id: Optional[int],
        client_id: int,
        phone_number: str,
        message_type: str,
        message_content: str,
        status: str,
        provider_message_id: Optional[str] = None,
        error_message: Optional[str] = None,
    ) -> None:
        """Log notification to database"""

        log_entry = NotificationLog(
            booking_id=booking_id,
            client_id=client_id,
            phone_number=phone_number,
            message_type=message_type,
            message_content=message_content,
            sent_at=datetime.utcnow() if status == "sent" else None,
            status=status,
            provider_message_id=provider_message_id,
            error_message=error_message,
            retry_count=0,
        )

        session.add(log_entry)
        await session.commit()

    async def _update_booking_confirmation(
        self, session: AsyncSession, booking_id: int
    ) -> None:
        """Update booking confirmation timestamp"""

        result = await session.execute(select(Booking).where(Booking.id == booking_id))
        booking = result.scalar_one_or_none()

        if booking:
            booking.confirmation_sent_at = datetime.utcnow()
            await session.commit()

    async def _update_booking_reminder(
        self, session: AsyncSession, booking_id: int
    ) -> None:
        """Update booking reminder timestamp"""

        result = await session.execute(select(Booking).where(Booking.id == booking_id))
        booking = result.scalar_one_or_none()

        if booking:
            booking.reminder_sent_at = datetime.utcnow()
            await session.commit()
