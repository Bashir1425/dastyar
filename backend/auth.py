"""احراز هویت «دستیار»: ثبت‌نام/ورود با ایمیل، JWT و OAuth گوگل/گیت‌هاب.

مسیرها:
    POST /auth/register
    POST /auth/login
    GET  /auth/me
    POST /auth/logout
    GET  /auth/google            -> 302 به گوگل (یا 501 اگر پیکربندی نشده باشد)
    GET  /auth/google/callback   -> 302 به FRONTEND_URL/?token=...
    GET  /auth/github
    GET  /auth/github/callback
"""

from __future__ import annotations

import logging
import secrets
from datetime import datetime, timedelta, timezone
from typing import Annotated, Any
from urllib.parse import quote, urlencode

import httpx
import jwt
from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import RedirectResponse
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from passlib.context import CryptContext

import database as db
from config import settings
from schemas import AuthResponse, LoginIn, OkOut, RegisterIn, UserOut

logger = logging.getLogger("dastyar.auth")

router = APIRouter(prefix="/auth", tags=["auth"])

JWT_ALGORITHM = "HS256"
JWT_ISSUER = "dastyar"
OAUTH_STATE_TTL_SECONDS = 600

GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth"
GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"
GOOGLE_USERINFO_URL = "https://openidconnect.googleapis.com/v1/userinfo"

GITHUB_AUTH_URL = "https://github.com/login/oauth/authorize"
GITHUB_TOKEN_URL = "https://github.com/login/oauth/access_token"
GITHUB_API_URL = "https://api.github.com"

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
bearer_scheme = HTTPBearer(auto_error=False, description="Bearer <access_token>")

INVALID_CREDENTIALS = "ایمیل یا رمز عبور نادرست است."
UNAUTHORIZED = "برای دسترسی باید وارد شوید."


# --------------------------------------------------------------------------- #
# رمز عبور
# --------------------------------------------------------------------------- #
def _password_bytes(password: str) -> bytes:
    """bcrypt حداکثر ۷۲ بایت می‌پذیرد؛ برش پایدار برای رمزهای بلند/فارسی."""
    return password.encode("utf-8")[:72]


def hash_password(password: str) -> str:
    return pwd_context.hash(_password_bytes(password))


def verify_password(password: str, password_hash: str | None) -> bool:
    if not password_hash:
        return False
    try:
        return pwd_context.verify(_password_bytes(password), password_hash)
    except (ValueError, TypeError):
        logger.warning("bcrypt verification failed for stored hash")
        return False


# --------------------------------------------------------------------------- #
# توکن‌ها
# --------------------------------------------------------------------------- #
def create_access_token(user_id: int) -> str:
    now = datetime.now(timezone.utc)
    payload = {
        "sub": str(user_id),
        "iss": JWT_ISSUER,
        "iat": int(now.timestamp()),
        "exp": int((now + timedelta(minutes=settings.jwt_expire_minutes)).timestamp()),
    }
    return jwt.encode(payload, settings.jwt_secret, algorithm=JWT_ALGORITHM)


def decode_access_token(token: str) -> int | None:
    """شناسه کاربر را برمی‌گرداند؛ توکن نامعتبر/منقضی -> None."""
    try:
        payload = jwt.decode(
            token,
            settings.jwt_secret,
            algorithms=[JWT_ALGORITHM],
            issuer=JWT_ISSUER,
        )
    except jwt.PyJWTError:
        return None

    subject = payload.get("sub")
    try:
        return int(subject)
    except (TypeError, ValueError):
        return None


def _make_state(provider: str) -> str:
    """state امضاشده برای جلوگیری از CSRF در جریان OAuth."""
    now = datetime.now(timezone.utc)
    payload = {
        "purpose": f"oauth:{provider}",
        "nonce": secrets.token_urlsafe(12),
        "exp": int((now + timedelta(seconds=OAUTH_STATE_TTL_SECONDS)).timestamp()),
    }
    return jwt.encode(payload, settings.jwt_secret, algorithm=JWT_ALGORITHM)


