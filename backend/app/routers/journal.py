"""Journal routes."""
import logging

from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.core.dependencies import CurrentUser, get_current_user
from app.models.schemas import JournalEntryCreate, JournalEntryResponse, JournalHistoryResponse
from app.services.journal_service import JournalService

router = APIRouter(prefix="/journal", tags=["Journal"])
logger = logging.getLogger(__name__)


def _svc() -> JournalService:
    return JournalService()


def _to_response(doc: dict) -> JournalEntryResponse:
    return JournalEntryResponse(
        entry_id=doc["entry_id"],
        content=doc["content"],
        exam_type=doc.get("exam_type"),
        study_hours=doc.get("study_hours"),
        created_at=doc["created_at"],
        ai_analysis=doc.get("ai_analysis"),
    )


@router.post("", response_model=JournalEntryResponse, status_code=status.HTTP_201_CREATED)
async def create_journal_entry(
    payload: JournalEntryCreate,
    current_user: CurrentUser = Depends(get_current_user),
):
    svc = _svc()
    doc = await svc.create_entry(
        owner_id=current_user.user_id,
        content=payload.content,
        exam_type=payload.exam_type,
        study_hours=payload.study_hours,
    )
    return _to_response(doc)


@router.get("/history", response_model=JournalHistoryResponse)
async def get_journal_history(
    limit: int = Query(default=20, ge=1, le=50),
    offset: int = Query(default=0, ge=0),
    current_user: CurrentUser = Depends(get_current_user),
):
    svc = _svc()
    entries = await svc.get_history(current_user.user_id, limit, offset)
    total = await svc.count_entries(current_user.user_id)
    return JournalHistoryResponse(entries=[_to_response(e) for e in entries], total=total)
