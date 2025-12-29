import logging
from contextlib import asynccontextmanager
from datetime import datetime, timedelta
from typing import Optional

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
from config import settings
from database import get_db, init_db
from fastapi import Depends, FastAPI, HTTPException
from models.schemas import NotificationStats, SendMessageRequest, SendMessageResponse
from services.notification_service import NotificationService
from services.whatsapp_provider import get_whatsapp_provider

# Configure logging
logging.basicConfig(
    level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)

# Initialize scheduler
scheduler = AsyncIOScheduler()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Manage application lifecycle - startup and shutdown"""
    # Startup
    logger.info("Starting WhatsApp Notification Service...")
    init_db()

    # Initialize notification service
    provider = get_whatsapp_provider()
    notification_service = NotificationService(provider)
    app.state.notification_service = notification_service

    # Schedule jobs
    scheduler.add_job(
        notification_service.send_confirmations,
        CronTrigger(minute="*/5"),  # Every 5 minutes
        id="send_confirmations",
        name="Send appointment confirmations",
    )

    scheduler.add_job(
        notification_service.send_24h_reminders,
        CronTrigger(hour="9", minute="0"),  # Daily at 9 AM
        id="send_24h_reminders",
        name="Send 24-hour reminders",
    )

    scheduler.add_job(
        notification_service.send_1h_reminders,
        CronTrigger(minute="0"),  # Every hour
        id="send_1h_reminders",
        name="Send 1-hour reminders",
    )

    scheduler.add_job(
        notification_service.send_aftercare_messages,
        CronTrigger(hour="10", minute="0"),  # Daily at 10 AM
        id="send_aftercare",
        name="Send aftercare messages",
    )

    scheduler.start()
    logger.info("Scheduler started with all jobs")

    yield

    # Shutdown
    logger.info("Shutting down WhatsApp Notification Service...")
    scheduler.shutdown()


app = FastAPI(
    title="WhatsApp Notification Service",
    description="Beauty Salon appointment notifications via WhatsApp",
    version="1.0.0",
    lifespan=lifespan,
)


@app.get("/")
async def root():
    """Health check endpoint"""
    return {
        "service": "WhatsApp Notification Service",
        "status": "healthy",
        "version": "1.0.0",
    }


@app.get("/health")
async def health():
    """Detailed health check"""
    return {
        "status": "healthy",
        "scheduler": scheduler.running,
        "jobs": [
            {
                "id": job.id,
                "name": job.name,
                "next_run": (
                    job.next_run_time.isoformat() if job.next_run_time else None
                ),
            }
            for job in scheduler.get_jobs()
        ],
    }


@app.post("/send-message", response_model=SendMessageResponse)
async def send_message(request: SendMessageRequest):
    """
    Manually send a WhatsApp message
    Useful for testing or manual notifications
    """
    try:
        notification_service = app.state.notification_service
        success = await notification_service.send_manual_message(
            phone_number=request.phone_number,
            message=request.message,
            message_type=request.message_type,
        )

        return SendMessageResponse(
            success=success,
            message=(
                "Message sent successfully" if success else "Failed to send message"
            ),
        )
    except Exception as e:
        logger.error(f"Error sending manual message: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/send-confirmation/{booking_id}")
async def send_confirmation(booking_id: int):
    """Manually trigger confirmation for a specific booking"""
    try:
        notification_service = app.state.notification_service
        success = await notification_service.send_confirmation_for_booking(booking_id)

        return {
            "success": success,
            "booking_id": booking_id,
            "message": (
                "Confirmation sent" if success else "Failed to send confirmation"
            ),
        }
    except Exception as e:
        logger.error(f"Error sending confirmation for booking {booking_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/send-cancellation/{booking_id}")
async def send_cancellation(booking_id: int):
    """Manually trigger cancellation notification for a specific booking"""
    try:
        notification_service = app.state.notification_service
        success = await notification_service.send_cancellation_for_booking(booking_id)

        return {
            "success": success,
            "booking_id": booking_id,
            "message": (
                "Cancellation sent" if success else "Failed to send cancellation"
            ),
        }
    except Exception as e:
        logger.error(f"Error sending cancellation for booking {booking_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/stats", response_model=NotificationStats)
async def get_stats(days: int = 7):
    """Get notification statistics for the last N days"""
    try:
        notification_service = app.state.notification_service
        stats = await notification_service.get_stats(days)
        return stats
    except Exception as e:
        logger.error(f"Error fetching stats: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/trigger-job/{job_id}")
async def trigger_job(job_id: str):
    """Manually trigger a scheduled job (for testing)"""
    job = scheduler.get_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail=f"Job {job_id} not found")

    try:
        job.modify(next_run_time=datetime.now())
        return {"success": True, "message": f"Job {job_id} triggered successfully"}
    except Exception as e:
        logger.error(f"Error triggering job {job_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)
