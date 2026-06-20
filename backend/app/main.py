"""
MindEase Backend — FastAPI entry point.
Runtime: EC2 / Elastic Beanstalk
Database: AWS DynamoDB
AI: AWS Bedrock
Secrets: AWS Secrets Manager
Logs: CloudWatch Logs (via stdout JSON)
"""
import logging
import sys
from contextlib import asynccontextmanager
from datetime import datetime, timezone

from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address

from app.config import get_settings
from app.db.dynamodb import bootstrap_tables
from app.middleware.logging import RequestLoggingMiddleware
from app.routers import ai, auth, journal, mood, s3

# ── Settings & Logging ────────────────────────────────────────────────────────
settings = get_settings()

logging.basicConfig(
    stream=sys.stdout,
    level=logging.DEBUG if settings.DEBUG else logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s %(message)s",
)
logger = logging.getLogger(__name__)

# ── Rate Limiter ──────────────────────────────────────────────────────────────
limiter = Limiter(key_func=get_remote_address)


# ── Lifespan ──────────────────────────────────────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info(
        f"Starting {settings.APP_NAME} v{settings.APP_VERSION} "
        f"[{settings.ENVIRONMENT}] region={settings.AWS_REGION}"
    )
    try:
        # Auto-create DynamoDB table in development; skip in production
        # (table managed by CloudFormation/Terraform in prod).
        if settings.ENVIRONMENT != "production":
            bootstrap_tables()
            logger.info("DynamoDB bootstrap complete")
    except Exception as exc:
        logger.error(f"DynamoDB bootstrap failed: {exc}")

    yield
    logger.info("Application shutdown")


# ── App ───────────────────────────────────────────────────────────────────────
app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description=(
        "AI-powered Mental Wellness Tracker — NEET, JEE, CUET, CAT, GATE, UPSC. "
        "⚠️ NOT a medical or diagnostic tool. "
        "Backend: FastAPI on EC2 · DB: DynamoDB · AI: AWS Bedrock · "
        "Secrets: AWS Secrets Manager · CDN: CloudFront."
    ),
    docs_url="/docs" if settings.DEBUG else None,
    redoc_url="/redoc" if settings.DEBUG else None,
    lifespan=lifespan,
)

# ── Middleware ────────────────────────────────────────────────────────────────
app.add_middleware(RequestLoggingMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://mindease-public-755953012704-us-east-1.s3-website-us-east-1.amazonaws.com", "http://localhost:3000", "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "X-Request-ID"],
    expose_headers=["X-Request-ID"],
)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)


# ── Global error handler ──────────────────────────────────────────────────────
@app.exception_handler(Exception)
async def global_error_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled exception: {exc}", exc_info=True)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"detail": "An internal error occurred. Please try again."},
    )


# ── Routers ───────────────────────────────────────────────────────────────────
app.include_router(auth.router)
app.include_router(journal.router)
app.include_router(mood.router)
app.include_router(ai.router)
app.include_router(s3.router)


# ── Health & Root ─────────────────────────────────────────────────────────────
@app.get("/health", tags=["System"])
async def health():
    return {
        "status": "healthy",
        "version": settings.APP_VERSION,
        "environment": settings.ENVIRONMENT,
        "aws_region": settings.AWS_REGION,
        "ai_model": settings.BEDROCK_MODEL_ID,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "disclaimer": "AI wellness tool — NOT a medical service.",
    }


@app.get("/", tags=["System"])
async def root():
    return {
        "app": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "cloud": "AWS",
        "compute": "EC2 / Elastic Beanstalk",
        "database": "DynamoDB",
        "ai": f"AWS Bedrock ({settings.BEDROCK_MODEL_ID})",
        "secrets": "AWS Secrets Manager",
        "cdn": "CloudFront + S3",
        "disclaimer": (
            "⚠️ MindEase is an AI wellness companion. "
            "Not a substitute for professional mental health care."
        ),
    }
