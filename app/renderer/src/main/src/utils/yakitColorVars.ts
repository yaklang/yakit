import { generateColors } from '@yakit-libs/color'
import { getColors as getPreviewColors } from '@yakit-libs/color/preview'
import type { ColorHex, ThemeMode } from '@yakit-libs/color'
import { GetMainColor } from './envfile'

const VAR_REF_PATTERN = /^var\((--[^)]+)\)$/
export const DEFAULT_MAIN_COLOR = '#F17F30' as ColorHex

const themeColorsCache = new Map<string, Record<string, string>>()
const resolvedColorsCache = new Map<string, Record<string, string>>()

const getCacheKey = (theme: ThemeMode, mainColorOverride?: ColorHex) =>
  `${theme}:${mainColorOverride?.toLowerCase() ?? DEFAULT_MAIN_COLOR.toLowerCase()}`

export const usesStaticThemeCss = (mainColorOverride?: ColorHex) =>
  !mainColorOverride || mainColorOverride.toLowerCase() === DEFAULT_MAIN_COLOR.toLowerCase()

export function resolveYakitColorVars(colors: Record<string, string>): Record<string, string> {
  const resolved: Record<string, string> = { ...colors }

  for (let pass = 0; pass < 10; pass++) {
    let changed = false

    for (const [key, value] of Object.entries(resolved)) {
      const match = value.match(VAR_REF_PATTERN)
      if (!match) continue

      const refValue = resolved?.[match[1]]
      if (refValue && !refValue.startsWith('var(')) {
        resolved[key] = refValue
        changed = true
      }
    }

    if (!changed) break
  }

  return resolved
}

export function getYakitThemeColors(theme: ThemeMode, mainColorOverride?: ColorHex): Record<string, string> {
  const cacheKey = getCacheKey(theme, mainColorOverride)
  const cached = themeColorsCache.get(cacheKey)
  if (cached) return cached

  const colors = usesStaticThemeCss(mainColorOverride)
    ? getPreviewColors(theme)
    : generateColors(theme, mainColorOverride)

  themeColorsCache.set(cacheKey, colors)
  return colors
}

export function getYakitColorVars(theme: ThemeMode, mainColorOverride?: ColorHex): Record<string, string> {
  const cacheKey = getCacheKey(theme, mainColorOverride)
  const cached = resolvedColorsCache.get(cacheKey)
  if (cached) return cached

  const colors = resolveYakitColorVars(getYakitThemeColors(theme, mainColorOverride))
  resolvedColorsCache.set(cacheKey, colors)
  return colors
}

/** 读取当前主题色变量；不依赖 monaco，避免从 theme.ts 间接拉入编辑器 ESM */
export function getAllYakitColorVars(theme?: ThemeMode): Record<string, string> {
  const currentTheme = theme ?? (document.documentElement.dataset.theme as ThemeMode | undefined) ?? 'light'
  return getYakitColorVars(currentTheme, GetMainColor(currentTheme) as ColorHex)
}

export const THEME_PRIMARY_COLOR = 'var(--Colors-Use-Main-Primary)'
export const THEME_BORDER_COLOR = 'var(--Colors-Use-Main-Border)'