def _check_state(state: str | None, provider: str) -> bool:
    if not state:
        return False
    try:
        payload = jwt.decode(state, settings.jwt_secret, algorithms=[JWT_ALGORITHM])
    except jwt.PyJWTError:
        return False
    return payload.get("purpose") == f"oauth:{provider}"


# --------------------------------------------------------------------------- #
# وابستگی «کاربر جاری»
# --------------------------------------------------------------------------- #
def get_current_user(
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(bearer_scheme)],
) -> dict[str, Any]:
    if credentials is None or credentials.scheme.lower() != "bearer":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=UNAUTHORIZED,
            headers={"WWW-Authenticate": "Bearer"},
        )

    user_id = decode_access_token(credentials.credentials)
    if user_id is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="نشست شما منقضی شده است؛ دوباره وارد شوید.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user = db.get_user(user_id)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=UNAUTHORIZED,
            headers={"WWW-Authenticate": "Bearer"},
        )
    return user


CurrentUser = Annotated[dict[str, Any], Depends(get_current_user)]


# --------------------------------------------------------------------------- #
# ثبت‌نام / ورود / خروج
# --------------------------------------------------------------------------- #
@router.post("/register", response_model=AuthResponse, status_code=status.HTTP_201_CREATED)
def register(payload: RegisterIn) -> AuthResponse:
    if db.get_user_by_email(payload.email) is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="این ایمیل قبلاً ثبت شده است. وارد شوید.",
        )

    user = db.create_user(
        email=payload.email,
        name=payload.name,
        password_hash=hash_password(payload.password),
        provider="email",
    )
    return AuthResponse(
        access_token=create_access_token(user["id"]),
        user=UserOut.model_validate(user),
    )


@router.post("/login", response_model=AuthResponse)
def login(payload: LoginIn) -> AuthResponse:
    user = db.get_user_by_email(payload.email)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=INVALID_CREDENTIALS,
            headers={"WWW-Authenticate": "Bearer"},
        )

    password_hash = db.get_user_password_hash(user["id"])
    if not verify_password(payload.password, password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=INVALID_CREDENTIALS,
            headers={"WWW-Authenticate": "Bearer"},
        )

    return AuthResponse(
        access_token=create_access_token(user["id"]),
        user=UserOut.model_validate(user),
    )


@router.get("/me", response_model=UserOut)
def me(user: CurrentUser) -> UserOut:
    return UserOut.model_validate(user)


@router.post("/logout", response_model=OkOut)
def logout() -> OkOut:
    """JWT بی‌حالت است؛ خروج سمت کلاینت با حذف توکن انجام می‌شود."""
    return OkOut(ok=True)


# --------------------------------------------------------------------------- #
# کمک‌کننده‌های OAuth
# --------------------------------------------------------------------------- #
def _frontend_redirect(*, token: str | None = None, error: str | None = None) -> RedirectResponse:
    if token:
        url = f"{settings.frontend_url}/?token={quote(token, safe='')}"
    else:
        url = f"{settings.frontend_url}/?error={quote(error or 'oauth_failed', safe='')}"
    return RedirectResponse(url, status_code=status.HTTP_302_FOUND)


def _ensure_provider_configured(provider: str) -> None:
    if provider == "google" and not (settings.google_client_id and settings.google_client_secret):
        raise HTTPException(
            status_code=status.HTTP_501_NOT_IMPLEMENTED,
            detail="ورود با گوگل پیکربندی نشده است. GOOGLE_CLIENT_ID و GOOGLE_CLIENT_SECRET را تنظیم کنید.",
        )
    if provider == "github" and not (settings.github_client_id and settings.github_client_secret):
        raise HTTPException(
            status_code=status.HTTP_501_NOT_IMPLEMENTED,
            detail="ورود با گیت‌هاب پیکربندی نشده است. GITHUB_CLIENT_ID و GITHUB_CLIENT_SECRET را تنظیم کنید.",
        )


