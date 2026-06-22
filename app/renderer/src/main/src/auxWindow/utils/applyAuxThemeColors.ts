import { GetMainColor } from '@/utils/envfile'
import { applyYakitThemeColors } from '@/utils/applyYakitThemeColors'
import type { Theme } from '@/hook/useTheme'

export const AUX_XTERM_THEME_SYNC = 'aux:xterm-theme-sync'

/** CSS 变量写入完成后再刷新 xterm，避免被主窗 stale 的 forward-xterm-theme 覆盖 */
export function scheduleSyncAuxXtermTheme() {
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      window.dispatchEvent(new CustomEvent(AUX_XTERM_THEME_SYNC))
    })
  })
}

export function applyAuxThemeColors(theme: Theme) {
  applyYakitThemeColors(theme, GetMainColor(theme))
  scheduleSyncAuxXtermTheme()
}
