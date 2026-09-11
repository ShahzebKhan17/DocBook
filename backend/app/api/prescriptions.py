import os
from pathlib import Path
from typing import List, Optional
from uuid import uuid4

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from fastapi.responses import FileResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session

from backend.app.api.deps import get_current_verified_patient
from backend.app.core.database import get_db
from backend.app.models.appointment import Appointment
from backend.app.models.prescription import Prescription
from backend.app.models.user import User
from backend.app.services.telegram import send_telegram_prescription

router = APIRouter()

UPLOAD_DIR = Path(__file__).resolve().parent.parent.parent / "uploads" / "prescriptions"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp", ".pdf"}
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10 MB


class PrescriptionResponse(BaseModel):
    id: int
    appointment_id: Optional[str] = None
    filename: str
    file_type: str
    delivery_address: str
    contact_mobile: str
    notes: Optional[str] = None
    status: str
    telegram_sent: bool
    created_at: str

    class Config:
        from_attributes = True


@router.post("/upload", response_model=PrescriptionResponse)
async def upload_prescription(
    file: UploadFile = File(...),
    delivery_address: str = Form(...),
    contact_mobile: str = Form(...),
    appointment_id: Optional[str] = Form(None),
    notes: Optional[str] = Form(None),
    current_patient: User = Depends(get_current_verified_patient),
    db: Session = Depends(get_db),
):
    if not delivery_address.strip():
        raise HTTPException(status_code=400, detail="Delivery address is required.")
    if not contact_mobile.strip():
        raise HTTPException(status_code=400, detail="Contact mobile number is required.")

    # Validate file extension
    ext = os.path.splitext(file.filename)[1].lower() if file.filename else ""
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid file type. Allowed formats: JPG, PNG, WEBP, PDF."
        )

    # Read file contents and check size
    file_bytes = await file.read()
    if len(file_bytes) > MAX_FILE_SIZE:
        raise HTTPException(status_code=400, detail="File size exceeds 10MB limit.")

    file_type = "image" if ext in {".jpg", ".jpeg", ".png", ".webp"} else "pdf"

    # Save to storage
    unique_filename = f"{uuid4().hex[:12]}_{file.filename}"
    save_path = UPLOAD_DIR / unique_filename
    with open(save_path, "wb") as f:
        f.write(file_bytes)

    # Resolve doctor info if appointment_id provided
    doctor_name = None
    clean_appt_id = appointment_id.strip() if appointment_id and appointment_id.strip() else None
    if clean_appt_id:
        appt = db.query(Appointment).filter(Appointment.id == clean_appt_id).first()
        if appt and appt.doctor:
            doctor_name = f"{appt.doctor.name} ({appt.doctor.specialization})"

    # Save Prescription record in database
    prescription = Prescription(
        patient_id=current_patient.id,
        appointment_id=clean_appt_id,
        filename=unique_filename,
        file_path=str(save_path),
        file_type=file_type,
        delivery_address=delivery_address.strip(),
        contact_mobile=contact_mobile.strip(),
        notes=notes.strip() if notes else None,
        status="PENDING",
        telegram_sent=False,
    )
    db.add(prescription)
    db.commit()
    db.refresh(prescription)

    # Dispatch to Telegram Group
    sent = await send_telegram_prescription(
        file_bytes=file_bytes,
        filename=file.filename or unique_filename,
        file_type=file_type,
        patient_name=current_patient.name,
        contact_mobile=contact_mobile.strip(),
        delivery_address=delivery_address.strip(),
        doctor_name=doctor_name,
        appointment_id=clean_appt_id,
        notes=notes.strip() if notes else None,
    )

    if sent:
        prescription.telegram_sent = True
        db.commit()
        db.refresh(prescription)

    return PrescriptionResponse(
        id=prescription.id,
        appointment_id=prescription.appointment_id,
        filename=prescription.filename,
        file_type=prescription.file_type,
        delivery_address=prescription.delivery_address,
        contact_mobile=prescription.contact_mobile,
        notes=prescription.notes,
        status=prescription.status,
        telegram_sent=prescription.telegram_sent,
        created_at=prescription.created_at.isoformat(),
    )


@router.get("/my", response_model=List[PrescriptionResponse])
def get_my_prescriptions(
    current_patient: User = Depends(get_current_verified_patient),
    db: Session = Depends(get_db),
):
    prescriptions = (
        db.query(Prescription)
        .filter(Prescription.patient_id == current_patient.id)
        .order_by(Prescription.created_at.desc())
        .all()
    )
    return [
        PrescriptionResponse(
            id=p.id,
            appointment_id=p.appointment_id,
            filename=p.filename,
            file_type=p.file_type,
            delivery_address=p.delivery_address,
            contact_mobile=p.contact_mobile,
            notes=p.notes,
            status=p.status,
            telegram_sent=p.telegram_sent,
            created_at=p.created_at.isoformat(),
        )
        for p in prescriptions
    ]
