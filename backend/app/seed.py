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

        # 3. Seed Doctors
        existing_doc = db.query(Doctor).filter(Doctor.name == "Dr. Amit Kumar").first()
        if not existing_doc:
            print("Seeding initial doctors and locations...")

            # Doctor 1: Dr. Amit Kumar
            doc1 = Doctor(
                name="Dr. Amit Kumar",
                profile_photo="https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&q=80&w=400",
                gender="Male",
                specialization="Cardiologist",
                qualification="MBBS, MD, DM Cardiology",
                experience_years=15,
                about="Senior Consultant Interventional Cardiologist with over 15 years of experience in adult clinical cardiology, echocardiography, angiography, and preventive heart care.",
                consultation_fee=Decimal("500.00"),
                follow_up_fee=Decimal("300.00"),
                languages="English, Hindi",
                is_verified=True,
                is_active=True,
            )
            db.add(doc1)
            db.commit()
            db.refresh(doc1)

            # Location 1 for Dr. Amit Kumar
            loc1 = DoctorLocation(
                doctor_id=doc1.id,
                clinic_name="Sharma Clinic",
                address="12 Civil Lines, Near Gandhi Chowk",
                locality="Civil Lines",
                city="Ayodhya",
                state="Uttar Pradesh",
                pincode="224001",
                google_maps_url="https://maps.google.com/?q=Civil+Lines+Ayodhya",
                room_number="Room 102",
                is_active=True,
            )
            # Location 2 for Dr. Amit Kumar
            loc2 = DoctorLocation(
                doctor_id=doc1.id,
                clinic_name="City Hospital",
                address="Faizabad Road, Opposite Stadium",
                locality="Faizabad Road",
                city="Ayodhya",
                state="Uttar Pradesh",
                pincode="224001",
                google_maps_url="https://maps.google.com/?q=Faizabad+Road+Ayodhya",
                room_number="OPD 4",
                is_active=True,
            )
            db.add_all([loc1, loc2])
            db.commit()
            db.refresh(loc1)
            db.refresh(loc2)

            # Availabilities for Sharma Clinic:
            # Mon(0), Tue(1), Thu(3), Fri(4)
            for day in [0, 1, 3, 4]:
                # Morning slot
                db.add(DoctorAvailability(
                    doctor_location_id=loc1.id,
                    day_of_week=day,
                    start_time=time(10, 0),
                    end_time=time(13, 0),
                    slot_duration=30,
                    is_active=True,
                ))
                # Evening slot
                db.add(DoctorAvailability(
                    doctor_location_id=loc1.id,
                    day_of_week=day,
                    start_time=time(17, 0),
                    end_time=time(20, 0),
                    slot_duration=30,
                    is_active=True,
                ))
            # Saturday half day
            db.add(DoctorAvailability(
                doctor_location_id=loc1.id,
                day_of_week=5,
                start_time=time(10, 0),
                end_time=time(14, 0),
                slot_duration=30,
                is_active=True,
            ))

            # Availabilities for City Hospital:
            # Wednesday(2) 9 AM to 1 PM
            db.add(DoctorAvailability(
                doctor_location_id=loc2.id,
                day_of_week=2,
                start_time=time(9, 0),
                end_time=time(13, 0),
                slot_duration=30,
                is_active=True,
            ))
            db.commit()

            # Doctor 2: Dr. Ananya Roy
            doc2 = Doctor(
                name="Dr. Ananya Roy",
                profile_photo="https://images.unsplash.com/photo-1594824813629-67d1db0b0377?auto=format&fit=crop&q=80&w=400",
                gender="Female",
                specialization="Dermatologist",
                qualification="MBBS, MD Dermatology, DNB",
                experience_years=9,
                about="Consultant Dermatologist, Trichologist, and Cosmetologist specializing in acne management, laser therapies, and allergy care.",
                consultation_fee=Decimal("600.00"),
                follow_up_fee=Decimal("350.00"),
                languages="English, Hindi, Bengali",
                is_verified=True,
                is_active=True,
            )
            db.add(doc2)
            db.commit()
            db.refresh(doc2)

            loc_roy = DoctorLocation(
                doctor_id=doc2.id,
                clinic_name="Aura Skin & Hair Clinic",
                address="Sector 4, Gomti Nagar",
                locality="Gomti Nagar",
                city="Lucknow",
                state="Uttar Pradesh",
                pincode="226010",
                google_maps_url="https://maps.google.com/?q=Gomti+Nagar+Lucknow",
                room_number="Suite 2",
                is_active=True,
            )
            db.add(loc_roy)
            db.commit()
            db.refresh(loc_roy)

            for day in [0, 1, 2, 3, 4, 5]:
                db.add(DoctorAvailability(
                    doctor_location_id=loc_roy.id,
                    day_of_week=day,
                    start_time=time(11, 0),
                    end_time=time(15, 0),
                    slot_duration=30,
                    is_active=True,
                ))
            db.commit()

            # Doctor 3: Dr. Rajesh Verma
            doc3 = Doctor(
                name="Dr. Rajesh Verma",
                profile_photo="https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?auto=format&fit=crop&q=80&w=400",
                gender="Male",
                specialization="Pediatrician",
                qualification="MBBS, MD Pediatrics",
                experience_years=12,
                about="Compassionate child specialist with extensive expertise in newborn intensive care, vaccination, growth monitoring, and pediatric nutrition.",
                consultation_fee=Decimal("400.00"),
                follow_up_fee=Decimal("250.00"),
                languages="English, Hindi",
                is_verified=True,
                is_active=True,
            )
            db.add(doc3)
            db.commit()
            db.refresh(doc3)

            loc_verma = DoctorLocation(
                doctor_id=doc3.id,
                clinic_name="Little Care Child Clinic",
                address="88 Civil Lines, Station Road",
                locality="Civil Lines",
                city="Ayodhya",
                state="Uttar Pradesh",
                pincode="224001",
                room_number="Room 1",
                is_active=True,
            )
            db.add(loc_verma)
            db.commit()
            db.refresh(loc_verma)

            for day in [0, 1, 2, 3, 4, 5]:
                db.add(DoctorAvailability(
                    doctor_location_id=loc_verma.id,
                    day_of_week=day,
                    start_time=time(9, 30),
                    end_time=time(13, 30),
                    slot_duration=30,
                    is_active=True,
                ))
            db.commit()

            # Doctor 4: Dr. Sunita Deshmukh
            doc4 = Doctor(
                name="Dr. Sunita Deshmukh",
                profile_photo="https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&q=80&w=400",
                gender="Female",
                specialization="Gynecologist",
                qualification="MBBS, MS Obstetrics & Gynecology",
                experience_years=14,
                about="Senior Obstetrician and Gynecologist specialized in high-risk pregnancy care, infertility treatment, and laparoscopic surgeries.",
                consultation_fee=Decimal("700.00"),
                follow_up_fee=Decimal("400.00"),
                languages="English, Hindi, Marathi",
                is_verified=True,
                is_active=True,
            )
            db.add(doc4)
            db.commit()
            db.refresh(doc4)

            loc_deshmukh = DoctorLocation(
                doctor_id=doc4.id,
                clinic_name="Mother & Child Medical Center",
                address="Hazratganj Main Market",
                locality="Hazratganj",
                city="Lucknow",
                state="Uttar Pradesh",
                pincode="226001",
                room_number="Cabin A",
                is_active=True,
            )
            db.add(loc_deshmukh)
            db.commit()
            db.refresh(loc_deshmukh)

            for day in [0, 1, 3, 4, 5]:
                db.add(DoctorAvailability(
                    doctor_location_id=loc_deshmukh.id,
                    day_of_week=day,
                    start_time=time(10, 0),
                    end_time=time(14, 0),
                    slot_duration=30,
                    is_active=True,
                ))
            db.commit()

            # Doctor 5: Dr. Vikram Malhotra
            doc5 = Doctor(
                name="Dr. Vikram Malhotra",
                profile_photo="https://images.unsplash.com/photo-1537368910025-700350fe46c7?auto=format&fit=crop&q=80&w=400",
                gender="Male",
                specialization="Orthopedic Surgeon",
                qualification="MBBS, MS Orthopedics, Fellowship Joint Replacement",
                experience_years=16,
                about="Specialist in joint replacement, sports injury management, arthritis, and spine rehabilitation.",
                consultation_fee=Decimal("800.00"),
                follow_up_fee=Decimal("500.00"),
                languages="English, Hindi, Punjabi",
                is_verified=True,
                is_active=True,
            )
            db.add(doc5)
            db.commit()
            db.refresh(doc5)

            loc_malhotra = DoctorLocation(
                doctor_id=doc5.id,
                clinic_name="Metro Bone & Joint Institute",
                address="Ring Road, Bypass Colony",
                locality="Ring Road",
                city="Ayodhya",
                state="Uttar Pradesh",
                pincode="224001",
                room_number="Consultation 3",
                is_active=True,
            )
            db.add(loc_malhotra)
            db.commit()
            db.refresh(loc_malhotra)

            for day in [0, 2, 4]:
                db.add(DoctorAvailability(
                    doctor_location_id=loc_malhotra.id,
                    day_of_week=day,
                    start_time=time(14, 0),
                    end_time=time(18, 0),
                    slot_duration=30,
                    is_active=True,
                ))
            db.commit()

            # Seed completed past appointments for consultation count calculation
            # For Dr. Amit Kumar: seed completed appointments so the counter has real completed data
            today = date.today()
            for i in range(1, 26):
                past_date = today - timedelta(days=i * 2)
                appt = Appointment(
                    id=f"APT-PAST-{1000 + i}",
                    patient_id=patient.id,
                    doctor_id=doc1.id,
                    doctor_location_id=loc1.id,
                    appointment_date=past_date,
                    appointment_time=time(10, 30),
                    consultation_fee=Decimal("500.00"),
                    status=AppointmentStatus.COMPLETED,
                    notes="Regular follow-up consultation",
                )
                db.add(appt)

            # Seed an upcoming confirmed appointment for Rahul Sharma with Dr. Amit Kumar
            # Find next Monday or tomorrow
            future_date = today + timedelta(days=3)
            upcoming_appt = Appointment(
                id="APT-1024",
                patient_id=patient.id,
                doctor_id=doc1.id,
                doctor_location_id=loc1.id,
                appointment_date=future_date,
                appointment_time=time(11, 30),
                consultation_fee=Decimal("500.00"),
                status=AppointmentStatus.CONFIRMED,
                notes="Cardiology health checkup",
            )
            db.add(upcoming_appt)
            db.commit()
            print("[OK] Sample doctors, clinics, schedules, and appointments seeded successfully.")

    except Exception as e:
        db.rollback()
        print(f"Error seeding database: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    seed_database()
