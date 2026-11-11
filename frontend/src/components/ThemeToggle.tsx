import { useTheme } from '../hooks/useTheme'
import type { ThemePreference } from '../lib/types'

const OPTIONS: { value: ThemePreference; label: string; icon: string }[] = [
  { value: 'light', label: 'روشن', icon: 'sun' },
  { value: 'dark', label: 'دارک', icon: 'moon' },
  { value: 'system', label: 'سیستم', icon: 'monitor' },
]

function Icon({ name }: { name: string }) {
  const common = {
    viewBox: '0 0 24 24',
    width: 16,
    height: 16,
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.7,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    'aria-hidden': true,
  }
  if (name === 'sun') return <svg {...common}><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></svg>
  if (name === 'moon') return <svg {...common}><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z" /></svg>
  return <svg {...common}><rect x="2" y="3" width="20" height="14" rx="2" /><path d="M8 21h8M12 17v4" /></svg>
}

export function ThemeToggle() {
  const { preference, setTheme } = useTheme()

  return (
    <div
      role="radiogroup"
      aria-label="تم"
      className="flex w-full gap-1 rounded-xl border border-line bg-surface p-1"
    >
      {OPTIONS.map((opt) => {
        const active = preference === opt.value
        return (
          <button
            key={opt.value}
            role="radio"
            aria-checked={active}
            onClick={() => void setTheme(opt.value)}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg px-2 py-2 text-xs font-medium transition-colors ${
              active
                ? 'bg-raised text-ink shadow-sm'
                : 'text-muted hover:text-ink'
            }`}
          >
            <Icon name={opt.icon} />
            {opt.label}
          </button>
        )
      })}
    </div>
  )
}
