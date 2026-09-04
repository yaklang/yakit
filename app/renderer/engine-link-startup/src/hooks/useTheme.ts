import { create } from 'zustand'
import { yakitTheme } from '@/utils/electronBridge'

export type Theme = 'light' | 'dark'
let cleanupThemeListener: (() => void) | null = null

function resolveIncoming(theme: string): Theme {
  if (theme === 'dark' || theme === 'light') return theme
  if (typeof window !== 'undefined' && window.matchMedia) {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  }
  return 'light'
}

function applyDocument(theme: Theme) {
  document.documentElement.setAttribute('data-theme', theme)
}

export const useTheme = create<{
  theme: Theme
  setTheme: (theme: Theme, save: boolean) => void
}>((set) => {
  const initialTheme = resolveIncoming(localStorage.getItem('theme') || 'light')
  applyDocument(initialTheme)

  if (!cleanupThemeListener) {
    cleanupThemeListener = yakitTheme.onUpdated((theme: string) => {
      const resolved = resolveIncoming(theme)
      applyDocument(resolved)
      set({ theme: resolved })
    })
  }

  return {
    theme: initialTheme,
    setTheme: (theme: Theme, save: boolean) => {
      applyDocument(theme)
      if (save) localStorage.setItem('theme', theme)
      set({ theme })
      yakitTheme.setTheme(theme)
    },
  }
})
