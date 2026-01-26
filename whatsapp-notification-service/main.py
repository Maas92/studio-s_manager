"""
FastAPI Service for Temporal Workflow Management
Provides REST API to trigger and manage workflows
"""

import asyncio
from datetime import datetime
from typing import Any, Dict, List, Optional
from uuid import UUID

import structlog
from fastapi import BackgroundTasks, FastAPI, HTTPException
from pydantic import BaseModel, Field
from temporalio.client import Client, WorkflowHandle
from temporalio.common import RetryPolicy
from workflow import (
    AppointmentBookingWorkflow,
    BookingWorkflowInput,
    CancellationInput,
    CancellationWorkflow,
    MarketingCampaignWorkflow,
    RescheduleInput,
    RescheduleWorkflow,
)

logger = structlog.get_logger()

app = FastAPI(title="Temporal Notification Service", version="1.0.0")

# Global Temporal client
temporal_client: Optional[Client] = None


# Pydantic models for API requests


class StartBookingWorkflowRequest(BaseModel):
    booking_id: UUID
    client_id: UUID
    appointment_datetime: datetime
    client_phone: str
    client_name: str
    treatment_name: str = "Treatment"
    staff_name: str = "Staff"


class CancelWorkflowRequest(BaseModel):
    booking_id: UUID
    cancellation_reason: Optional[str] = None


class RescheduleWorkflowRequest(BaseModel):
    booking_id: UUID
    new_appointment_datetime: datetime
    client_phone: str
    client_name: str
    treatment_name: str
    staff_name: str


class MarketingCampaignRequest(BaseModel):
    campaign_id: int
    message_template: str


class WorkflowStatusResponse(BaseModel):
    workflow_id: str
    status: str
    result: Optional[Dict[str, Any]] = None


# Startup/Shutdown events


@app.on_event("startup")
async def startup() -> None:
    """Initialize Temporal client on startup"""
    global temporal_client

    # Connect to Temporal server
    temporal_client = await Client.connect("temporal:7233")
    logger.info("Connected to Temporal server")


@app.on_event("shutdown")
async def shutdown() -> None:
    """Close Temporal client on shutdown"""
    global temporal_client
    if temporal_client is not None:
        # Temporal client doesn't have a close method, just set to None
        temporal_client = None
    logger.info("Disconnected from Temporal server")


# Health check


@app.get("/health")
async def health_check() -> Dict[str, Any]:
    """Health check endpoint"""
    return {
        "status": "healthy",
        "temporal_connected": temporal_client is not None,
    }


# Workflow endpoints


@app.post("/workflows/booking/start", response_model=WorkflowStatusResponse)
async def start_booking_workflow(
    request: StartBookingWorkflowRequest,
) -> WorkflowStatusResponse:
    """
    Start a new appointment booking workflow.
    This will send confirmation immediately and schedule reminders/aftercare.
    """

    if not temporal_client:
        raise HTTPException(status_code=503, detail="Temporal client not connected")

    workflow_id = f"booking-{request.booking_id}-{int(datetime.utcnow().timestamp())}"

    try:
        # Prepare workflow input
        workflow_input = BookingWorkflowInput(
            booking_id=request.booking_id,
            client_id=request.client_id,
            appointment_datetime=request.appointment_datetime,
            client_phone=request.client_phone,
            client_name=request.client_name,
            treatment_name=request.treatment_name,
            staff_name=request.staff_name,
        )

        # Start workflow
        handle: WorkflowHandle = await temporal_client.start_workflow(
            AppointmentBookingWorkflow.run,
            workflow_input,
            id=workflow_id,
            task_queue="notifications-queue",
            # Workflow can run for weeks (appointment + 24h aftercare)
            execution_timeout=None,
        )

        logger.info(
            "Started booking workflow",
            workflow_id=workflow_id,
            booking_id=request.booking_id,
        )

        return WorkflowStatusResponse(
            workflow_id=workflow_id,
            status="started",
        )

    except Exception as e:
        logger.error(f"Failed to start booking workflow: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/workflows/booking/cancel")
