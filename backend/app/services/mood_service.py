"""
Mood service — DynamoDB operations for mood logs.

Key schema
──────────
  PK = USER#{owner_id}
  SK = MOOD#{iso_timestamp}#{log_id}

GSI2:
  GSI2PK = OWNER#{owner_id}
  GSI2SK = MOOD#{iso_timestamp}
"""
import logging
import uuid
from datetime import datetime, timedelta, timezone
from typing import Optional

from boto3.dynamodb.conditions import Key

from app.db.dynamodb import get_main_table

logger = logging.getLogger(__name__)


class MoodService:
    def __init__(self) -> None:
        self._table = get_main_table()

    async def create_log(
        self,
        owner_id: str,
        mood: int,
        stress: int,
        notes: Optional[str] = None,
        activities: Optional[list[str]] = None,
    ) -> dict:
        log_id = f"mood_{uuid.uuid4().hex}"
        now = datetime.now(timezone.utc).isoformat()

        item = {
            "PK": f"USER#{owner_id}",
            "SK": f"MOOD#{now}#{log_id}",
            "GSI2PK": f"OWNER#{owner_id}",
            "GSI2SK": f"MOOD#{now}",
            "log_id": log_id,
            "owner_id": owner_id,
            "mood": mood,
            "stress": stress,
            "notes": notes,
            "activities": activities or [],
            "created_at": now,
        }
        self._table.put_item(Item=item)
        return item

    async def get_history(self, owner_id: str, limit: int = 20, offset: int = 0) -> list[dict]:
        resp = self._table.query(
            KeyConditionExpression=(
                Key("PK").eq(f"USER#{owner_id}")
                & Key("SK").begins_with("MOOD#")
            ),
            ScanIndexForward=False,
            Limit=limit + offset,
        )
        return resp.get("Items", [])[offset: offset + limit]

    async def get_recent_logs(self, owner_id: str, days: int = 7) -> list[dict]:
        cutoff = (datetime.now(timezone.utc) - timedelta(days=days)).isoformat()
        resp = self._table.query(
            IndexName="GSI2-owner-date-index",
            KeyConditionExpression=(
                Key("GSI2PK").eq(f"OWNER#{owner_id}")
                & Key("GSI2SK").gte(f"MOOD#{cutoff}")
            ),
            ScanIndexForward=False,
        )
        return resp.get("Items", [])

    async def get_average_mood(self, owner_id: str, days: int = 7) -> Optional[float]:
        logs = await self.get_recent_logs(owner_id, days)
        if not logs:
            return None
        return sum(int(l["mood"]) for l in logs) / len(logs)

    async def count_logs(self, owner_id: str) -> int:
        resp = self._table.query(
            Select="COUNT",
            KeyConditionExpression=(
                Key("PK").eq(f"USER#{owner_id}")
                & Key("SK").begins_with("MOOD#")
            ),
        )
        return resp.get("Count", 0)
