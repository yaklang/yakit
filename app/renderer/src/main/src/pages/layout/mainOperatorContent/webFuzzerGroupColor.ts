import type { CSSProperties } from 'react'

type WebFuzzerGroupColorStyle = CSSProperties & {
  '--web-fuzzer-group-color'?: string
  '--web-fuzzer-group-contrast-color'?: string
}

/** 标准 #RRGGBB 格式正则，用于识别用户自定义十六进制分组颜色。 */
const customGroupColorPattern = /^#[0-9A-Fa-f]{6}$/

/**
 * 校验是否为用户自定义的十六进制分组颜色。
 * 仅接受标准 #RRGGBB 格式，用于扩展固定 colorList 之外的主题色。
 */
export const isCustomWebFuzzerGroupColor = (color?: string) => customGroupColorPattern.test(color || '')

/**
 * 根据背景色亮度计算可读前景色。
 * 阈值 0.58 为常见 WCAG 近似判定：偏亮用深色文字，偏暗用白色文字。
 */
export const getWebFuzzerGroupContrastColor = (color: string) => {
  if (!isCustomWebFuzzerGroupColor(color)) return ''
  const red = Number.parseInt(color.slice(1, 3), 16)
  const green = Number.parseInt(color.slice(3, 5), 16)
  const blue = Number.parseInt(color.slice(5, 7), 16)
  const luminance = (red * 299 + green * 587 + blue * 114) / 255000
  return luminance > 0.58 ? '#111827' : '#FFFFFF'
}

/**
 * 生成分组自定义颜色所需的 CSS 变量。
 * 颜色统一大写，保证对比色可读；非法颜色返回空对象，避免污染样式。
 */
export const getCustomWebFuzzerGroupColorStyle = (color?: string): WebFuzzerGroupColorStyle => {
  if (!color || !isCustomWebFuzzerGroupColor(color)) return {}
  return {
    '--web-fuzzer-group-color': color.toUpperCase(),
    '--web-fuzzer-group-contrast-color': getWebFuzzerGroupContrastColor(color),
  }
}
