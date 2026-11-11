"""نقطه‌ی ورود برنامه‌ی «دستیار» (FastAPI).

اجرا:
    cd dastyar/backend
    python -m uvicorn main:app --reload --port 8000
"""

from __future__ import annotations

from contextlib import asynccontextmanager
from collections.abc import AsyncIterator

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

import database
from auth import router as auth_router
from config import settings
from routers_chat import router as chat_router
from routers_conversations import router as conversations_router
from routers_profile import router as profile_router
from schemas import HealthOut

DESCRIPTION = """
بک‌اند اپلیکیشن چت هوش مصنوعی **دستیار**.

- احراز هویت با ایمیل/رمز، گوگل و گیت‌هاب (JWT)
- گفتگوها و پیام‌ها در SQLite
- پاسخ جریانی (SSE) از OpenRouter با نام مدل «دستیار»
"""


@asynccontextmanager
async def lifespan(_app: FastAPI) -> AsyncIterator[None]:
    """ساخت جدول‌های SQLite در شروع برنامه."""
    database.init_db()
    yield


app = FastAPI(
    title="دستیار API",
    description=DESCRIPTION,
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)

app.include_router(auth_router)
app.include_router(conversations_router)
app.include_router(chat_router)
app.include_router(profile_router)


@app.get("/health", response_model=HealthOut, tags=["system"])
def health() -> HealthOut:
    """بررسی سلامت سرویس (فرانت‌اند برای نمایش وضعیت از آن استفاده می‌کند)."""
    return HealthOut(status="ok", model="دستیار")


@app.get("/", tags=["system"])
def root() -> dict[str, str]:
    return {
        "name": "دستیار",
        "docs": "/docs",
        "health": "/health",
    }


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("main:app", host=settings.app_host, port=settings.app_port)
