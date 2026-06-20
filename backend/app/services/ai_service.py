"""
AI Service — all Generative AI via AWS Bedrock.

Models used (configurable via BEDROCK_MODEL_ID env var):
  Default : anthropic.claude-3-haiku-20240307-v1:0  (fast, cost-efficient)
  Upgraded: anthropic.claude-3-sonnet-20240229-v1:0 (richer responses)
  Fallback : amazon.titan-text-express-v1            (if Claude not available)

All prompts follow Anthropic's Messages API format via Bedrock's
InvokeModel / Converse API.  No external API keys — authentication
is handled by the EC2 instance's IAM role (or local AWS credentials).
"""
import json
import logging
import re
from datetime import datetime, timezone
from typing import Optional

import boto3
from botocore.exceptions import ClientError

from app.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()

# ─────────────────────────────────────────────────────────────────────────────
# System prompt — shared across all AI features
# ─────────────────────────────────────────────────────────────────────────────
SYSTEM_PROMPT = """You are MindEase, an empathetic AI wellness companion built \
specifically for students preparing for competitive exams like NEET, JEE, CUET, \
CAT, GATE, and UPSC in India.

Your core principles:
1. EMPATHY FIRST — always acknowledge feelings before offering advice.
2. NON-DIAGNOSTIC — never diagnose, label, or suggest mental health conditions.
3. SAFETY — if a student expresses thoughts of self-harm or severe distress, \
always provide crisis resources: iCall: 9152987821, \
Vandrevala Foundation: 1860-2662-345.
4. GROUNDED — give practical, exam-focused wellness support.
5. ENCOURAGING — celebrate small wins, normalise struggle, build resilience.
6. BOUNDARY-AWARE — clarify you are an AI tool, not a therapist.

You understand the specific pressures of Indian competitive exam culture: \
parental expectations, peer competition, long study hours, fear of failure, \
financial stakes, and social isolation.

NEVER: diagnose mental health conditions, prescribe treatment, replace \
professional help, make promises about outcomes.
ALWAYS: validate emotions, suggest evidence-based coping strategies, \
encourage professional support when needed."""


