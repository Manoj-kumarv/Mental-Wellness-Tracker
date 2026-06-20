"""
S3 service — pre-signed URL generation for file uploads/downloads.
Separate buckets for public and private assets.
"""
import logging
from typing import Optional

import boto3
from botocore.exceptions import ClientError

from app.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()


class S3Service:
    def __init__(self) -> None:
        kwargs: dict = {"region_name": settings.AWS_REGION}
        if settings.AWS_ACCESS_KEY_ID:
            kwargs["aws_access_key_id"] = settings.AWS_ACCESS_KEY_ID
            kwargs["aws_secret_access_key"] = settings.AWS_SECRET_ACCESS_KEY
        self._client = boto3.client("s3", **kwargs)

    def generate_presigned_upload_url(
        self,
        bucket: str,
        key: str,
        content_type: str = "application/octet-stream",
        expiry_seconds: int = 300,
    ) -> Optional[str]:
        """
        Generate a pre-signed PUT URL so the client can upload directly to S3.
        The backend never touches the file content — zero-trust upload.
        """
        try:
            url = self._client.generate_presigned_url(
                "put_object",
                Params={
                    "Bucket": bucket,
                    "Key": key,
                    "ContentType": content_type,
                },
                ExpiresIn=expiry_seconds,
            )
            return url
        except ClientError as exc:
            logger.error(f"S3 presign upload error: {exc}")
            return None

    def generate_presigned_download_url(
        self,
        bucket: str,
        key: str,
        expiry_seconds: int = 3600,
    ) -> Optional[str]:
        """Generate a pre-signed GET URL for private asset access."""
        try:
            return self._client.generate_presigned_url(
                "get_object",
                Params={"Bucket": bucket, "Key": key},
                ExpiresIn=expiry_seconds,
            )
        except ClientError as exc:
            logger.error(f"S3 presign download error: {exc}")
            return None

    def delete_object(self, bucket: str, key: str) -> bool:
        try:
            self._client.delete_object(Bucket=bucket, Key=key)
            return True
        except ClientError as exc:
            logger.error(f"S3 delete error: {exc}")
            return False
