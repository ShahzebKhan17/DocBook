from datetime import date, datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func
from sqlalchemy.orm import Session
from backend.app.api.deps import get_current_admin
from backend.app.core.database import get_db
from backend.app.models.appointment import Appointment, AppointmentStatus
from backend.app.models.doctor import Doctor, DoctorAvailability, DoctorLocation
from backend.app.models.user import User, UserRole
from backend.app.schemas.admin import AdminStatsResponse
from backend.app.schemas.appointment import AppointmentResponse, AppointmentStatusUpdate
from backend.app.schemas.doctor import (
    DoctorAvailabilityCreate,
    DoctorAvailabilityResponse,
    DoctorCreate,
    DoctorDetailResponse,
    DoctorLocationCreate,
    DoctorLocationResponse,
    DoctorLocationUpdate,
    DoctorUpdate,
)
from backend.app.schemas.patient import PatientDetailResponse, PatientProfileResponse
from backend.app.services.slots import format_time_display

router = APIRouter(dependencies=[Depends(get_current_admin)])


@router.get("/stats", response_model=AdminStatsResponse)
def get_admin_stats(db: Session = Depends(get_db)):
    today = date.today()
    total_patients = db.query(func.count(User.id)).filter(User.role == UserRole.PATIENT).scalar() or 0
    total_doctors = db.query(func.count(Doctor.id)).scalar() or 0
    today_appointments = db.query(func.count(Appointment.id)).filter(Appointment.appointment_date == today).scalar() or 0
    upcoming_appointments = (
        db.query(func.count(Appointment.id))
        .filter(
            Appointment.appointment_date >= today,
            Appointment.status.in_([AppointmentStatus.BOOKED, AppointmentStatus.CONFIRMED]),
        )
        .scalar()
        or 0
    )
    completed_appointments = (
        db.query(func.count(Appointment.id))
        .filter(Appointment.status == AppointmentStatus.COMPLETED)
        .scalar()
        or 0
    )
    cancelled_appointments = (
        db.query(func.count(Appointment.id))
        .filter(Appointment.status == AppointmentStatus.CANCELLED)
        .scalar()
        or 0
    )

    return AdminStatsResponse(
        total_patients=total_patients,
        total_doctors=total_doctors,
        today_appointments=today_appointments,
        upcoming_appointments=upcoming_appointments,
        completed_appointments=completed_appointments,
        cancelled_appointments=cancelled_appointments,
    )


# --- Doctor Management ---
@router.post("/doctors", response_model=DoctorDetailResponse)
def create_doctor(doctor_in: DoctorCreate, db: Session = Depends(get_db)):
    doc = Doctor(
        name=doctor_in.name,
        profile_photo=doctor_in.profile_photo,
        gender=doctor_in.gender,
        specialization=doctor_in.specialization,
        qualification=doctor_in.qualification,
        experience_years=doctor_in.experience_years,
        about=doctor_in.about,
        consultation_fee=doctor_in.consultation_fee,
        follow_up_fee=doctor_in.follow_up_fee,
        languages=doctor_in.languages,
        is_verified=doctor_in.is_verified,
        is_active=doctor_in.is_active,
    )
    db.add(doc)
    db.commit()
    db.refresh(doc)
    return DoctorDetailResponse.model_validate(doc)


@router.get("/doctors", response_model=List[DoctorDetailResponse])
def get_all_doctors(db: Session = Depends(get_db)):
    doctors = db.query(Doctor).order_by(Doctor.id.desc()).all()
    results = []
    for doc in doctors:
        count = (
            db.query(func.count(Appointment.id))
            .filter(Appointment.doctor_id == doc.id, Appointment.status == AppointmentStatus.COMPLETED)
            .scalar()
            or 0
        )
        results.append(
            DoctorDetailResponse(
                id=doc.id,
                name=doc.name,
                profile_photo=doc.profile_photo,
                gender=doc.gender,
                specialization=doc.specialization,
                qualification=doc.qualification,
                experience_years=doc.experience_years,
                about=doc.about,
                consultation_fee=doc.consultation_fee,
                follow_up_fee=doc.follow_up_fee,
                languages=doc.languages,
                is_verified=doc.is_verified,
                is_active=doc.is_active,
                consultations_count=count,
                consultations_display=f"{count}+ Consultations",
                locations=[DoctorLocationResponse.model_validate(loc) for loc in doc.locations],
                created_at=doc.created_at,
                updated_at=doc.updated_at,
            )
        )
    return results


