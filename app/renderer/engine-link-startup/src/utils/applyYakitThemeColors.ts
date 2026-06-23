import { applyThemeColors, generateColors } from '@yakit-libs/color'
import type { ColorHex } from '@yakit-libs/color'

export function applyYakitThemeColors(theme: 'light' | 'dark', mainColorOverride?: string) {
  applyThemeColors(theme, generateColors(theme, mainColorOverride as ColorHex | undefined))
}
