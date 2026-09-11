import os
import sys
from datetime import date, timedelta
from fastapi.testclient import TestClient

# Ensure root dir is in sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")))

from backend.app.main import app

client = TestClient(app)


def test_full_flow():
    print("\n--- 1. Testing Health & Root Endpoints ---")
    res = client.get("/health")
    assert res.status_code == 200
    assert res.json() == {"status": "healthy"}
    print("[OK] Health check passed")

    print("\n--- 2. Testing Doctor Search & Listing ---")
    res = client.get("/api/v1/doctors")
    assert res.status_code == 200
    doctors = res.json()

    if len(doctors) == 0:
        # Self-provision a test doctor via admin API for automated testing
        from backend.app.core.config import settings
        admin_login = client.post(
            "/api/v1/auth/login",
            json={"email": settings.admin_email, "password": settings.admin_password}
        )
        adm_hdr = {"Authorization": f"Bearer {admin_login.json()['access_token']}"}
        new_doc_res = client.post("/api/v1/admin/doctors", json={
            "name": "Dr. Test Specialist",
            "gender": "Male",
            "specialization": "Cardiologist",
            "qualification": "MBBS, MD Cardiology",
            "experience_years": 10,
            "about": "Automated test doctor",
            "consultation_fee": 500.00,
            "follow_up_fee": 300.00,
            "languages": "English, Hindi"
        }, headers=adm_hdr)
        assert new_doc_res.status_code == 200
        test_doc_id = new_doc_res.json()["id"]

        # Add location
        loc_res = client.post(f"/api/v1/admin/doctors/{test_doc_id}/locations", json={
            "clinic_name": "Test Care Clinic",
            "address": "12 Civil Lines",
            "locality": "Civil Lines",
            "city": "Ayodhya",
            "state": "Uttar Pradesh",
            "pincode": "224001",
            "room_number": "Room 101"
        }, headers=adm_hdr)
        assert loc_res.status_code == 200
        test_loc_id = loc_res.json()["id"]

        # Add availability for all 7 days
        for d in range(7):
            client.post(f"/api/v1/admin/locations/{test_loc_id}/availability", json={
                "day_of_week": d,
                "start_time": "10:00",
                "end_time": "14:00",
                "slot_duration": 30
            }, headers=adm_hdr)

        res = client.get("/api/v1/doctors")
        doctors = res.json()

    assert len(doctors) > 0
    doc = doctors[0]
    print(f"[OK] Found {len(doctors)} doctors. First doctor: {doc['name']} - {doc['specialization']}")
    assert "consultations_display" in doc
    assert doc["consultations_count"] >= 0

    # Search by specialization
    res = client.get("/api/v1/doctors?specialization=Cardiologist")
    assert res.status_code == 200
    cardios = res.json()
    assert all("Cardiologist" in d["specialization"] for d in cardios)
    print("[OK] Filter by specialization passed")

    # Filter by city
    res = client.get("/api/v1/doctors?city=Ayodhya")
    assert res.status_code == 200
    ayodhya_docs = res.json()
    assert len(ayodhya_docs) > 0
    print("[OK] Filter by city passed")

    # Filter by fee
    res = client.get("/api/v1/doctors?max_fee=500")
    assert res.status_code == 200
    fee_docs = res.json()
    assert all(float(d["consultation_fee"]) <= 500.0 for d in fee_docs)
    print("[OK] Filter by fee passed")

    print("\n--- 3. Testing Patient Registration & Email Verification ---")
    reg_payload = {
        "name": "Aman Gupta",
        "email": f"aman.gupta.{int(date.today().strftime('%Y%m%d'))}@example.com",
        "password": "Password@123",
        "confirm_password": "Password@123",
    }
    res = client.post("/api/v1/auth/register", json=reg_payload)
    if res.status_code == 400 and "already exists" in res.text:
        reg_payload["email"] = f"aman.{os.urandom(4).hex()}@example.com"
        res = client.post("/api/v1/auth/register", json=reg_payload)

    assert res.status_code == 200, res.text
    reg_data = res.json()
    assert "dev_verification_token" not in reg_data, "dev_verification_token should NOT be returned in API response"

    # Retrieve 6-digit verification code from DB (simulating user checking email inbox)
    from backend.app.core.database import SessionLocal
    from backend.app.models.user import User
    db_session = SessionLocal()
    registered_user = db_session.query(User).filter(User.email == reg_payload["email"].lower()).first()
    code = registered_user.verification_token
    db_session.close()

    assert code is not None and len(code) == 6 and code.isdigit(), f"Expected 6-digit numeric code, got: {code}"
    print(f"[OK] Registered patient without token leakage. 6-Digit Code in email: {code}")

    # Verify email using the 6-digit code
    res = client.post("/api/v1/auth/verify-email", json={"token": code, "email": reg_payload["email"]})
    assert res.status_code == 200
    assert "verified successfully" in res.json()["message"]
    print("[OK] Email verified successfully using 6-digit code")

    # Test resend verification endpoint guard
    resend_res = client.post("/api/v1/auth/resend-verification", json={"email": reg_payload["email"]})
    assert resend_res.status_code == 200
    assert "already verified" in resend_res.json()["message"]
    print("[OK] Resend verification guard passed")

    # Login patient
    login_res = client.post(
        "/api/v1/auth/login",
        json={"email": reg_payload["email"], "password": reg_payload["password"]}
    )
    assert login_res.status_code == 200
    patient_token = login_res.json()["access_token"]
    patient_headers = {"Authorization": f"Bearer {patient_token}"}
    print("[OK] Patient login successful")

    # Patient profile update
    prof_update = {
        "date_of_birth": "30",
        "gender": "Male",
        "mobile": "9988776655",
        "address": "Civil Lines, Ayodhya",
        "blood_group": "O+",
    }
    res = client.put("/api/v1/patients/profile", json=prof_update, headers=patient_headers)
    assert res.status_code == 200
    assert res.json()["profile"]["mobile"] == "9988776655"
    print("[OK] Patient profile updated successfully")

    print("\n--- 4. Testing Role-Based Authorization Guards ---")
    # Patient attempting to access admin route MUST get 403 Forbidden
    res = client.get("/api/v1/admin/stats", headers=patient_headers)
    assert res.status_code == 403
    print("[OK] Patient blocked from Admin routes with HTTP 403")

    from backend.app.core.config import settings
    # Admin Login
    admin_login_res = client.post(
        "/api/v1/auth/login",
        json={"email": settings.admin_email, "password": settings.admin_password}
    )
    assert admin_login_res.status_code == 200
    admin_token = admin_login_res.json()["access_token"]
    admin_headers = {"Authorization": f"Bearer {admin_token}"}
    print("[OK] Admin login successful")

    # Admin access stats
    stats_res = client.get("/api/v1/admin/stats", headers=admin_headers)
    assert stats_res.status_code == 200
    stats = stats_res.json()
    assert stats["total_doctors"] > 0
    print(f"[OK] Admin stats retrieved: {stats}")

    print("\n--- 5. Testing Slot Generation & Appointment Booking ---")
    # Find Dr. Amit Kumar and his first location
    doc_res = client.get(f"/api/v1/doctors/{doc['id']}")
    assert doc_res.status_code == 200
    doc_detail = doc_res.json()
    location_id = doc_detail["locations"][0]["id"]

    # Target a future Monday or Tuesday to guarantee active schedule
    test_date = date.today() + timedelta(days=1)
    while test_date.weekday() not in [0, 1, 3, 4]:  # Dr. Amit practices Mon, Tue, Thu, Fri at Sharma Clinic
        test_date += timedelta(days=1)

    slots_res = client.get(f"/api/v1/appointments/slots?doctor_id={doc['id']}&doctor_location_id={location_id}&appointment_date={test_date.isoformat()}")
    assert slots_res.status_code == 200
    slots_data = slots_res.json()
    assert slots_data["is_working_day"] is True
    available_slots = [s for s in slots_data["slots"] if s["is_available"]]
    assert len(available_slots) > 0, "Expected available slots"
    chosen_slot = available_slots[0]
    print(f"[OK] Slots generated successfully for {test_date} ({slots_data['day_name']}). Available: {len(available_slots)}. Chosen: {chosen_slot['time_str']}")

    # Book the slot
    book_payload = {
        "doctor_id": doc["id"],
        "doctor_location_id": location_id,
        "appointment_date": test_date.isoformat(),
        "appointment_time": chosen_slot["time_raw"],
        "notes": "General cardiology checkup",
    }
    book_res = client.post("/api/v1/appointments/book", json=book_payload, headers=patient_headers)
    assert book_res.status_code == 200, book_res.text
    booking = book_res.json()
    appointment_id = booking["id"]
    initial_fee = float(booking["consultation_fee"])
    print(f"[OK] Appointment booked! ID: {appointment_id}, Fee: INR {initial_fee}")

    print("\n--- 6. Testing Double Booking Prevention ---")
    # Attempting to book the SAME slot again MUST return 409 Conflict
    conflict_res = client.post("/api/v1/appointments/book", json=book_payload, headers=patient_headers)
    assert conflict_res.status_code == 409
    print(f"[OK] Double booking successfully prevented with HTTP 409 Conflict: {conflict_res.json()['detail']}")

    print("\n--- 7. Testing Fee Immutability ---")
    # Admin changes doctor fee from ₹500 to ₹750
    new_fee = 750.00
    update_doc_res = client.put(
        f"/api/v1/admin/doctors/{doc['id']}",
        json={"consultation_fee": new_fee},
        headers=admin_headers
    )
    assert update_doc_res.status_code == 200
    assert float(update_doc_res.json()["consultation_fee"]) == new_fee
    print(f"[OK] Doctor fee updated to INR {new_fee}")

    # Verify historical appointment still preserves initial fee
    patient_appts = client.get("/api/v1/patients/appointments", headers=patient_headers).json()
    my_appt = next(a for a in patient_appts if a["id"] == appointment_id)
    assert float(my_appt["consultation_fee"]) == initial_fee, f"Expected {initial_fee} but got {my_appt['consultation_fee']}"
    print(f"[OK] Fee immutability verified: Appointment fee remained INR {my_appt['consultation_fee']} even after doctor fee changed to INR {new_fee}!")

    # Reset fee back
    client.put(f"/api/v1/admin/doctors/{doc['id']}", json={"consultation_fee": 500.00}, headers=admin_headers)

    print("\n--- 8. Testing Admin Appointment Lifecycle ---")
    # Admin updates appointment status to CONFIRMED then COMPLETED
    confirm_res = client.put(
        f"/api/v1/admin/appointments/{appointment_id}/status",
        json={"status": "CONFIRMED"},
        headers=admin_headers
    )
    assert confirm_res.status_code == 200
    assert confirm_res.json()["status"] == "CONFIRMED"
    print("[OK] Appointment status changed to CONFIRMED")

    complete_res = client.put(
        f"/api/v1/admin/appointments/{appointment_id}/status",
        json={"status": "COMPLETED"},
        headers=admin_headers
    )
    assert complete_res.status_code == 200
    assert complete_res.json()["status"] == "COMPLETED"
    print("[OK] Appointment status changed to COMPLETED")

    print("\n--- ALL BACKEND TESTS PASSED! ---")


if __name__ == "__main__":
    test_full_flow()
