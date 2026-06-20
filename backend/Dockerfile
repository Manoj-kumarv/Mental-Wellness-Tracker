# ─────────────────────────────────────────────────────────────────────────────
# MindEase Backend — Production Dockerfile
# Deployable to: EC2 (via docker run) or Elastic Beanstalk (Single-Container)
# IAM role on the instance provides AWS SDK credentials — no keys in image.
# ─────────────────────────────────────────────────────────────────────────────

FROM python:3.11-slim AS base

# Non-root user for security
RUN groupadd -r appuser && useradd -r -g appuser appuser

WORKDIR /app

# System deps
RUN apt-get update && apt-get install -y --no-install-recommends gcc \
    && rm -rf /var/lib/apt/lists/*

# Install Python packages
COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip \
    && pip install --no-cache-dir -r requirements.txt

# Application code
COPY app/ ./app/

RUN chown -R appuser:appuser /app
USER appuser

# Elastic Beanstalk / Cloud Run standard port
ENV PORT=8080
EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8080/health')"

CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT} --workers 2 --loop uvloop"]
