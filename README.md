<div dir="rtl" align="center">

# دستیار — Dastyar

دستیار هوش مصنوعی فارسی، سریع و مینیمال — با رابط چت شبیه ChatGPT.

ورود با گوگل / گیت‌هاب / ایمیل · تم دارک و روشن · کدنویسی حرفه‌ای · RTL کامل

[![FastAPI](https://img.shields.io/badge/FastAPI-0.115-009688?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=black)](https://react.dev)
[![Vite](https://img.shields.io/badge/Vite-6-646CFF?logo=vite&logoColor=white)](https://vitejs.dev)
[![License: MIT](https://img.shields.io/badge/License-MIT-0F62FE.svg)](LICENSE)

</div>

---

## ✨ امکانات

- **چت زنده (SSE)** — پاسخ‌ها کلمه‌به‌کلمه جاری می‌آیند
- **ورود چندراهی** — گوگل، گیت‌هاب، یا ایمیل/رمز (همیشه کار می‌کند)
- **مدل «دستیار»** — برند روی OpenRouter (پیش‌فرض: Gemini Flash Lite — سریع و ارزان)
- **کدنویسی** — پرامپت سیستمی برنامه‌نویس + هایلایت کد + دکمه کپی
- **تم** — روشن / دارک / پیش‌فرض سیستم
- **فارسی و RTL** — فونت وزیرمتن (فال‌بک نازنین/تیتر)
- **پروفایل** — نام، آواتار، تم
- **مینیمال** — بدون شلوغی، بدون گرادیانت بنفش، یک رنگ تاکیدی `#0F62FE`
- **حالت نمایشی** — بدون کلید API هم بالا می‌آید و فارسی جواب می‌دهد

## 🧱 تکنولوژی

| لایه | ابزار |
|---|---|
| بک‌اند | FastAPI · SQLite · JWT · OAuth2 · SSE |
| فرانت‌اند | React 18 · Vite · TypeScript · Tailwind CSS |
| مدل | OpenRouter (OpenAI-compatible) |
| فونت | Vazirmatn + IBM-style UI |

## 📁 ساختار پروژه

```
dastyar/
├── backend/           # FastAPI + SQLite + JWT + OAuth
│   ├── main.py
│   ├── auth.py        # register / login / google / github
│   ├── routers_chat.py
│   ├── database.py
│   └── .env.example
├── frontend/          # React + Vite + Tailwind (RTL)
│   ├── src/pages/     # Login / Chat / Profile
│   ├── src/hooks/     # useAuth, useChat, useTheme, useConversations
│   └── src/components/
├── logo/              # لوگو (SVG + JPG)
├── design/            # توکن‌های طراحی
└── start.bat          # اجرای یک‌کلیکی ویندوز
```

## 🚀 اجرا

### روش ۱ — ویندوز (یک کلیک)

دوبار کلیک روی `start.bat`

> اگر پایتون/Node در PATH نیست، `start.bat` مسیر AutoClaw را هم چک می‌کند.

### روش ۲ — دستی

**بک‌اند:**

```powershell
cd backend
pip install -r requirements.txt
copy .env.example .env        # ویندوز
# cp .env.example .env        # لینوکس/مک
python -m uvicorn main:app --reload --port 8000
```

**فرانت‌اند (ترمینال جدید):**

```powershell
cd frontend
npm install
npm run dev
```

سپس مرورگر: **http://localhost:5173**

- API docs: http://localhost:8000/docs
- Health: http://localhost:8000/health

## 🔑 تنظیمات (`backend/.env`)

از `.env.example` کپی کنید. هیچ کلیدی اجباری نیست؛ بدون کلید، اپ در حالت نمایشی کار می‌کند.

### ۱. مدل هوش مصنوعی (OpenRouter) — برای پاسخ واقعی

1. برو به [openrouter.ai/keys](https://openrouter.ai/keys)
2. یک کلید بساز
3. در `.env`:

```env
OPENROUTER_API_KEY=sk-or-v1-...
OPENROUTER_MODEL=google/gemini-2.0-flash-lite-001
```

مدل‌های سریع پیشنهادی:

| مدل | توضیح |
|---|---|
| `google/gemini-2.5-flash-lite` | پیش‌فرض — سریع و دقیق |
| `meta-llama/llama-3.1-8b-instant` | خیلی سریع |
| `google/gemini-2.5-flash` | تعادل سرعت/کیفیت |

### ۲. ورود با گوگل

1. [console.cloud.google.com/apis/credentials](https://console.cloud.google.com/apis/credentials)
2. **Create Credentials → OAuth client ID → Web application**
3. Authorized redirect URI (**دقیقاً**):

   ```
   http://localhost:8000/auth/google/callback
   ```

4. در `.env`:

```env
GOOGLE_CLIENT_ID=xxxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-xxxx
```

5. بک‌اند را ری‌استارت کن.

> اگر بعد از انتخاب حساب برگشتی به صفحه‌ی لاگین: پنجره‌ی API را ببین.
> اگر `Google token exchange failed` بود، VPN باید برای کل سیستم روشن باشد (نه فقط مرورگر).

### ۳. ورود با گیت‌هاب

1. [github.com/settings/developers](https://github.com/settings/developers) → **New OAuth App**
2. پر کن:

| فیلد | مقدار |
|---|---|
| Application name | `Dastyar` |
| Homepage URL | `http://localhost:5173` |
| Authorization callback URL | `http://localhost:8000/auth/github/callback` |

3. Device Flow و Wildcard را تیک نزن.
4. **Client ID** و **Client Secret** را در `.env`:

```env
GITHUB_CLIENT_ID=Ov23li...
GITHUB_CLIENT_SECRET=...
```

5. بک‌اند را ری‌استارت کن.

### بقیه‌ی متغیرها

```env
JWT_SECRET=change-me-to-a-long-random-string   # حتماً عوض کن
JWT_EXPIRE_MINUTES=43200                        # ۳۰ روز
APP_HOST=127.0.0.1
APP_PORT=8000
FRONTEND_URL=http://localhost:5173
BACKEND_URL=http://localhost:8000
MOCK_MODE=false                                 # true = همیشه پاسخ نمایشی
```

تولید JWT امن:

```powershell
python -c "import secrets;print(secrets.token_urlsafe(48))"
```

## 🔌 API خلاصه

| متد | مسیر | توضیح |
|---|---|---|
| POST | `/auth/register` | `{email, password, name}` |
| POST | `/auth/login` | `{email, password}` |
| GET | `/auth/me` | پروفایل (Bearer) |
| GET | `/auth/google` | شروع OAuth گوگل |
| GET | `/auth/github` | شروع OAuth گیت‌هاب |
| GET | `/auth/providers` | `{google:bool, github:bool}` |
| GET | `/conversations` | فهرست گفتگوها |
| POST | `/conversations` | گفتگوی تازه |
| GET | `/conversations/{id}/messages` | پیام‌ها |
| DELETE | `/conversations/{id}` | حذف |
| POST | `/chat` | `{conversation_id, message}` → SSE |
| PATCH | `/profile` | نام / تم / آواتار |
| GET | `/health` | `{status, model:"دستیار"}` |

## 🧪 نکات عیب‌یابی

<details>
<summary><b>start.bat اجرا نمی‌شود</b></summary>

پایتون/Node در PATH ویندوز نیست. نسخه‌ی جدید `start.bat` مسیر AutoClaw را هم چک می‌کند.
اگر باز نشد، CMD را در پوشه‌ی پروژه باز کن و `start.bat` را تایپ کن تا خطا را ببینی.
</details>

<details>
<summary><b>ورود با گوگل برمی‌گردد به لاگین</b></summary>

1. مطمئن شو Redirect URI دقیقاً `http://localhost:8000/auth/google/callback` است
2. پنجره‌ی API را ببین — اگر `token exchange failed` بود، VPN سیستم روشن باشد
3. `FRONTEND_URL` باید `http://localhost:5173` باشد
4. بعد از تغییر `index.html`، رفرش سخت: `Ctrl+Shift+R`
</details>

<details>
<summary><b>پاسخ‌ها نمایشی است / واقعی نیست</b></summary>

کلید `OPENROUTER_API_KEY` در `.env` خالی است. بگذار و بک‌اند را ری‌استارت کن.
</details>

<details>
<summary><b>npm install خطای شبکه می‌دهد</b></summary>

کش را پاک کن و دوباره:

```powershell
npm cache verify
npm install --no-audit --no-fund
```
</details>

## 🎨 طراحی

توکن‌ها در `design/tokens.css` و `frontend/src/index.css`:

- جوهر `#161616` · کاغذ `#ffffff` · اکسنت `#0F62FE`
- در دارک: اکسنت `#4589FF` (کنتراست ۴.۵:۱)
- فاصله‌گذاری ۸px · شعاع ۴/۸/۱۲ · لیفت ۲px
- بدون گرادیانت، بدون بنفش، بدون شلوغی

## 📄 لایسنس

MIT — آزاد برای استفاده، تغییر و انتشار.

---

<div dir="rtl" align="center">

ساخته‌شده با FastAPI و React · مدل برند **دستیار**

</div>