@router.get("/doctors/{doctor_id}", response_model=DoctorDetailResponse)
def get_doctor(doctor_id: int, db: Session = Depends(get_db)):
    doc = db.query(Doctor).filter(Doctor.id == doctor_id).first()
    if not doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Doctor not found")
    count = (
        db.query(func.count(Appointment.id))
        .filter(Appointment.doctor_id == doc.id, Appointment.status == AppointmentStatus.COMPLETED)
        .scalar()
        or 0
    )
    return DoctorDetailResponse(
        id=doc.id,
        name=doc.name,
        profile_photo=doc.profile_photo,
        gender=doc.gender,
        specialization=doc.specialization,
        qualification=doc.qualification,
        experience_years=doc.experience_years,
        about=doc.about,
        consultation_fee=doc.consultation_fee,
        follow_up_fee=doc.follow_up_fee,
        languages=doc.languages,
        is_verified=doc.is_verified,
        is_active=doc.is_active,
        consultations_count=count,
        consultations_display=f"{count}+ Consultations",
        locations=[DoctorLocationResponse.model_validate(loc) for loc in doc.locations],
        created_at=doc.created_at,
        updated_at=doc.updated_at,
    )


@router.put("/doctors/{doctor_id}", response_model=DoctorDetailResponse)
def update_doctor(doctor_id: int, doctor_in: DoctorUpdate, db: Session = Depends(get_db)):
    doc = db.query(Doctor).filter(Doctor.id == doctor_id).first()
    if not doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Doctor not found")

    update_data = doctor_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(doc, field, value)

    db.commit()
    db.refresh(doc)
    return DoctorDetailResponse.model_validate(doc)


@router.delete("/doctors/{doctor_id}")
def delete_doctor(doctor_id: int, db: Session = Depends(get_db)):
    doc = db.query(Doctor).filter(Doctor.id == doctor_id).first()
    if not doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Doctor not found")
    # Soft disable doctor
    doc.is_active = False
    db.commit()
    return {"message": f"Doctor {doc.name} deactivated successfully"}


# --- Location Management ---
@router.post("/doctors/{doctor_id}/locations", response_model=DoctorLocationResponse)
def add_location(doctor_id: int, loc_in: DoctorLocationCreate, db: Session = Depends(get_db)):
    doc = db.query(Doctor).filter(Doctor.id == doctor_id).first()
    if not doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Doctor not found")

    loc = DoctorLocation(
        doctor_id=doctor_id,
        clinic_name=loc_in.clinic_name,
        address=loc_in.address,
        locality=loc_in.locality,
        city=loc_in.city,
        state=loc_in.state,
        pincode=loc_in.pincode,
        google_maps_url=loc_in.google_maps_url,
        room_number=loc_in.room_number,
        is_active=loc_in.is_active,
    )
    db.add(loc)
    db.commit()
    db.refresh(loc)
    return DoctorLocationResponse.model_validate(loc)


@router.put("/locations/{location_id}", response_model=DoctorLocationResponse)
def update_location(location_id: int, loc_in: DoctorLocationUpdate, db: Session = Depends(get_db)):
    loc = db.query(DoctorLocation).filter(DoctorLocation.id == location_id).first()
    if not loc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Location not found")

    for field, val in loc_in.model_dump(exclude_unset=True).items():
        setattr(loc, field, val)

    db.commit()
    db.refresh(loc)
    return DoctorLocationResponse.model_validate(loc)


@router.delete("/locations/{location_id}")
def delete_location(location_id: int, db: Session = Depends(get_db)):
    loc = db.query(DoctorLocation).filter(DoctorLocation.id == location_id).first()
    if not loc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Location not found")
    loc.is_active = False
    db.commit()
    return {"message": "Location deactivated successfully"}


