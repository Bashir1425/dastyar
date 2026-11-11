import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { api } from '../lib/api'
import { Logo } from '../components/Logo'
import { ThemeToggle } from '../components/ThemeToggle'

type Mode = 'login' | 'register'

interface Providers {
  google: boolean
  github: boolean
}

export default function Login() {
  const { login, register, user } = useAuth()
  const navigate = useNavigate()
  const [mode, setMode] = useState<Mode>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [busy, setBusy] = useState(false)
  const [providers, setProviders] = useState<Providers | null>(null)
  const [showGuide, setShowGuide] = useState(false)

  useEffect(() => {
    if (user) navigate('/', { replace: true })
  }, [user, navigate])

  useEffect(() => {
    const oauthError = sessionStorage.getItem('dastyar_oauth_error');
    if (oauthError) {
      sessionStorage.removeItem('dastyar_oauth_error');
      const map: Record<string, string> = {
        oauth_failed: 'ورود با گوگل/گیت‌هاب ناموفق بود. دوباره تلاش کنید.',
        invalid_state: 'نشست OAuth منقضی شده. دوباره تلاش کنید.',
        google_failed:
          'سرور نتوانست با گوگل صحبت کند. اگر VPN داری، برای پنجره‌ی API هم روشن باشد. لاگ پنجره‌ی Dastyar API را ببین.',
        google_cancelled: 'ورود با گوگل لغو شد.',
        google_no_email: 'حساب گوگل ایمیل نداشت یا دسترسی ایمیل داده نشد.',
        google_missing_code: 'پاسخ گوگل ناقص بود. دوباره تلاش کنید.',
        github_failed: 'اتصال به گیت‌هاب برقرار نشد. تنظیمات OAuth App را بررسی کنید.',
      }
      setError(map[oauthError] ?? `خطای OAuth: ${oauthError}`)
    }
  }, [])

  useEffect(() => {
    api<Providers>('/auth/providers')
      .then(setProviders)
      .catch(() => setProviders({ google: false, github: false }))
  }, [])

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      if (mode === 'login') {
        await login(email, password)
      } else {
        await register(email, password, name || email.split('@')[0])
      }
      navigate('/', { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'خطایی رخ داد.')
    } finally {
      setBusy(false)
    }
  }

  const startOAuth = (provider: 'google' | 'github') => {
    setError('')
    if (providers && !providers[provider]) {
      setShowGuide(true)
      setNotice(
        provider === 'google'
          ? 'ورود با گوگل هنوز پیکربندی نشده. با ایمیل/رمز وارد شوید یا Client ID گوگل را بسازید.'
          : 'ورود با گیت‌هاب هنوز پیکربندی نشده. با ایمیل/رمز وارد شوید یا OAuth App بسازید.',
      )
      return
    }
    window.location.href = `/auth/${provider}`
  }

  return (
    <main className="grid min-h-dvh place-items-center bg-paper px-4 py-10">
      <div className="w-full max-w-[400px]">
        <div className="mb-6 flex flex-col items-center gap-3">
          <Logo size={40} className="text-ink" />
          <h1 className="font-display text-2xl font-semibold">دستیار</h1>
          <p className="text-center text-sm leading-relaxed text-muted">
            دستیار سریع فارسی برای پرسش، نوشتن و کدنویسی
          </p>
        </div>

        <div className="surface-card lift p-5">
          <div className="mb-4 grid grid-cols-2 gap-1 rounded-xl bg-surface p-1" role="tablist">
            {(['login', 'register'] as Mode[]).map((m) => (
              <button
                key={m}
                role="tab"
                aria-selected={mode === m}
                onClick={() => {
                  setMode(m)
                  setError('')
                  setNotice('')
                }}
                className={`rounded-lg py-2 text-sm font-medium transition-colors ${
                  mode === m ? 'bg-raised text-ink shadow-sm' : 'text-muted hover:text-ink'
                }`}
              >
                {m === 'login' ? 'ورود' : 'ساخت حساب'}
              </button>
            ))}
          </div>

          <form onSubmit={submit} className="space-y-3">
            {mode === 'register' && (
              <div>
                <label htmlFor="name" className="field-label">نام</label>
                <input
                  id="name"
                  className="field"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="مثلاً علی"
                  autoComplete="name"
                />
              </div>
            )}
            <div>
              <label htmlFor="email" className="field-label">ایمیل (جیمیل)</label>
              <input
                id="email"
                type="email"
                required
                dir="ltr"
                className="field"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@gmail.com"
                autoComplete="email"
              />
            </div>
            <div>
              <label htmlFor="password" className="field-label">رمز عبور</label>
              <input
                id="password"
                type="password"
                required
                minLength={6}
                dir="ltr"
                className="field"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              />
            </div>

            {error && (
              <p role="alert" className="rounded-lg bg-danger-soft px-3 py-2 text-xs leading-relaxed text-danger">
                {error}
              </p>
            )}
            {notice && (
              <p className="rounded-lg bg-accent-soft px-3 py-2 text-xs leading-relaxed text-ink">
                {notice}
              </p>
            )}

            <button type="submit" disabled={busy} className="btn btn-primary w-full">
              {busy ? 'لطفاً صبر کنید…' : mode === 'login' ? 'ورود' : 'ساخت حساب'}
            </button>
          </form>

          <div className="my-4 flex items-center gap-3 text-[11px] text-muted">
            <span className="h-px flex-1 bg-line" />
            یا
            <span className="h-px flex-1 bg-line" />
          </div>

          <div className="space-y-2">
            <button
              type="button"
              onClick={() => startOAuth('google')}
              className="btn btn-secondary w-full"
            >
              <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1Z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23Z" />
                <path fill="#FBBC05" d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84Z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15A11 11 0 0 0 2.18 7.06l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38Z" />
              </svg>
              ورود با گوگل
              {providers && !providers.google && (
                <span className="ms-auto text-[10px] text-muted">(غیرفعال)</span>
              )}
            </button>
            <button
              type="button"
              onClick={() => startOAuth('github')}
              className="btn btn-secondary w-full"
            >
              <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true">
                <path d="M12 .5C5.65.5.5 5.65.5 12c0 5.08 3.29 9.39 7.86 10.91.58.11.79-.25.79-.56v-2c-3.2.7-3.87-1.54-3.87-1.54-.52-1.33-1.28-1.68-1.28-1.68-1.04-.71.08-.7.08-.7 1.15.08 1.76 1.18 1.76 1.18 1.03 1.75 2.69 1.25 3.34.95.1-.74.4-1.25.72-1.54-2.55-.29-5.23-1.28-5.23-5.68 0-1.26.45-2.28 1.18-3.09-.12-.29-.51-1.46.11-3.05 0 0 .96-.31 3.15 1.18a11 11 0 0 1 5.74 0c2.19-1.49 3.15-1.18 3.15-1.18.62 1.59.23 2.76.11 3.05.73.81 1.18 1.83 1.18 3.09 0 4.41-2.69 5.38-5.25 5.67.41.35.77 1.05.77 2.12v3.14c0 .31.21.68.8.56A10.52 10.52 0 0 0 23.5 12C23.5 5.65 18.35.5 12 .5Z" />
              </svg>
              ورود با گیت‌هاب
              {providers && !providers.github && (
                <span className="ms-auto text-[10px] text-muted">(غیرفعال)</span>
              )}
            </button>
          </div>

          {showGuide && (
            <div className="mt-4 rounded-xl border border-line bg-surface p-3 text-xs leading-relaxed text-ink-2">
              <p className="mb-2 font-medium text-ink">فعال‌سازی ورود با گوگل (۲ دقیقه):</p>
              <ol className="list-decimal space-y-1 ps-4">
                <li>
                  به <a href="https://console.cloud.google.com/apis/credentials" target="_blank" rel="noreferrer" className="link-draw">console.cloud.google.com</a> بروید
                </li>
                <li>Credentials → Create Credentials → OAuth client ID</li>
                <li>Application type: <b>Web application</b></li>
                <li>
                  Authorized redirect URI:
                  <code dir="ltr" className="mx-1 rounded bg-bubble px-1.5 py-0.5 font-mono text-[11px]">
                    http://localhost:8000/auth/google/callback
                  </code>
                </li>
                <li>Client ID و Secret را در <code dir="ltr">backend/.env</code> بگذارید و بک‌اند را ری‌استارت کنید</li>
              </ol>
              <p className="mt-2 text-[11px] text-muted">
                تا آن موقع، با ایمیل و رمز وارد شوید — همان جیمیل کافی است.
              </p>
            </div>
          )}
        </div>

        <div className="mt-6">
          <ThemeToggle />
        </div>

        <p className="mt-6 text-center text-[11px] leading-relaxed text-muted">
          با ورود، شرایط استفاده را می‌پذیرید.
          <br />
          بدون کلید OpenRouter، دستیار در حالت نمایشی پاسخ می‌دهد.
        </p>
      </div>
    </main>
  )
}
