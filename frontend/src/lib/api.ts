import type { AuthResponse, ProfilePatch, User } from './types'

const TOKEN_KEY = 'dastyar_token'
const USER_KEY = 'dastyar_user'

export function getToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY)
  } catch {
    return null
  }
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token)
}

export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(USER_KEY)
}

export function getStoredUser(): User | null {
  try {
    const raw = localStorage.getItem(USER_KEY)
    if (!raw) return null
    return JSON.parse(raw) as User
  } catch {
    return null
  }
}

export function setStoredUser(user: User): void {
  localStorage.setItem(USER_KEY, JSON.stringify(user))
}

function detailOf(body: unknown, fallback: string): string {
  if (!body) return fallback
  if (typeof body === 'string') return body
  const candidate = body as Record<string, unknown>
  if (typeof candidate.detail === 'string') return candidate.detail
  if (Array.isArray(candidate.detail)) {
    const first = candidate.detail[0] as { msg?: string } | undefined
    if (first?.msg) return first.msg
  }
  return fallback
}

export async function api<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const token = getToken()
  const res = await fetch(path, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init.headers ?? {}),
    },
  })

  if (!res.ok) {
    const body = await res.json().catch(() => null)
    if (res.status === 401) {
      clearToken()
      throw new Error('نشست شما منقضی شده؛ دوباره وارد شوید.')
    }
    throw new Error(detailOf(body, `خطای ${res.status}`))
  }

  if (res.status === 204) return undefined as T
  return (await res.json()) as T
}

/* ---------------- auth ---------------- */

export interface RegisterPayload {
  email: string
  password: string
  name: string
}

export const authApi = {
  register: (payload: RegisterPayload) =>
    api<AuthResponse>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  login: (email: string, password: string) =>
    api<AuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  me: () => api<User>('/auth/me'),

  logout: () => api<{ ok: boolean }>('/auth/logout', { method: 'POST' }),
}

/* ---------------- profile ---------------- */

export const profileApi = {
  update: (patch: ProfilePatch) =>
    api<User>('/profile', { method: 'PATCH', body: JSON.stringify(patch) }),
}

/* ---------------- conversations ---------------- */

export interface ConversationRow {
  id: number
  title: string
  created_at: string
  updated_at: string
}

export interface MessageRow {
  id: number
  role: 'user' | 'assistant' | 'system'
  content: string
  created_at: string
}

export const chatApi = {
  listConversations: () => api<ConversationRow[]>('/conversations'),
  createConversation: (title?: string) =>
    api<ConversationRow>('/conversations', {
      method: 'POST',
      body: JSON.stringify(title ? { title } : {}),
    }),
  listMessages: (id: number) =>
    api<MessageRow[]>(`/conversations/${id}/messages`),
  deleteConversation: (id: number) =>
    api<{ ok: boolean }>(`/conversations/${id}`, { method: 'DELETE' }),
}

/* ---------------- SSE chat ---------------- */

export interface StreamHandlers {
  onToken: (text: string) => void
  onDone: () => void
  onError: (message: string) => void
}

export async function streamChat(
  conversationId: number,
  message: string,
  handlers: StreamHandlers,
  signal?: AbortSignal,
): Promise<void> {
  const token = getToken()
  let res: Response
  try {
    res = await fetch('/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'text/event-stream',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ conversation_id: conversationId, message }),
      signal,
    })
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') return
    handlers.onError('ارتباط با سرور برقرار نشد.')
    return
  }

  if (!res.ok || !res.body) {
    const body = await res.json().catch(() => null)
    handlers.onError(detailOf(body, 'پاسخی دریافت نشد.'))
    return
  }

  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })
      const parts = buffer.split('\n\n')
      buffer = parts.pop() ?? ''
      for (const part of parts) {
        const dataLines = part
          .split('\n')
          .filter((line) => line.startsWith('data: '))
          .map((line) => line.slice(6))
        if (dataLines.length === 0) continue
        if (dataLines.includes('[DONE]')) {
          handlers.onDone()
          return
        }
        // Server splits multi-line tokens into several data: lines (SSE spec: join with \n).
        const text = dataLines.join('\n')
        if (text) handlers.onToken(text)
      }
    }
    handlers.onDone()
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') return
    handlers.onError('جریان پاسخ قطع شد.')
  }
}
