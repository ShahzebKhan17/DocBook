from pathlib import Path
from typing import Optional
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    PROJECT_NAME: str = "DocBook API"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api/v1"

    # Database
    DATABASE_URL: str = "sqlite:///./docbook.db"

    # Security
    SECRET_KEY: str = "docbook-super-secret-key-for-jwt-signing-2026-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days

    # Frontend
    FRONTEND_URL: str = "http://localhost:3000"

    # Brevo Email
    BREVO_API_KEY: Optional[str] = None
    BREVO_SENDER_EMAIL: str = "noreply@docbook.app"
    BREVO_SENDER_NAME: str = "DocBook"

    # Telegram Admin Notification
    TELEGRAM_BOT_TOKEN: Optional[str] = None
    TELEGRAM_ADMIN_CHAT_ID: Optional[str] = None

    # Single Admin Credentials (Set in Render / .env)
    ADMIN_NAME: Optional[str] = None
    ADMIN_EMAIL: Optional[str] = None
    ADMIN_PASSWORD: Optional[str] = None

    INITIAL_ADMIN_NAME: str = "System Admin"
    INITIAL_ADMIN_EMAIL: str = "admin@docbook.com"
    INITIAL_ADMIN_PASSWORD: str = "Admin@123"

    @property
    def admin_name(self) -> str:
        return self.ADMIN_NAME or self.INITIAL_ADMIN_NAME

    @property
    def admin_email(self) -> str:
        return (self.ADMIN_EMAIL or self.INITIAL_ADMIN_EMAIL).lower().strip()

    @property
    def admin_password(self) -> str:
        return self.ADMIN_PASSWORD or self.INITIAL_ADMIN_PASSWORD

    model_config = SettingsConfigDict(
        env_file=(".env", "backend/.env", str(Path(__file__).resolve().parent.parent.parent / ".env")),
        env_file_encoding="utf-8",
        extra="ignore",
    )


settings = Settings()
