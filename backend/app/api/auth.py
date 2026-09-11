from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from backend.app.api.deps import get_current_user
from backend.app.core.database import get_db
from backend.app.core.security import (
    create_access_token,
    generate_verification_token,
    get_password_hash,
    verify_password,
)
from backend.app.models.user import PatientProfile, User, UserRole
from backend.app.schemas.auth import (
    ResendVerificationRequest,
    Token,
    UserLogin,
    UserRegister,
    UserResponse,
    VerifyEmailRequest,
)
from backend.app.services.email import send_verification_email

router = APIRouter()


from backend.app.core.config import settings


@router.post("/register")
async def register(user_in: UserRegister, db: Session = Depends(get_db)):
    if user_in.email.lower().strip() == settings.admin_email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This email is reserved for administration. Please use another email or log in."
        )

    existing = db.query(User).filter(User.email == user_in.email.lower()).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A user with this email address already exists."
        )

    verification_token = generate_verification_token()
    user = User(
        name=user_in.name,
        email=user_in.email.lower(),
        password_hash=get_password_hash(user_in.password),
        role=UserRole.PATIENT,
        email_verified=False,
        verification_token=verification_token,
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    # Initialize blank patient profile
    profile = PatientProfile(user_id=user.id)
    db.add(profile)
    db.commit()

    # Send verification email via Brevo (or console fallback)
    await send_verification_email(user.email, user.name, verification_token)

    return {
        "message": "Registration successful! A 6-digit verification code has been sent to your email.",
        "user_id": user.id,
        "email": user.email,
    }


@router.post("/verify-email")
def verify_email(payload: VerifyEmailRequest, db: Session = Depends(get_db)):
    clean_token = payload.token.strip()
    query = db.query(User).filter(User.verification_token == clean_token)
    if payload.email:
        query = query.filter(User.email == payload.email.lower().strip())

    user = query.first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired verification code."
        )

    user.email_verified = True
    user.verification_token = None
    db.commit()

    return {"message": "Email address verified successfully. You can now log in."}


@router.post("/resend-verification")
async def resend_verification(payload: ResendVerificationRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == payload.email.lower().strip()).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No account found with this email address."
        )

    if user.email_verified:
        return {"message": "This email address is already verified. Please sign in."}

    # Generate fresh 6-digit verification code
    new_code = generate_verification_token()
    user.verification_token = new_code
    db.commit()

    await send_verification_email(user.email, user.name, new_code)
    return {"message": "A fresh verification code has been sent to your email."}


@router.post("/login", response_model=Token)
def login(credentials: UserLogin, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == credentials.email.lower()).first()
    if not user or not verify_password(credentials.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    access_token = create_access_token(subject=user.id, role=user.role.value)
    return Token(
        access_token=access_token,
        token_type="bearer",
        role=user.role.value,
        user_id=user.id,
        name=user.name,
        email=user.email,
        email_verified=user.email_verified,
    )


@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user)):
    return current_user
