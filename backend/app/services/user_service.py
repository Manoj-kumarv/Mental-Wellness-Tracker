"""
User service — DynamoDB single-table operations for users and guest sessions.

Key schema
──────────
Authenticated user:
  PK = USER#{user_id}    SK = PROFILE
  GSI1PK = EMAIL#{email} GSI1SK = USER#{user_id}

Guest session:
  PK = SESSION#{session_id}  SK = PROFILE
"""
import logging
import uuid
from datetime import datetime, timezone
from typing import Optional

from boto3.dynamodb.conditions import Key
from botocore.exceptions import ClientError

from app.core.security import hash_password, verify_password
from app.db.dynamodb import get_main_table
from app.models.schemas import UserType

logger = logging.getLogger(__name__)


class UserService:
    def __init__(self) -> None:
        self._table = get_main_table()

    # ── Authenticated users ────────────────────────────────────────────────

    async def create_user(self, email: str, password: str, name: str) -> dict:
        existing = await self.get_user_by_email(email)
        if existing:
            raise ValueError("Email already registered")

        user_id = f"user_{uuid.uuid4().hex}"
        now = datetime.now(timezone.utc).isoformat()

        item = {
            "PK": f"USER#{user_id}",
            "SK": "PROFILE",
            "GSI1PK": f"EMAIL#{email.lower()}",
            "GSI1SK": f"USER#{user_id}",
            "user_id": user_id,
            "email": email.lower(),
            "name": name,
            "password_hash": hash_password(password),
            "user_type": UserType.AUTHENTICATED.value,
            "created_at": now,
            "last_login": now,
        }

        self._table.put_item(
            Item=item,
            ConditionExpression="attribute_not_exists(PK)",
        )
        logger.info(f"Created user: {user_id}")
        return item

    async def get_user_by_email(self, email: str) -> Optional[dict]:
        resp = self._table.query(
            IndexName="GSI1-email-index",
            KeyConditionExpression=Key("GSI1PK").eq(f"EMAIL#{email.lower()}"),
            Limit=1,
        )
        items = resp.get("Items", [])
        return items[0] if items else None

    async def get_user_by_id(self, user_id: str) -> Optional[dict]:
        resp = self._table.get_item(
            Key={"PK": f"USER#{user_id}", "SK": "PROFILE"}
        )
        return resp.get("Item")

    async def verify_credentials(self, email: str, password: str) -> Optional[dict]:
        user = await self.get_user_by_email(email)
        if not user:
            return None
        if not verify_password(password, user.get("password_hash", "")):
            return None

        # Update last_login (best-effort)
        try:
            self._table.update_item(
                Key={"PK": f"USER#{user['user_id']}", "SK": "PROFILE"},
                UpdateExpression="SET last_login = :ts",
                ExpressionAttributeValues={":ts": datetime.now(timezone.utc).isoformat()},
            )
        except ClientError:
            pass

        return user

    # ── Guest sessions ─────────────────────────────────────────────────────

    async def create_guest_session(self, session_id: str) -> dict:
        now = datetime.now(timezone.utc).isoformat()
        item = {
            "PK": f"SESSION#{session_id}",
            "SK": "PROFILE",
            "session_id": session_id,
            "user_type": UserType.GUEST.value,
            "created_at": now,
            "last_active": now,
        }
        self._table.put_item(Item=item)
        logger.info(f"Created guest session: {session_id}")
        return item

    async def touch_guest_session(self, session_id: str) -> None:
        try:
            self._table.update_item(
                Key={"PK": f"SESSION#{session_id}", "SK": "PROFILE"},
                UpdateExpression="SET last_active = :ts",
                ExpressionAttributeValues={
                    ":ts": datetime.now(timezone.utc).isoformat()
                },
            )
        except ClientError:
            pass
