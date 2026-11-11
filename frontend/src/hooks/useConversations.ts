import { useCallback, useEffect, useState } from 'react'
import { chatApi, type ConversationRow } from '../lib/api'

export function useConversations(activeId: number | null) {
  const [items, setItems] = useState<ConversationRow[]>([])
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    try {
      const list = await chatApi.listConversations()
      setItems(list)
    } catch {
      // keep previous list on failure
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  // Keep the active conversation at the top after a message lands.
  useEffect(() => {
    if (!activeId) return
    setItems((prev) => {
      const found = prev.find((item) => item.id === activeId)
      if (!found) return prev
      return [found, ...prev.filter((item) => item.id !== activeId)]
    })
  }, [activeId])

  const create = useCallback(async (title?: string) => {
    const created = await chatApi.createConversation(title)
    setItems((prev) => [created, ...prev])
    return created
  }, [])

  const remove = useCallback(async (id: number) => {
    await chatApi.deleteConversation(id)
    setItems((prev) => prev.filter((item) => item.id !== id))
  }, [])

  return { items, loading, refresh, create, remove }
}
