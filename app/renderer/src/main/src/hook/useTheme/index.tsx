import { useEffect, useState } from 'react'
import { create } from 'zustand'
import { yakitTheme } from '@/services/electronBridge'

export type Theme = 'light' | 'dark'
export type ThemeMode = Theme | 'system'

function isTheme(value: string | null): value is Theme {
  return value === 'light' || value === 'dark'
}

function isThemeMode(value: string | null): value is ThemeMode {
  return value === 'system' || isTheme(value)
}

function getSystemTheme(): Theme {
  if (typeof window === 'undefined' || !window.matchMedia) return 'light'
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

export function resolveTheme(theme: ThemeMode): Theme {
  return theme === 'system' ? getSystemTheme() : theme
}

function readTheme(): ThemeMode {
  const stored = localStorage.getItem('theme')
  return isThemeMode(stored) ? stored : 'light'
}

function applyTheme(theme: ThemeMode) {
  document.documentElement.setAttribute('data-theme', resolveTheme(theme))
  localStorage.setItem('theme', theme)
}

const themeStore = create<{
  /** 用户选择：system / light / dark */
  theme: ThemeMode
  setTheme: (theme: ThemeMode) => void
  syncTheme: (theme: ThemeMode) => void
}>((set, get) => {
  const initialTheme = readTheme()
  applyTheme(initialTheme)

  if (typeof window !== 'undefined' && window.matchMedia) {
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
      if (get().theme !== 'system') return
      applyTheme('system')
      yakitTheme.setTheme('system')
    })
  }

  return {
    theme: initialTheme,
    syncTheme: (theme) => {
      if (!isThemeMode(theme)) return
      applyTheme(theme)
      set({ theme })
    },
    setTheme: (theme) => {
      applyTheme(theme)
      set({ theme })
      yakitTheme.setTheme(theme)
    },
  }
})

function useLiveResolvedTheme(theme: ThemeMode): Theme {
  const [systemTheme, setSystemTheme] = useState(getSystemTheme)

  useEffect(() => {
    if (theme !== 'system') return
    const media = window.matchMedia('(prefers-color-scheme: dark)')
    const onChange = () => setSystemTheme(getSystemTheme())
    onChange()
    media.addEventListener('change', onChange)
    return () => media.removeEventListener('change', onChange)
  }, [theme])

  return theme === 'system' ? systemTheme : theme
}

function useThemeHook() {
  const themeMode = themeStore((s) => s.theme)
  const setTheme = themeStore((s) => s.setTheme)
  const syncTheme = themeStore((s) => s.syncTheme)
  const theme = useLiveResolvedTheme(themeMode)
  return { theme, themeMode, setTheme, syncTheme }
}

/** theme：当前实际亮/暗；themeMode：用户选的 system/light/dark */
export const useTheme = Object.assign(useThemeHook, {
  getState: themeStore.getState,
  setState: themeStore.setState,
  subscribe: themeStore.subscribe,
})
