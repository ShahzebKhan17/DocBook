from datetime import datetime, timezone
import enum
from sqlalchemy import Column, DateTime, Enum, ForeignKey, Integer, String, Text
from sqlalchemy.orm import relationship
from backend.app.core.database import Base


class NotificationType(str, enum.Enum):
    TELEGRAM = "TELEGRAM"
    EMAIL = "EMAIL"


class NotificationStatus(str, enum.Enum):
    SENT = "SENT"
    FAILED = "FAILED"


class Notification(Base):
    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True, index=True)
    appointment_id = Column(String(50), ForeignKey("appointments.id", ondelete="CASCADE"), nullable=False, index=True)
    type = Column(Enum(NotificationType, name="notificationtype"), default=NotificationType.TELEGRAM, nullable=False)
    status = Column(Enum(NotificationStatus, name="notificationstatus"), nullable=False)
    error_message = Column(Text, nullable=True)
    sent_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)

    appointment = relationship("Appointment", back_populates="notifications")
