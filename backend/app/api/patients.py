from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from backend.app.api.deps import get_current_user
from backend.app.core.database import get_db
from backend.app.models.appointment import Appointment
from backend.app.models.user import PatientProfile, User, UserRole
from backend.app.schemas.appointment import AppointmentResponse
from backend.app.schemas.patient import PatientDetailResponse, PatientProfileResponse, PatientProfileUpdate
from backend.app.services.slots import format_time_display

router = APIRouter()


@router.get("/profile", response_model=PatientDetailResponse)
def get_profile(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if current_user.role != UserRole.PATIENT:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only patients have patient profiles")

    profile = db.query(PatientProfile).filter(PatientProfile.user_id == current_user.id).first()
    if not profile:
        profile = PatientProfile(user_id=current_user.id)
        db.add(profile)
        db.commit()
        db.refresh(profile)

    return PatientDetailResponse(
        id=current_user.id,
        name=current_user.name,
        email=current_user.email,
        role=current_user.role.value,
        email_verified=current_user.email_verified,
        profile=PatientProfileResponse.model_validate(profile),
        created_at=current_user.created_at,
    )


@router.put("/profile", response_model=PatientDetailResponse)
def update_profile(
    profile_in: PatientProfileUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if current_user.role != UserRole.PATIENT:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only patients have patient profiles")

    if profile_in.name:
        current_user.name = profile_in.name

    profile = db.query(PatientProfile).filter(PatientProfile.user_id == current_user.id).first()
    if not profile:
        profile = PatientProfile(user_id=current_user.id)
        db.add(profile)

    if profile_in.date_of_birth is not None:
        profile.date_of_birth = profile_in.date_of_birth
    if profile_in.gender is not None:
        profile.gender = profile_in.gender
    if profile_in.mobile is not None:
        profile.mobile = profile_in.mobile
    if profile_in.address is not None:
        profile.address = profile_in.address
    if profile_in.blood_group is not None:
        profile.blood_group = profile_in.blood_group
    if profile_in.allergies is not None:
        profile.allergies = profile_in.allergies
    if profile_in.emergency_contact is not None:
        profile.emergency_contact = profile_in.emergency_contact

    db.commit()
    db.refresh(current_user)
    db.refresh(profile)

    return PatientDetailResponse(
        id=current_user.id,
        name=current_user.name,
        email=current_user.email,
        role=current_user.role.value,
        email_verified=current_user.email_verified,
        profile=PatientProfileResponse.model_validate(profile),
        created_at=current_user.created_at,
    )


@router.get("/appointments", response_model=List[AppointmentResponse])
def get_patient_appointments(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if current_user.role != UserRole.PATIENT:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only patients have appointments here")

    appointments = (
        db.query(Appointment)
        .filter(Appointment.patient_id == current_user.id)
        .order_by(Appointment.appointment_date.desc(), Appointment.appointment_time.desc())
        .all()
    )

    results = []
    for appt in appointments:
        results.append(
            AppointmentResponse(
                id=appt.id,
                patient_id=appt.patient_id,
                patient_name=current_user.name,
                patient_email=current_user.email,
                patient_mobile=current_user.profile.mobile if current_user.profile else None,
                patient_age_or_dob=current_user.profile.date_of_birth if current_user.profile else None,
                doctor_id=appt.doctor_id,
                doctor_name=appt.doctor.name,
                doctor_specialization=appt.doctor.specialization,
                doctor_location_id=appt.doctor_location_id,
                clinic_name=appt.location.clinic_name,
                clinic_address=appt.location.address,
                clinic_city=appt.location.city,
                google_maps_url=appt.location.google_maps_url,
                appointment_date=appt.appointment_date,
                appointment_time=appt.appointment_time,
                time_display=format_time_display(appt.appointment_time),
                consultation_fee=appt.consultation_fee,
                status=appt.status,
                notes=appt.notes,
                created_at=appt.created_at,
            )
        )
    return results
