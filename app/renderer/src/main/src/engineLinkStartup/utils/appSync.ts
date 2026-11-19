import i18n from '@/i18n/i18n'
import { useTheme, type ThemeMode } from '@/hook/useTheme'
import { yakitApp } from './electronBridge'

let registered = false
let lastSyncedLanguage: string | null = null

/** 最近一次主窗 i18n 广播；配置快照可能早于广播，读取配置时应以它为准 */
export const getLastSyncedLanguage = () => lastSyncedLanguage

/** link 窗口监听主进程广播的 theme / i18n（与主窗、aux 同一 aux-window:app-sync 通道） */
export function registerLinkAppSyncHandlers() {
  if (registered) return () => {}
  registered = true

  const off = yakitApp.onSync((message) => {
    if (!message?.type) return
    if (message.type === 'theme') {
      useTheme.getState().syncTheme(message.payload as ThemeMode)
    } else if (message.type === 'i18n' && message.payload) {
      lastSyncedLanguage = message.payload
      void i18n.changeLanguage(message.payload)
    }
  })

  return () => {
    registered = false
    lastSyncedLanguage = null
    off()
  }
}
