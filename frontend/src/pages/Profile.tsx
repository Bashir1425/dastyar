import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChatHeader } from '../components/ChatHeader'
import { Logo } from '../components/Logo'
import { ThemeToggle } from '../components/ThemeToggle'
import { profileApi } from '../lib/api'
import { initials } from '../lib/format'
import { useAuth } from '../hooks/useAuth'

export default function Profile() {
  const { user, loading, setUser, logout } = useAuth()
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [saved, setSaved] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!loading && !user) navigate('/login', { replace: true })
  }, [loading, user, navigate])

  useEffect(() => {
    if (user) setName(user.name)
  }, [user])

  if (loading || !user) return null

  const save = async () => {
    setBusy(true)
    setError('')
    try {
      const updated = await profileApi.update({ name: name.trim() || user.name })
      setUser(updated)
      setSaved(true)
      setTimeout(() => setSaved(false), 1800)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'ذخیره نشد.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex min-h-dvh flex-col bg-paper">
      <ChatHeader onOpenSidebar={() => navigate(-1)} title="پروفایل" />

      <main className="mx-auto w-full max-w-lg flex-1 px-4 py-8">
        <div className="surface-card p-6">
          <div className="mb-6 flex items-center gap-4">
            {user.avatar_url ? (
              <img
                src={user.avatar_url}
                alt=""
                className="h-16 w-16 rounded-full object-cover"
              />
            ) : (
              <span className="grid h-16 w-16 place-items-center rounded-full bg-accent text-xl font-semibold text-on-accent">
                {initials(user.name)}
              </span>
            )}
            <div className="min-w-0">
              <h1 className="truncate font-display text-xl font-semibold">{user.name}</h1>
              <p dir="ltr" className="truncate text-sm text-muted">{user.email}</p>
              <p className="mt-1 text-[11px] text-muted">
                ورود با{' '}
                {user.provider === 'google'
                  ? 'گوگل'
                  : user.provider === 'github'
                    ? 'گیت‌هاب'
                    : 'ایمیل'}
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label htmlFor="pname" className="field-label">نام نمایشی</label>
              <input
                id="pname"
                className="field"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={80}
              />
            </div>

            <div>
              <p className="field-label">تم</p>
              <ThemeToggle />
            </div>

            {error && (
              <p role="alert" className="rounded-lg bg-danger-soft px-3 py-2 text-xs text-danger">
                {error}
              </p>
            )}

            <div className="flex items-center gap-3">
              <button onClick={save} disabled={busy} className="btn btn-primary flex-1">
                {busy ? 'در حال ذخیره…' : saved ? 'ذخیره شد ✓' : 'ذخیره تغییرات'}
              </button>
              <button
                onClick={async () => {
                  await logout()
                  navigate('/login', { replace: true })
                }}
                className="btn btn-ghost text-danger"
              >
                خروج
              </button>
            </div>
          </div>
        </div>

        <p className="mt-8 flex items-center justify-center gap-2 text-[11px] text-muted">
          <Logo size={14} className="text-muted" />
          دستیار · ساخت با FastAPI و React
        </p>
      </main>
    </div>
  )
}
