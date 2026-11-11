# دستیار — بک‌اند (FastAPI)

بک‌اند اپلیکیشن چت هوش مصنوعی **دستیار**: احراز هویت با ایمیل/رمز و OAuth گوگل و گیت‌هاب،
گفتگوهای ذخیره‌شده در SQLite، و پاسخ جریانی (SSE) از OpenRouter.

- Python 3.13
- FastAPI + uvicorn
- SQLite (کتابخانه‌ی استاندارد `sqlite3`) — بدون Postgres و Redis
- PyJWT + passlib[bcrypt]
- httpx برای تماس با OpenRouter و سرویس‌های OAuth

---

## ۱. نصب و اجرا

```powershell
cd dastyar\backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
copy .env.example .env
python -m uvicorn main:app --reload --port 8000
```

- مستندات تعاملی: <http://localhost:8000/docs>
- سلامت سرویس: <http://localhost:8000/health> → `{"status":"ok","model":"دستیار"}`

> دیتابیس `dastyar.db` کنار همین فایل‌ها و در اولین اجرا خودکار ساخته می‌شود
> (جدول‌های `users`، `conversations`، `messages`).

### اجرا روی ویندوز بدون فعال‌سازی venv

```powershell
cd dastyar\backend
python -m pip install -r requirements.txt
copy .env.example .env
python -m uvicorn main:app --reload --port 8000
```

---

## ۲. ساختار فایل‌ها

```
backend/
  main.py                   اپ FastAPI، CORS، اتصال روترها، /health
  config.py                 تنظیمات با pydantic-settings (خواندن .env)
  database.py               SQLite: جدول‌ها + توابع دسترسی داده
  schemas.py                مدل‌های Pydantic ورودی/خروجی
  auth.py                   ثبت‌نام/ورود/JWT/OAuth + وابستگی کاربر جاری
  routers_chat.py           POST /chat — استریم SSE از OpenRouter
  routers_conversations.py  CRUD گفتگوها
  routers_profile.py        GET/PATCH پروفایل
  data/system_prompt.py     پرامپت سیستمی فارسی (دستیار + متخصص کدنویسی)
  requirements.txt
  .env.example
  README.md
```

---

## ۳. متغیرهای محیطی (`.env`)

| کلید | توضیح |
|---|---|
| `OPENROUTER_API_KEY` | کلید OpenRouter. خالی باشد → حالت نمایشی |
| `OPENROUTER_BASE_URL` | پیش‌فرض `https://openrouter.ai/api/v1` |
| `OPENROUTER_MODEL` | پیش‌فرض `google/gemini-2.0-flash-lite-001` |
| `JWT_SECRET` | کلید امضای توکن؛ در محیط واقعی حتماً عوض شود |
| `JWT_EXPIRE_MINUTES` | مدت اعتبار توکن (پیش‌فرض ۳۰ روز) |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | ورود با گوگل (خالی → ۵۰۱) |
| `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET` | ورود با گیت‌هاب (خالی → ۵۰۱) |
| `APP_HOST` / `APP_PORT` | پیش‌فرض `127.0.0.1` و `8000` |
| `MOCK_MODE` | `true` → همیشه پاسخ نمایشی فارسی |
| `FRONTEND_URL` | پیش‌فرض `http://localhost:5173` (CORS + بازگشت OAuth) |
| `BACKEND_URL` | پیش‌فرض `http://localhost:8000` (ساخت redirect_uri) |

**حالت نمایشی:** اگر `OPENROUTER_API_KEY` خالی باشد یا `MOCK_MODE=true` باشد،
`POST /chat` بدون تماس با OpenRouter یک پاسخ کوتاه فارسی را به‌صورت جریانی برمی‌گرداند.

---

## ۴. قرارداد API

همه‌ی مسیرهای محافظت‌شده هدر `Authorization: Bearer <access_token>` می‌خواهند.

### احراز هویت

| متد | مسیر | ورودی | خروجی |
|---|---|---|---|
| POST | `/auth/register` | `{email, password, name}` | `{access_token, token_type, user}` |
| POST | `/auth/login` | `{email, password}` | `{access_token, token_type, user}` |
| GET | `/auth/me` | — | `user` |
| POST | `/auth/logout` | — | `{ok: true}` |
| GET | `/auth/google` | — | ۳۰۲ به گوگل (یا ۵۰۱) |
| GET | `/auth/google/callback` | `code`, `state` | ۳۰۲ به `FRONTEND_URL/?token=...` |
| GET | `/auth/github` | — | ۳۰۲ به گیت‌هاب (یا ۵۰۱) |
| GET | `/auth/github/callback` | `code`, `state` | ۳۰۲ به `FRONTEND_URL/?token=...` |

شکل `user`:

