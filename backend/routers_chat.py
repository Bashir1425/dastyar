"""مسیر چت «دستیار» — پاسخ جریانی (SSE) از OpenRouter.

قرارداد خروجی:
    data: <token>\\n\\n        (برای هر تکه متن)
    data: [DONE]\\n\\n         (پایان جریان)

اگر توکنی شامل خط جدید باشد، هر خط در یک فیلد `data:` جدا ارسال می‌شود
(طبق استاندارد SSE کلاینت باید این خطوط را با «\\n» به هم بچسباند).
"""

from __future__ import annotations

import asyncio
import json
import logging
import re
from collections.abc import AsyncIterator
from typing import Any

import httpx
from fastapi import APIRouter, HTTPException, status
from fastapi.responses import StreamingResponse

import database as db
from auth import CurrentUser
from config import settings
from data.system_prompt import SYSTEM_PROMPT
from schemas import ChatIn

logger = logging.getLogger("dastyar.chat")

router = APIRouter(tags=["chat"])

HISTORY_LIMIT = 30
TITLE_MAX_LENGTH = 60
MODEL_LABEL = "دستیار"

DEMO_REPLY = (
    "سلام! من **دستیار** هستم 👋\n\n"
    "این یک پاسخ نمایشی است، چون کلید `OPENROUTER_API_KEY` تنظیم نشده یا حالت نمایشی "
    "(`MOCK_MODE`) روشن است. برای پاسخ‌های واقعی، کلید OpenRouter را در فایل "
    "`backend/.env` بگذارید و سرور را دوباره اجرا کنید.\n\n"
    "هر سؤال فنی یا کدی داشتید، بعد از فعال‌سازی کلید همین‌جا بپرسید."
)

STREAM_ERROR_TEXT = "\n\n⚠️ ارتباط با مدل برقرار نشد. لطفاً چند لحظه بعد دوباره تلاش کنید."
EMPTY_REPLY_TEXT = "متأسفم، پاسخی تولید نشد. لطفاً سؤال را به شکل دیگری بپرسید."


# --------------------------------------------------------------------------- #
# کمک‌کننده‌های SSE
# --------------------------------------------------------------------------- #
def _sse(text: str) -> str:
    """یک قطعه متن را به قالب SSE تبدیل می‌کند (چندخطی‌ها امن می‌شوند)."""
    if not text:
        return ""
    normalized = text.replace("\r\n", "\n").replace("\r", "\n")
    return "".join(f"data: {line}\n" for line in normalized.split("\n")) + "\n"


def _done() -> str:
    return "data: [DONE]\n\n"


def _chunk_text(text: str, words_per_chunk: int = 3) -> list[str]:
    """تقسیم متن نمایشی به تکه‌های کوچک شبیه توکن‌های مدل."""
    words = re.findall(r"\S+\s*", text)
    if not words:
        return [text]
    groups = [words[i:i + words_per_chunk] for i in range(0, len(words), words_per_chunk)]
    return ["".join(group) for group in groups]


def _make_title(message: str) -> str:
    title = " ".join(message.split())
    if len(title) > TITLE_MAX_LENGTH:
        title = title[:TITLE_MAX_LENGTH].rstrip() + "…"
    return title or db.DEFAULT_TITLE


def _build_llm_messages(conversation_id: int) -> list[dict[str, str]]:
    history = db.list_messages(conversation_id, limit=HISTORY_LIMIT)
    messages: list[dict[str, str]] = [{"role": "system", "content": SYSTEM_PROMPT}]
    for item in history:
        if item["role"] in ("user", "assistant"):
            messages.append({"role": item["role"], "content": item["content"]})
    return messages


# --------------------------------------------------------------------------- #
# تولید جریان
# --------------------------------------------------------------------------- #
async def _demo_stream() -> AsyncIterator[str]:
    """پاسخ نمایشی کوتاه فارسی، با تأخیر کوتاه برای حس استریم واقعی."""
    for chunk in _chunk_text(DEMO_REPLY):
        await asyncio.sleep(0.03)
        yield chunk


