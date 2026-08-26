import { applyThemeColors } from '@yakit-libs/color'
import type { ColorHex } from '@yakit-libs/color'
import type { Theme } from '@/hook/useTheme'
import { getYakitThemeColors, usesStaticThemeCss } from './yakitColorVars'

export function applyYakitThemeColors(theme: Theme, mainColorOverride?: string) {
  const mainColor = mainColorOverride as ColorHex | undefined

  if (usesStaticThemeCss(mainColor)) {
    document.documentElement.dataset.theme = theme
    return
  }

  applyThemeColors(theme, getYakitThemeColors(theme, mainColor))
}
