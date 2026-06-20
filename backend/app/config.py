"""
Centralized configuration — reads from environment variables.
In production, values are injected by Elastic Beanstalk environment
configuration or fetched from AWS Secrets Manager at startup.
"""
import os
from functools import lru_cache
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # ── App ────────────────────────────────────────────────────────────────
    APP_NAME: str = "MindEase - Mental Wellness Tracker"
    APP_VERSION: str = "1.0.0"
    ENVIRONMENT: str = os.getenv("ENVIRONMENT", "development")
    DEBUG: bool = os.getenv("DEBUG", "false").lower() == "true"

    # ── Security ───────────────────────────────────────────────────────────
    JWT_SECRET_KEY: str = os.getenv("JWT_SECRET_KEY", "change-me-in-production")
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRE_MINUTES: int = 60 * 24 * 7       # 7 days
    GUEST_SESSION_EXPIRE_HOURS: int = 24

    # ── CORS ───────────────────────────────────────────────────────────────
    # Comma-separated list; overridden in production via env var
    ALLOWED_ORIGINS: str = os.getenv(
        "ALLOWED_ORIGINS",
        "http://localhost:3000,http://localhost:5173",
    )

    @property
    def allowed_origins_list(self) -> list[str]:
        return [o.strip() for o in self.ALLOWED_ORIGINS.split(",") if o.strip()]

    # ── AWS ────────────────────────────────────────────────────────────────
    AWS_REGION: str = os.getenv("AWS_REGION", "us-east-1")
    AWS_ACCESS_KEY_ID: str = os.getenv("AWS_ACCESS_KEY_ID", "")
    AWS_SECRET_ACCESS_KEY: str = os.getenv("AWS_SECRET_ACCESS_KEY", "")

    # ── DynamoDB ───────────────────────────────────────────────────────────
    DYNAMODB_TABLE_PREFIX: str = os.getenv("DYNAMODB_TABLE_PREFIX", "mindease")
    DYNAMODB_ENDPOINT: str = os.getenv("DYNAMODB_ENDPOINT", "")  # local dev only

    # ── S3 ─────────────────────────────────────────────────────────────────
    S3_PRIVATE_BUCKET: str = os.getenv("S3_PRIVATE_BUCKET", "mindease-private")
    S3_PUBLIC_BUCKET: str = os.getenv("S3_PUBLIC_BUCKET", "mindease-public")

    # ── AWS Bedrock ────────────────────────────────────────────────────────
    BEDROCK_MODEL_ID: str = os.getenv(
        "BEDROCK_MODEL_ID",
        "meta.llama3-8b-instruct-v1:0",
    )
    BEDROCK_REGION: str = os.getenv("BEDROCK_REGION", "us-east-1")

    # ── AWS Secrets Manager ────────────────────────────────────────────────
    USE_SECRETS_MANAGER: bool = os.getenv("USE_SECRETS_MANAGER", "false").lower() == "true"
    SECRET_NAME_JWT: str = os.getenv("SECRET_NAME_JWT", "mindease/jwt-secret-key")

    # ── Rate limiting ──────────────────────────────────────────────────────
    RATE_LIMIT_PER_MINUTE: int = 60
    AI_RATE_LIMIT_PER_MINUTE: int = 20

    # ── Cookie ─────────────────────────────────────────────────────────────
    COOKIE_SECURE: bool = os.getenv("ENVIRONMENT", "development") == "production"
    COOKIE_SAMESITE: str = "lax"
    COOKIE_HTTPONLY: bool = True

    class Config:
        env_file = ".env"
        case_sensitive = True


@lru_cache()
def get_settings() -> Settings:
    return Settings()