async def cancel_booking_workflow(request: CancelWorkflowRequest) -> Dict[str, Any]:
    """
    Cancel an existing booking workflow and send cancellation notification.
    This will stop all pending reminders/aftercare.
    """

    if not temporal_client:
        raise HTTPException(status_code=503, detail="Temporal client not connected")

    try:
        # Find the booking workflow
        workflow_id = await _find_booking_workflow(request.booking_id)

        if not workflow_id:
            raise HTTPException(
                status_code=404,
                detail=f"No active workflow found for booking {request.booking_id}",
            )

        # Get workflow handle
        handle: WorkflowHandle = temporal_client.get_workflow_handle(workflow_id)

        # Send cancellation signal to stop the workflow
        await handle.signal(AppointmentBookingWorkflow.cancel)

        logger.info(
            "Sent cancellation signal to workflow",
            workflow_id=workflow_id,
            booking_id=request.booking_id,
        )

        # Start cancellation notification workflow
        cancellation_workflow_id = (
            f"cancellation-{request.booking_id}-{int(datetime.utcnow().timestamp())}"
        )

        # Get booking details from database for cancellation message
        # (In production, you'd fetch this from your database)
        cancellation_input = CancellationInput(
            booking_id=request.booking_id,
            client_phone="",  # Fetch from DB
            client_name="",  # Fetch from DB
            appointment_datetime=datetime.utcnow(),  # Fetch from DB
            cancellation_reason=request.cancellation_reason,
        )

        await temporal_client.start_workflow(
            CancellationWorkflow.run,
            cancellation_input,
            id=cancellation_workflow_id,
            task_queue="notifications-queue",
        )

        return {
            "status": "cancelled",
            "booking_workflow_id": workflow_id,
            "cancellation_workflow_id": cancellation_workflow_id,
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to cancel booking workflow: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/workflows/booking/reschedule")
async def reschedule_booking_workflow(
    request: RescheduleWorkflowRequest,
) -> Dict[str, Any]:
    """
    Reschedule a booking by cancelling old workflow and starting new one.
    """

    if not temporal_client:
        raise HTTPException(status_code=503, detail="Temporal client not connected")

    try:
        # Find and cancel old workflow
        old_workflow_id = await _find_booking_workflow(request.booking_id)

        if old_workflow_id:
            handle: WorkflowHandle = temporal_client.get_workflow_handle(
                old_workflow_id
            )
            await handle.signal(AppointmentBookingWorkflow.cancel)
            logger.info(f"Cancelled old workflow: {old_workflow_id}")

        # Send reschedule notification
        reschedule_workflow_id = (
            f"reschedule-{request.booking_id}-{int(datetime.utcnow().timestamp())}"
        )

        reschedule_input = RescheduleInput(
            booking_id=request.booking_id,
            old_workflow_id=old_workflow_id or "",
            new_appointment_datetime=request.new_appointment_datetime,
            client_phone=request.client_phone,
            client_name=request.client_name,
            treatment_name=request.treatment_name,
            staff_name=request.staff_name,
        )

        await temporal_client.start_workflow(
            RescheduleWorkflow.run,
            reschedule_input,
            id=reschedule_workflow_id,
            task_queue="notifications-queue",
        )

        # Start new booking workflow
        new_workflow_id = (
            f"booking-{request.booking_id}-{int(datetime.utcnow().timestamp())}"
        )

        new_booking_input = BookingWorkflowInput(
            booking_id=request.booking_id,
            client_id=0,  # Fetch from DB
            appointment_datetime=request.new_appointment_datetime,
            client_phone=request.client_phone,
            client_name=request.client_name,
            treatment_name=request.treatment_name,
            staff_name=request.staff_name,
        )

        await temporal_client.start_workflow(
            AppointmentBookingWorkflow.run,
            new_booking_input,
            id=new_workflow_id,
            task_queue="notifications-queue",
        )

        return {
            "status": "rescheduled",
            "old_workflow_id": old_workflow_id,
            "reschedule_workflow_id": reschedule_workflow_id,
            "new_workflow_id": new_workflow_id,
        }

    except Exception as e:
        logger.error(f"Failed to reschedule booking workflow: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/workflows/marketing/start")
async def start_marketing_campaign(request: MarketingCampaignRequest) -> Dict[str, str]:
    """
    Start a marketing campaign workflow.
    This will send messages to all eligible clients with rate limiting.
    """

    if not temporal_client:
        raise HTTPException(status_code=503, detail="Temporal client not connected")

    workflow_id = (
        f"marketing-campaign-{request.campaign_id}-{int(datetime.utcnow().timestamp())}"
    )

    try:
        handle: WorkflowHandle = await temporal_client.start_workflow(
            MarketingCampaignWorkflow.run,
            args=[request.campaign_id, request.message_template],
            id=workflow_id,
            task_queue="notifications-queue",
        )

        logger.info(
            "Started marketing campaign workflow",
            workflow_id=workflow_id,
            campaign_id=request.campaign_id,
        )

        return {
            "workflow_id": workflow_id,
            "status": "started",
        }

    except Exception as e:
        logger.error(f"Failed to start marketing campaign: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/workflows/{workflow_id}/status")
async def get_workflow_status(workflow_id: str) -> Dict[str, Any]:
    """Get the current status of a workflow"""

    if not temporal_client:
        raise HTTPException(status_code=503, detail="Temporal client not connected")

    try:
        handle: WorkflowHandle = temporal_client.get_workflow_handle(workflow_id)

        # Try to get workflow description
        desc = await handle.describe()

        result: Optional[Any] = None
        if desc.status.name in ["COMPLETED", "FAILED", "CANCELLED"]:
            try:
                result = await handle.result()
            except Exception:
                pass

        return {
            "workflow_id": workflow_id,
            "status": desc.status.name,
            "start_time": desc.start_time.isoformat() if desc.start_time else None,
            "close_time": desc.close_time.isoformat() if desc.close_time else None,
            "result": result,
        }

    except Exception as e:
        logger.error(f"Failed to get workflow status: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/workflows/booking/{booking_id}")
async def get_booking_workflow(booking_id: int) -> Dict[str, Any]:
    """Find active workflow for a booking"""

    if not temporal_client:
        raise HTTPException(status_code=503, detail="Temporal client not connected")

    try:
        workflow_id = await _find_booking_workflow(booking_id)

        if not workflow_id:
            raise HTTPException(
                status_code=404,
                detail=f"No active workflow found for booking {booking_id}",
            )

        # Get workflow status
        handle: WorkflowHandle = temporal_client.get_workflow_handle(workflow_id)
        desc = await handle.describe()

        # Query workflow state
        status = await handle.query(AppointmentBookingWorkflow.get_status)

        return {
            "workflow_id": workflow_id,
            "booking_id": booking_id,
            "status": desc.status.name,
            "workflow_state": status,
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get booking workflow: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# Helper functions


async def _find_booking_workflow(booking_id: int) -> Optional[str]:
    """
    Find active workflow ID for a booking.
    Uses Temporal's list API to search for workflows.
    """

    if not temporal_client:
        return None

    try:
        # Search for workflows with booking ID in the workflow ID
        # In production, you might want to store workflow IDs in your database
        async for workflow in temporal_client.list_workflows(
            query=f'WorkflowId STARTS_WITH "booking-{booking_id}-"'
        ):
            if workflow.status.name == "RUNNING":
                return workflow.id

        return None

    except Exception as e:
        logger.error(f"Failed to find booking workflow: {e}")
        return None


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)