def _upsert_oauth_user(
    *,
    provider: str,
    provider_id: str,
    email: str,
    name: str | None,
    avatar_url: str | None,
) -> dict[str, Any]:
    """کاربر OAuth را می‌سازد یا به حساب موجود متصل می‌کند."""
    email = email.strip().lower()
    display_name = (name or "").strip() or email.split("@")[0]

    existing = db.get_user_by_oauth(provider, provider_id)
    if existing is not None:
        updates: dict[str, Any] = {}
        if avatar_url and not existing.get("avatar_url"):
            updates["avatar_url"] = avatar_url
        if updates:
            return db.update_user(existing["id"], **updates) or existing
        return existing

    by_email = db.get_user_by_email(email)
    if by_email is not None:
        return db.update_user(
            by_email["id"],
            provider=provider,
            provider_id=provider_id,
            avatar_url=by_email.get("avatar_url") or avatar_url,
            name=by_email.get("name") or display_name,
        ) or by_email

    return db.create_user(
        email=email,
        name=display_name,
        provider=provider,
        provider_id=provider_id,
        avatar_url=avatar_url,
    )


async def _http_error_detail(response: httpx.Response) -> str:
    try:
        body = (await response.aread()).decode("utf-8", "replace")
    except httpx.HTTPError:
        body = ""
    return f"{response.status_code} {body[:300]}".strip()


# --------------------------------------------------------------------------- #
# وضعیت ارائه‌دهنده‌های OAuth (فرانت‌اند برای غیرفعال/راهنما کردن دکمه‌ها)
# --------------------------------------------------------------------------- #
@router.get("/providers")
def oauth_providers() -> dict[str, bool]:
    """اگر کلید OAuth تنظیم نشده باشد، فرانت‌اند به‌جای JSON ۵۰۱ راهنما نشان می‌دهد."""
    return {
        "google": bool(settings.google_client_id and settings.google_client_secret),
        "github": bool(settings.github_client_id and settings.github_client_secret),
    }


# --------------------------------------------------------------------------- #
# گوگل
# --------------------------------------------------------------------------- #
@router.get("/google")
def google_login() -> RedirectResponse:
    _ensure_provider_configured("google")
    params = {
        "client_id": settings.google_client_id,
        "redirect_uri": settings.google_redirect_uri,
        "response_type": "code",
        "scope": "openid email profile",
        "state": _make_state("google"),
        "prompt": "select_account",
    }
    return RedirectResponse(f"{GOOGLE_AUTH_URL}?{urlencode(params)}", status_code=status.HTTP_302_FOUND)


@router.get("/google/callback")
async def google_callback(
    code: str | None = Query(default=None),
    state: str | None = Query(default=None),
    error: str | None = Query(default=None),
) -> RedirectResponse:
    _ensure_provider_configured("google")

    if error:
        logger.info("Google OAuth cancelled: %s", error)
        return _frontend_redirect(error="google_cancelled")
    if not code:
        return _frontend_redirect(error="google_missing_code")
    if not _check_state(state, "google"):
        logger.warning("Google OAuth state mismatch")
        return _frontend_redirect(error="invalid_state")

    try:
        async with httpx.AsyncClient(timeout=20.0) as client:
            token_response = await client.post(
                GOOGLE_TOKEN_URL,
                data={
                    "code": code,
                    "client_id": settings.google_client_id,
                    "client_secret": settings.google_client_secret,
                    "redirect_uri": settings.google_redirect_uri,
                    "grant_type": "authorization_code",
                },
                headers={"Accept": "application/json"},
            )
            if token_response.status_code >= 400:
                logger.warning("Google token exchange failed: %s", await _http_error_detail(token_response))
                return _frontend_redirect(error="google_failed")

            access_token = token_response.json().get("access_token")
            if not access_token:
                logger.warning("Google token response has no access_token")
                return _frontend_redirect(error="google_failed")

            info_response = await client.get(
                GOOGLE_USERINFO_URL,
                headers={"Authorization": f"Bearer {access_token}"},
            )
            if info_response.status_code >= 400:
                logger.warning("Google userinfo failed: %s", await _http_error_detail(info_response))
                return _frontend_redirect(error="google_failed")

            info = info_response.json()
    except httpx.HTTPError as exc:
        logger.warning("Google OAuth request error: %s", exc)
        return _frontend_redirect(error="google_failed")

    email = (info.get("email") or "").strip().lower()
    if not email:
        logger.warning("Google account without email")
        return _frontend_redirect(error="google_no_email")

    user = _upsert_oauth_user(
        provider="google",
        provider_id=str(info.get("sub") or email),
        email=email,
        name=info.get("name"),
        avatar_url=info.get("picture"),
    )
    return _frontend_redirect(token=create_access_token(user["id"]))


