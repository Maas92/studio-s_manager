"""
Configuration management using Pydantic settings
"""

from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings"""

    # Temporal Configuration
    TEMPORAL_HOST: str = "temporal:7233"
    TEMPORAL_NAMESPACE: str = "default"
    TEMPORAL_TASK_QUEUE: str = "notifications-queue"

    # Database Configuration
    DATABASE_URL: str

    # WhatsApp Provider (ChakraHQ)
    CHAKRA_API_KEY: str
    CHAKRA_API_URL: str = "https://api.chakrahq.com/v1"

    # Business Information
    BUSINESS_NAME: str = "STUDIO S BEAUTY BAR"
    BUSINESS_PHONE: str
    BUSINESS_ADDRESS: str

    # Notification Settings
    MAX_RETRY_ATTEMPTS: int = 5
    RETRY_INITIAL_INTERVAL_SECONDS: int = 1
    RETRY_MAX_INTERVAL_MINUTES: int = 15
    RETRY_BACKOFF_COEFFICIENT: float = 2.0

    # Rate Limiting
    WHATSAPP_RATE_LIMIT_PER_MINUTE: int = 60

    # Timing Configuration
    REMINDER_24H_HOURS_BEFORE: int = 24
    REMINDER_1H_HOURS_BEFORE: int = 1
    AFTERCARE_HOURS_AFTER: int = 3

    # Marketing Campaign Settings
    MARKETING_INACTIVE_DAYS: int = 60

    # Logging
    LOG_LEVEL: str = "INFO"

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
    )


@lru_cache
def get_settings() -> Settings:
    """Get cached settings instance"""
    return Settings()
