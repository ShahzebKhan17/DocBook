import os
import sys
from fastapi.testclient import TestClient

# Ensure root dir is in sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")))
os.environ["DATABASE_URL"] = "sqlite:///./docbook.db"

from backend.app.core.database import Base, SessionLocal, engine
from backend.app.core.security import get_password_hash
from backend.app.main import app
from backend.app.models.user import User, UserRole

client = TestClient(app)


def test_forgot_and_reset_password_flow():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    test_email = "test_reset_flow_patient@example.com"
    old_password = "OldPassword123!"
    new_password = "NewPassword456!"

    # Ensure clean test user
    existing = db.query(User).filter(User.email == test_email).first()
    if existing:
        db.delete(existing)
        db.commit()

    test_user = User(
        name="Test Reset User",
        email=test_email,
        password_hash=get_password_hash(old_password),
        role=UserRole.PATIENT,
        email_verified=False,
    )
    db.add(test_user)
    db.commit()
    db.refresh(test_user)

    print("\n--- 1. Testing Forgot Password with Non-existent Email ---")
    res = client.post("/api/v1/auth/forgot-password", json={"email": "nonexistent_email_123@example.com"})
    assert res.status_code == 404
    print("[OK] Non-existent email correctly rejected with 404")

    print("\n--- 2. Testing Forgot Password for Registered User ---")
    res = client.post("/api/v1/auth/forgot-password", json={"email": test_email})
    assert res.status_code == 200
    assert "A 6-digit verification code" in res.json()["message"]
    print("[OK] Forgot password endpoint returned 200")

    # Fetch user from DB to inspect reset token
    db.refresh(test_user)
    otp = test_user.reset_token
    assert otp is not None
    assert len(otp) == 6
    assert otp.isdigit()
    assert test_user.reset_token_expires_at is not None
    print(f"[OK] 6-digit OTP correctly generated and saved: {otp}")

    print("\n--- 3. Testing Reset Password with Invalid OTP ---")
    res = client.post("/api/v1/auth/reset-password", json={
        "email": test_email,
        "otp": "000000",
        "new_password": new_password,
        "confirm_password": new_password,
    })
    assert res.status_code == 400
    assert "Invalid or expired" in res.json()["detail"]
    print("[OK] Invalid OTP rejected with 400")

    print("\n--- 4. Testing Reset Password with Mismatched Passwords ---")
    res = client.post("/api/v1/auth/reset-password", json={
        "email": test_email,
        "otp": otp,
        "new_password": new_password,
        "confirm_password": "DifferentPassword789!",
    })
    assert res.status_code == 422
    print("[OK] Mismatched password rejected with 422 validation error")

    print("\n--- 5. Testing Reset Password with Valid OTP ---")
    res = client.post("/api/v1/auth/reset-password", json={
        "email": test_email,
        "otp": otp,
        "new_password": new_password,
        "confirm_password": new_password,
    })
    assert res.status_code == 200
    assert "successfully reset" in res.json()["message"]
    print("[OK] Reset password succeeded")

    # Verify reset token is cleared and email verified in DB
    db.refresh(test_user)
    assert test_user.reset_token is None
    assert test_user.reset_token_expires_at is None
    assert test_user.email_verified is True
    print("[OK] Token cleared and email marked as verified")

    print("\n--- 6. Testing Login with Old Password (Should Fail) ---")
    res = client.post("/api/v1/auth/login", json={
        "email": test_email,
        "password": old_password,
    })
    assert res.status_code == 401
    print("[OK] Old password rejected")

    print("\n--- 7. Testing Login with New Password (Should Succeed) ---")
    res = client.post("/api/v1/auth/login", json={
        "email": test_email,
        "password": new_password,
    })
    assert res.status_code == 200
    assert "access_token" in res.json()
    print("[OK] Logged in successfully with new password!")

    # Cleanup
    db.delete(test_user)
    db.commit()
    db.close()
    print("\n=== ALL FORGOT & RESET PASSWORD TESTS PASSED! ===")


if __name__ == "__main__":
    test_forgot_and_reset_password_flow()
