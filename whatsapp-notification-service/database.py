"""
Database connection and SQLAlchemy models
"""

from contextlib import asynccontextmanager
from datetime import datetime, time
from typing import Optional

from config import get_settings
from sqlalchemy import (
    UUID,
    Boolean,
    DateTime,
    ForeignKey,
    Integer,
    MetaData,
    Numeric,
    String,
    Text,
)
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column


# Base class for models
class Base(DeclarativeBase):
    metadata = MetaData()


# Database engine (singleton)
settings = get_settings()
engine = create_async_engine(
    settings.DATABASE_URL,
    echo=False,
    pool_pre_ping=True,
    pool_size=10,
    max_overflow=20,
)

async_session_maker = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


@asynccontextmanager
async def get_db_session():
    """Get database session context manager"""
    async with async_session_maker() as session:
        try:
            yield session
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()


# Models (matching your existing schema)


class Client(Base):
    __tablename__ = "clients"
    __table_args__ = {"schema": "public", "extend_existing": True}

    id: Mapped[UUID] = mapped_column(UUID, primary_key=True)
    first_name: Mapped[str] = mapped_column(String(100))
    last_name: Mapped[str] = mapped_column(String(100))
    email: Mapped[Optional[str]] = mapped_column(String(255))
    phone: Mapped[Optional[str]] = mapped_column(String(20))
    whatsapp: Mapped[Optional[str]] = mapped_column(String(20))
    date_of_birth: Mapped[Optional[datetime]]
    gender: Mapped[Optional[str]] = mapped_column(String(20))
    address: Mapped[Optional[str]] = mapped_column(Text)
    city: Mapped[Optional[str]] = mapped_column(String(100))
    postal_code: Mapped[Optional[str]] = mapped_column(String(20))
    emergency_contact_name: Mapped[Optional[str]] = mapped_column(String(200))
    emergency_contact_phone: Mapped[Optional[str]] = mapped_column(String(20))
    allergies: Mapped[Optional[str]] = mapped_column(Text)
    skin_type: Mapped[Optional[str]] = mapped_column(String(50))
    medical_conditions: Mapped[Optional[str]] = mapped_column(Text)
    notes: Mapped[Optional[str]] = mapped_column(Text)
    marketing_consent: Mapped[bool] = mapped_column(Boolean, default=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow
    )
    last_visit_date: Mapped[Optional[datetime]]
    source: Mapped[Optional[str]] = mapped_column(String(100))
    referral_source: Mapped[Optional[str]] = mapped_column(String(200))
    customer_segment: Mapped[Optional[str]] = mapped_column(String(50))
    total_lifetime_value: Mapped[Optional[float]] = mapped_column(Numeric(10, 2))
    total_visits: Mapped[int] = mapped_column(Integer, default=0)
    average_spend: Mapped[Optional[float]] = mapped_column(Numeric(10, 2))
    last_communication_date: Mapped[Optional[datetime]]
    status: Mapped[str] = mapped_column(String(20), default="active")
    blocked_reason: Mapped[Optional[str]] = mapped_column(Text)
    blocked_at: Mapped[Optional[datetime]]
    blocked_by: Mapped[Optional[int]] = mapped_column(Integer)
    loyalty_points: Mapped[int] = mapped_column(Integer, default=0)
    whatsapp_verified: Mapped[bool] = mapped_column(Boolean, default=False)


class Booking(Base):
    __tablename__ = "bookings"
    __table_args__ = {"schema": "public", "extend_existing": True}

    id: Mapped[UUID] = mapped_column(UUID, primary_key=True)
    client_id: Mapped[UUID] = mapped_column(UUID, ForeignKey("public.clients.id"))
    treatment_id: Mapped[UUID] = mapped_column(UUID)
    staff_id: Mapped[UUID] = mapped_column(UUID)
    booking_date: Mapped[datetime]
    start_time: Mapped[time]
    end_time: Mapped[time]
    status: Mapped[str] = mapped_column(String(20), default="pending")
    treatment_location_id: Mapped[Optional[int]] = mapped_column(Integer)
    total_price: Mapped[float] = mapped_column(Numeric(10, 2))
    deposit_paid: Mapped[bool] = mapped_column(Boolean, default=False)
    loyalty_points_earned: Mapped[int] = mapped_column(Integer, default=0)
    notes: Mapped[Optional[str]] = mapped_column(Text)
    internal_notes: Mapped[Optional[str]] = mapped_column(Text)
    cancellation_reason: Mapped[Optional[str]] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow
    )
    confirmed_at: Mapped[Optional[datetime]]
    completed_at: Mapped[Optional[datetime]]
    cancelled_at: Mapped[Optional[datetime]]
    deposit_required: Mapped[bool] = mapped_column(Boolean, default=False)
    deposit_amount: Mapped[Optional[float]] = mapped_column(Numeric(10, 2))
    payment_status: Mapped[str] = mapped_column(String(20), default="pending")
    amount_paid: Mapped[float] = mapped_column(Numeric(10, 2), default=0)
    cancellation_policy_id: Mapped[Optional[int]] = mapped_column(Integer)
    recurring_appointment_id: Mapped[Optional[int]] = mapped_column(Integer)
    confirmation_sent_at: Mapped[Optional[datetime]]
    reminder_sent_at: Mapped[Optional[datetime]]
    no_show: Mapped[bool] = mapped_column(Boolean, default=False)
    checked_in_at: Mapped[Optional[datetime]]
    checked_out_at: Mapped[Optional[datetime]]
    duration_minutes: Mapped[int] = mapped_column(Integer, default=60)


class NotificationLog(Base):
    __tablename__ = "notification_logs"
    __table_args__ = {"schema": "public", "extend_existing": True}

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    booking_id: Mapped[Optional[UUID]] = mapped_column(
        UUID, ForeignKey("public.bookings.id")
    )
    client_id: Mapped[UUID] = mapped_column(UUID, ForeignKey("public.clients.id"))
    phone_number: Mapped[str] = mapped_column(String(20))
    message_type: Mapped[str] = mapped_column(String(50))
    message_content: Mapped[str] = mapped_column(Text)
    sent_at: Mapped[Optional[datetime]]
    status: Mapped[str] = mapped_column(String(20))
    provider_message_id: Mapped[Optional[str]] = mapped_column(String(200))
    error_message: Mapped[Optional[str]] = mapped_column(Text)
    retry_count: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow
    )


# Workflow tracking table (new - optional but recommended)
class WorkflowTracking(Base):
    __tablename__ = "workflow_tracking"
    __table_args__ = {"schema": "public", "extend_existing": True}

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    booking_id: Mapped[UUID] = mapped_column(
        UUID, ForeignKey("public.bookings.id"), unique=True
    )
    workflow_id: Mapped[str] = mapped_column(String(200), unique=True)
    workflow_type: Mapped[str] = mapped_column(String(50))
    status: Mapped[str] = mapped_column(String(20))
    started_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    completed_at: Mapped[Optional[datetime]]
    cancelled_at: Mapped[Optional[datetime]]
    error_message: Mapped[Optional[str]] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow
    )
    started_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    completed_at: Mapped[Optional[datetime]]
    cancelled_at: Mapped[Optional[datetime]]
    error_message: Mapped[Optional[str]] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow
    )
