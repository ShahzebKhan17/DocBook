from decimal import Decimal
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, or_
from sqlalchemy.orm import Session
from backend.app.core.database import get_db
from backend.app.models.appointment import Appointment, AppointmentStatus
from backend.app.models.doctor import Doctor, DoctorLocation
from backend.app.schemas.doctor import (
    DoctorCardResponse,
    DoctorDetailResponse,
    DoctorLocationResponse,
)

router = APIRouter()


def get_consultations_count(db: Session, doctor_id: int) -> int:
    """Calculates consultation count from completed appointments."""
    count = (
        db.query(func.count(Appointment.id))
        .filter(
            Appointment.doctor_id == doctor_id,
            Appointment.status == AppointmentStatus.COMPLETED,
        )
        .scalar()
    )
    return count or 0


def format_consultations_display(count: int) -> str:
    if count >= 1000:
        return f"{count:,}+ Consultations"
    elif count > 0:
        return f"{count}+ Consultations"
    else:
        return "New Doctor"


@router.get("", response_model=List[DoctorCardResponse])
def list_doctors(
    search: Optional[str] = Query(None, description="Search by doctor name or specialization"),
    specialization: Optional[str] = Query(None, description="Filter by specialization"),
    city: Optional[str] = Query(None, description="Filter by city"),
    max_fee: Optional[Decimal] = Query(None, description="Filter by maximum consultation fee"),
    db: Session = Depends(get_db),
):
    query = db.query(Doctor).filter(Doctor.is_active == True)

    if search:
        term = f"%{search.strip()}%"
        query = query.filter(
            or_(
                Doctor.name.ilike(term),
                Doctor.specialization.ilike(term),
                Doctor.qualification.ilike(term),
            )
        )

    if specialization:
        query = query.filter(Doctor.specialization.ilike(f"%{specialization.strip()}%"))

    if max_fee is not None:
        query = query.filter(Doctor.consultation_fee <= max_fee)

    if city:
        # Filter doctors that have at least one active location in this city
        query = query.join(DoctorLocation).filter(
            DoctorLocation.is_active == True,
            DoctorLocation.city.ilike(f"%{city.strip()}%"),
        ).distinct()

    doctors = query.order_by(Doctor.experience_years.desc()).all()

    results = []
    for doc in doctors:
        count = get_consultations_count(db, doc.id)
        # Select first active location
        primary_loc = next((loc for loc in doc.locations if loc.is_active), None)
        loc_resp = DoctorLocationResponse.model_validate(primary_loc) if primary_loc else None

        results.append(
            DoctorCardResponse(
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
                consultations_display=format_consultations_display(count),
                primary_location=loc_resp,
                created_at=doc.created_at,
            )
        )
    return results


@router.get("/specializations", response_model=List[str])
def get_specializations(db: Session = Depends(get_db)):
    specs = (
        db.query(Doctor.specialization)
        .filter(Doctor.is_active == True)
        .distinct()
        .all()
    )
    return [s[0] for s in specs if s[0]]


@router.get("/cities", response_model=List[str])
def get_cities(db: Session = Depends(get_db)):
    cities = (
        db.query(DoctorLocation.city)
        .filter(DoctorLocation.is_active == True)
        .distinct()
        .all()
    )
    return [c[0] for c in cities if c[0]]


@router.get("/{doctor_id}", response_model=DoctorDetailResponse)
def get_doctor_detail(doctor_id: int, db: Session = Depends(get_db)):
    doc = db.query(Doctor).filter(Doctor.id == doctor_id, Doctor.is_active == True).first()
    if not doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Doctor not found or inactive")

    count = get_consultations_count(db, doc.id)
    active_locations = [loc for loc in doc.locations if loc.is_active]

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
        consultations_display=format_consultations_display(count),
        locations=[DoctorLocationResponse.model_validate(loc) for loc in active_locations],
        created_at=doc.created_at,
        updated_at=doc.updated_at,
    )
