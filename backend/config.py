"""تنظیمات برنامه «دستیار».

همه‌ی مقادیر از فایل `.env` (کنار همین فایل) یا متغیرهای محیطی خوانده می‌شوند.
متغیرهای محیطی بر محتوای `.env` اولویت دارند.
"""

from __future__ import annotations

from functools import lru_cache
from pathlib import Path

from pydantic import model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

BASE_DIR = Path(__file__).resolve().parent

DEFAULT_BASE_URL = "https://openrouter.ai/api/v1"
DEFAULT_MODEL = "google/gemini-2.5-flash-lite"
DEFAULT_FRONTEND_URL = "http://localhost:5173"
DEFAULT_BACKEND_URL = "http://localhost:8000"


class Settings(BaseSettings):
    """پیکربندی سرور؛ نام فیلدها با حروف بزرگ در `.env` نوشته می‌شود."""

    model_config = SettingsConfigDict(
        env_file=str(BASE_DIR / ".env"),
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # --- OpenRouter ---
    openrouter_api_key: str = ""
    openrouter_base_url: str = DEFAULT_BASE_URL
    openrouter_model: str = DEFAULT_MODEL

    # --- JWT ---
    jwt_secret: str = "dastyar-dev-secret-change-me"
    jwt_expire_minutes: int = 60 * 24 * 30  # ۳۰ روز

    # --- OAuth ---
    google_client_id: str = ""
    google_client_secret: str = ""
    github_client_id: str = ""
    github_client_secret: str = ""

    # --- سرور ---
    app_host: str = "127.0.0.1"
    app_port: int = 8000
    mock_mode: bool = False
    frontend_url: str = DEFAULT_FRONTEND_URL
    backend_url: str = DEFAULT_BACKEND_URL

    @model_validator(mode="after")
    def _normalize(self) -> "Settings":
        """مقدارهای خالی را به پیش‌فرض برمی‌گرداند و اسلش انتهایی را حذف می‌کند."""
        if not self.openrouter_base_url.strip():
            self.openrouter_base_url = DEFAULT_BASE_URL
        if not self.openrouter_model.strip():
            self.openrouter_model = DEFAULT_MODEL
        if not self.frontend_url.strip():
            self.frontend_url = DEFAULT_FRONTEND_URL
        if not self.backend_url.strip():
            self.backend_url = DEFAULT_BACKEND_URL
        if not self.jwt_secret.strip():
            self.jwt_secret = "dastyar-dev-secret-change-me"

        for field in ("openrouter_base_url", "frontend_url", "backend_url"):
            setattr(self, field, getattr(self, field).strip().rstrip("/"))

        return self

    @property
    def has_openrouter_key(self) -> bool:
        """آیا کلید OpenRouter تنظیم شده است؟"""
        return bool(self.openrouter_api_key.strip())

    @property
    def use_mock(self) -> bool:
        """حالت نمایشی: یا صریح روشن شده یا کلید API وجود ندارد."""
        return self.mock_mode or not self.has_openrouter_key

    @property
    def cors_origins(self) -> list[str]:
        """مبدأهای مجاز CORS (فرانت‌اند + پورت‌های توسعه)."""
        origins = {
            self.frontend_url,
            "http://localhost:5173",
            "http://localhost:3000",
        }
        return sorted(o for o in origins if o)

    @property
    def google_redirect_uri(self) -> str:
        return f"{self.backend_url}/auth/google/callback"

    @property
    def github_redirect_uri(self) -> str:
        return f"{self.backend_url}/auth/github/callback"


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    """نسخه‌ی singleton تنظیمات (برای استفاده در تست‌ها هم قابل بازنشانی است)."""
    return Settings()


settings = get_settings()
