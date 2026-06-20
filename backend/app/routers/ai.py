"""
AI routes — journal analysis, chat, weekly insights.
All inference via AWS Bedrock (no external API keys).
"""
import logging
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, status

from app.core.dependencies import CurrentUser, get_current_user
from app.core.security import generate_conversation_id
from app.models.schemas import (
    ChatRequest,
    ChatResponse,
    JournalAnalysisRequest,
    JournalAnalysisResponse,
    WeeklyInsightResponse,
)
from app.services.ai_service import get_ai_service
from app.services.chat_service import ChatService
from app.services.journal_service import JournalService
from app.services.mood_service import MoodService

router = APIRouter(prefix="/ai", tags=["AI — AWS Bedrock"])
logger = logging.getLogger(__name__)


@router.post("/analyze-journal", response_model=JournalAnalysisResponse)
async def analyze_journal(
    payload: JournalAnalysisRequest,
    current_user: CurrentUser = Depends(get_current_user),
):
    """
    Analyse a journal entry via AWS Bedrock (Claude / Titan).
    Detects emotions, stress triggers, patterns, suggests coping strategies.
    """
    j_svc = JournalService()
    m_svc = MoodService()

    entry = await j_svc.get_entry(payload.entry_id, current_user.user_id)
    if not entry:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Entry not found.")

    recent_mood_avg = await m_svc.get_average_mood(current_user.user_id, days=7)

    ai = get_ai_service()
    analysis = ai.analyze_journal(
        content=entry["content"],
        exam_type=entry.get("exam_type"),
        study_hours=entry.get("study_hours"),
        recent_mood_average=recent_mood_avg,
    )

    # Persist analysis back to the entry
    await j_svc.save_ai_analysis(payload.entry_id, current_user.user_id, analysis)

    now = datetime.now(timezone.utc)
    return JournalAnalysisResponse(
        entry_id=payload.entry_id,
        emotions_detected=analysis.get("emotions_detected", []),
        stress_triggers=analysis.get("stress_triggers", []),
        patterns=analysis.get("patterns", []),
        coping_suggestions=analysis.get("coping_suggestions", []),
        mindfulness_exercise=analysis.get("mindfulness_exercise", ""),
        empathy_message=analysis.get("empathy_message", ""),
        safety_note=analysis.get("safety_note", ""),
        sentiment_score=float(analysis.get("sentiment_score", 0.0)),
        analyzed_at=now,
    )


@router.post("/chat", response_model=ChatResponse)
async def chat(
    payload: ChatRequest,
    current_user: CurrentUser = Depends(get_current_user),
):
    """
    Multi-turn empathetic AI chat via AWS Bedrock.
    Context-aware: injects recent journal/mood data into the conversation.
    """
    chat_svc = ChatService()
    j_svc = JournalService()
    m_svc = MoodService()

    conversation_id = payload.conversation_id or generate_conversation_id()

    # Load history
    raw_history = await chat_svc.get_conversation_history(
        conversation_id, current_user.user_id
    )
    history = [{"role": msg["role"], "content": msg["content"]} for msg in raw_history]

    # Build user context from recent data
    recent_entries = await j_svc.get_recent_entries(current_user.user_id, days=3)
    recent_logs = await m_svc.get_recent_logs(current_user.user_id, days=3)

    user_context: dict = {}
    if recent_entries:
        user_context["recent_journal"] = recent_entries[0].get("content", "")
    if recent_logs:
        user_context["current_mood"] = recent_logs[0].get("mood")
        user_context["current_stress"] = recent_logs[0].get("stress")

    # Persist user message
    await chat_svc.save_message(conversation_id, current_user.user_id, "user", payload.message)

    # Bedrock inference
    ai = get_ai_service()
    result = ai.chat(
        message=payload.message,
        history=history,
        user_context=user_context or None,
    )

    # Persist AI reply (role="assistant" in our storage)
    await chat_svc.save_message(
        conversation_id, current_user.user_id, "assistant", result["reply"]
    )

    return ChatResponse(
        reply=result["reply"],
        conversation_id=conversation_id,
        safety_reminder=result.get("safety_reminder"),
        timestamp=datetime.now(timezone.utc),
    )


@router.get("/weekly-insights", response_model=WeeklyInsightResponse)
async def get_weekly_insights(
    current_user: CurrentUser = Depends(get_current_user),
):
    """
    AI-generated weekly emotional summary via AWS Bedrock.
    Aggregates 7 days of journal entries + mood logs.
    """
    j_svc = JournalService()
    m_svc = MoodService()

    journal_entries = await j_svc.get_recent_entries(current_user.user_id, days=7)
    mood_logs = await m_svc.get_recent_logs(current_user.user_id, days=7)

    exam_type = journal_entries[0].get("exam_type") if journal_entries else None

    ai = get_ai_service()
    insights = ai.generate_weekly_insights(
        journal_entries=journal_entries,
        mood_logs=mood_logs,
        exam_type=exam_type,
    )

    now = datetime.now(timezone.utc)
    return WeeklyInsightResponse(
        week_start=now - timedelta(days=7),
        week_end=now,
        mood_trend=insights.get("mood_trend", ""),
        stress_trend=insights.get("stress_trend", ""),
        dominant_emotions=insights.get("dominant_emotions", []),
        top_triggers=insights.get("top_triggers", []),
        positive_patterns=insights.get("positive_patterns", []),
        areas_of_concern=insights.get("areas_of_concern", []),
        personalized_recommendations=insights.get("personalized_recommendations", []),
        motivational_message=insights.get("motivational_message", ""),
        safety_disclaimer=insights.get("safety_disclaimer", ""),
        generated_at=now,
    )
