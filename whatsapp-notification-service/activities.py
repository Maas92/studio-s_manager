"""
Temporal Activities for WhatsApp Notifications
Activities handle all external interactions (database, WhatsApp API)
"""

from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional
from uuid import UUID

import structlog
from config import get_settings
from database import Booking, Client, NotificationLog, get_db_session
from services.message_templates import MessageTemplates
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

        async with get_db_session() as session:
            booking_data = await self._get_booking_details(session, input["booking_id"])

            if not booking_data:
                activity.logger.error(
                    f"Booking {input['booking_id']} not found in database"
                )
                raise ValueError(f"Booking {input['booking_id']} not found")

            if not await self._can_send_to_client(session, booking_data["client_id"]):
                activity.logger.warning(
                    f"Client {booking_data['client_id']} cannot receive messages (blocked/inactive)"
                )
                return {"success": False, "reason": "client_preferences"}

            message_text, template_params, template_name = (
                self.templates.confirmation_message(
                    client_name=booking_data["client_name"],
                    appointment_date=booking_data["appointment_date"],
                    appointment_time=booking_data["appointment_time"],
                    treatment_name=booking_data["treatment_name"],
                    staff_name=booking_data["staff_name"],
                    location=booking_data.get("location", "Our Salon"),
                )
            )

            phone = self._format_phone_number(booking_data["client_phone"])

            result = await self.whatsapp.send_message(
                to=phone,
                message=message_text,
                template_name=template_name,
                parameters=template_params,
            )

            if result.get("success"):
                activity.logger.info(
                    f"✅ Confirmation sent successfully for booking {input['booking_id']} to {phone} message_id={result.get('message_id')}"
                )
            else:
                activity.logger.error(
                    f"❌ Failed to send confirmation for booking {input['booking_id']} to {phone} error={result.get('error')}"
                )

            await self._log_notification(
                session=session,
                booking_id=input["booking_id"],
                client_id=booking_data["client_id"],
                phone_number=phone,
                message_type="confirmation",
                message_content=message_text,
                status="sent" if result.get("success") else "failed",
                provider_message_id=result.get("message_id"),
                error_message=result.get("error"),
            )

            if result.get("success"):
                await self._update_booking_confirmation(session, input["booking_id"])

            return result

    @activity.defn(name="send_24h_reminder_message")
    async def send_24h_reminder_message(self, input: dict) -> dict:
        """Send 24-hour reminder message"""

        activity.logger.info(f"Sending 24h reminder for booking {input['booking_id']}")

        async with get_db_session() as session:
            booking_data = await self._get_booking_details(session, input["booking_id"])

            if not booking_data:
                activity.logger.error(f"Booking {input['booking_id']} not found")
                raise ValueError(f"Booking {input['booking_id']} not found")

            if booking_data["status"] not in ["confirmed", "pending"]:
                activity.logger.warning(f"Booking {input['booking_id']} is not active")
                return {"success": False, "reason": "booking_not_active"}

            if not await self._can_send_to_client(session, booking_data["client_id"]):
                return {"success": False, "reason": "client_preferences"}

            message_text, template_params, template_name = (
                self.templates.reminder_24h_message(
                    client_name=booking_data["client_name"],
                    appointment_date=booking_data["appointment_date"],
                    appointment_time=booking_data["appointment_time"],
                    treatment_name=booking_data["treatment_name"],
                    staff_name=booking_data["staff_name"],
                )
            )

            phone = self._format_phone_number(booking_data["client_phone"])

            result = await self.whatsapp.send_message(
                to=phone,
                message=message_text,
                template_name=template_name,
                parameters=template_params,
            )

            if result.get("success"):
                activity.logger.info(
                    f"✅ 24h reminder sent successfully for booking {input['booking_id']} message_id={result.get('message_id')}"
                )
            else:
                activity.logger.error(
                    f"❌ Failed to send 24h reminder for booking {input['booking_id']} error={result.get('error')}"
                )

            await self._log_notification(
                session=session,
                booking_id=input["booking_id"],
                client_id=booking_data["client_id"],
                phone_number=phone,
                message_type="reminder_24h",
                message_content=message_text,
                status="sent" if result.get("success") else "failed",
                provider_message_id=result.get("message_id"),
                error_message=result.get("error"),
            )

            if result.get("success"):
                await self._update_booking_reminder(session, input["booking_id"])

            return result

    @activity.defn(name="send_1h_reminder_message")
    async def send_1h_reminder_message(self, input: dict) -> dict:
        """Send 1-hour reminder message"""

        activity.logger.info(f"Sending 1h reminder for booking {input['booking_id']}")

        async with get_db_session() as session:
            booking_data = await self._get_booking_details(session, input["booking_id"])

            if not booking_data:
                activity.logger.error(f"Booking {input['booking_id']} not found")
                raise ValueError(f"Booking {input['booking_id']} not found")

            if booking_data["status"] not in ["confirmed", "pending"]:
                activity.logger.warning(f"Booking {input['booking_id']} is not active")
                return {"success": False, "reason": "booking_not_active"}

            if not await self._can_send_to_client(session, booking_data["client_id"]):
                return {"success": False, "reason": "client_preferences"}

            message_text, template_params, template_name = (
                self.templates.reminder_1h_message(
                    client_name=booking_data["client_name"],
                    appointment_time=booking_data["appointment_time"],
                    treatment_name=booking_data["treatment_name"],
                )
            )

            phone = self._format_phone_number(booking_data["client_phone"])

            result = await self.whatsapp.send_message(
                to=phone,
                message=message_text,
                template_name=template_name,
                parameters=template_params,
            )

            if result.get("success"):
                activity.logger.info(
                    f"✅ 1h reminder sent successfully for booking {input['booking_id']} message_id={result.get('message_id')}"
                )
            else:
                activity.logger.error(
                    f"❌ Failed to send 1h reminder for booking {input['booking_id']} error={result.get('error')}"
                )

            await self._log_notification(
                session=session,
                booking_id=input["booking_id"],
                client_id=booking_data["client_id"],
                phone_number=phone,
                message_type="reminder_1h",
                message_content=message_text,
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
                activity.logger.error(f"Booking {input['booking_id']} not found")
                raise ValueError(f"Booking {input['booking_id']} not found")

            if booking_data["status"] != "completed":
                activity.logger.warning(
                    f"Booking {input['booking_id']} not completed, skipping aftercare"
                )
                return {"success": False, "reason": "appointment_not_completed"}

            if not await self._can_send_to_client(session, booking_data["client_id"]):
                return {"success": False, "reason": "client_preferences"}

            message_text, template_params, template_name = (
                self.templates.aftercare_message(
                    client_name=booking_data["client_name"],
                    treatment_name=booking_data["treatment_name"],
                )
            )

            phone = self._format_phone_number(booking_data["client_phone"])

            result = await self.whatsapp.send_message(
                to=phone,
                message=message_text,
                template_name=template_name,
                parameters=template_params,
            )

            if result.get("success"):
                activity.logger.info(
                    f"✅ Aftercare sent successfully for booking {input['booking_id']} message_id={result.get('message_id')}"
                )
            else:
                activity.logger.error(
                    f"❌ Failed to send aftercare for booking {input['booking_id']} error={result.get('error')}"
                )

            await self._log_notification(
                session=session,
                booking_id=input["booking_id"],
                client_id=booking_data["client_id"],
                phone_number=phone,
                message_type="aftercare",
                message_content=message_text,
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
                activity.logger.error(f"Booking {input['booking_id']} not found")
                raise ValueError(f"Booking {input['booking_id']} not found")

            if not await self._can_send_to_client(session, booking_data["client_id"]):
                return {"success": False, "reason": "client_preferences"}

            message_text, template_params, template_name = (
                self.templates.cancellation_message(
                    client_name=booking_data["client_name"],
                    appointment_date=booking_data["appointment_date"],
                    appointment_time=booking_data["appointment_time"],
                    cancellation_reason=input.get("cancellation_reason"),
                )
            )

            phone = self._format_phone_number(booking_data["client_phone"])

            result = await self.whatsapp.send_message(
                to=phone,
                message=message_text,
                template_name=template_name,
                parameters=template_params,
            )

            if result.get("success"):
                activity.logger.info(
                    f"✅ Cancellation sent successfully for booking {input['booking_id']} message_id={result.get('message_id')}"
                )
            else:
                activity.logger.error(
                    f"❌ Failed to send cancellation for booking {input['booking_id']} error={result.get('error')}"
                )

            await self._log_notification(
                session=session,
                booking_id=input["booking_id"],
                client_id=booking_data["client_id"],
                phone_number=phone,
                message_type="cancellation",
                message_content=message_text,
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
                activity.logger.error(f"Booking {input['booking_id']} not found")
                raise ValueError(f"Booking {input['booking_id']} not found")

            if not await self._can_send_to_client(session, booking_data["client_id"]):
                return {"success": False, "reason": "client_preferences"}

            message_text, template_params, template_name = (
                self.templates.reschedule_message(
                    client_name=booking_data["client_name"],
                    new_appointment_date=booking_data["appointment_date"],
                    new_appointment_time=booking_data["appointment_time"],
                    treatment_name=booking_data["treatment_name"],
                )
            )

            phone = self._format_phone_number(booking_data["client_phone"])

            result = await self.whatsapp.send_message(
                to=phone,
                message=message_text,
                template_name=template_name,
                parameters=template_params,
            )

            if result.get("success"):
                activity.logger.info(
                    f"✅ Reschedule notification sent successfully for booking {input['booking_id']} message_id={result.get('message_id')}"
                )
            else:
                activity.logger.error(
                    f"❌ Failed to send reschedule notification for booking {input['booking_id']} error={result.get('error')}"
                )

            await self._log_notification(
                session=session,
                booking_id=input["booking_id"],
                client_id=booking_data["client_id"],
                phone_number=phone,
                message_type="reschedule",
                message_content=message_text,
                status="sent" if result.get("success") else "failed",
                provider_message_id=result.get("message_id"),
                error_message=result.get("error"),
            )

            return result

    @activity.defn(name="get_appointment_end_time")
    async def get_appointment_end_time(self, booking_id: str) -> datetime:
        """Get appointment end time from database"""

        async with get_db_session() as session:
            result = await session.execute(
                select(
                    Booking.booking_date, Booking.start_time, Booking.duration_minutes
                ).where(Booking.id == UUID(booking_id))
            )
            row = result.first()

            if not row:
                activity.logger.error(
                    f"Booking {booking_id} not found for end time calculation"
                )
                raise ValueError(f"Booking {booking_id} not found")

            booking_date, start_time, duration = row

            appointment_start = datetime.combine(booking_date, start_time)
            appointment_end = appointment_start + timedelta(minutes=duration or 60)

            activity.logger.info(
                f"Appointment end time calculated for booking {booking_id} end_time={appointment_end.isoformat()}"
            )

            return appointment_end

    @activity.defn(name="get_eligible_marketing_clients")
    async def get_eligible_marketing_clients(
        self, campaign_id: int
    ) -> List[Dict[str, Any]]:
        """Get clients eligible for marketing campaign"""

        activity.logger.info(f"Fetching eligible clients for campaign {campaign_id}")

        async with get_db_session() as session:
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
                            "id": str(row.id),
                            "name": f"{row.first_name} {row.last_name}",
                            "phone": phone,
                        }
                    )

            activity.logger.info(
                f"Found {len(clients)} eligible clients for campaign {campaign_id}"
            )

            return clients

    @activity.defn(name="send_marketing_message")
    async def send_marketing_message(self, input: dict) -> dict:
        """Send marketing message to a client"""

        activity.logger.info(
            f"Sending marketing message to client {input['client_id']}"
        )

        async with get_db_session() as session:
            message_text, template_params, template_name = (
                self.templates.marketing_message(
                    client_name=input["name"],
                    custom_message=input["message_template"],
                )
            )

            phone = self._format_phone_number(input["phone"])

            result = await self.whatsapp.send_message(
                to=phone,
                message=message_text,
                template_name=template_name,
                parameters=template_params,
            )

            if result.get("success"):
                activity.logger.info(
                    f"✅ Marketing message sent successfully to client {input['client_id']} message_id={result.get('message_id')}"
                )
            else:
                activity.logger.error(
                    f"❌ Failed to send marketing message to client {input['client_id']} error={result.get('error')}"
                )

            await self._log_notification(
                session=session,
                booking_id=None,
                client_id=UUID(input["client_id"]),
                phone_number=phone,
                message_type="marketing",
                message_content=message_text,
                status="sent" if result.get("success") else "failed",
                provider_message_id=result.get("message_id"),
                error_message=result.get("error"),
            )

            return result

    async def _get_booking_details(
        self, session: AsyncSession, booking_id: str
    ) -> Optional[dict]:
        """Fetch booking details with client and treatment info"""

        try:
            booking_uuid = (
                UUID(booking_id) if isinstance(booking_id, str) else booking_id
            )
        except (ValueError, TypeError):
            activity.logger.error(f"Invalid booking_id format: {booking_id}")
            return None

        result = await session.execute(
            select(
                Booking,
                Client.first_name,
                Client.last_name,
                Client.whatsapp,
                Client.phone,
            )
            .join(Client, Booking.client_id == Client.id)
            .where(Booking.id == booking_uuid)
        )

        row = result.first()
        if not row:
            activity.logger.warning(f"Booking {booking_id} not found in database")
            return None

        booking, first_name, last_name, whatsapp, phone = row

        return {
            "booking_id": str(booking.id),
            "client_id": booking.client_id,
            "client_name": f"{first_name} {last_name}",
            "client_phone": whatsapp or phone,
            "appointment_date": booking.booking_date.strftime("%Y-%m-%d"),
            "appointment_time": booking.start_time.strftime("%H:%M"),
            "treatment_name": "Treatment",
            "staff_name": "Staff",
            "status": booking.status,
        }

    async def _can_send_to_client(self, session: AsyncSession, client_id: UUID) -> bool:
        """Check if client can receive messages"""

        result = await session.execute(
            select(Client.is_active, Client.status, Client.whatsapp_verified).where(
                Client.id == client_id
            )
        )

        row = result.first()
        if not row:
            activity.logger.warning(f"Client {client_id} not found")
            return False

        is_active, status, whatsapp_verified = row

        can_send = is_active and status != "blocked"

        if not can_send:
            activity.logger.info(
                f"Client {client_id} cannot receive messages is_active={is_active} status={status}"
            )

        return can_send

    def _format_phone_number(self, phone: str) -> str:
        """
        Format phone number to E.164 format
        """

        if not phone:
            raise ValueError("Phone number is required")

        cleaned = phone.strip()

        if cleaned.startswith("+"):
            activity.logger.debug(f"Phone already has country code: {cleaned}")
            return cleaned

        phone_digits = "".join(filter(str.isdigit, cleaned))

        if len(phone_digits) > 10 and not phone_digits.startswith("0"):
            formatted = "+" + phone_digits
            activity.logger.debug(f"Phone appears to have country code: {formatted}")
            return formatted

        if phone_digits.startswith("0"):
            formatted = "+263" + phone_digits[1:]
            activity.logger.debug(f"Local number converted: {formatted}")
            return formatted

        formatted = "+263" + phone_digits
        activity.logger.debug(f"Added default country code: {formatted}")
        return formatted

    async def _log_notification(
        self,
        session: AsyncSession,
        booking_id: Optional[str],
        client_id: UUID,
        phone_number: str,
        message_type: str,
        message_content: str,
        status: str,
        provider_message_id: Optional[str] = None,
        error_message: Optional[str] = None,
    ) -> None:
        """Log notification to database"""

        try:
            log_entry = NotificationLog(
                booking_id=UUID(booking_id) if booking_id else None,
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

            activity.logger.debug(
                f"Notification logged to database booking_id={booking_id} message_type={message_type} status={status}"
            )

        except Exception as e:
            activity.logger.error(
                f"Failed to log notification to database booking_id={booking_id} error={str(e)}"
            )
            await session.rollback()

    async def _update_booking_confirmation(
        self, session: AsyncSession, booking_id: str
    ) -> None:
        """Update booking confirmation timestamp"""

        try:
            booking_uuid = UUID(booking_id)
            result = await session.execute(
                select(Booking).where(Booking.id == booking_uuid)
            )
            booking = result.scalar_one_or_none()

            if booking:
                booking.confirmation_sent_at = datetime.utcnow()
                await session.commit()
                activity.logger.debug(
                    f"Updated confirmation timestamp for booking {booking_id}"
                )
        except Exception as e:
            activity.logger.error(
                f"Failed to update booking confirmation timestamp booking_id={booking_id} error={str(e)}"
            )
            await session.rollback()

    async def _update_booking_reminder(
        self, session: AsyncSession, booking_id: str
    ) -> None:
        """Update booking reminder timestamp"""

        try:
            booking_uuid = UUID(booking_id)
            result = await session.execute(
                select(Booking).where(Booking.id == booking_uuid)
            )
            booking = result.scalar_one_or_none()

            if booking:
                booking.reminder_sent_at = datetime.utcnow()
                await session.commit()
                activity.logger.debug(
                    f"Updated reminder timestamp for booking {booking_id}"
                )
        except Exception as e:
            activity.logger.error(
                f"Failed to update booking reminder timestamp booking_id={booking_id} error={str(e)}"
            )
            await session.rollback()
