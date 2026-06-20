"""
FastAPI dependency injection — current user from JWT (auth or guest).
"""
import logging
from typing import Optional

from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError

from app.core.security import decode_token
from app.models.schemas import UserType

logger = logging.getLogger(__name__)
bearer_scheme = HTTPBearer(auto_error=False)


class CurrentUser:
    def __init__(
        self,
        user_id: str,
        user_type: UserType,
        name: Optional[str] = None,
        email: Optional[str] = None,
    ):
        self.user_id = user_id
        self.user_type = user_type
        self.name = name
        self.email = email

    @property
    def is_guest(self) -> bool:
        return self.user_type == UserType.GUEST

    @property
    def is_authenticated(self) -> bool:
        return self.user_type == UserType.AUTHENTICATED


def _extract_token(
    request: Request,
    credentials: Optional[HTTPAuthorizationCredentials],
) -> Optional[str]:
    if credentials and credentials.credentials:
        return credentials.credentials
    return request.cookies.get("mindease_token")


async def get_current_user(
    request: Request,
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(bearer_scheme),
) -> CurrentUser:
    token = _extract_token(request, credentials)
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required. Please login or continue as guest.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    try:
        payload = decode_token(token)
        user_id: str = payload.get("sub", "")
        user_type_str: str = payload.get("user_type", "guest")
        if not user_id:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token.")
        return CurrentUser(
            user_id=user_id,
            user_type=UserType(user_type_str),
            name=payload.get("name"),
            email=payload.get("email"),
        )
    except JWTError as exc:
        logger.warning(f"JWT validation failed: {exc}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token is invalid or expired.",
            headers={"WWW-Authenticate": "Bearer"},
        )
