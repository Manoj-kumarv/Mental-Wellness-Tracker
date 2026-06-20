"""
Pydantic schemas for all request/response models.
"""
from datetime import datetime
from enum import Enum
from typing import Any, Optional
from pydantic import BaseModel, EmailStr, Field, field_validator
import re


# ──────────────────────────────────────────
# Enums
# ──────────────────────────────────────────

class MoodLevel(int, Enum):
    VERY_LOW = 1
    LOW = 2
    NEUTRAL = 3
    GOOD = 4
    EXCELLENT = 5


class StressLevel(int, Enum):
    VERY_HIGH = 1
    HIGH = 2
    MODERATE = 3
    LOW = 4
    MINIMAL = 5


class UserType(str, Enum):
    AUTHENTICATED = "authenticated"
    GUEST = "guest"


# ──────────────────────────────────────────
# Auth Schemas
# ──────────────────────────────────────────

class SignupRequest(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=8, max_length=128)
    name: str = Field(..., min_length=1, max_length=100)

    @field_validator("password")
    @classmethod
    def password_strength(cls, v: str) -> str:
        if not re.search(r"[A-Z]", v):
            raise ValueError("Password must contain at least one uppercase letter")
        if not re.search(r"[0-9]", v):
            raise ValueError("Password must contain at least one digit")
        return v

    @field_validator("name")
    @classmethod
    def sanitize_name(cls, v: str) -> str:
        return v.strip()


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=1)


class AuthResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user_type: UserType
    user_id: str
    name: Optional[str] = None
    expires_in: int  # seconds


class GuestSessionResponse(BaseModel):
    session_id: str
    token: str
    token_type: str = "bearer"
    user_type: UserType = UserType.GUEST
    expires_in: int


class UserProfile(BaseModel):
    user_id: str
    user_type: UserType
    name: Optional[str] = None
    email: Optional[str] = None
    created_at: datetime


# ──────────────────────────────────────────
# Journal Schemas
# ──────────────────────────────────────────

class JournalEntryCreate(BaseModel):
    content: str = Field(..., min_length=10, max_length=5000)
    exam_type: Optional[str] = Field(None, max_length=50)
    study_hours: Optional[float] = Field(None, ge=0, le=24)

    @field_validator("exam_type")
    @classmethod
    def validate_exam(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return v
        allowed = {"NEET", "JEE", "CUET", "CAT", "GATE", "UPSC", "OTHER"}
        if v.upper() not in allowed:
            raise ValueError(f"exam_type must be one of {allowed}")
        return v.upper()


class JournalEntryResponse(BaseModel):
    entry_id: str
    content: str
    exam_type: Optional[str]
    study_hours: Optional[float]
    created_at: datetime
    ai_analysis: Optional[dict[str, Any]] = None


class JournalHistoryResponse(BaseModel):
    entries: list[JournalEntryResponse]
    total: int


# ──────────────────────────────────────────
# Mood Schemas
# ──────────────────────────────────────────

class MoodLogCreate(BaseModel):
    mood: MoodLevel
    stress: StressLevel
    notes: Optional[str] = Field(None, max_length=500)
    activities: Optional[list[str]] = Field(default_factory=list, max_length=10)


class MoodLogResponse(BaseModel):
    log_id: str
    mood: int
    stress: int
    notes: Optional[str]
    activities: list[str]
    created_at: datetime


class MoodHistoryResponse(BaseModel):
    logs: list[MoodLogResponse]
    total: int


# ──────────────────────────────────────────
# AI Schemas
# ──────────────────────────────────────────

class JournalAnalysisRequest(BaseModel):
    entry_id: str


class JournalAnalysisResponse(BaseModel):
    entry_id: str
    emotions_detected: list[str]
    stress_triggers: list[str]
    patterns: list[str]
    coping_suggestions: list[str]
    mindfulness_exercise: str
    empathy_message: str
    safety_note: str
    sentiment_score: float = Field(..., ge=-1.0, le=1.0)
    analyzed_at: datetime


class ChatMessage(BaseModel):
    role: str  # "user" or "assistant"
    content: str
    timestamp: datetime


class ChatRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=2000)
    conversation_id: Optional[str] = None


class ChatResponse(BaseModel):
    reply: str
    conversation_id: str
    safety_reminder: Optional[str] = None
    timestamp: datetime


class WeeklyInsightResponse(BaseModel):
    week_start: datetime
    week_end: datetime
    mood_trend: str
    stress_trend: str
    dominant_emotions: list[str]
    top_triggers: list[str]
    positive_patterns: list[str]
    areas_of_concern: list[str]
    personalized_recommendations: list[str]
    motivational_message: str
    safety_disclaimer: str
    generated_at: datetime


# ──────────────────────────────────────────
# Common
# ──────────────────────────────────────────

class HealthResponse(BaseModel):
    status: str
    version: str
    environment: str
    timestamp: datetime


class ErrorResponse(BaseModel):
    detail: str
    code: Optional[str] = None
