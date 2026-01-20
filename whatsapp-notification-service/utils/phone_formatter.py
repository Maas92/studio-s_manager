"""Phone number formatting utilities"""

import re


def format_phone_number(phone: str, country_code: str = "263") -> str:
    """
    Format phone number to E.164 format

    Args:
        phone: Phone number (any format)
        country_code: Default country code (default: 27 for South Africa)

    Returns:
        Phone number in E.164 format (+27821234567)

    Examples:
        format_phone_number("0821234567") -> "+27821234567"
        format_phone_number("27821234567") -> "+27821234567"
        format_phone_number("+27821234567") -> "+27821234567"
        format_phone_number("082 123 4567") -> "+27821234567"
    """
    if not phone:
        raise ValueError("Phone number is required")

    # Remove all non-numeric characters
    phone = re.sub(r"\D", "", phone)

    # Add country code if not present
    if not phone.startswith(country_code):
        if phone.startswith("0"):
            phone = country_code + phone[1:]
        else:
            phone = country_code + phone

    return "+" + phone