```json
{
  "id": 1,
  "email": "user@example.com",
  "name": "کاربر",
  "avatar_url": null,
  "provider": "email",
  "theme": "system",
  "language": "fa",
  "created_at": "2026-01-01T12:00:00Z"
}
```

### گفتگوها

| متد | مسیر | توضیح |
|---|---|---|
| GET | `/conversations` | `[{id, title, created_at, updated_at}]` |
| POST | `/conversations` | بدنه‌ی اختیاری `{title?}` → گفتگو |
| GET | `/conversations/{id}/messages` | `[{id, role, content, created_at}]` |
| PATCH | `/conversations/{id}` | `{title}` → گفتگو |
| DELETE | `/conversations/{id}` | `{ok: true}` |

عنوان پیش‌فرض گفتگو «گفتگوی جدید» است و با اولین پیام کاربر، خودکار از متن پیام ساخته می‌شود.

### چت

| متد | مسیر | ورودی |
|---|---|---|
| POST | `/chat` | `{conversation_id, message}` |

پاسخ `text/event-stream` است:

```
data: سلام
data:  چطور

data: می‌توانم
data: [DONE]
```

- هر تکه متن در یک یا چند خط `data: ` می‌آید و با یک خط خالی تمام می‌شود.
- اگر یک تکه شامل خط جدید باشد، هر خط در `data:` جدا ارسال می‌شود؛
  کلاینت باید خطوط یک رویداد را با `\n` به هم بچسباند.
- پایان جریان: `data: [DONE]`.

نمونه‌ی خواندن در جاوااسکریپت:

```js
const res = await fetch("/chat", {
  method: "POST",
  headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
  body: JSON.stringify({ conversation_id: id, message }),
});
const reader = res.body.getReader();
const decoder = new TextDecoder();
let buffer = "";
while (true) {
  const { value, done } = await reader.read();
  if (done) break;
  buffer += decoder.decode(value, { stream: true });
  const events = buffer.split("\n\n");
  buffer = events.pop() ?? "";
  for (const event of events) {
    const payload = event
      .split("\n")
      .filter((line) => line.startsWith("data: "))
      .map((line) => line.slice(6))
      .join("\n");
    if (payload === "[DONE]") continue;
    appendToken(payload);
  }
}
```

### پروفایل و سلامت

| متد | مسیر | توضیح |
|---|---|---|
| GET | `/profile` | `user` |
| PATCH | `/profile` | `{name?, avatar_url?, theme?, language?}` → `user` |
| GET | `/health` | `{status: "ok", model: "دستیار"}` |

`theme` یکی از `system` | `dark` | `light` است؛ `language` پیش‌فرض `fa` است.
ارسال `avatar_url: null` آواتار را پاک می‌کند.

---

## ۵. تنظیم OAuth

### گوگل

1. <https://console.cloud.google.com> → APIs & Services → Credentials → OAuth client ID (Web application)
2. Authorized redirect URI: `http://localhost:8000/auth/google/callback`
3. `GOOGLE_CLIENT_ID` و `GOOGLE_CLIENT_SECRET` را در `.env` بگذارید.

### گیت‌هاب

1. <https://github.com/settings/developers> → New OAuth App
2. Authorization callback URL: `http://localhost:8000/auth/github/callback`
3. `GITHUB_CLIENT_ID` و `GITHUB_CLIENT_SECRET` را در `.env` بگذارید.

اگر کلیدها خالی باشند، `GET /auth/google` و `GET /auth/github` پاسخ **501** می‌دهند
(دکمه‌های ورود اجتماعی در فرانت‌اند باید این حالت را مدیریت کنند). ورود با ایمیل/رمز
همیشه و بدون هیچ کلیدی کار می‌کند.

پس از موفقیت، کاربر به `FRONTEND_URL/?token=<jwt>` هدایت می‌شود؛ فرانت‌اند باید توکن را
از query بخواند، ذخیره کند و آدرس را تمیز کند. در خطا: `FRONTEND_URL/?error=<reason>`.

---

## ۶. نکته‌ها

- **خروج:** JWT بی‌حالت است؛ `POST /auth/logout` فقط `{"ok": true}` برمی‌گرداند و
  فرانت‌اند باید توکن را پاک کند.
- **CORS:** `FRONTEND_URL` به‌همراه `http://localhost:5173` و `http://localhost:3000`.
- **رمز عبور:** با bcrypt هش می‌شود (حداکثر ۷۲ بایت مؤثر؛ رمزهای بلندتر برش داده می‌شوند).
- **مدل:** در تمام پاسخ‌ها و `/health` نام برند «دستیار» است، نه نام مدل upstream.
- **تست سریع:**

```powershell
curl http://localhost:8000/health
curl -X POST http://localhost:8000/auth/register -H "Content-Type: application/json" `
  -d "{\"email\":\"a@b.com\",\"password\":\"secret123\",\"name\":\"آزمایش\"}"
```
