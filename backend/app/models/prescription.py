from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Boolean
from sqlalchemy.orm import relationship
from backend.app.core.database import Base


class Prescription(Base):
    __tablename__ = "prescriptions"

    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    appointment_id = Column(String(50), ForeignKey("appointments.id", ondelete="SET NULL"), nullable=True, index=True)
    filename = Column(String(255), nullable=False)
    file_path = Column(String(500), nullable=False)
    file_type = Column(String(50), nullable=False)  # 'image' or 'pdf'
    delivery_address = Column(Text, nullable=False)
    contact_mobile = Column(String(50), nullable=False)
    notes = Column(Text, nullable=True)
    status = Column(String(50), default="PENDING", nullable=False)  # PENDING, PROCESSING, DELIVERED, CANCELLED
    telegram_sent = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)

    patient = relationship("User", backref="prescriptions")
    appointment = relationship("Appointment", backref="prescriptions")
