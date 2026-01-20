"""
Configuration management using Pydantic settings
"""

import os
from functools import lru_cache
from typing import Optional

from dotenv import load_dotenv
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings"""

    # Temporal Configuration
    TEMPORAL_HOST: str = os.getenv("TEMPORAL_HOST", "temporal:7233")
    TEMPORAL_NAMESPACE: str = os.getenv("TEMPORAL_NAMESPACE", "default")
    TEMPORAL_TASK_QUEUE: str = os.getenv("TEMPORAL_TASK_QUEUE", "notifications-queue")

    # Database Configuration
    DATABASE_URL: str = os.getenv("DATABASE_URL", "")

    # WhatsApp Provider (ChakraHQ)
    CHAKRA_API_KEY: str = os.getenv("CHAKRA_API_KEY", "")
    CHAKRA_API_URL: str = os.getenv("CHAKRA_API_URL", "https://api.chakrahq.com/v1")

    # Business Information
    BUSINESS_NAME: str = os.getenv("BUSINESS_NAME", "STUDIO S BEAUTY BAR")
    BUSINESS_PHONE: str = os.getenv("BUSINESS_PHONE", "")
    BUSINESS_ADDRESS: str = os.getenv("BUSINESS_ADDRESS", "")

    # Notification Settings
    MAX_RETRY_ATTEMPTS: int = 5
    RETRY_INITIAL_INTERVAL_SECONDS: int = 1
    RETRY_MAX_INTERVAL_MINUTES: int = 15
    RETRY_BACKOFF_COEFFICIENT: float = 2.0

    # Rate Limiting
    WHATSAPP_RATE_LIMIT_PER_MINUTE: int = 60

    # Timing Configuration
    REMINDER_24H_HOURS_BEFORE: int = int(os.getenv("REMINDER_24H_HOURS_BEFORE", "24"))
    REMINDER_1H_HOURS_BEFORE: int = int(os.getenv("REMINDER_1H_HOURS_BEFORE", "1"))
    AFTERCARE_HOURS_AFTER: int = int(os.getenv("AFTERCARE_HOURS_AFTER", "3"))

    # Marketing Campaign Settings
    MARKETING_INACTIVE_DAYS: int = 60

    # Logging
    LOG_LEVEL: str = os.getenv("LOG_LEVEL", "INFO")

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
    )


@lru_cache
def get_settings() -> Settings:
    """Get cached settings instance"""
    return Settings()
