import { useMemo, type CSSProperties } from 'react'
import {
  generateColorScales,
  generateRandomColorScales,
  yakitThemeColors,
  type ColorHex,
  type ThemeColorName,
  type ThemeMode,
} from '@yakit-libs/color'
import { useTheme } from '@/hook/useTheme'
import type { MultipleNodeInfo } from './MainOperatorContentType'

type WebFuzzerGroupColorStyle = CSSProperties & {
  '--web-fuzzer-group-color'?: string
  '--web-fuzzer-group-contrast-color'?: string
}

/** 标准 #RRGGBB 格式正则，用于识别扩展分组颜色。 */
const customGroupColorPattern = /^#[0-9A-Fa-f]{6}$/

export const webFuzzerGroupColorList = [
  'purple',
  'blue',
  'lakeBlue',
  'green',
  'red',
  'orange',
  'bluePurple',
  'grey',
] as const

export type WebFuzzerFixedGroupColor = (typeof webFuzzerGroupColorList)[number]

const WEB_FUZZER_FIXED_COLOR_THEME_NAME: Record<WebFuzzerFixedGroupColor, ThemeColorName> = {
  purple: 'Purple',
  blue: 'Blue',
  lakeBlue: 'Lake-blue',
  green: 'Green',
  red: 'Error',
  orange: 'Orange',
  bluePurple: 'Magenta',
  grey: 'Neutral',
}

const WEB_FUZZER_FIXED_COLOR_DARK_BASE: Partial<Record<ThemeColorName, ColorHex>> = {
  Purple: '#9B79FF',
  Neutral: '#B6C0D2',
}

const SCALE_PRIMARY_LEVEL: Record<ThemeMode, number> = {
  light: 60,
  dark: 70,
}

const SCALE_ON_PRIMARY_LEVEL: Record<ThemeMode, number> = {
  light: 10,
  dark: 100,
}

const RANDOM_SCALE_NAME = 'Random-1'
const RANDOM_PERSIST_LEVEL = 60

const isFixedWebFuzzerGroupColor = (color?: string): color is WebFuzzerFixedGroupColor =>
  !!color && (webFuzzerGroupColorList as readonly string[]).includes(color)

/**
 * 校验是否为扩展分组颜色（标准 #RRGGBB）。
 */
export const isCustomWebFuzzerGroupColor = (color?: string) => customGroupColorPattern.test(color || '')

const normalizeHexForExclusion = (hex: string) => hex.trim().toLowerCase()

const toScaleVariable = (scaleName: string, level: number) => `--yakit-colors-${scaleName}-${level}`

const getScalePair = (scaleName: string, baseHex: ColorHex, mode: ThemeMode) => {
  const scales = generateColorScales([{ name: scaleName, hex: baseHex }])
  const current = scales[mode]
  const primaryLevel = SCALE_PRIMARY_LEVEL[mode]
  const onPrimaryLevel = SCALE_ON_PRIMARY_LEVEL[mode]
  return {
    primary: current[toScaleVariable(scaleName, primaryLevel)],
    onPrimary: current[toScaleVariable(scaleName, onPrimaryLevel)],
  }
}

export const getFixedColorBaseHex = (name: WebFuzzerFixedGroupColor, mode: ThemeMode): ColorHex => {
  const themeColorName = WEB_FUZZER_FIXED_COLOR_THEME_NAME[name]
  if (mode === 'dark' && WEB_FUZZER_FIXED_COLOR_DARK_BASE[themeColorName]) {
    return WEB_FUZZER_FIXED_COLOR_DARK_BASE[themeColorName] as ColorHex
  }
  return yakitThemeColors[themeColorName]
}

const getGroupColorBaseHex = (color: string, mode: ThemeMode): ColorHex | undefined => {
  if (isFixedWebFuzzerGroupColor(color)) {
    return getFixedColorBaseHex(color, mode)
  }
  if (isCustomWebFuzzerGroupColor(color)) {
    return color as ColorHex
  }
  return undefined
}

export const getGroupLength = (subPage: MultipleNodeInfo[]) =>
  subPage.filter((ele) => ele.groupChildren && ele.groupChildren.length > 0).length

export const collectUsedBaseHex = (subPage: MultipleNodeInfo[], mode: ThemeMode): string[] => {
  const used = new Set<string>()

  subPage.forEach((item) => {
    if (!item.groupChildren?.length || !item.color) return
    const baseHex = getGroupColorBaseHex(item.color, mode)
    if (baseHex) {
      used.add(normalizeHexForExclusion(baseHex))
    }
  })

  return Array.from(used)
}

export const pickWebFuzzerGroupColor = (subPage: MultipleNodeInfo[], mode: ThemeMode): string => {
  try {
    const groupLength = getGroupLength(subPage)
    if (groupLength < webFuzzerGroupColorList.length) {
      return webFuzzerGroupColorList[groupLength] || 'purple'
    }

    const exclusions = collectUsedBaseHex(subPage, mode)
    const randomScales = generateRandomColorScales(exclusions, 1)
    const persistedHex = randomScales.light[toScaleVariable(RANDOM_SCALE_NAME, RANDOM_PERSIST_LEVEL)]
    if (persistedHex) {
      return persistedHex
    }
  } catch {
    // fall through
  }

  return 'purple'
}

export const getWebFuzzerGroupColorStyle = (color?: string, mode: ThemeMode = 'light'): WebFuzzerGroupColorStyle => {
  if (!color) return {}

  try {
    if (isFixedWebFuzzerGroupColor(color)) {
      const baseHex = getFixedColorBaseHex(color, mode)
      const scaleName = `WebFuzzer-${color}`
      const { primary, onPrimary } = getScalePair(scaleName, baseHex, mode)
      if (!primary || !onPrimary) return {}
      return {
        '--web-fuzzer-group-color': primary,
        '--web-fuzzer-group-contrast-color': onPrimary,
      }
    }

    if (isCustomWebFuzzerGroupColor(color)) {
      const { primary, onPrimary } = getScalePair('WebFuzzerGroup', color as ColorHex, mode)
      if (!primary || !onPrimary) return {}
      return {
        '--web-fuzzer-group-color': primary,
        '--web-fuzzer-group-contrast-color': onPrimary,
      }
    }
  } catch {
    return color === 'purple' ? {} : getWebFuzzerGroupColorStyle('purple', mode)
  }

  return {}
}

export const useWebFuzzerGroupColorStyle = (color?: string): WebFuzzerGroupColorStyle => {
  const { theme } = useTheme()
  return useMemo(() => getWebFuzzerGroupColorStyle(color, theme), [color, theme])
}
