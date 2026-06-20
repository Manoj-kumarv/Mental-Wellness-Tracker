"""
Security utilities: JWT creation/verification, password hashing, session ID generation.
JWT secret is resolved from AWS Secrets Manager in production.
"""
import secrets
import uuid
from datetime import datetime, timedelta, timezone
from typing import Optional

from jose import JWTError, jwt
from passlib.context import CryptContext

from app.config import get_settings

settings = get_settings()

# bcrypt — work factor 12 by default
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def _jwt_secret() -> str:
    """Lazily resolve the JWT secret (Secrets Manager or env var)."""
    from app.services.secrets_service import get_jwt_secret
    return get_jwt_secret()


def hash_password(plain: str) -> str:
    return pwd_context.hash(plain)


def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)


def create_access_token(
    user_id: str,
    user_type: str,
    name: Optional[str] = None,
    email: Optional[str] = None,
    expires_delta: Optional[timedelta] = None,
) -> str:
    if expires_delta is None:
        expires_delta = timedelta(minutes=settings.JWT_EXPIRE_MINUTES)

    expire = datetime.now(timezone.utc) + expires_delta
    payload: dict = {
        "sub": user_id,
        "user_type": user_type,
        "exp": expire,
        "iat": datetime.now(timezone.utc),
        "jti": str(uuid.uuid4()),
    }
    if name:
        payload["name"] = name
    if email:
        payload["email"] = email

    return jwt.encode(payload, _jwt_secret(), algorithm=settings.JWT_ALGORITHM)


def decode_token(token: str) -> dict:
    """Decode and validate JWT. Raises JWTError on failure."""
    return jwt.decode(token, _jwt_secret(), algorithms=[settings.JWT_ALGORITHM])


def generate_guest_session_id() -> str:
    """Cryptographically secure anonymous session identifier."""
    return f"guest_{secrets.token_urlsafe(32)}"


def generate_conversation_id() -> str:
    return f"conv_{uuid.uuid4().hex}"
