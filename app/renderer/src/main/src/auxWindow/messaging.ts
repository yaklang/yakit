import { yakitApp } from '@/services/electronBridge'
import i18n from '@/i18n/i18n'
import { useTheme, type Theme } from '@/hook/useTheme'
import { applyAuxThemeColors } from '@/auxWindow/applyAuxThemeColors'

export type AppSyncType = 'theme' | 'i18n'

export interface AppSyncMessage {
  type: AppSyncType
  payload: string
}

let appSyncRegistered = false

const isAuxWindow = () =>
  window.location.pathname.includes('yakit-aux') || new URLSearchParams(window.location.search).has('route')

function handleAppSyncMessage(message: AppSyncMessage) {
  if (!message?.type) return
  switch (message.type) {
    case 'theme': {
      const theme = message.payload as Theme
      if (isAuxWindow()) {
        applyAuxThemeColors(theme)
      }
      useTheme.getState().syncTheme(theme)
      break
    }
    case 'i18n':
      if (message.payload) void i18n.changeLanguage(message.payload)
      break
    default:
      break
  }
}

/** 主渲染 / 辅助窗入口：监听 theme / i18n 广播 */
export function registerAppSyncHandlers() {
  if (appSyncRegistered) return () => {}
  appSyncRegistered = true

  const off = yakitApp.onSync(handleAppSyncMessage)
  return () => {
    appSyncRegistered = false
    off()
  }
}

/** 主窗口：广播 theme / i18n 到所有窗口 */
export function syncAppSettings(message: AppSyncMessage) {
  return yakitApp.sync(message)
}
