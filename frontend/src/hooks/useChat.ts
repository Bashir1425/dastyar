import { useCallback, useRef, useState } from 'react'
import { chatApi, streamChat, type MessageRow } from '../lib/api'
import type { ChatMessage } from '../lib/types'

interface UseChatOptions {
  onFirstReply?: (conversationId: number, userText: string) => void
}

export function useChat({ onFirstReply }: UseChatOptions = {}) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [streaming, setStreaming] = useState(false)
  const abortRef = useRef<AbortController | null>(null)

  const load = useCallback(async (conversationId: number) => {
    const rows: MessageRow[] = await chatApi.listMessages(conversationId)
    setMessages(
      rows.map((row) => ({
        id: String(row.id),
        role: row.role,
        content: row.content,
        created_at: row.created_at,
      })),
    )
  }, [])

  const stop = useCallback(() => {
    abortRef.current?.abort()
    abortRef.current = null
    setStreaming(false)
    setMessages((prev) => {
      const last = prev[prev.length - 1]
      if (last?.role === 'assistant' && !last.content) {
        return [...prev.slice(0, -1), { ...last, stopped: true }]
      }
      return prev
    })
  }, [])

  const send = useCallback(
    async (conversationId: number, text: string) => {
      const trimmed = text.trim()
      if (!trimmed || streaming) return

      const userMsg: ChatMessage = {
        id: `u-${Date.now()}`,
        role: 'user',
        content: trimmed,
      }
      const botId = `a-${Date.now()}`
      const botMsg: ChatMessage = {
        id: botId,
        role: 'assistant',
        content: '',
      }
      setMessages((prev) => [...prev, userMsg, botMsg])
      setStreaming(true)
      abortRef.current = new AbortController()

      let first = true
      await streamChat(
        conversationId,
        trimmed,
        {
          onToken: (token) => {
            if (first) {
              first = false
              onFirstReply?.(conversationId, trimmed)
            }
            setMessages((prev) =>
              prev.map((msg) =>
                msg.id === botId ? { ...msg, content: msg.content + token } : msg,
              ),
            )
          },
          onDone: () => {
            setStreaming(false)
            abortRef.current = null
          },
          onError: (message) => {
            setMessages((prev) =>
              prev.map((msg) =>
                msg.id === botId ? { ...msg, content: message, error: true } : msg,
              ),
            )
            setStreaming(false)
            abortRef.current = null
          },
        },
        abortRef.current.signal,
      )
    },
    [streaming, onFirstReply],
  )

  const reset = useCallback(() => {
    abortRef.current?.abort()
    abortRef.current = null
    setMessages([])
    setStreaming(false)
  }, [])

  return { messages, streaming, send, stop, load, reset }
}
