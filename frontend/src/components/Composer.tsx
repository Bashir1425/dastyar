import { useRef, type KeyboardEvent } from 'react'

interface ComposerProps {
  onSend: (text: string) => void
  onStop: () => void
  streaming: boolean
  disabled?: boolean
}

export function Composer({ onSend, onStop, streaming, disabled }: ComposerProps) {
  const ref = useRef<HTMLTextAreaElement>(null)

  const autosize = () => {
    const el = ref.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`
  }

  const submit = () => {
    const el = ref.current
    if (!el) return
    const text = el.value.trim()
    if (!text || streaming || disabled) return
    onSend(text)
    el.value = ''
    autosize()
  }

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      submit()
    }
  }

  return (
    <div className="composer rounded-2xl border border-line bg-raised p-2 shadow-composer">
      <div className="flex items-end gap-2">
        <textarea
          ref={ref}
          rows={1}
          onInput={autosize}
          onKeyDown={onKeyDown}
          placeholder={disabled ? 'برای گفتگو وارد شوید…' : 'پیام بنویسید…'}
          disabled={disabled}
          aria-label="پیام"
          className="max-h-40 min-h-[44px] flex-1 resize-none bg-transparent px-3 py-2.5 text-[15px] leading-relaxed outline-none placeholder:text-muted disabled:opacity-50"
        />
        {streaming ? (
          <button
            onClick={onStop}
            className="btn btn-secondary h-11 w-11 !px-0"
            aria-label="توقف"
          >
            <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><rect x="6" y="6" width="12" height="12" rx="2" /></svg>
          </button>
        ) : (
          <button
            onClick={submit}
            disabled={disabled}
            className="btn btn-primary h-11 w-11 !px-0"
            aria-label="ارسال"
          >
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="rotate-180">
              <path d="M22 2 11 13" />
              <path d="M22 2 15 22l-4-9-9-4Z" />
            </svg>
          </button>
        )}
      </div>
      <p className="px-3 pb-1 pt-0.5 text-[11px] text-muted">
        Enter برای ارسال · Shift+Enter خط جدید
      </p>
    </div>
  )
}
