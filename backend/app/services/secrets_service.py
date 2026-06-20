"""
AWS Secrets Manager integration.
Fetches secrets at startup and caches them in memory.
Falls back to environment variables when USE_SECRETS_MANAGER=false.
"""
import json
import logging
from functools import lru_cache
from typing import Optional

import boto3
from botocore.exceptions import ClientError

from app.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()


@lru_cache(maxsize=32)
def get_secret(secret_name: str) -> Optional[str]:
    """
    Fetch a secret string from AWS Secrets Manager.
    Returns None if the secret cannot be retrieved.
    Cached per secret name for the process lifetime.
    """
    if not settings.USE_SECRETS_MANAGER:
        return None

    client = boto3.client("secretsmanager", region_name=settings.AWS_REGION)

    try:
        response = client.get_secret_value(SecretId=secret_name)
        secret = response.get("SecretString") or response.get("SecretBinary", b"").decode()

        # If it's a JSON object, return the whole string;
        # callers can json.loads() if needed.
        return secret
    except ClientError as e:
        code = e.response["Error"]["Code"]
        logger.error(f"Secrets Manager error for '{secret_name}': {code} — {e}")
        return None


def get_jwt_secret() -> str:
    """
    Return JWT secret — from Secrets Manager in production,
    from env var in development.
    """
    if settings.USE_SECRETS_MANAGER:
        secret = get_secret(settings.SECRET_NAME_JWT)
        if secret:
            # Secret may be stored as plain string or JSON {"value": "..."}
            try:
                return json.loads(secret)["value"]
            except (json.JSONDecodeError, KeyError):
                return secret

    return settings.JWT_SECRET_KEY
