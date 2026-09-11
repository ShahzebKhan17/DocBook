from datetime import date, datetime, time
from decimal import Decimal
from typing import List, Optional
from pydantic import BaseModel, Field
from backend.app.models.appointment import AppointmentStatus


class TimeSlot(BaseModel):
    time_str: str  # e.g., "10:00 AM - 11:00 AM"
    time_raw: str  # e.g., "10:00:00"
    is_available: bool
    is_full: bool = False
    message: Optional[str] = None


class AvailableSlotsResponse(BaseModel):
    doctor_id: int
    doctor_location_id: int
    date: date
    day_name: str
    is_working_day: bool
    slots: List[TimeSlot] = []


class AppointmentCreate(BaseModel):
    doctor_id: int
    doctor_location_id: int
    appointment_date: date
    appointment_time: str  # accepts "10:00:00" or "10:00" or "10:00 AM"
    notes: Optional[str] = None


class AppointmentStatusUpdate(BaseModel):
    status: AppointmentStatus


class AppointmentResponse(BaseModel):
    id: str
    patient_id: int
    patient_name: str
    patient_email: str
    patient_mobile: Optional[str] = None
    patient_age_or_dob: Optional[str] = None
    doctor_id: int
    doctor_name: str
    doctor_specialization: str
    doctor_location_id: int
    clinic_name: str
    clinic_address: str
    clinic_city: str
    google_maps_url: Optional[str] = None
    appointment_date: date
    appointment_time: time
    time_display: str
    consultation_fee: Decimal
    status: AppointmentStatus
    notes: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True
