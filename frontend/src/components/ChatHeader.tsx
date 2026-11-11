import { Logo } from './Logo'

interface ChatHeaderProps {
  onOpenSidebar: () => void
  title?: string
}

export function ChatHeader({ onOpenSidebar, title }: ChatHeaderProps) {
  return (
    <header className="sticky top-0 z-20 flex h-14 items-center gap-2 border-b border-line bg-paper/90 px-3 backdrop-blur md:px-4">
      <button
        onClick={onOpenSidebar}
        className="icon-btn md:hidden"
        aria-label="باز کردن منو"
      >
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"><path d="M3 6h18M3 12h18M3 18h18" /></svg>
      </button>

      <div className="flex items-center gap-2">
        <Logo size={20} className="text-ink md:hidden" />
        <span className="text-sm font-medium">{title ?? 'دستیار'}</span>
      </div>

      <span className="ms-auto hidden items-center gap-1.5 text-[11px] text-muted sm:flex">
        <span className="h-1.5 w-1.5 rounded-full bg-ok" aria-hidden="true" />
        آنلاین
      </span>
    </header>
  )
}