class BedrockAIService:
    """
    Wraps AWS Bedrock Converse API for all AI features.
    Uses IAM role credentials — no API keys in code.
    """

    def __init__(self) -> None:
        kwargs: dict = {"region_name": settings.BEDROCK_REGION}
        if settings.AWS_ACCESS_KEY_ID:
            kwargs["aws_access_key_id"] = settings.AWS_ACCESS_KEY_ID
            kwargs["aws_secret_access_key"] = settings.AWS_SECRET_ACCESS_KEY
        self._client = boto3.client("bedrock-runtime", **kwargs)
        self._model_id = settings.BEDROCK_MODEL_ID
        logger.info(f"BedrockAIService initialised — model: {self._model_id}")

    # ── Low-level Converse wrapper ─────────────────────────────────────────

    def _converse(
        self,
        messages: list[dict],
        system: str = SYSTEM_PROMPT,
        max_tokens: int = 2048,
        temperature: float = 0.7,
    ) -> str:
        """
        Call Bedrock Converse API and return the assistant text.
        Handles both Anthropic Claude and Amazon Titan model families.
        """
        try:
            response = self._client.converse(
                modelId=self._model_id,
                system=[{"text": system}],
                messages=messages,
                inferenceConfig={
                    "maxTokens": max_tokens,
                    "temperature": temperature,
                    "topP": 0.9,
                },
            )
            return response["output"]["message"]["content"][0]["text"].strip()

        except ClientError as exc:
            code = exc.response["Error"]["Code"]
            logger.error(f"Bedrock ClientError [{code}]: {exc}")
            raise RuntimeError(f"Bedrock inference error: {code}") from exc

    # ── Journal Analysis ───────────────────────────────────────────────────

    def analyze_journal(
        self,
        content: str,
        exam_type: Optional[str],
        study_hours: Optional[float],
        recent_mood_average: Optional[float] = None,
    ) -> dict:
        """
        Analyse a journal entry — detect emotions, triggers, patterns.
        Returns structured JSON.
        """
        context_parts: list[str] = []
        if exam_type:
            context_parts.append(f"Exam preparing for: {exam_type}")
        if study_hours is not None:
            context_parts.append(f"Study hours today: {study_hours}")
        if recent_mood_average is not None:
            context_parts.append(f"Recent average mood (1–5): {recent_mood_average:.1f}")
        context = "\n".join(context_parts) if context_parts else "No additional context."

        prompt = f"""Analyse this student's journal entry and provide a \
compassionate, structured wellness analysis.

STUDENT CONTEXT:
{context}

JOURNAL ENTRY:
"{content}"

Return a single valid JSON object — no markdown fences, no explanation — \
matching this exact schema:
{{
  "emotions_detected": ["list", "of", "emotions"],
  "stress_triggers": ["specific triggers mentioned or implied"],
  "patterns": ["behavioral or emotional patterns observed"],
  "coping_suggestions": ["3–5 specific, actionable coping strategies"],
  "mindfulness_exercise": "A specific 2–3 minute mindfulness exercise described in detail",
  "empathy_message": "A warm 2–3 sentence empathetic response acknowledging their feelings",
  "safety_note": "Always include the standard disclaimer pointing to iCall 9152987821",
  "sentiment_score": 0.0
}}

sentiment_score: -1.0 = very negative, 0.0 = neutral, 1.0 = very positive.
Be specific to their exam context. Be warm, never clinical.
Return ONLY valid JSON."""

        raw = self._converse(
            messages=[{"role": "user", "content": [{"text": prompt}]}],
            max_tokens=1024,
            temperature=0.6,
        )
        return self._parse_json(raw, self._fallback_analysis())

    # ── Conversational Chat ────────────────────────────────────────────────

    def chat(
        self,
        message: str,
        history: list[dict],
        user_context: Optional[dict] = None,
    ) -> dict:
        """
        Multi-turn empathetic chat.
        history format: [{"role": "user"|"assistant", "content": "..."}]
        """
        # Build context addendum from recent user data
        context_lines: list[str] = []
        if user_context:
            if user_context.get("recent_journal"):
                context_lines.append(
                    f'Recent journal excerpt: "{user_context["recent_journal"][:200]}..."'
                )
            if user_context.get("current_mood"):
                context_lines.append(f"Current mood: {user_context['current_mood']}/5")
            if user_context.get("current_stress"):
                context_lines.append(
                    f"Current stress: {user_context['current_stress']}/5 (1=very high, 5=minimal)"
                )
            if user_context.get("exam_type"):
                context_lines.append(f"Preparing for: {user_context['exam_type']}")

        # Convert history to Bedrock Converse format
        bedrock_messages: list[dict] = []
        for msg in history[-10:]:  # last 10 turns
            role = "user" if msg["role"] == "user" else "assistant"
            bedrock_messages.append(
                {"role": role, "content": [{"text": msg["content"]}]}
            )

        # Inject context into first user message if no history
        user_text = message
        if context_lines and not bedrock_messages:
            ctx = "\n".join(context_lines)
            user_text = f"[Student context]\n{ctx}\n\n[Student message]\n{message}"

        bedrock_messages.append(
            {"role": "user", "content": [{"text": user_text}]}
        )

        reply = self._converse(
            messages=bedrock_messages,
            max_tokens=1024,
            temperature=0.75,
        )

        # Crisis keyword detection
        crisis_keywords = [
            "want to die", "kill myself", "end it all", "no point in living",
            "give up on life", "worthless", "can't go on", "suicide", "self harm",
        ]
        safety_reminder: Optional[str] = None
        if any(kw in message.lower() for kw in crisis_keywords):
            safety_reminder = (
                "🆘 If you're having thoughts of harming yourself, please reach out now:\n"
                "• iCall (TISS): 9152987821\n"
                "• Vandrevala Foundation: 1860-2662-345 (24/7)\n"
                "You matter. Help is available."
            )
            reply = f"{reply}\n\n---\n{safety_reminder}"

        return {"reply": reply, "safety_reminder": safety_reminder}

    # ── Weekly Insights ────────────────────────────────────────────────────

    def generate_weekly_insights(
        self,
        journal_entries: list[dict],
        mood_logs: list[dict],
        exam_type: Optional[str] = None,
    ) -> dict:
        """Generate a structured weekly wellness summary."""
        if not journal_entries and not mood_logs:
            return self._empty_weekly_insights()

        mood_vals = [l.get("mood", 3) for l in mood_logs]
        stress_vals = [l.get("stress", 3) for l in mood_logs]
        avg_mood = sum(mood_vals) / len(mood_vals) if mood_vals else 3.0
        avg_stress = sum(stress_vals) / len(stress_vals) if stress_vals else 3.0

        journal_text = "\n".join(
            f"- Day {i+1}: {e.get('content','')[:150]}..."
            for i, e in enumerate(journal_entries[:7])
        ) or "No journal entries."

        mood_text = "\n".join(
            f"- Mood {l.get('mood')}/5, Stress {l.get('stress')}/5, Notes: {l.get('notes','none')}"
            for l in mood_logs[:7]
        ) or "No mood logs."

        prompt = f"""Analyse this student's week of wellness data and generate \
compassionate, actionable insights.

{f"Exam: {exam_type}" if exam_type else ""}
Avg mood this week: {avg_mood:.1f}/5 (5=excellent)
Avg stress this week: {avg_stress:.1f}/5 (5=minimal)

JOURNAL ENTRIES:
{journal_text}

MOOD LOGS:
{mood_text}

Return a single valid JSON object — no markdown fences — matching:
{{
  "mood_trend": "One-sentence trend description",
  "stress_trend": "One-sentence trend description",
  "dominant_emotions": ["top 3–4 emotions"],
  "top_triggers": ["2–4 main stress triggers"],
  "positive_patterns": ["2–3 positive behaviours observed"],
  "areas_of_concern": ["1–2 patterns needing gentle attention"],
  "personalized_recommendations": ["4–5 specific next-week recommendations"],
  "motivational_message": "Warm 2–3 sentence message for the student",
  "safety_disclaimer": "Standard AI wellness tool disclaimer"
}}

Return ONLY valid JSON."""

        raw = self._converse(
            messages=[{"role": "user", "content": [{"text": prompt}]}],
            max_tokens=1200,
            temperature=0.65,
        )
        return self._parse_json(raw, self._empty_weekly_insights())

    # ── Helpers ────────────────────────────────────────────────────────────

    @staticmethod
    def _parse_json(text: str, fallback: dict) -> dict:
        """Extract and parse JSON from model output, return fallback on failure."""
        try:
            match = re.search(r"\{.*\}", text, re.DOTALL)
            return json.loads(match.group()) if match else json.loads(text)
        except (json.JSONDecodeError, AttributeError) as exc:
            logger.error(f"JSON parse failed: {exc} — raw: {text[:200]}")
            return fallback

    @staticmethod
    def _fallback_analysis() -> dict:
        return {
            "emotions_detected": [],
            "stress_triggers": [],
            "patterns": [],
            "coping_suggestions": [
                "Take a 5-minute break and breathe deeply",
                "Write down three things you are grateful for",
                "Go for a short walk",
            ],
            "mindfulness_exercise": (
                "Close your eyes. Breathe in for 4 counts, hold for 4, "
                "exhale for 4. Repeat 5 times."
            ),
            "empathy_message": (
                "Thank you for sharing. It takes courage to put your feelings into words."
            ),
            "safety_note": (
                "MindEase is an AI wellness tool, not a mental health professional. "
                "If overwhelmed, call iCall: 9152987821."
            ),
            "sentiment_score": 0.0,
        }

    @staticmethod
    def _empty_weekly_insights() -> dict:
        return {
            "mood_trend": "Not enough data yet — keep logging!",
            "stress_trend": "Not enough data yet — keep logging!",
            "dominant_emotions": [],
            "top_triggers": [],
            "positive_patterns": ["You started your wellness journey — that's a great step!"],
            "areas_of_concern": [],
            "personalized_recommendations": [
                "Start with a 5-minute daily journal entry",
                "Log your mood at least once a day",
                "Chat with MindEase when feeling stressed",
            ],
            "motivational_message": (
                "Every journey starts with a single step. You've taken yours."
            ),
            "safety_disclaimer": (
                "This analysis is generated by an AI wellness tool only. "
                "It is not a medical or psychological assessment."
            ),
        }


# ── Singleton ─────────────────────────────────────────────────────────────────
_ai_service: Optional[BedrockAIService] = None


def get_ai_service() -> BedrockAIService:
    global _ai_service
    if _ai_service is None:
        _ai_service = BedrockAIService()
    return _ai_service
