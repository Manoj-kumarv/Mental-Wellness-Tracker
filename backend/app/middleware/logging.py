"""
Request logging middleware.
Structured JSON logs are forwarded to CloudWatch Logs by the EC2/Beanstalk
agent automatically — no extra SDK needed for basic logging.
"""
import logging
import time
import uuid
from typing import Callable

from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware

logger = logging.getLogger(__name__)


class RequestLoggingMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        request_id = str(uuid.uuid4())
        start = time.time()
        request.state.request_id = request_id

        logger.info(
            "request_start",
            extra={
                "request_id": request_id,
                "method": request.method,
                "path": request.url.path,
                "user_agent": request.headers.get("user-agent", "")[:100],
            },
        )

        try:
            response = await call_next(request)
        except Exception as exc:
            logger.error(
                "request_error",
                extra={"request_id": request_id, "error": str(exc)},
            )
            raise

        ms = round((time.time() - start) * 1000, 2)
        logger.info(
            "request_end",
            extra={
                "request_id": request_id,
                "status": response.status_code,
                "duration_ms": ms,
            },
        )
        response.headers["X-Request-ID"] = request_id
        return response
