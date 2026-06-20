"""Mood routes."""
import logging

from fastapi import APIRouter, Depends, Query, status

from app.core.dependencies import CurrentUser, get_current_user
from app.models.schemas import MoodHistoryResponse, MoodLogCreate, MoodLogResponse
from app.services.mood_service import MoodService

router = APIRouter(prefix="/mood", tags=["Mood"])
logger = logging.getLogger(__name__)


def _svc() -> MoodService:
    return MoodService()


def _to_response(doc: dict) -> MoodLogResponse:
    return MoodLogResponse(
        log_id=doc["log_id"],
        mood=int(doc["mood"]),
        stress=int(doc["stress"]),
        notes=doc.get("notes"),
        activities=doc.get("activities", []),
        created_at=doc["created_at"],
    )


@router.post("", response_model=MoodLogResponse, status_code=status.HTTP_201_CREATED)
async def log_mood(
    payload: MoodLogCreate,
    current_user: CurrentUser = Depends(get_current_user),
):
    svc = _svc()
    doc = await svc.create_log(
        owner_id=current_user.user_id,
        mood=payload.mood.value,
        stress=payload.stress.value,
        notes=payload.notes,
        activities=payload.activities,
    )
    return _to_response(doc)


@router.get("/history", response_model=MoodHistoryResponse)
async def get_mood_history(
    limit: int = Query(default=20, ge=1, le=50),
    offset: int = Query(default=0, ge=0),
    current_user: CurrentUser = Depends(get_current_user),
):
    svc = _svc()
    logs = await svc.get_history(current_user.user_id, limit, offset)
    total = await svc.count_logs(current_user.user_id)
    return MoodHistoryResponse(logs=[_to_response(l) for l in logs], total=total)
