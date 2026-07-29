import { create } from 'zustand'
import { yakitTheme } from '@/services/electronBridge'

export type Theme = 'light' | 'dark'

function applyTheme(theme: Theme) {
  document.documentElement.setAttribute('data-theme', theme)
  localStorage.setItem('theme', theme)
}

export const useTheme = create<{
  theme: Theme
  setTheme: (theme: Theme) => void
  /** 来自主进程 yakit-app-sync 广播，不再走 IPC */
  syncTheme: (theme: Theme) => void
}>((set) => {
  const initialTheme: Theme = (localStorage.getItem('theme') as Theme) || 'light'
  applyTheme(initialTheme)

  return {
    theme: initialTheme,
    syncTheme: (theme: Theme) => {
      applyTheme(theme)
      set({ theme })
    },
    setTheme: (theme: Theme) => {
      applyTheme(theme)
      set({ theme })
      yakitTheme.setTheme(theme)
    },
  }
})
