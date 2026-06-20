"""
Journal service — DynamoDB operations for journal entries.

Key schema
──────────
  PK = USER#{owner_id}
  SK = JOURNAL#{iso_timestamp}#{entry_id}   ← range-sortable by date

GSI2 (date-range queries):
  GSI2PK = OWNER#{owner_id}
  GSI2SK = JOURNAL#{iso_timestamp}
"""
import logging
import uuid
from datetime import datetime, timedelta, timezone
from typing import Optional

from boto3.dynamodb.conditions import Key
from botocore.exceptions import ClientError

from app.db.dynamodb import get_main_table

logger = logging.getLogger(__name__)


class JournalService:
    def __init__(self) -> None:
        self._table = get_main_table()

    # ── CRUD ───────────────────────────────────────────────────────────────

    async def create_entry(
        self,
        owner_id: str,
        content: str,
        exam_type: Optional[str] = None,
        study_hours: Optional[float] = None,
    ) -> dict:
        entry_id = f"jnl_{uuid.uuid4().hex}"
        now = datetime.now(timezone.utc).isoformat()

        item = {
            "PK": f"USER#{owner_id}",
            "SK": f"JOURNAL#{now}#{entry_id}",
            "GSI2PK": f"OWNER#{owner_id}",
            "GSI2SK": f"JOURNAL#{now}",
            "entry_id": entry_id,
            "owner_id": owner_id,
            "content": content,
            "exam_type": exam_type,
            "study_hours": str(study_hours) if study_hours is not None else None,
            "ai_analysis": None,
            "created_at": now,
            "updated_at": now,
        }
        self._table.put_item(Item=item)
        logger.info(f"Journal entry created: {entry_id}")
        return self._deserialise(item)

    async def get_entry(self, entry_id: str, owner_id: str) -> Optional[dict]:
        """Scan SK begins_with JOURNAL# and match entry_id — ownership enforced."""
        resp = self._table.query(
            KeyConditionExpression=(
                Key("PK").eq(f"USER#{owner_id}")
                & Key("SK").begins_with("JOURNAL#")
            ),
            FilterExpression="entry_id = :eid",
            ExpressionAttributeValues={":eid": entry_id},
            Limit=1,
        )
        items = resp.get("Items", [])
        return self._deserialise(items[0]) if items else None

    async def save_ai_analysis(self, entry_id: str, owner_id: str, analysis: dict) -> None:
        # We need the full SK to update — query first
        entry = await self.get_entry(entry_id, owner_id)
        if not entry:
            return
        sk = f"JOURNAL#{entry['created_at']}#{entry_id}"
        try:
            self._table.update_item(
                Key={"PK": f"USER#{owner_id}", "SK": sk},
                UpdateExpression="SET ai_analysis = :a, updated_at = :ts",
                ExpressionAttributeValues={
                    ":a": analysis,
                    ":ts": datetime.now(timezone.utc).isoformat(),
                },
            )
        except ClientError as exc:
            logger.warning(f"Could not update ai_analysis: {exc}")

    async def get_history(
        self, owner_id: str, limit: int = 20, offset: int = 0
    ) -> list[dict]:
        """Return journal entries, newest first."""
        resp = self._table.query(
            KeyConditionExpression=(
                Key("PK").eq(f"USER#{owner_id}")
                & Key("SK").begins_with("JOURNAL#")
            ),
            ScanIndexForward=False,  # descending (newest first)
            Limit=limit + offset,
        )
        items = resp.get("Items", [])[offset: offset + limit]
        return [self._deserialise(i) for i in items]

    async def get_recent_entries(self, owner_id: str, days: int = 7) -> list[dict]:
        cutoff = (datetime.now(timezone.utc) - timedelta(days=days)).isoformat()
        resp = self._table.query(
            IndexName="GSI2-owner-date-index",
            KeyConditionExpression=(
                Key("GSI2PK").eq(f"OWNER#{owner_id}")
                & Key("GSI2SK").gte(f"JOURNAL#{cutoff}")
            ),
            ScanIndexForward=False,
        )
        return [self._deserialise(i) for i in resp.get("Items", [])]

    async def count_entries(self, owner_id: str) -> int:
        resp = self._table.query(
            Select="COUNT",
            KeyConditionExpression=(
                Key("PK").eq(f"USER#{owner_id}")
                & Key("SK").begins_with("JOURNAL#")
            ),
        )
        return resp.get("Count", 0)

    # ── Helpers ────────────────────────────────────────────────────────────

    @staticmethod
    def _deserialise(item: dict) -> dict:
        """Convert DynamoDB types back to Python primitives."""
        out = dict(item)
        if out.get("study_hours") and out["study_hours"] != "None":
            out["study_hours"] = float(out["study_hours"])
        else:
            out["study_hours"] = None
        return out
