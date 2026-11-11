import { useCallback, useEffect, useState } from 'react'
import { profileApi } from '../lib/api'
import type { ThemePreference } from '../lib/types'

const KEY = 'dastyar_theme'

function resolve(preference: ThemePreference): 'light' | 'dark' {
  if (preference !== 'system') return preference
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function apply(preference: ThemePreference): void {
  const resolved = resolve(preference)
  document.documentElement.setAttribute('data-theme', resolved)
  document.documentElement.style.colorScheme = resolved
  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute('content', resolved === 'dark' ? '#0d0d0f' : '#ffffff')
}

export function useTheme() {
  const [preference, setPreference] = useState<ThemePreference>(() => {
    const stored = localStorage.getItem(KEY)
    return stored === 'light' || stored === 'dark' || stored === 'system' ? stored : 'system'
  })

  useEffect(() => {
    apply(preference)
    localStorage.setItem(KEY, preference)
  }, [preference])

  useEffect(() => {
    if (preference !== 'system') return
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const onChange = () => apply('system')
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [preference])

  const update = useCallback(
    async (next: ThemePreference, persist = true) => {
      setPreference(next)
      if (persist) {
        try {
          await profileApi.update({ theme: next })
        } catch {
          // offline / not logged in — localStorage is enough
        }
      }
    },
    [],
  )

  return { preference, resolved: resolve(preference), setTheme: update }
}