# --- Availability Management ---
@router.post("/locations/{location_id}/availability", response_model=DoctorAvailabilityResponse)
def add_availability(location_id: int, avail_in: DoctorAvailabilityCreate, db: Session = Depends(get_db)):
    loc = db.query(DoctorLocation).filter(DoctorLocation.id == location_id).first()
    if not loc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Location not found")

    avail = DoctorAvailability(
        doctor_location_id=location_id,
        day_of_week=avail_in.day_of_week,
        start_time=avail_in.start_time,
        end_time=avail_in.end_time,
        slot_duration=avail_in.slot_duration,
        is_active=avail_in.is_active,
    )
    db.add(avail)
    db.commit()
    db.refresh(avail)
    return DoctorAvailabilityResponse.model_validate(avail)


@router.delete("/availability/{availability_id}")
def delete_availability(availability_id: int, db: Session = Depends(get_db)):
    avail = db.query(DoctorAvailability).filter(DoctorAvailability.id == availability_id).first()
    if not avail:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Availability schedule not found")
    db.delete(avail)
    db.commit()
    return {"message": "Availability schedule deleted successfully"}


# --- Appointment Management ---
@router.get("/appointments", response_model=List[AppointmentResponse])
def get_all_appointments(
    doctor_id: Optional[int] = Query(None),
    status_filter: Optional[AppointmentStatus] = Query(None, alias="status"),
    date_filter: Optional[date] = Query(None, alias="date"),
    db: Session = Depends(get_db),
):
    query = db.query(Appointment)
    if doctor_id:
        query = query.filter(Appointment.doctor_id == doctor_id)
    if status_filter:
        query = query.filter(Appointment.status == status_filter)
    if date_filter:
        query = query.filter(Appointment.appointment_date == date_filter)

    appointments = query.order_by(Appointment.appointment_date.desc(), Appointment.appointment_time.desc()).all()

    results = []
    for appt in appointments:
        results.append(
            AppointmentResponse(
                id=appt.id,
                patient_id=appt.patient.id,
                patient_name=appt.patient.name,
                patient_email=appt.patient.email,
                patient_mobile=appt.patient.profile.mobile if appt.patient.profile else None,
                patient_age_or_dob=appt.patient.profile.date_of_birth if appt.patient.profile else None,
                doctor_id=appt.doctor.id,
                doctor_name=appt.doctor.name,
                doctor_specialization=appt.doctor.specialization,
                doctor_location_id=appt.location.id,
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


@router.put("/appointments/{appointment_id}/status", response_model=AppointmentResponse)
def update_appointment_status(
    appointment_id: str,
    status_in: AppointmentStatusUpdate,
    db: Session = Depends(get_db),
):
    appt = db.query(Appointment).filter(Appointment.id == appointment_id).first()
    if not appt:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Appointment not found")

    appt.status = status_in.status
    db.commit()
    db.refresh(appt)

    return AppointmentResponse(
        id=appt.id,
        patient_id=appt.patient.id,
        patient_name=appt.patient.name,
        patient_email=appt.patient.email,
        patient_mobile=appt.patient.profile.mobile if appt.patient.profile else None,
        patient_age_or_dob=appt.patient.profile.date_of_birth if appt.patient.profile else None,
        doctor_id=appt.doctor.id,
        doctor_name=appt.doctor.name,
        doctor_specialization=appt.doctor.specialization,
        doctor_location_id=appt.location.id,
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


# --- Patient Directory ---
@router.get("/patients", response_model=List[PatientDetailResponse])
def get_all_patients(db: Session = Depends(get_db)):
    patients = db.query(User).filter(User.role == UserRole.PATIENT).order_by(User.id.desc()).all()
    results = []
    for p in patients:
        results.append(
            PatientDetailResponse(
                id=p.id,
                name=p.name,
                email=p.email,
                role=p.role.value,
                email_verified=p.email_verified,
                profile=PatientProfileResponse.model_validate(p.profile) if p.profile else None,
                created_at=p.created_at,
            )
        )
    return results
