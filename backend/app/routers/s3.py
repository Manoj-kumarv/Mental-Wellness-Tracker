"""
S3 pre-signed URL routes.
Clients upload files directly to S3 — the backend issues time-limited
signed URLs and never proxies file content.
"""
import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field

from app.config import get_settings
from app.core.dependencies import CurrentUser, get_current_user
from app.services.s3_service import S3Service

router = APIRouter(prefix="/storage", tags=["Storage — S3"])
settings = get_settings()

ALLOWED_CONTENT_TYPES = {
    "image/jpeg", "image/png", "image/webp",
    "application/pdf", "text/plain",
}


class PresignedUploadRequest(BaseModel):
    filename: str = Field(..., max_length=255)
    content_type: str = Field(..., max_length=100)
    is_public: bool = False


class PresignedUploadResponse(BaseModel):
    upload_url: str
    key: str
    bucket: str
    expires_in: int = 300


@router.post("/presign-upload", response_model=PresignedUploadResponse)
async def get_presigned_upload_url(
    payload: PresignedUploadRequest,
    current_user: CurrentUser = Depends(get_current_user),
):
    """
    Generate a pre-signed S3 PUT URL.
    The client uploads directly to S3 — no file data passes through the API.
    """
    if payload.content_type not in ALLOWED_CONTENT_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Content type '{payload.content_type}' is not allowed.",
        )

    # Namespace key under owner to prevent cross-user access
    ext = payload.filename.rsplit(".", 1)[-1] if "." in payload.filename else "bin"
    key = f"uploads/{current_user.user_id}/{uuid.uuid4().hex}.{ext}"
    bucket = settings.S3_PUBLIC_BUCKET if payload.is_public else settings.S3_PRIVATE_BUCKET

    svc = S3Service()
    url = svc.generate_presigned_upload_url(
        bucket=bucket,
        key=key,
        content_type=payload.content_type,
    )
    if not url:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Could not generate upload URL. Try again.",
        )

    return PresignedUploadResponse(upload_url=url, key=key, bucket=bucket)