# --------------------------------------------------------------------------- #
# گیت‌هاب
# --------------------------------------------------------------------------- #
@router.get("/github")
def github_login() -> RedirectResponse:
    _ensure_provider_configured("github")
    params = {
        "client_id": settings.github_client_id,
        "redirect_uri": settings.github_redirect_uri,
        "scope": "read:user user:email",
        "state": _make_state("github"),
        "allow_signup": "true",
    }
    return RedirectResponse(f"{GITHUB_AUTH_URL}?{urlencode(params)}", status_code=status.HTTP_302_FOUND)


@router.get("/github/callback")
async def github_callback(
    code: str | None = Query(default=None),
    state: str | None = Query(default=None),
    error: str | None = Query(default=None),
) -> RedirectResponse:
    _ensure_provider_configured("github")

    if error:
        logger.info("GitHub OAuth cancelled: %s", error)
        return _frontend_redirect(error="github_cancelled")
    if not code:
        return _frontend_redirect(error="github_missing_code")
    if not _check_state(state, "github"):
        logger.warning("GitHub OAuth state mismatch")
        return _frontend_redirect(error="invalid_state")

    headers = {
        "Accept": "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
    }

    try:
        async with httpx.AsyncClient(timeout=20.0, headers=headers) as client:
            token_response = await client.post(
                GITHUB_TOKEN_URL,
                data={
                    "client_id": settings.github_client_id,
                    "client_secret": settings.github_client_secret,
                    "code": code,
                    "redirect_uri": settings.github_redirect_uri,
                },
                headers={"Accept": "application/json"},
            )
            if token_response.status_code >= 400:
                logger.warning("GitHub token exchange failed: %s", await _http_error_detail(token_response))
                return _frontend_redirect(error="github_failed")

            token_payload = token_response.json()
            access_token = token_payload.get("access_token")
            if not access_token:
                logger.warning("GitHub token response: %s", str(token_payload)[:300])
                return _frontend_redirect(error="github_failed")

            auth_headers = {**headers, "Authorization": f"Bearer {access_token}"}
            profile_response = await client.get(f"{GITHUB_API_URL}/user", headers=auth_headers)
            if profile_response.status_code >= 400:
                logger.warning("GitHub user failed: %s", await _http_error_detail(profile_response))
                return _frontend_redirect(error="github_failed")
            profile = profile_response.json()

            email = (profile.get("email") or "").strip().lower()
            if not email:
                emails_response = await client.get(f"{GITHUB_API_URL}/user/emails", headers=auth_headers)
                if emails_response.status_code < 400:
                    emails = emails_response.json() or []
                    verified = [e for e in emails if e.get("verified")]
                    primary = next((e for e in verified if e.get("primary")), None)
                    chosen = primary or (verified[0] if verified else None)
                    if chosen:
                        email = (chosen.get("email") or "").strip().lower()
    except httpx.HTTPError as exc:
        logger.warning("GitHub OAuth request error: %s", exc)
        return _frontend_redirect(error="github_failed")

    login = (profile.get("login") or "").strip()
    if not email:
        if not login:
            return _frontend_redirect(error="github_no_email")
        # ایمیل خصوصی است؛ آدرس no-reply گیت‌هاب جایگزین می‌شود.
        email = f"{login}@users.noreply.github.com"

    user = _upsert_oauth_user(
        provider="github",
        provider_id=str(profile.get("id") or login),
        email=email,
        name=profile.get("name") or login,
        avatar_url=profile.get("avatar_url"),
    )
    return _frontend_redirect(token=create_access_token(user["id"]))
