import { applyThemeColors, generateColors } from '@yakit-libs/color'
import type { ColorHex } from '@yakit-libs/color'
import type { Theme } from '@/hook/useTheme'

export function applyYakitThemeColors(theme: Theme, mainColorOverride?: string) {
  applyThemeColors(theme, generateColors(theme, mainColorOverride as ColorHex | undefined))
}
