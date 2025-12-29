"""
Configuration management for WhatsApp Notification Service
"""

import os
from typing import Optional

from dotenv import load_dotenv
from pydantic_settings import BaseSettings

# Load environment variables from .env file
load_dotenv()


class Settings(BaseSettings):
    # Database Configuration
    DATABASE_URL: str = os.getenv("DATABASE_URL", "")
    DB_POOL_SIZE: int = int(os.getenv("DB_POOL_SIZE", "10"))
    DB_MAX_OVERFLOW: int = int(os.getenv("DB_MAX_OVERFLOW", "10"))

    # WhatsApp Provider Configuration
    WHATSAPP_PROVIDER: str = os.getenv("WHATSAPP_PROVIDER", "chakra")
    WHATSAPP_API_KEY: str = os.getenv("WHATSAPP_API_KEY", "")
    WHATSAPP_API_URL: Optional[str] = None
    WHATSAPP_PHONE_NUMBER: str = os.getenv("WHATSAPP_PHONE_NUMBER", "")

    # ChakraHQ Specific (if using)
    CHAKRA_API_KEY: str = os.getenv("CHAKRA_API_KEY", "")
    CHAKRA_BASE_URL: str = os.getenv("CHAKRA_BASE_URL", "https://api.chakrahq.com/v1")

    # Message Configuration
    BUSINESS_NAME: str = os.getenv("BUSINESS_NAME", "STUDIO S BEAUTY BAR")
    BUSINESS_ADDRESS: str = os.getenv("BUSINESS_ADDRESS", "")
    BUSINESS_PHONE: str = os.getenv("BUSINESS_PHONE", "")
    SUPPORT_EMAIL: str = os.getenv("SUPPORT_EMAIL", "")

    # Timing Configuration
    REMINDER_24H_ENABLED: bool = os.getenv("REMINDER_24H_ENABLED") == "True"
    REMINDER_1H_ENABLED: bool = os.getenv("REMINDER_1H_ENABLED") == "True"
    AFTERCARE_DELAY_HOURS: int = int(os.getenv("AFTERCARE_DELAY_HOURS", "24"))

    # Retry Configuration
    MAX_RETRIES: int = int(os.getenv("MAX_RETRIES", "3"))
    RETRY_DELAY_SECONDS: int = int(os.getenv("RETRY_DELAY_SECONDS", "5"))

    # Rate Limiting
    RATE_LIMIT_PER_MINUTE: int = int(os.getenv("RATE_LIMIT_PER_MINUTE", "100"))
    # Logging
    LOG_LEVEL: str = os.getenv("LOG_LEVEL", "INFO")

    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()
