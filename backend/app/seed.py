from datetime import date, datetime, time, timedelta, timezone
from decimal import Decimal
from sqlalchemy.orm import Session
from backend.app.core.config import settings
from backend.app.core.database import Base, SessionLocal, engine
from backend.app.core.security import get_password_hash
from backend.app.models.appointment import Appointment, AppointmentStatus
from backend.app.models.doctor import Doctor, DoctorAvailability, DoctorLocation
from backend.app.models.user import PatientProfile, User, UserRole


def ensure_single_admin(db: Session) -> User:
    """
    Ensures exactly one designated Administrator account exists,
    synchronized with settings.admin_email and settings.admin_password.
    Demotes any other accounts to PATIENT to enforce strict Single-Admin architecture.
    """
    target_email = settings.admin_email
    target_name = settings.admin_name
    target_password = settings.admin_password

    # 1. Check if user with target email exists
    admin_user = db.query(User).filter(User.email == target_email).first()

    if not admin_user:
        # Check if there is an existing admin with old email (e.g. default admin@docbook.com)
        old_admin = db.query(User).filter(User.role == UserRole.ADMIN).first()
        if old_admin:
            print(f"[Admin Sync] Updating existing admin account to {target_email}")
            old_admin.email = target_email
            old_admin.name = target_name
            old_admin.password_hash = get_password_hash(target_password)
            old_admin.email_verified = True
            old_admin.verification_token = None
            admin_user = old_admin
        else:
            print(f"[Admin Sync] Creating Single Admin account: {target_email}")
            admin_user = User(
                name=target_name,
                email=target_email,
                password_hash=get_password_hash(target_password),
                role=UserRole.ADMIN,
                email_verified=True,
                verification_token=None,
            )
            db.add(admin_user)
    else:
        # User exists - ensure admin privileges, name, and password hash
        admin_user.role = UserRole.ADMIN
        admin_user.name = target_name
        admin_user.password_hash = get_password_hash(target_password)
        admin_user.email_verified = True
        admin_user.verification_token = None

    db.commit()
    db.refresh(admin_user)

    # 2. Enforce Single-Admin rule: Demote any other admin users to PATIENT
    other_admins = db.query(User).filter(User.role == UserRole.ADMIN, User.id != admin_user.id).all()
    for extra in other_admins:
        print(f"[Admin Sync] Demoting extra admin '{extra.email}' to PATIENT")
        extra.role = UserRole.PATIENT
    if other_admins:
        db.commit()

    print(f"[OK] Single Admin verified: {admin_user.email} ({admin_user.name})")
    return admin_user


def seed_database():
    Base.metadata.create_all(bind=engine)
    db: Session = SessionLocal()

    try:
        # 1. Seed / Synchronize Single Admin User
        admin_user = ensure_single_admin(db)

        # 2. Seed Demo Patient (Rahul Sharma)
        patient_email = "rahul.sharma@example.com"
        patient = db.query(User).filter(User.email == patient_email).first()
        if not patient:
            print(f"Creating Demo Patient: {patient_email}")
            patient = User(
                name="Rahul Sharma",
                email=patient_email,
                password_hash=get_password_hash("Patient@123"),
                role=UserRole.PATIENT,
                email_verified=True,
                verification_token=None,
            )
            db.add(patient)
            db.commit()
            db.refresh(patient)

            profile = PatientProfile(
                user_id=patient.id,
                date_of_birth="28",
                gender="Male",
                mobile="9876543210",
                address="15 Vikas Nagar, Ayodhya, Uttar Pradesh",
                blood_group="B+",
                allergies="Penicillin",
                emergency_contact="9876543211",
            )
            db.add(profile)
            db.commit()
            print("[OK] Demo Patient created successfully.")

        # 3. Purge any legacy sample/dummy doctors from the database
        dummy_names = [
            "Dr. Amit Kumar",
            "Dr. Ananya Roy",
            "Dr. Rajesh Verma",
            "Dr. Sunita Deshmukh",
            "Dr. Vikram Malhotra",
        ]
        dummy_docs = db.query(Doctor).filter(Doctor.name.in_(dummy_names)).all()
        if dummy_docs:
            print(f"[Cleanup] Purging {len(dummy_docs)} legacy sample doctors and their schedules...")
            for doc in dummy_docs:
                db.delete(doc)
            db.commit()
            print("[OK] Legacy sample doctors removed.")

        print("[OK] Database ready for real clinic doctors.")

    except Exception as e:
        db.rollback()
        print(f"Error seeding database: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    seed_database()
