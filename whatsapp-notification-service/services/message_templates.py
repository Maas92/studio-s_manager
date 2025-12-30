"""
WhatsApp message templates for different notification types
"""

from datetime import datetime
from typing import Any, Dict

from config import settings


class MessageTemplates:
    """Message template generator for various notification types"""

    @staticmethod
    def format_datetime(dt: datetime) -> str:
        """Format datetime for display"""
        return dt.strftime("%A, %B %d, %Y at %I:%M %p")

    @staticmethod
    def format_date(dt: datetime) -> str:
        """Format date only"""
        return dt.strftime("%A, %B %d, %Y")

    @staticmethod
    def format_time(dt: datetime) -> str:
        """Format time only"""
        return dt.strftime("%I:%M %p")

    @staticmethod
    def confirmation(booking_data: Dict[str, Any]) -> str:
        """
        Booking confirmation message

        Args:
            booking_data: Dict containing booking and client information
        """
        client_name = booking_data.get("client_name", "Valued Client")
        booking_date = booking_data.get("booking_date", datetime.now())
        start_time = booking_data.get("start_time", datetime.now())
        treatment_name = booking_data.get("treatment_name", "your treatment")
        staff_name = booking_data.get("staff_name", "our staff")
        location = booking_data.get(
            "location", settings.BUSINESS_ADDRESS or "our salon"
        )

        message = f"""✨ {settings.BUSINESS_NAME} - Booking Confirmed ✨

        Hello {client_name}!
        
        Your appointment has been confirmed:
        
        📅 Date: {MessageTemplates.format_date(booking_date)}
        🕐 Time: {MessageTemplates.format_time(start_time)}
        💆 Treatment: {treatment_name}
        👤 With: {staff_name}
        📍 Location: {location}
        """

        if booking_data.get("deposit_required"):
            deposit = booking_data.get("deposit_amount", 0)
            message += f"\n💳 Deposit Required: R{deposit:.2f}"

        message += f"""

        We look forward to seeing you! 
        
        If you need to reschedule or cancel, please contact us at least 24 hours in advance.
        
        {settings.BUSINESS_PHONE or ''}
        {settings.SUPPORT_EMAIL or ''}
        """
        return message.strip()

    @staticmethod
    def reminder_24h(booking_data: Dict[str, Any]) -> str:
        """24-hour reminder message"""
        client_name = booking_data.get("client_name", "Valued Client")
        start_time = booking_data.get("start_time", datetime.now())
        treatment_name = booking_data.get("treatment_name", "your treatment")
        location = booking_data.get(
            "location", settings.BUSINESS_ADDRESS or "our salon"
        )

        message = f"""⏰ {settings.BUSINESS_NAME} - Appointment Reminder

        Hello {client_name}!
        
        This is a friendly reminder that your appointment is tomorrow:
        
        🕐 Time: {MessageTemplates.format_time(start_time)}
        💆 Treatment: {treatment_name}
        📍 Location: {location}
        
        Please arrive 5-10 minutes early to complete any necessary forms.
        
        Looking forward to seeing you!
        
        To cancel or reschedule: {settings.BUSINESS_PHONE or 'Contact us'}
        """
        return message.strip()

    @staticmethod
    def reminder_1h(booking_data: Dict[str, Any]) -> str:
        """1-hour reminder message"""
        client_name = booking_data.get("client_name", "Valued Client")
        start_time = booking_data.get("start_time", datetime.now())
        treatment_name = booking_data.get("treatment_name", "your treatment")
        location = booking_data.get(
            "location", settings.BUSINESS_ADDRESS or "our salon"
        )

        message = f"""⏰ {settings.BUSINESS_NAME} - Starting Soon!

        Hello {client_name}!
        
        Your appointment starts in 1 hour:
        
        🕐 Time: {MessageTemplates.format_time(start_time)}
        💆 Treatment: {treatment_name}
        📍 Location: {location}
        
        See you soon! 💖
        """
        return message.strip()

    @staticmethod
    def cancellation(booking_data: Dict[str, Any]) -> str:
        """Appointment cancellation message"""
        client_name = booking_data.get("client_name", "Valued Client")
        booking_date = booking_data.get("booking_date")
        start_time = booking_data.get("start_time", datetime.now())
        cancellation_reason = booking_data.get("cancellation_reason", "")

        message = f"""❌ {settings.BUSINESS_NAME} - Appointment Cancelled

        Hello {client_name},
        
        Your appointment has been cancelled:
        
        📅 Was scheduled for: {MessageTemplates.format_datetime(start_time)}
        """

        if cancellation_reason:
            message += f"\nReason: {cancellation_reason}"

        message += f"""
        
        We hope to see you again soon! To book a new appointment, please contact us.
        
        {settings.BUSINESS_PHONE or ''}
        {settings.SUPPORT_EMAIL or ''}
        """
        return message.strip()

    @staticmethod
    def reschedule(booking_data: Dict[str, Any]) -> str:
        """Appointment reschedule message"""
        client_name = booking_data.get("client_name", "Valued Client")
        old_time = booking_data.get("old_start_time", datetime.now())
        new_time = booking_data.get("start_time", datetime.now())
        treatment_name = booking_data.get("treatment_name", "your treatment")

        message = f"""🔄 {settings.BUSINESS_NAME} - Appointment Rescheduled

        Hello {client_name}!
        
        Your appointment has been rescheduled:
        
        ❌ Previous time: {MessageTemplates.format_datetime(old_time)}
        ✅ New time: {MessageTemplates.format_datetime(new_time)}
        💆 Treatment: {treatment_name}
        
        We look forward to seeing you at your new appointment time!
        
        Questions? Contact us:
        {settings.BUSINESS_PHONE or ''}
        """
        return message.strip()

    @staticmethod
    def aftercare(booking_data: Dict[str, Any]) -> str:
        """Post-appointment aftercare message"""
        client_name = booking_data.get("client_name", "Valued Client")
        treatment_name = booking_data.get("treatment_name", "treatment")
        aftercare_instructions = booking_data.get("aftercare_instructions", "")

        message = f"""💖 {settings.BUSINESS_NAME} - Aftercare Tips

        Hello {client_name}!
        
        Thank you for visiting us! We hope you enjoyed your {treatment_name}.
        """

        if aftercare_instructions:
            message += f"Aftercare instructions:\n{aftercare_instructions}\n\n"
        else:
            message += """General aftercare tips:
            • Keep the treated area clean
            • Avoid direct sunlight for 24-48 hours
            • Stay hydrated
            • Avoid heavy exercise for 24 hours
            """

        message += f"""If you have any concerns or questions, please don't hesitate to contact us.

        We'd love to see you again! Book your next appointment:
        {settings.BUSINESS_PHONE or ''}
        
        Rate your experience: [feedback_link]
        """
        return message.strip()

    @staticmethod
    def marketing(client_name: str, offer_details: str) -> str:
        """Marketing/promotional message"""
        message = f"""✨ {settings.BUSINESS_NAME} - Special Offer! ✨

        Hello {client_name}!
        
        {offer_details}
        
        Book now to take advantage of this limited-time offer!
        
        {settings.BUSINESS_PHONE or ''}
        {settings.SUPPORT_EMAIL or ''}
        
        Reply STOP to unsubscribe from promotional messages.
        """
        return message.strip()
