"""
Chat service — DynamoDB for conversation history.

Key schema
──────────
  PK = USER#{owner_id}
  SK = CHAT#{conv_id}#{iso_timestamp}#{msg_id}
"""
import logging
import uuid
from datetime import datetime, timezone

from boto3.dynamodb.conditions import Key

from app.db.dynamodb import get_main_table

logger = logging.getLogger(__name__)


class ChatService:
    def __init__(self) -> None:
        self._table = get_main_table()

    async def save_message(
        self,
        conversation_id: str,
        owner_id: str,
        role: str,
        content: str,
    ) -> dict:
        msg_id = f"msg_{uuid.uuid4().hex}"
        now = datetime.now(timezone.utc).isoformat()

        item = {
            "PK": f"USER#{owner_id}",
            "SK": f"CHAT#{conversation_id}#{now}#{msg_id}",
            "msg_id": msg_id,
            "conversation_id": conversation_id,
            "owner_id": owner_id,
            "role": role,
            "content": content,
            "created_at": now,
        }
        self._table.put_item(Item=item)
        return item

    async def get_conversation_history(
        self,
        conversation_id: str,
        owner_id: str,
        limit: int = 20,
    ) -> list[dict]:
        """Return messages oldest-first for context window."""
        resp = self._table.query(
            KeyConditionExpression=(
                Key("PK").eq(f"USER#{owner_id}")
                & Key("SK").begins_with(f"CHAT#{conversation_id}#")
            ),
            ScanIndexForward=True,   # ascending — oldest first
            Limit=limit,
        )
        return resp.get("Items", [])

    async def conversation_belongs_to(
        self, conversation_id: str, owner_id: str
    ) -> bool:
        resp = self._table.query(
            Select="COUNT",
            KeyConditionExpression=(
                Key("PK").eq(f"USER#{owner_id}")
                & Key("SK").begins_with(f"CHAT#{conversation_id}#")
            ),
            Limit=1,
        )
        return resp.get("Count", 0) > 0
