"""
Database models and connection management
"""

from datetime import datetime
from typing import Generator, Optional

from config import settings
from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    ForeignKey,
    Integer,
    Numeric,
    String,
    Text,
    create_engine,
)
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import Session, relationship, sessionmaker

Base = declarative_base()

# Create engine
engine = create_engine(
    settings.DATABASE_URL,
    pool_size=int(settings.DB_POOL_SIZE or 5),
    max_overflow=int(settings.DB_MAX_OVERFLOW or 10),
    pool_pre_ping=True,  # Verify connections before using
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class Booking(Base):
    """Booking table model (read-only for this service)"""

    __tablename__ = "bookings"

    # We use '# type: ignore' here because Pylance sees a Column object,
    # but at runtime SQLAlchemy converts these to the actual types (int, str, etc.)
    id: int = Column(Integer, primary_key=True)  # type: ignore
    client_id: int = Column(Integer, ForeignKey("clients.id"))  # type: ignore
    treatment_id: int = Column(Integer)  # type: ignore
    staff_id: int = Column(Integer)  # type: ignore
    booking_date: datetime = Column(DateTime)  # type: ignore
    start_time: datetime = Column(DateTime)  # type: ignore
    end_time: datetime = Column(DateTime)  # type: ignore
    status: str = Column(String)  # type: ignore
    treatment_location_id: int = Column(Integer)  # type: ignore
    total_price: float = Column(Numeric)  # type: ignore
    deposit_paid: bool = Column(Boolean)  # type: ignore
    loyalty_points_earned: int = Column(Integer)  # type: ignore
    notes: Optional[str] = Column(Text)  # type: ignore
    internal_notes: Optional[str] = Column(Text)  # type: ignore
    cancellation_reason: Optional[str] = Column(Text)  # type: ignore
    created_at: datetime = Column(DateTime)  # type: ignore
    updated_at: datetime = Column(DateTime)  # type: ignore
    confirmed_at: Optional[datetime] = Column(DateTime)  # type: ignore
    completed_at: Optional[datetime] = Column(DateTime)  # type: ignore
    cancelled_at: Optional[datetime] = Column(DateTime)  # type: ignore
    deposit_required: bool = Column(Boolean)  # type: ignore
    deposit_amount: float = Column(Numeric)  # type: ignore
    payment_status: str = Column(String)  # type: ignore
    amount_paid: float = Column(Numeric)  # type: ignore
    cancellation_policy_id: int = Column(Integer)  # type: ignore
    recurring_appointment_id: int = Column(Integer)  # type: ignore

    # Specific fix for your original error:
    confirmation_sent_at: Optional[datetime] = Column(DateTime)  # type: ignore
    reminder_sent_at: Optional[datetime] = Column(DateTime)  # type: ignore

    no_show: bool = Column(Boolean)  # type: ignore
    checked_in_at: Optional[datetime] = Column(DateTime)  # type: ignore
    checked_out_at: Optional[datetime] = Column(DateTime)  # type: ignore
    duration_minutes: int = Column(Integer)  # type: ignore

    # Relationship
    client = relationship("Client", back_populates="bookings")


class Client(Base):
    """Client table model (read-only for this service)"""

    __tablename__ = "clients"

    id: int = Column(Integer, primary_key=True)  # type: ignore
    first_name: str = Column(String)  # type: ignore
    last_name: str = Column(String)  # type: ignore
    email: str = Column(String)  # type: ignore
    phone: str = Column(String, default="")  # type: ignore
    whatsapp: str = Column(String, default="")  # type: ignore
    date_of_birth: Optional[datetime] = Column(DateTime)  # type: ignore
    gender: str = Column(String)  # type: ignore
    address: str = Column(Text)  # type: ignore
    city: str = Column(String)  # type: ignore
    postal_code: str = Column(String)  # type: ignore
    emergency_contact_name: str = Column(String)  # type: ignore
    emergency_contact_phone: str = Column(String)  # type: ignore
    allergies: str = Column(Text)  # type: ignore
    skin_type: str = Column(String)  # type: ignore
    medical_conditions: str = Column(Text)  # type: ignore
    notes: str = Column(Text)  # type: ignore
    marketing_consent: bool = Column(Boolean)  # type: ignore
    is_active: bool = Column(Boolean)  # type: ignore
    created_at: datetime = Column(DateTime)  # type: ignore
    updated_at: datetime = Column(DateTime)  # type: ignore
    last_visit_date: Optional[datetime] = Column(DateTime)  # type: ignore
    source: str = Column(String)  # type: ignore
    referral_source: str = Column(String)  # type: ignore
    customer_segment: str = Column(String)  # type: ignore
    total_lifetime_value: float = Column(Numeric)  # type: ignore
    total_visits: int = Column(Integer)  # type: ignore
    average_spend: float = Column(Numeric)  # type: ignore
    last_communication_date: Optional[datetime] = Column(DateTime)  # type: ignore
    status: str = Column(String)  # type: ignore
    blocked_reason: str = Column(Text)  # type: ignore
    blocked_at: Optional[datetime] = Column(DateTime)  # type: ignore
    blocked_by: int = Column(Integer)  # type: ignore
    loyalty_points: int = Column(Integer)  # type: ignore
    whatsapp_verified: bool = Column(Boolean)  # type: ignore

    # Relationship
    bookings = relationship("Booking", back_populates="client")


class NotificationLog(Base):
    """
    Track all sent notifications
    This table will be created by this service
    """

    __tablename__ = "notification_logs"

    id: int = Column(Integer, primary_key=True, autoincrement=True)  # type: ignore
    booking_id: Optional[int] = Column(Integer, ForeignKey("bookings.id"), nullable=True)  # type: ignore
    client_id: Optional[int] = Column(Integer, ForeignKey("clients.id"), nullable=True)  # type: ignore
    phone_number: str = Column(String, nullable=False)  # type: ignore
    message_type: str = Column(String, nullable=False)  # type: ignore
    message_content: str = Column(Text, nullable=False)  # type: ignore
    sent_at: datetime = Column(DateTime, default=datetime.utcnow)  # type: ignore
    status: str = Column(String, default="pending")  # type: ignore
    provider_message_id: Optional[str] = Column(String, nullable=True)  # type: ignore
    error_message: Optional[str] = Column(Text, nullable=True)  # type: ignore
    retry_count: int = Column(Integer, default=0)  # type: ignore
    created_at: datetime = Column(DateTime, default=datetime.utcnow)  # type: ignore
    updated_at: datetime = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)  # type: ignore


def init_db():
    """Initialize database - create notification_logs table if it doesn't exist"""
    Base.metadata.create_all(bind=engine, tables=[NotificationLog.__table__])


def get_db() -> Generator[Session, None, None]:
    """Dependency to get database session"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
