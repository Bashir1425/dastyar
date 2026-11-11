import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useConversations } from '../hooks/useConversations'
import { dayBucket, groupLabel, initials, type DayBucket } from '../lib/format'
import { Logo } from './Logo'
import { ThemeToggle } from './ThemeToggle'

interface SidebarProps {
  open: boolean
  onClose: () => void
  activeId: number | null
  onSelect: (id: number) => void
  onNew: () => void
}

const BUCKET_ORDER: DayBucket[] = ['today', 'yesterday', 'older', 'unknown']

export function Sidebar({ open, onClose, activeId, onSelect, onNew }: SidebarProps) {
  const { user } = useAuth()
  const { items, loading, remove } = useConversations(activeId)
  const navigate = useNavigate()
  const listRef = useRef<HTMLUListElement>(null)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && open) onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  const grouped = BUCKET_ORDER.map((bucket) => ({
    bucket,
    label: groupLabel(bucket),
    rows: items.filter((item) => dayBucket(item.updated_at) === bucket),
  })).filter((group) => group.rows.length > 0)

  return (
    <>
      {/* scrim — mobile only */}
      {open && (
        <div
          className="fixed inset-0 z-30 bg-ink/40 md:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside
        className={`fixed inset-y-0 end-0 z-40 flex w-[288px] flex-col border-s border-line bg-surface transition-transform duration-200 ease-out md:static md:translate-x-0 ${
          open ? 'translate-x-0' : 'translate-x-full md:translate-x-0'
        }`}
        aria-label="فهرست گفتگوها"
      >
        {/* brand */}
        <div className="flex items-center gap-2 px-4 pb-2 pt-4">
          <Logo size={24} className="text-ink" />
          <span className="font-display text-base font-semibold">دستیار</span>
          <button
            onClick={onClose}
            className="icon-btn ms-auto md:hidden"
            aria-label="بستن منو"
          >
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12" /></svg>
          </button>
        </div>

        {/* new chat */}
        <div className="px-3 pb-3">
          <button onClick={onNew} className="btn btn-primary w-full">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
            گفتگوی تازه
          </button>
        </div>

        {/* conversations */}
        <ul ref={listRef} className="scroll-area flex-1 overflow-y-auto px-2 pb-2">
          {loading && (
            <li className="px-3 py-6 text-center text-xs text-muted">در حال بارگذاری…</li>
          )}
          {!loading && items.length === 0 && (
            <li className="px-3 py-6 text-center text-xs leading-relaxed text-muted">
              هنوز گفتگویی ندارید.
              <br />
              یکی شروع کنید.
            </li>
          )}
          {grouped.map((group) => (
            <li key={group.bucket}>
              <p className="px-3 pb-1 pt-3 text-[11px] font-medium text-muted">{group.label}</p>
              <ul>
                {group.rows.map((row) => {
                  const active = row.id === activeId
                  return (
                    <li key={row.id} className="group/row relative">
                      <button
                        onClick={() => {
                          onSelect(row.id)
                          onClose()
                        }}
                        className={`flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-start text-sm transition-colors ${
                          active
                            ? 'bg-accent-soft font-medium text-ink'
                            : 'text-ink-2 hover:bg-bubble hover:text-ink'
                        }`}
                        style={active ? undefined : undefined}
                      >
                        <span
                          className={`h-1.5 w-1.5 shrink-0 rounded-full ${active ? 'bg-accent' : 'bg-line-2'}`}
                          aria-hidden="true"
                        />
                        <span className="truncate">{row.title || 'بدون عنوان'}</span>
                      </button>
                      <button
                        onClick={async () => {
                          await remove(row.id)
                          if (activeId === row.id) onNew()
                        }}
                        className="icon-btn absolute inset-y-0 end-1 my-auto h-8 w-8 opacity-0 transition-opacity focus-visible:opacity-100 group-hover/row:opacity-100"
                        aria-label={`حذف ${row.title || 'گفتگو'}`}
                      >
                        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" /></svg>
                      </button>
                    </li>
                  )
                })}
              </ul>
            </li>
          ))}
        </ul>

        {/* footer: theme + profile */}
        <div className="border-t border-line p-3">
          <ThemeToggle />
          <button
            onClick={() => {
              navigate('/profile')
              onClose()
            }}
            className="lift mt-3 flex w-full items-center gap-3 rounded-xl border border-line bg-raised p-2 text-start"
          >
            {user?.avatar_url ? (
              <img src={user.avatar_url} alt="" className="h-9 w-9 rounded-full object-cover" />
            ) : (
              <span className="grid h-9 w-9 place-items-center rounded-full bg-accent text-sm font-semibold text-on-accent">
                {initials(user?.name ?? 'د')}
              </span>
            )}
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-medium">{user?.name ?? 'کاربر'}</span>
              <span className="block truncate text-xs text-muted">{user?.email}</span>
            </span>
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" className="text-muted"><path d="M9 18l6-6-6-6" /></svg>
          </button>
        </div>
      </aside>
    </>
  )
}
