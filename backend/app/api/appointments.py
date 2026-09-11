from datetime import date, datetime, time, timedelta
import random
from typing import Optional
from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from backend.app.api.deps import get_current_user, get_current_verified_patient
from backend.app.core.database import get_db
from backend.app.models.appointment import Appointment, AppointmentStatus
from backend.app.models.doctor import Doctor, DoctorLocation
from backend.app.models.user import User
from backend.app.schemas.appointment import (
    AppointmentCreate,
    AppointmentResponse,
    AvailableSlotsResponse,
)
from backend.app.services.slots import (
    format_time_display,
    generate_available_slots,
)
from backend.app.services.telegram import (
    send_telegram_admin_notification,
    send_telegram_cancellation_notification,
)

router = APIRouter()


def parse_appointment_time(time_str: str) -> time:
    """Parses various time formats into a datetime.time object."""
    clean = time_str.strip().upper()
    if " - " in clean:
        clean = clean.split(" - ")[0].strip()
    for fmt in ["%H:%M:%S", "%H:%M", "%I:%M %p", "%I:%M%p"]:
        try:
            return datetime.strptime(clean, fmt).time()
        except ValueError:
            pass
    raise HTTPException(
        status_code=status.HTTP_400_BAD_REQUEST,
        detail=f"Invalid time format '{time_str}'. Expected HH:MM:SS or HH:MM AM/PM.",
    )


def generate_appointment_id(db: Session) -> str:
    """Generates unique sequential appointment ID like APT-1024."""
    for _ in range(10):
        candidate = f"APT-{random.randint(1000, 9999)}"
        exists = db.query(Appointment).filter(Appointment.id == candidate).first()
        if not exists:
            return candidate
    return f"APT-{int(datetime.now().timestamp())}"


@router.get("/slots", response_model=AvailableSlotsResponse)
def get_slots(
    doctor_id: int = Query(...),
    doctor_location_id: int = Query(...),
    appointment_date: date = Query(...),
    db: Session = Depends(get_db),
):
    if appointment_date < date.today():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot check slots for a past date.",
        )

    # Verify doctor and location existence & active status
    doc = db.query(Doctor).filter(Doctor.id == doctor_id, Doctor.is_active == True).first()
    if not doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Doctor not found or inactive")

    loc = (
        db.query(DoctorLocation)
        .filter(
            DoctorLocation.id == doctor_location_id,
            DoctorLocation.doctor_id == doctor_id,
            DoctorLocation.is_active == True,
        )
        .first()
    )
    if not loc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Location not found for this doctor")

    return generate_available_slots(db, doctor_id, doctor_location_id, appointment_date)


