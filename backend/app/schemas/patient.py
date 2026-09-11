from datetime import datetime
from typing import Optional
from pydantic import BaseModel


class PatientProfileBase(BaseModel):
    date_of_birth: Optional[str] = None
    gender: Optional[str] = None
    mobile: Optional[str] = None
    address: Optional[str] = None
    blood_group: Optional[str] = None
    allergies: Optional[str] = None
    emergency_contact: Optional[str] = None


class PatientProfileCreate(PatientProfileBase):
    pass


class PatientProfileUpdate(PatientProfileBase):
    name: Optional[str] = None


class PatientProfileResponse(PatientProfileBase):
    id: int
    user_id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class PatientDetailResponse(BaseModel):
    id: int
    name: str
    email: str
    role: str
    email_verified: bool
    profile: Optional[PatientProfileResponse] = None
    created_at: datetime

    class Config:
        from_attributes = True
