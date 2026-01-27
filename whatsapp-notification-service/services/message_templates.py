"""
WhatsApp message templates for ChakraHQ
Returns both message text and template parameters
"""

from datetime import datetime
from typing import Dict, Optional, Tuple


class MessageTemplates:
    """Message template generator for ChakraHQ templates"""

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
    ) -> Tuple[str, Dict[str, str], str]:
        """
        Generate booking confirmation message

        Returns:
            (message_text, template_parameters, template_name)
        """

        message = f"""{client_name}! ✨

Your appointment has been confirmed!

📅 Date: {appointment_date}
🕐 Time: {appointment_time}
💆 Treatment: {treatment_name}
👤 With: {staff_name}
📍 Location: {location}

We look forward to seeing you!"""

        # ChakraHQ template parameters
        parameters = {
            "customer_name": client_name,
            "appointment_date": appointment_date,
            "appointment_time": appointment_time,
            "treatment_name": treatment_name,
            "staff_name": staff_name,
            "location": location,
            "business_phone": self.business_phone,
            "business_name": self.business_name,
        }

        return message, parameters, "confirmation"

    def reminder_24h_message(
        self,
        client_name: str,
        appointment_date: str,
        appointment_time: str,
        treatment_name: str,
        staff_name: str,
    ) -> Tuple[str, Dict[str, str], str]:
        """Generate 24-hour reminder message"""

        message = f"""{client_name}! 👋

Just a friendly reminder about your appointment tomorrow:

📅 {appointment_date} at {appointment_time}
💆 {treatment_name} with {staff_name}

See you soon! ✨"""

        parameters = {
            "customer_name": client_name,
            "appointment_date": appointment_date,
            "appointment_time": appointment_time,
            "treatment_name": treatment_name,
            "staff_name": staff_name,
            "business_phone": self.business_phone,
        }

        return message, parameters, "reminder"

    def reminder_1h_message(
        self,
        client_name: str,
        appointment_time: str,
        treatment_name: str,
    ) -> Tuple[str, Dict[str, str], str]:
        """Generate 1-hour reminder message"""

        message = f"""{client_name}!

Quick reminder: Your {treatment_name} appointment is at {appointment_time} (in about 1 hour).

See you soon! ✨

- {self.business_name}"""

        parameters = {
            "customer_name": client_name,
            "appointment_time": appointment_time,
            "treatment_name": treatment_name,
        }

        return message, parameters, "reminder"

    def aftercare_message(
        self,
        client_name: str,
        treatment_name: str,
    ) -> Tuple[str, Dict[str, str], str]:
        """Generate aftercare message"""

        message = f"""Hi {client_name}! 💕

Thank you for choosing {self.business_name}!

We hope you loved your {treatment_name}. Here are some aftercare tips:

• Avoid touching the treated area for 24 hours
• Stay hydrated
• Use gentle, fragrance-free products
• Contact us if you have any concerns

We'd love to hear your feedback! Book your next appointment."""

        parameters = {
            "customer_name": client_name,
            "treatment_name": treatment_name,
            "business_name": self.business_name,
            "business_phone": self.business_phone,
        }

        return message, parameters, "aftercare"

    def cancellation_message(
        self,
        client_name: str,
        appointment_date: str,
        appointment_time: str,
        cancellation_reason: Optional[str] = None,
    ) -> Tuple[str, Dict[str, str], str]:
        """Generate cancellation message"""

        reason_text = f"\nReason: {cancellation_reason}" if cancellation_reason else ""

        message = f"""{client_name},

Your appointment on {appointment_date} at {appointment_time} has been cancelled.{reason_text}

We hope to see you again soon! To book a new appointment, contact us"""

        parameters = {
            "customer_name": client_name,
            "appointment_date": appointment_date,
            "appointment_time": appointment_time,
            "cancellation_reason": cancellation_reason or "No reason provided",
            "business_phone": self.business_phone,
        }

        return message, parameters, "cancellation"

    def reschedule_message(
        self,
        client_name: str,
        new_appointment_date: str,
        new_appointment_time: str,
        treatment_name: str,
    ) -> Tuple[str, Dict[str, str], str]:
        """Generate reschedule message"""

        message = f"""{client_name}! 📅

Your appointment has been rescheduled:

New Date: {new_appointment_date}
New Time: {new_appointment_time}
Treatment: {treatment_name}

See you then!"""

        parameters = {
            "customer_name": client_name,
            "new_appointment_date": new_appointment_date,
            "new_appointment_time": new_appointment_time,
            "treatment_name": treatment_name,
        }

        return message, parameters, "reschedule"

    def marketing_message(
        self,
        client_name: str,
        custom_message: str,
    ) -> Tuple[str, Dict[str, str], str]:
        """Generate marketing message"""

        message = f"""Hi {client_name}! 🎉

{custom_message}

Book now: {self.business_phone}

Reply STOP to unsubscribe.

- {self.business_name}"""

        parameters = {
            "customer_name": client_name,
            "custom_message": custom_message,
            "business_phone": self.business_phone,
        }

        return message, parameters, "marketing"
