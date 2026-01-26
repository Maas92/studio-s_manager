"""
Temporal Worker Service
Executes workflows and activities
"""

import asyncio

import models
import structlog
from activities import NotificationActivities  # Changed
from config import get_settings
from services.message_templates import MessageTemplates
from services.whatsapp_provider import WhatsAppProvider
from temporalio.client import Client
from temporalio.worker import Worker
from workflow import (  # Changed
    AppointmentBookingWorkflow,
    CancellationWorkflow,
    MarketingCampaignWorkflow,
    RescheduleWorkflow,
)

logger = structlog.get_logger()


async def main():
    """Main worker function"""

    settings = get_settings()

    # Initialize services
    whatsapp_provider = WhatsAppProvider(
        api_key=settings.CHAKRA_API_KEY,
        api_url=settings.CHAKRA_API_URL,
    )

    message_templates = MessageTemplates(
        business_name=settings.BUSINESS_NAME,
        business_phone=settings.BUSINESS_PHONE,
        business_address=settings.BUSINESS_ADDRESS,
    )

    # Initialize activities
    activities_instance = NotificationActivities(
        whatsapp_provider=whatsapp_provider,
        message_templates=message_templates,
    )

    # Connect to Temporal server
    client = await Client.connect(
        settings.TEMPORAL_HOST,
        namespace=settings.TEMPORAL_NAMESPACE,
    )

    logger.info(
        "Connected to Temporal server",
        host=settings.TEMPORAL_HOST,
        namespace=settings.TEMPORAL_NAMESPACE,
    )

    # Create worker
    worker = Worker(
        client,
        task_queue=settings.TEMPORAL_TASK_QUEUE,  # Use from config
        workflows=[
            AppointmentBookingWorkflow,
            CancellationWorkflow,
            RescheduleWorkflow,
            MarketingCampaignWorkflow,
        ],
        activities=[
            activities_instance.send_confirmation_message,
            activities_instance.send_24h_reminder_message,
            activities_instance.send_1h_reminder_message,
            activities_instance.send_aftercare_message,
            activities_instance.send_cancellation_message,
            activities_instance.send_reschedule_message,
            activities_instance.get_appointment_end_time,
            activities_instance.get_eligible_marketing_clients,
            activities_instance.send_marketing_message,
        ],
        max_concurrent_activities=10,
        max_concurrent_workflow_tasks=50,
    )

    logger.info(
        "Starting Temporal worker",
        task_queue=settings.TEMPORAL_TASK_QUEUE,
        workflows=4,
        activities=9,
    )

    # Run worker until shutdown
    await worker.run()


if __name__ == "__main__":
    asyncio.run(main())
    asyncio.run(main())
