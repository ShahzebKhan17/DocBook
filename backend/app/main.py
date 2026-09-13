from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from backend.app.api import admin, appointments, auth, doctors, patients, prescriptions
from backend.app.core.config import settings
from backend.app.core.database import Base, SessionLocal, engine
from sqlalchemy import inspect, text
from backend.app.seed import ensure_single_admin


def ensure_schema_migrations():
    try:
        inspector = inspect(engine)
        if "users" in inspector.get_table_names():
            columns = [col["name"] for col in inspector.get_columns("users")]
            with engine.connect() as conn:
                if "reset_token" not in columns:
                    print("[Schema Migration] Adding 'reset_token' column to users table...")
                    conn.execute(text("ALTER TABLE users ADD COLUMN reset_token VARCHAR(255)"))
                    conn.commit()
                if "reset_token_expires_at" not in columns:
                    print("[Schema Migration] Adding 'reset_token_expires_at' column to users table...")
                    is_pg = engine.dialect.name == "postgresql"
                    col_type = "TIMESTAMP WITH TIME ZONE" if is_pg else "TIMESTAMP"
                    conn.execute(text(f"ALTER TABLE users ADD COLUMN reset_token_expires_at {col_type}"))
                    conn.commit()
    except Exception as exc:
        print(f"[Schema Migration] Warning ensuring reset_token columns: {exc}")


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Ensure database tables exist
    Base.metadata.create_all(bind=engine)
    # Ensure schema migrations for new columns
    ensure_schema_migrations()
    # Ensure single admin account is initialized and synchronized
    db = SessionLocal()
    try:
        ensure_single_admin(db)
    except Exception as exc:
        print(f"[Admin Lifespan] Warning syncing admin: {exc}")
    finally:
        db.close()
    yield


app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    lifespan=lifespan,
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3001",
        settings.FRONTEND_URL,
        "*"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount API routers
app.include_router(auth.router, prefix=f"{settings.API_V1_STR}/auth", tags=["Authentication"])
app.include_router(patients.router, prefix=f"{settings.API_V1_STR}/patients", tags=["Patients"])
app.include_router(doctors.router, prefix=f"{settings.API_V1_STR}/doctors", tags=["Doctors"])
app.include_router(appointments.router, prefix=f"{settings.API_V1_STR}/appointments", tags=["Appointments"])
app.include_router(admin.router, prefix=f"{settings.API_V1_STR}/admin", tags=["Admin Management"])
app.include_router(prescriptions.router, prefix=f"{settings.API_V1_STR}/prescriptions", tags=["Prescriptions"])


@app.get("/")
def root():
    return {
        "app": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "status": "online",
        "docs": "/docs",
    }


@app.get("/health")
def health_check():
    return {"status": "healthy"}
