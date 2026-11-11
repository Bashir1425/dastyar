import { useEffect, useRef } from 'react'
import type { ChatMessage } from '../lib/types'
import { Markdown } from './Message'
import { Logo } from './Logo'

interface MessageListProps {
  messages: ChatMessage[]
  streaming: boolean
}

function TypingDots() {
  return (
    <span className="inline-flex items-center gap-1 py-2 text-muted" aria-label="در حال نوشتن">
      <i className="typing-dot" />
      <i className="typing-dot" />
      <i className="typing-dot" />
    </span>
  )
}

export function MessageList({ messages, streaming }: MessageListProps) {
  const endRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [messages])

  if (messages.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
        <Logo size={48} className="text-ink" />
        <h1 className="font-display text-2xl font-semibold">چطور می‌توانم کمک کنم؟</h1>
        <p className="max-w-sm text-sm leading-relaxed text-muted">
          سؤال بپرسید، کد بنویسید، یا هر کاری که دارید. پاسخ‌ها سریع و جاری می‌آیند.
        </p>
      </div>
    )
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-6">
      {messages.map((msg) => {
        const isUser = msg.role === 'user'
        const empty = !msg.content && (streaming || msg.stopped)
        return (
          <article
            key={msg.id}
            className={`rise-in group mb-6 flex flex-col ${isUser ? 'items-start' : 'items-end'}`}
          >
            <span className="mb-1 text-[11px] font-medium text-muted">
              {isUser ? 'شما' : 'دستیار'}
            </span>
            <div
              className={`w-fit max-w-full rounded-2xl px-4 py-3 ${
                isUser
                  ? 'rounded-bl-md border border-line bg-bubble text-ink'
                  : 'rounded-br-md border border-line bg-paper'
              } ${msg.error ? 'border-danger/40' : ''}`}
            >
              {empty && streaming && !isUser ? (
                <TypingDots />
              ) : empty && msg.stopped ? (
                <p className="text-sm text-muted">تولید پاسخ متوقف شد.</p>
              ) : isUser ? (
                <p className="whitespace-pre-wrap text-[15.5px] leading-[1.9]">{msg.content}</p>
              ) : (
                <Markdown content={msg.content} />
              )}
            </div>
          </article>
        )
      })}
      <div ref={endRef} />
    </div>
  )
}
