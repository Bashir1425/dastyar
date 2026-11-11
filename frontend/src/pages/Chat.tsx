import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChatHeader } from '../components/ChatHeader'
import { Composer } from '../components/Composer'
import { MessageList } from '../components/MessageList'
import { Sidebar } from '../components/Sidebar'
import { useAuth } from '../hooks/useAuth'
import { useChat } from '../hooks/useChat'
import { useConversations } from '../hooks/useConversations'

const SUGGESTIONS = [
  'یک تابع پایتون برای خواندن CSV بنویس',
  'React hooks را ساده توضیح بده',
  'یک کوئری SQL برای آخرین سفارش‌ها',
]

export default function Chat() {
  const { user, loading } = useAuth()
  const navigate = useNavigate()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [activeId, setActiveId] = useState<number | null>(null)
  const { items, create, refresh } = useConversations(activeId)
  const chat = useChat({
    onFirstReply: () => void refresh(),
  })

  useEffect(() => {
    if (!loading && !user) navigate('/login', { replace: true })
  }, [loading, user, navigate])

  const newChat = useCallback(async () => {
    chat.reset()
    setActiveId(null)
    setSidebarOpen(false)
  }, [chat])

  const selectChat = useCallback(
    async (id: number) => {
      setActiveId(id)
      try {
        await chat.load(id)
      } catch {
        chat.reset()
        setActiveId(null)
      }
    },
    [chat],
  )

  const send = useCallback(
    async (text: string) => {
      if (!user) return
      let convId = activeId
      if (!convId) {
        const created = await create(text.slice(0, 60))
        convId = created.id
        setActiveId(convId)
      }
      await chat.send(convId, text)
    },
    [user, activeId, create, chat],
  )

  if (loading) {
    return (
      <div className="grid min-h-dvh place-items-center bg-paper">
        <p className="text-sm text-muted">در حال ورود…</p>
      </div>
    )
  }
  if (!user) return null

  const activeTitle = items.find((item) => item.id === activeId)?.title

  return (
    <div className="flex min-h-dvh bg-paper">
      <Sidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        activeId={activeId}
        onSelect={selectChat}
        onNew={() => void newChat()}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <ChatHeader
          onOpenSidebar={() => setSidebarOpen(true)}
          title={activeTitle || 'دستیار'}
        />

        <main className="flex flex-1 flex-col overflow-hidden">
          <div className="scroll-area flex-1 overflow-y-auto">
            <MessageList messages={chat.messages} streaming={chat.streaming} />
          </div>

          <div className="mx-auto w-full max-w-3xl px-4 pb-4">
            {chat.messages.length === 0 && (
              <div className="mb-3 flex flex-wrap gap-2">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => void send(s)}
                    className="lift rounded-full border border-line bg-surface px-3.5 py-2 text-xs text-ink-2 hover:border-line-2 hover:text-ink"
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
            <Composer
              onSend={(text) => void send(text)}
              onStop={chat.stop}
              streaming={chat.streaming}
            />
          </div>
        </main>
      </div>
    </div>
  )
}
