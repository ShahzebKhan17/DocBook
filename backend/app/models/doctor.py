from datetime import datetime, time, timezone
from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, Numeric, String, Text, Time
from sqlalchemy.orm import relationship
from backend.app.core.database import Base


class Doctor(Base):
    __tablename__ = "doctors"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False, index=True)
    profile_photo = Column(String(500), nullable=True)
    gender = Column(String(50), nullable=True)
    specialization = Column(String(255), nullable=False, index=True)
    qualification = Column(String(255), nullable=False)
    experience_years = Column(Integer, default=0, nullable=False)
    about = Column(Text, nullable=True)
    consultation_fee = Column(Numeric(10, 2), default=500.00, nullable=False)
    follow_up_fee = Column(Numeric(10, 2), default=300.00, nullable=False)
    languages = Column(String(255), default="English, Hindi", nullable=False)
    is_verified = Column(Boolean, default=True, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)

    locations = relationship("DoctorLocation", back_populates="doctor", cascade="all, delete-orphan")
    appointments = relationship("Appointment", back_populates="doctor", cascade="all, delete-orphan")


class DoctorLocation(Base):
    __tablename__ = "doctor_locations"

    id = Column(Integer, primary_key=True, index=True)
    doctor_id = Column(Integer, ForeignKey("doctors.id", ondelete="CASCADE"), nullable=False, index=True)
    clinic_name = Column(String(255), nullable=False)
    address = Column(Text, nullable=False)
    locality = Column(String(255), nullable=False)
    city = Column(String(100), nullable=False, index=True)
    state = Column(String(100), nullable=False)
    pincode = Column(String(20), nullable=False)
    google_maps_url = Column(String(500), nullable=True)
    room_number = Column(String(50), nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)

    doctor = relationship("Doctor", back_populates="locations")
    availabilities = relationship("DoctorAvailability", back_populates="location", cascade="all, delete-orphan")
    appointments = relationship("Appointment", back_populates="location")


class DoctorAvailability(Base):
    __tablename__ = "doctor_availability"

    id = Column(Integer, primary_key=True, index=True)
    doctor_location_id = Column(Integer, ForeignKey("doctor_locations.id", ondelete="CASCADE"), nullable=False, index=True)
    # day_of_week: 0=Monday, 1=Tuesday, 2=Wednesday, 3=Thursday, 4=Friday, 5=Saturday, 6=Sunday
    day_of_week = Column(Integer, nullable=False)
    start_time = Column(Time, nullable=False)
    end_time = Column(Time, nullable=False)
    slot_duration = Column(Integer, default=30, nullable=False)  # in minutes
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)

    location = relationship("DoctorLocation", back_populates="availabilities")
