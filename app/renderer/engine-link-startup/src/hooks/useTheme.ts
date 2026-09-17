import { ipc } from '../../../../shared/communication/window-client'
import { create } from 'zustand'
export type Theme = 'light' | 'dark'
export type ThemeMode = Theme | 'system'
let cleanupThemeListener: (() => void) | null = null

function isThemeMode(value: string | null): value is ThemeMode {
  return value === 'system' || value === 'light' || value === 'dark'
}

function getSystemTheme(): Theme {
  if (typeof window !== 'undefined' && window.matchMedia) {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  }
  return 'light'
}

export function resolveTheme(mode: string): Theme {
  if (mode === 'dark' || mode === 'light') return mode
  return getSystemTheme()
}

function applyDocument(theme: Theme) {
  document.documentElement.setAttribute('data-theme', theme)
}

export const useTheme = create<{
  theme: Theme
  themeMode: ThemeMode
  setTheme: (theme: Theme, save: boolean) => void
  persistThemeMode: () => void
}>((set, get) => {
  const stored = localStorage.getItem('theme')
  const initialMode: ThemeMode = isThemeMode(stored) ? stored : 'light'
  const initialTheme = resolveTheme(initialMode)
  applyDocument(initialTheme)

  if (!cleanupThemeListener) {
    cleanupThemeListener = ipc.on('aux-window:app-sync', (message: { type: string; payload: string }) => {
      if (message.type !== 'theme') return
      const theme = message.payload
      const mode: ThemeMode = isThemeMode(theme) ? theme : resolveTheme(theme)
      const resolved = resolveTheme(mode)
      applyDocument(resolved)
      localStorage.setItem('theme', mode)
      set({ theme: resolved, themeMode: mode })
    })
  }

  return {
    theme: initialTheme,
    themeMode: initialMode,
    setTheme: (theme: Theme, save: boolean) => {
      applyDocument(theme)
      set({ theme, themeMode: theme })
      if (!save) return
      localStorage.setItem('theme', theme)
      ipc.invoke('local', 'aux-window:app-sync', { type: 'theme', payload: theme })
    },
    persistThemeMode: () => {
      const { themeMode } = get()
      localStorage.setItem('theme', themeMode)
      yakitTheme.setTheme(themeMode)
    },
  }
})
