import { create } from 'zustand'
import { yakitTheme } from '@/utils/electronBridge'

export type Theme = 'light' | 'dark'
let cleanupThemeListener: (() => void) | null = null

function applyTheme(theme: Theme) {
  document.documentElement.setAttribute('data-theme', theme)
  localStorage.setItem('theme', theme)
}

export const useTheme = create<{
  theme: Theme
  setTheme: (theme: Theme) => void
}>((set) => {
  const initialTheme: Theme = (localStorage.getItem('theme') as Theme) || 'light'
  applyTheme(initialTheme)

  if (!cleanupThemeListener) {
    cleanupThemeListener = yakitTheme.onUpdated((theme: Theme) => {
      applyTheme(theme)
      set({ theme })
    })
  }

  return {
    theme: initialTheme,
    setTheme: (theme: Theme) => {
      applyTheme(theme)
      set({ theme })
      yakitTheme.setTheme(theme)
    },
  }
})
