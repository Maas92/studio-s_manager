"""
Core notification service - handles all notification logic
"""

import logging
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional, cast

from config import settings
from database import Booking, Client, NotificationLog, SessionLocal
from models.schemas import NotificationStats
from services.message_templates import MessageTemplates
from services.whatsapp_provider import WhatsAppProvider
from sqlalchemy import Column, and_, or_
from sqlalchemy.orm import Session

logger = logging.getLogger(__name__)


class NotificationService:
    """Service for managing WhatsApp notifications"""

    def __init__(self, whatsapp_provider: WhatsAppProvider):
        self.provider = whatsapp_provider
        self.templates = MessageTemplates()

    def _get_db(self) -> Session:
        """Get database session"""
        return SessionLocal()

    def _should_send_to_client(self, client: Client) -> bool:
        """Check if client should receive WhatsApp messages"""
        # Changed check to avoid comparison errors
        if not client.is_active:
            return False

        # Transactional logic
        if not client.marketing_consent and settings.REMINDER_24H_ENABLED:
            pass

        phone: Optional[str] = client.whatsapp or client.phone
        if not phone:
            return False

        return True

    def _get_phone_number(self, client: Client) -> Optional[str]:
        """Get the best phone number to use for WhatsApp"""
        return client.whatsapp or client.phone

    def _prepare_booking_data(self, booking: Booking, db: Session) -> Dict[str, Any]:
        """Prepare booking data for message templates"""
        client = booking.client

        treatment_name = f"Treatment #{booking.treatment_id}"
        staff_name = f"Staff Member #{booking.staff_id}"
        location = "Our Salon"

        return {
            "client_name": f"{client.first_name} {client.last_name}",
            "booking_date": booking.booking_date,
            "start_time": booking.start_time,
            "end_time": booking.end_time,
            "treatment_name": treatment_name,
            "staff_name": staff_name,
            "location": location,
            "deposit_required": booking.deposit_required,
            "deposit_amount": booking.deposit_amount,
            "total_price": booking.total_price,
            "notes": booking.notes,
            "cancellation_reason": booking.cancellation_reason,
        }

    async def _send_and_log(
        self,
        phone_number: str,
        message: str,
        message_type: str,
        booking_id: Optional[int],
        client_id: Optional[int],
    ) -> bool:
        """Send message and log to database"""
        db = self._get_db()

        try:
            result = await self.provider.send_message(phone_number, message)

            log = NotificationLog(
                booking_id=booking_id,
                client_id=client_id,
                phone_number=phone_number,
                message_type=message_type,
                message_content=message,
                status="sent" if result["success"] else "failed",
                provider_message_id=result.get("message_id"),
                error_message=result.get("error"),
            )
            db.add(log)
            db.commit()

            return result["success"]

        except Exception as e:
            logger.error(f"Error sending message: {e}")
            log = NotificationLog(
                booking_id=booking_id,
                client_id=client_id,
                phone_number=phone_number,
                message_type=message_type,
                message_content=message,
                status="failed",
                error_message=str(e),
            )
            db.add(log)
            db.commit()
            return False
        finally:
            db.close()

    async def send_confirmations(self):
        """Send confirmations for bookings that haven't received one"""
        logger.info("Running confirmation job...")
        db = self._get_db()

        try:
            cutoff_time = datetime.now() - timedelta(hours=24)

            # FIX: We use 'is_(True)' instead of '== True' to satisfy the type checker
            bookings = (
                db.query(Booking)
                .join(Client)
                .filter(
                    and_(
                        Booking.created_at >= cutoff_time,
                        Booking.confirmation_sent_at.is_(None),
                        Booking.status.in_(["confirmed", "pending"]),
                        Booking.start_time > datetime.now(),
                        cast(Column, Client.is_active).is_(True),
                    )
                )
                .all()
            )

            sent_count = 0
            for booking in bookings:
                if not self._should_send_to_client(booking.client):
                    continue

                phone = self._get_phone_number(booking.client)
                if not phone:
                    continue

                booking_data = self._prepare_booking_data(booking, db)
                message = self.templates.confirmation(booking_data)

                success = await self._send_and_log(
                    phone_number=str(phone),
                    message=message,
                    message_type="confirmation",
                    booking_id=booking.id,
                    client_id=booking.client_id,
                )

                if success:
                    booking.confirmation_sent_at = datetime.now()
                    db.commit()
                    sent_count += 1

            logger.info(f"Sent {sent_count} confirmations")

        except Exception as e:
            logger.error(f"Error in send_confirmations: {e}")
        finally:
            db.close()

    async def send_24h_reminders(self):
        """Send 24-hour reminders"""
        logger.info("Running 24-hour reminder job...")
        db = self._get_db()

        try:
            now = datetime.now()
            window_start = now + timedelta(hours=23)
            window_end = now + timedelta(hours=25)

            bookings = (
                db.query(Booking)
                .join(Client)
                .filter(
                    and_(
                        Booking.start_time.between(window_start, window_end),
                        Booking.status.in_(["confirmed"]),
                        cast(Column, Client.is_active).is_(True),
                    )
                )
                .all()
            )

            sent_count = 0
            for booking in bookings:
                existing_log = (
                    db.query(NotificationLog)
                    .filter(
                        and_(
                            NotificationLog.booking_id == booking.id,
                            NotificationLog.message_type == "reminder_24h",
                            NotificationLog.status == "sent",
                        )
                    )
                    .first()
                )

                if existing_log:
                    continue

                if not self._should_send_to_client(booking.client):
                    continue

                phone = self._get_phone_number(booking.client)
                if not phone:
                    continue

                booking_data = self._prepare_booking_data(booking, db)
                message = self.templates.reminder_24h(booking_data)

                success = await self._send_and_log(
                    phone_number=str(phone),
                    message=message,
                    message_type="reminder_24h",
                    booking_id=booking.id,
                    client_id=booking.client_id,
                )

                if success:
                    sent_count += 1

            logger.info(f"Sent {sent_count} 24-hour reminders")

        except Exception as e:
            logger.error(f"Error in send_24h_reminders: {e}")
        finally:
            db.close()

    async def send_1h_reminders(self):
        """Send 1-hour reminders"""
        logger.info("Running 1-hour reminder job...")
        db = self._get_db()

        try:
            now = datetime.now()
            window_start = now + timedelta(minutes=50)
            window_end = now + timedelta(minutes=70)

            bookings = (
                db.query(Booking)
                .join(Client)
                .filter(
                    and_(
                        Booking.start_time.between(window_start, window_end),
                        Booking.status.in_(["confirmed"]),
                        cast(Column, Client.is_active).is_(True),
                    )
                )
                .all()
            )

            sent_count = 0
            for booking in bookings:
                existing_log = (
                    db.query(NotificationLog)
                    .filter(
                        and_(
                            NotificationLog.booking_id == booking.id,
                            NotificationLog.message_type == "reminder_1h",
                            NotificationLog.status == "sent",
                        )
                    )
                    .first()
                )

                if existing_log:
                    continue

                if not self._should_send_to_client(booking.client):
                    continue

                phone = self._get_phone_number(booking.client)
                if not phone:
                    continue

                booking_data = self._prepare_booking_data(booking, db)
                message = self.templates.reminder_1h(booking_data)

                success = await self._send_and_log(
                    phone_number=str(phone),
                    message=message,
                    message_type="reminder_1h",
                    booking_id=booking.id,
                    client_id=booking.client_id,
                )

                if success:
                    sent_count += 1

            logger.info(f"Sent {sent_count} 1-hour reminders")

        except Exception as e:
            logger.error(f"Error in send_1h_reminders: {e}")
        finally:
            db.close()

    async def send_aftercare_messages(self):
        """Send aftercare messages after completed appointments"""
        logger.info("Running aftercare job...")
        db = self._get_db()

        try:
            cutoff_hours: float = float(settings.AFTERCARE_DELAY_HOURS or 3)
            now = datetime.now()
            window_start = now - timedelta(hours=cutoff_hours + 1)
            window_end = now - timedelta(hours=cutoff_hours - 1)

            bookings = (
                db.query(Booking)
                .join(Client)
                .filter(
                    and_(
                        Booking.completed_at.between(window_start, window_end),
                        Booking.status == "completed",
                        cast(Column, Client.is_active).is_(True),
                    )
                )
                .all()
            )

            sent_count = 0
            for booking in bookings:
                existing_log = (
                    db.query(NotificationLog)
                    .filter(
                        and_(
                            NotificationLog.booking_id == booking.id,
                            NotificationLog.message_type == "aftercare",
                            NotificationLog.status == "sent",
                        )
                    )
                    .first()
                )

                if existing_log:
                    continue

                if not self._should_send_to_client(booking.client):
                    continue

                phone = self._get_phone_number(booking.client)
                if not phone:
                    continue

                booking_data = self._prepare_booking_data(booking, db)
                message = self.templates.aftercare(booking_data)

                success = await self._send_and_log(
                    phone_number=str(phone),
                    message=message,
                    message_type="aftercare",
                    booking_id=booking.id,
                    client_id=booking.client_id,
                )

                if success:
                    sent_count += 1

            logger.info(f"Sent {sent_count} aftercare messages")

        except Exception as e:
            logger.error(f"Error in send_aftercare_messages: {e}")
        finally:
            db.close()

    async def send_confirmation_for_booking(self, booking_id: int) -> bool:
        """Manually send confirmation for a specific booking"""
        db = self._get_db()

        try:
            booking = db.query(Booking).filter(Booking.id == booking_id).first()
            if not booking:
                return False

            if not self._should_send_to_client(booking.client):
                return False

            phone = self._get_phone_number(booking.client)
            if not phone:
                return False

            booking_data = self._prepare_booking_data(booking, db)
            message = self.templates.confirmation(booking_data)

            return await self._send_and_log(
                phone_number=str(phone),
                message=message,
                message_type="confirmation",
                booking_id=booking.id,
                client_id=booking.client_id,
            )

        finally:
            db.close()

    async def send_cancellation_for_booking(self, booking_id: int) -> bool:
        """Manually send cancellation for a specific booking"""
        db = self._get_db()

        try:
            booking = db.query(Booking).filter(Booking.id == booking_id).first()
            if not booking:
                return False

            if not self._should_send_to_client(booking.client):
                return False

            phone = self._get_phone_number(booking.client)
            if not phone:
                return False

            booking_data = self._prepare_booking_data(booking, db)
            message = self.templates.cancellation(booking_data)

            return await self._send_and_log(
                phone_number=str(phone),
                message=message,
                message_type="cancellation",
                booking_id=booking.id,
                client_id=booking.client_id,
            )

        finally:
            db.close()

    async def send_manual_message(
        self, phone_number: str, message: str, message_type: str = "manual"
    ) -> bool:
        """Send a manual message"""
        return await self._send_and_log(
            phone_number=phone_number,
            message=message,
            message_type=message_type,
            booking_id=None,
            client_id=None,
        )

    async def get_stats(self, days: int = 7) -> NotificationStats:
        """Get notification statistics"""
        db = self._get_db()

        try:
            cutoff_date = datetime.now() - timedelta(days=days)

            logs = (
                db.query(NotificationLog)
                .filter(NotificationLog.created_at >= cutoff_date)
                .all()
            )

            total_sent = len([l for l in logs if l.status == "sent"])
            total_failed = len([l for l in logs if l.status == "failed"])

            by_type = {}
            for log in logs:
                if log.message_type not in by_type:
                    by_type[log.message_type] = {"sent": 0, "failed": 0}

                if log.status == "sent":
                    by_type[log.message_type]["sent"] += 1
                elif log.status == "failed":
                    by_type[log.message_type]["failed"] += 1

            return NotificationStats(
                total_sent=total_sent,
                total_failed=total_failed,
                by_type=by_type,
                period_days=days,
            )

        finally:
            db.close()
