"""
WhatsApp message templates
"""

from datetime import datetime
from typing import Optional


class MessageTemplates:
    """Message template generator"""

    def __init__(
        self,
        business_name: str,
        business_phone: str,
        business_address: str,
    ):
        self.business_name = business_name
        self.business_phone = business_phone
        self.business_address = business_address

    def confirmation_message(
        self,
        client_name: str,
        appointment_date: str,
        appointment_time: str,
        treatment_name: str,
        staff_name: str,
        location: str,
    ) -> str:
        """Generate booking confirmation message"""
        return f"""Hi {client_name}! ✨

Your appointment has been confirmed!

📅 Date: {appointment_date}
🕐 Time: {appointment_time}
💆 Treatment: {treatment_name}
👤 With: {staff_name}
📍 Location: {location}

We look forward to seeing you!

If you need to reschedule, please contact us at {self.business_phone}.

- {self.business_name}"""

    def reminder_24h_message(
        self,
        client_name: str,
        appointment_date: str,
        appointment_time: str,
        treatment_name: str,
        staff_name: str,
    ) -> str:
        """Generate 24-hour reminder message"""
        return f"""Hi {client_name}! 👋

Just a friendly reminder about your appointment tomorrow:

📅 {appointment_date} at {appointment_time}
💆 {treatment_name} with {staff_name}

See you soon!

Need to reschedule? Call us at {self.business_phone}

- {self.business_name}"""

    def reminder_1h_message(
        self,
        client_name: str,
        appointment_time: str,
        treatment_name: str,
    ) -> str:
        """Generate 1-hour reminder message"""
        return f"""Hi {client_name}!

Quick reminder: Your {treatment_name} appointment is at {appointment_time} (in about 1 hour).

See you soon! ✨

- {self.business_name}"""

    def aftercare_message(
        self,
        client_name: str,
        treatment_name: str,
    ) -> str:
        """Generate aftercare message"""
        return f"""Hi {client_name}! 💕

Thank you for choosing {self.business_name}!

We hope you loved your {treatment_name}. Here are some aftercare tips:

- Avoid touching the treated area for 24 hours
- Stay hydrated
- Use gentle, fragrance-free products
- Contact us if you have any concerns

We'd love to hear your feedback! Book your next appointment at {self.business_phone}.

- {self.business_name}"""

    def cancellation_message(
        self,
        client_name: str,
        appointment_date: str,
        appointment_time: str,
        cancellation_reason: Optional[str] = None,
    ) -> str:
        """Generate cancellation message"""
        reason_text = f"\nReason: {cancellation_reason}" if cancellation_reason else ""

        return f"""Hi {client_name},

Your appointment on {appointment_date} at {appointment_time} has been cancelled.{reason_text}

We hope to see you again soon! To book a new appointment, contact us at {self.business_phone}.

- {self.business_name}"""

    def reschedule_message(
        self,
        client_name: str,
        new_appointment_date: str,
        new_appointment_time: str,
        treatment_name: str,
    ) -> str:
        """Generate reschedule message"""
        return f"""Hi {client_name}! 📅

Your appointment has been rescheduled:

New Date: {new_appointment_date}
New Time: {new_appointment_time}
Treatment: {treatment_name}

See you then!

- {self.business_name}"""

    def marketing_message(
        self,
        client_name: str,
        custom_message: str,
    ) -> str:
        """Generate marketing message"""
        return f"""Hi {client_name}! 🎉

{custom_message}

Book now: {self.business_phone}

Reply STOP to unsubscribe.

- {self.business_name}"""