@router.post("/book", response_model=AppointmentResponse)
async def book_appointment(
    payload: AppointmentCreate,
    current_patient: User = Depends(get_current_verified_patient),
    db: Session = Depends(get_db),
):
    if payload.appointment_date < date.today():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot book an appointment in the past.",
        )

    target_time = parse_appointment_time(payload.appointment_time)

    # If today, cannot book past time
    if payload.appointment_date == date.today():
        now_time = datetime.now().time()
        if target_time <= now_time:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Selected time slot has already passed for today.",
            )

    # Check doctor
    doctor = db.query(Doctor).filter(Doctor.id == payload.doctor_id, Doctor.is_active == True).first()
    if not doctor:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Doctor not found or inactive")

    # Check location
    location = (
        db.query(DoctorLocation)
        .filter(
            DoctorLocation.id == payload.doctor_location_id,
            DoctorLocation.doctor_id == payload.doctor_id,
            DoctorLocation.is_active == True,
        )
        .first()
    )
    if not location:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Doctor location not found or inactive")

    # Slot availability check from schedule
    available_data = generate_available_slots(db, payload.doctor_id, payload.doctor_location_id, payload.appointment_date)
    matching_slot = next((s for s in available_data.slots if s.time_raw == target_time.strftime("%H:%M:%S")), None)
    if not matching_slot or not matching_slot.is_available:
        if matching_slot and matching_slot.is_full:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No More Bookings Are Allowed for this Particular Time Slot",
            )
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="The requested time slot is not available or has already passed. Please select another slot.",
        )

    # Double check hourly 40-booking capacity in DB atomically
    slot_end_time = (datetime.combine(payload.appointment_date, target_time) + timedelta(hours=1)).time()
    booked_count = (
        db.query(Appointment)
        .filter(
            Appointment.doctor_id == payload.doctor_id,
            Appointment.doctor_location_id == payload.doctor_location_id,
            Appointment.appointment_date == payload.appointment_date,
            Appointment.appointment_time >= target_time,
            Appointment.appointment_time < slot_end_time,
            Appointment.status != AppointmentStatus.CANCELLED,
        )
        .count()
    )
    if booked_count >= 40:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No More Bookings Are Allowed for this Particular Time Slot",
        )

    # Snapshot current doctor fee at time of booking
    consultation_fee = doctor.consultation_fee
    appt_id = generate_appointment_id(db)

    appointment = Appointment(
        id=appt_id,
        patient_id=current_patient.id,
        doctor_id=doctor.id,
        doctor_location_id=location.id,
        appointment_date=payload.appointment_date,
        appointment_time=target_time,
        consultation_fee=consultation_fee,
        status=AppointmentStatus.BOOKED,
        notes=payload.notes,
    )
    db.add(appointment)
    db.commit()
    db.refresh(appointment)

    # Dispatch Telegram notification to Admin
    patient_age = current_patient.profile.date_of_birth if current_patient.profile else None
    patient_mobile = current_patient.profile.mobile if current_patient.profile else None
    time_str = format_time_display(target_time)
    date_str = payload.appointment_date.strftime("%d %B %Y")

    await send_telegram_admin_notification(
        db=db,
        appointment_id=appointment.id,
        patient_name=current_patient.name,
        patient_age=patient_age,
        patient_mobile=patient_mobile,
        doctor_name=doctor.name,
        specialization=doctor.specialization,
        appointment_date_str=date_str,
        appointment_time_str=time_str,
        clinic_name=location.clinic_name,
        consultation_fee=str(consultation_fee),
    )

    return AppointmentResponse(
        id=appointment.id,
        patient_id=current_patient.id,
        patient_name=current_patient.name,
        patient_email=current_patient.email,
        patient_mobile=patient_mobile,
        patient_age_or_dob=patient_age,
        doctor_id=doctor.id,
        doctor_name=doctor.name,
        doctor_specialization=doctor.specialization,
        doctor_location_id=location.id,
        clinic_name=location.clinic_name,
        clinic_address=location.address,
        clinic_city=location.city,
        google_maps_url=location.google_maps_url,
        appointment_date=appointment.appointment_date,
        appointment_time=appointment.appointment_time,
        time_display=time_str,
        consultation_fee=appointment.consultation_fee,
        status=appointment.status,
        notes=appointment.notes,
        created_at=appointment.created_at,
    )


@router.put("/{appointment_id}/cancel", response_model=AppointmentResponse)
async def cancel_appointment(
    appointment_id: str,
    current_patient: User = Depends(get_current_verified_patient),
    db: Session = Depends(get_db),
):
    appt = (
        db.query(Appointment)
        .filter(Appointment.id == appointment_id, Appointment.patient_id == current_patient.id)
        .first()
    )
    if not appt:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Appointment not found")

    if appt.status in (AppointmentStatus.COMPLETED, AppointmentStatus.CANCELLED):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot cancel an appointment that is already {appt.status.value}",
        )

    appt.status = AppointmentStatus.CANCELLED
    db.commit()
    db.refresh(appt)

    # Dispatch Telegram cancellation notification to Clinic
    try:
        time_str = format_time_display(appt.appointment_time)
        date_str = appt.appointment_date.strftime("%d %B %Y")
        await send_telegram_cancellation_notification(
            db=db,
            appointment_id=appt.id,
            patient_name=current_patient.name,
            doctor_name=appt.doctor.name,
            specialization=appt.doctor.specialization,
            appointment_date_str=date_str,
            appointment_time_str=time_str,
            clinic_name=appt.location.clinic_name,
        )
    except Exception as exc:
        pass

    return AppointmentResponse(
        id=appt.id,
        patient_id=current_patient.id,
        patient_name=current_patient.name,
        patient_email=current_patient.email,
        patient_mobile=current_patient.profile.mobile if current_patient.profile else None,
        patient_age_or_dob=current_patient.profile.date_of_birth if current_patient.profile else None,
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