async def _openrouter_stream(messages: list[dict[str, str]]) -> AsyncIterator[str]:
    """استریم توکن‌ها از endpoint سازگار با OpenAI در OpenRouter."""
    url = f"{settings.openrouter_base_url}/chat/completions"
    headers = {
        "Authorization": f"Bearer {settings.openrouter_api_key.strip()}",
        "Content-Type": "application/json",
        "HTTP-Referer": settings.frontend_url,
        "X-Title": "Dastyar",
    }
    payload: dict[str, Any] = {
        "model": settings.openrouter_model,
        "messages": messages,
        "stream": True,
        "temperature": 0.7,
    }
    timeout = httpx.Timeout(connect=15.0, read=120.0, write=30.0, pool=15.0)

    async with httpx.AsyncClient(timeout=timeout) as client:
        async with client.stream("POST", url, headers=headers, json=payload) as response:
            if response.status_code >= 400:
                body = (await response.aread()).decode("utf-8", "replace")[:300]
                logger.warning("OpenRouter HTTP %s: %s", response.status_code, body)
                raise RuntimeError(f"OpenRouter error {response.status_code}")

            async for raw_line in response.aiter_lines():
                line = raw_line.strip()
                if not line or not line.startswith("data:"):
                    continue  # کامنت‌ها مثل «: OPENROUTER PROCESSING» نادیده گرفته می‌شوند

                data = line[len("data:"):].strip()
                if data == "[DONE]":
                    break

                try:
                    event = json.loads(data)
                except json.JSONDecodeError:
                    logger.debug("Skipping malformed SSE payload: %s", data[:120])
                    continue

                if isinstance(event, dict) and event.get("error"):
                    logger.warning("OpenRouter stream error: %s", str(event["error"])[:300])
                    raise RuntimeError("OpenRouter stream error")

                choices = event.get("choices") or []
                if not choices:
                    continue
                delta = choices[0].get("delta") or {}
                content = delta.get("content")
                if isinstance(content, str) and content:
                    yield content


async def _event_stream(conversation_id: int, messages: list[dict[str, str]]) -> AsyncIterator[str]:
    """پاسخ SSE؛ متن تولیدشده در پایان (حتی در صورت قطع اتصال) ذخیره می‌شود."""
    parts: list[str] = []

    try:
        if settings.use_mock:
            async for chunk in _demo_stream():
                parts.append(chunk)
                yield _sse(chunk)
        else:
            async for chunk in _openrouter_stream(messages):
                parts.append(chunk)
                yield _sse(chunk)

        if not "".join(parts).strip():
            parts.append(EMPTY_REPLY_TEXT)
            yield _sse(EMPTY_REPLY_TEXT)
    except asyncio.CancelledError:
        # کلاینت اتصال را بست؛ متن جزئی در finally ذخیره می‌شود.
        raise
    except Exception:  # noqa: BLE001 - جریان نباید نیمه‌کاره رها شود
        logger.exception("Chat stream failed for conversation %s", conversation_id)
        parts.append(STREAM_ERROR_TEXT)
        yield _sse(STREAM_ERROR_TEXT)
    finally:
        answer = "".join(parts).strip()
        if answer:
            try:
                db.add_message(conversation_id, "assistant", answer)
            except Exception:  # noqa: BLE001 - ذخیره‌سازی نباید جریان را بشکند
                logger.exception("Failed to persist assistant message")

    yield _done()


# --------------------------------------------------------------------------- #
# مسیر
# --------------------------------------------------------------------------- #
@router.post("/chat")
async def chat(payload: ChatIn, user: CurrentUser) -> StreamingResponse:
    conversation = db.get_conversation(payload.conversation_id, user["id"])
    if conversation is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="گفتگو پیدا نشد.",
        )

    db.add_message(conversation["id"], "user", payload.message)

    if conversation["title"] == db.DEFAULT_TITLE:
        db.rename_conversation(conversation["id"], user["id"], _make_title(payload.message))

    messages = _build_llm_messages(conversation["id"])

    return StreamingResponse(
        _event_stream(conversation["id"], messages),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache, no-transform",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )
