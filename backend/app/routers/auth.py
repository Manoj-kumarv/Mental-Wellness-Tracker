"""
Auth routes — signup, login, guest session, me, logout.
"""
import logging
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, Response, status

from app.config import get_settings
from app.core.dependencies import CurrentUser, get_current_user
from app.core.security import (
    create_access_token,
    generate_guest_session_id,
)
from app.models.schemas import (
    AuthResponse,
    GuestSessionResponse,
    LoginRequest,
    SignupRequest,
    UserProfile,
    UserType,
)
from app.services.user_service import UserService

router = APIRouter(prefix="/auth", tags=["Authentication"])
logger = logging.getLogger(__name__)
settings = get_settings()


def _user_service() -> UserService:
    return UserService()


@router.post("/signup", response_model=AuthResponse, status_code=status.HTTP_201_CREATED)
async def signup(payload: SignupRequest, response: Response):
    """Register a new authenticated user."""
    svc = _user_service()
    try:
        user = await svc.create_user(payload.email, payload.password, payload.name)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc))

    expire_secs = settings.JWT_EXPIRE_MINUTES * 60
    token = create_access_token(
        user_id=user["user_id"],
        user_type=UserType.AUTHENTICATED.value,
        name=user["name"],
        email=user["email"],
        expires_delta=timedelta(minutes=settings.JWT_EXPIRE_MINUTES),
    )
    _set_cookie(response, token, expire_secs)
    return AuthResponse(
        access_token=token,
        user_type=UserType.AUTHENTICATED,
        user_id=user["user_id"],
        name=user["name"],
        expires_in=expire_secs,
    )


@router.post("/login", response_model=AuthResponse)
async def login(payload: LoginRequest, response: Response):
    """Login with email + password."""
    svc = _user_service()
    user = await svc.verify_credentials(payload.email, payload.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password.",
        )

    expire_secs = settings.JWT_EXPIRE_MINUTES * 60
    token = create_access_token(
        user_id=user["user_id"],
        user_type=UserType.AUTHENTICATED.value,
        name=user["name"],
        email=user["email"],
        expires_delta=timedelta(minutes=settings.JWT_EXPIRE_MINUTES),
    )
    _set_cookie(response, token, expire_secs)
    return AuthResponse(
        access_token=token,
        user_type=UserType.AUTHENTICATED,
        user_id=user["user_id"],
        name=user["name"],
        expires_in=expire_secs,
    )


@router.post("/guest", response_model=GuestSessionResponse, status_code=status.HTTP_201_CREATED)
async def create_guest_session(response: Response):
    """
    One-click guest access — no credentials required.
    Generates a cryptographically secure session ID, persists it in DynamoDB,
    and returns a signed JWT scoped to that session.
    """
    svc = _user_service()
    session_id = generate_guest_session_id()
    await svc.create_guest_session(session_id)

    expire_secs = settings.GUEST_SESSION_EXPIRE_HOURS * 3600
    token = create_access_token(
        user_id=session_id,
        user_type=UserType.GUEST.value,
        expires_delta=timedelta(hours=settings.GUEST_SESSION_EXPIRE_HOURS),
    )
    _set_cookie(response, token, expire_secs)
    return GuestSessionResponse(
        session_id=session_id,
        token=token,
        user_type=UserType.GUEST,
        expires_in=expire_secs,
    )


@router.get("/me", response_model=UserProfile)
async def get_me(current_user: CurrentUser = Depends(get_current_user)):
    return UserProfile(
        user_id=current_user.user_id,
        user_type=current_user.user_type,
        name=current_user.name,
        email=current_user.email,
        created_at=datetime.now(timezone.utc),
    )


@router.post("/logout")
async def logout(response: Response):
    response.delete_cookie("mindease_token")
    return {"message": "Logged out successfully"}


# ── helpers ───────────────────────────────────────────────────────────────────

def _set_cookie(response: Response, token: str, max_age: int) -> None:
    response.set_cookie(
        key="mindease_token",
        value=token,
        httponly=settings.COOKIE_HTTPONLY,
        secure=settings.COOKIE_SECURE,
        samesite=settings.COOKIE_SAMESITE,
        max_age=max_age,
    )
