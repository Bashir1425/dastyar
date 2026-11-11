export type ThemePreference = 'light' | 'dark' | 'system';

export type MessageRole = 'user' | 'assistant' | 'system';

export interface User {
  id: string | number;
  email: string;
  name: string;
  avatar_url?: string | null;
  provider?: string | null;
  theme?: ThemePreference | null;
  language?: string | null;
  created_at?: string | null;
}

export interface Conversation {
  id: string;
  title?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface ChatMessage {
  id: string;
  role: MessageRole;
  content: string;
  created_at?: string | null;
  /** Set on the assistant placeholder when the request failed. */
  error?: boolean;
  /** Set when the user stopped the generation. */
  stopped?: boolean;
}

export interface AuthResponse {
  access_token: string;
  user: User;
}

export interface ProfilePatch {
  name?: string;
  theme?: ThemePreference;
  avatar_url?: string | null;
}

export function isThemePreference(value: unknown): value is ThemePreference {
  return value === 'light' || value === 'dark' || value === 'system';
}

export function isUser(value: unknown): value is User {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Record<string, unknown>;
  return (
    (typeof candidate.id === 'string' || typeof candidate.id === 'number') &&
    typeof candidate.email === 'string'
  );
}
