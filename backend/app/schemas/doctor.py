from datetime import datetime, time
from decimal import Decimal
from typing import List, Optional
from pydantic import BaseModel, Field


# --- Availability Schemas ---
class DoctorAvailabilityBase(BaseModel):
    day_of_week: int = Field(..., ge=0, le=6, description="0=Monday, 6=Sunday")
    start_time: time
    end_time: time
    slot_duration: int = Field(60, ge=10, le=120)
    is_active: bool = True


class DoctorAvailabilityCreate(DoctorAvailabilityBase):
    pass


class DoctorAvailabilityResponse(DoctorAvailabilityBase):
    id: int
    doctor_location_id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# --- Location Schemas ---
class DoctorLocationBase(BaseModel):
    clinic_name: str = Field(..., min_length=2)
    address: str
    locality: str
    city: str
    state: str
    pincode: str
    google_maps_url: Optional[str] = None
    room_number: Optional[str] = None
    is_active: bool = True


class DoctorLocationCreate(DoctorLocationBase):
    pass


class DoctorLocationUpdate(BaseModel):
    clinic_name: Optional[str] = None
    address: Optional[str] = None
    locality: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    pincode: Optional[str] = None
    google_maps_url: Optional[str] = None
    room_number: Optional[str] = None
    is_active: Optional[bool] = None


class DoctorLocationResponse(DoctorLocationBase):
    id: int
    doctor_id: int
    created_at: datetime
    updated_at: datetime
    availabilities: List[DoctorAvailabilityResponse] = []

    class Config:
        from_attributes = True


# --- Doctor Schemas ---
class DoctorBase(BaseModel):
    name: str = Field(..., min_length=2)
    profile_photo: Optional[str] = None
    gender: Optional[str] = None
    specialization: str
    qualification: str
    experience_years: int = Field(0, ge=0)
    about: Optional[str] = None
    consultation_fee: Decimal = Field(..., ge=0)
    follow_up_fee: Decimal = Field(..., ge=0)
    languages: str = "English, Hindi"
    is_verified: bool = True
    is_active: bool = True


class DoctorCreate(DoctorBase):
    pass


class DoctorUpdate(BaseModel):
    name: Optional[str] = None
    profile_photo: Optional[str] = None
    gender: Optional[str] = None
    specialization: Optional[str] = None
    qualification: Optional[str] = None
    experience_years: Optional[int] = None
    about: Optional[str] = None
    consultation_fee: Optional[Decimal] = None
    follow_up_fee: Optional[Decimal] = None
    languages: Optional[str] = None
    is_verified: Optional[bool] = None
    is_active: Optional[bool] = None


class DoctorCardResponse(DoctorBase):
    id: int
    consultations_count: int = 0
    consultations_display: str = "0+ Consultations"
    primary_location: Optional[DoctorLocationResponse] = None
    created_at: datetime

    class Config:
        from_attributes = True


class DoctorDetailResponse(DoctorBase):
    id: int
    consultations_count: int = 0
    consultations_display: str = "0+ Consultations"
    locations: List[DoctorLocationResponse] = []
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
