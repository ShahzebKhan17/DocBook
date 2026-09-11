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

    # Initial Admin Seed
    INITIAL_ADMIN_NAME: str = "Dr. Admin"
    INITIAL_ADMIN_EMAIL: str = "admin@docbook.com"
    INITIAL_ADMIN_PASSWORD: str = "Admin@123"

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")


settings = Settings()
