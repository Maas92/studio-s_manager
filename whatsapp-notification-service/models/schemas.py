from datetime import datetime
from typing import Dict, Optional

from pydantic import BaseModel, Field


class SendMessageRequest(BaseModel):
    """Request schema for manual message sending"""

    phone_number: str = Field(..., description="Phone number in E.164 format")
    message: str = Field(..., description="Message content")
    message_type: str = Field(default="manual", description="Type of message")


class SendMessageResponse(BaseModel):
    """Response schema for message sending"""

    success: bool
    message: str
    message_id: Optional[str] = None


class NotificationStats(BaseModel):
    """Notification statistics response"""

    total_sent: int
    total_failed: int
    by_type: Dict[str, Dict[str, int]]
    period_days: int


class JobStatus(BaseModel):
    """Job status information"""

    job_id: str
    name: str
    next_run_time: Optional[datetime]
    is_running: bool
