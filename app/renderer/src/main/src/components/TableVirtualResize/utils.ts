import type React from 'react'

/**
 * @name 单元格背景色类型
 * @description 该类型必须按照升序排列
 */
type CellColor = 'BLUE' | 'CYAN' | 'GREEN' | 'GREY' | 'ORANGE' | 'PURPLE' | 'RED' | 'YELLOW'

/** @name 单元格背景色类型对应Tag */
export const TableCellToColorTag: Record<CellColor, string> = {
  BLUE: 'YAKIT_COLOR_BLUE',
  CYAN: 'YAKIT_COLOR_CYAN',
  GREEN: 'YAKIT_COLOR_GREEN',
  GREY: 'YAKIT_COLOR_GREY',
  ORANGE: 'YAKIT_COLOR_ORANGE',
  PURPLE: 'YAKIT_COLOR_PURPLE',
  RED: 'YAKIT_COLOR_RED',
  YELLOW: 'YAKIT_COLOR_YELLOW',
}

/**
 * @name 过滤出内容里的颜色Tag并转换成表格单元格可识别的颜色内容
 * @description 传入的内容中Tag是由'|'分割的(该分隔符由后端定义的)
 * @description 过滤出的颜色通过空格分割
 * @description 过滤出来的颜色样式为 "table-cell-bg-{color}"
 */
export const filterColorTag = (content?: string) => {
  if (!content || content.indexOf('YAKIT_COLOR_') === -1) return ''

  let colors: string[] = []
  try {
    colors = content
      .split('|')
      .filter((item) => item.indexOf('YAKIT_COLOR_') > -1)
      .map((item) => (item.split('_').pop() || '').toLowerCase())
      .filter((item) => !!item)
      .sort()
      .map((item) => `table-cell-bg-${item}`)
  } catch (error) {}
  return colors.length === 0 ? '' : colors.join(' ')
}

const VALID_CELL_BG_COLORS = new Set(['blue', 'cyan', 'green', 'grey', 'orange', 'purple', 'red', 'yellow'])

/**
 * @name 解析数据里传递的颜色内容并生成对应的颜色类名后缀
 * @description 只认 `table-cell-bg-{color}`，且 color 为八种合法色。普通自定义类名返回空。
 */
export const parseColorTag = (content?: string) => {
  if (!content) return ''

  let colors: string[] = []
  try {
    colors = content
      .split(/\s+/)
      .map((item) => {
        const matched = /^table-cell-bg-([a-z]+)$/i.exec(item)
        if (!matched) return ''
        const color = matched[1].toLowerCase()
        return VALID_CELL_BG_COLORS.has(color) ? color : ''
      })
      .filter((item) => !!item)
      .sort()
      .slice(0, 3)
  } catch (error) {}
  return colors.length === 0 ? '' : colors.join('-')
}

/** 单色（非 red）文字色 token：与 scss 的 $yakit-color-token-names 对应 */
const cellTextColorVars: Record<string, string> = {
  blue: 'var(--yakit-colors-Blue-100)',
  cyan: 'var(--yakit-colors-Cyan-100)',
  green: 'var(--yakit-colors-Green-100)',
  grey: 'var(--yakit-colors-Neutral-100)',
  orange: 'var(--yakit-colors-Orange-100)',
  purple: 'var(--yakit-colors-Purple-100)',
  yellow: 'var(--yakit-colors-Yellow-100)',
}

/** 单元格渐变背景色 token：多色组合用 Primary，与 scss 的 $generateColors 对应 */
const cellGradientColorVars: Record<string, string> = {
  blue: 'var(--Colors-Use-Blue-Primary)',
  cyan: 'var(--Colors-Use-Cyan-Primary)',
  green: 'var(--Colors-Use-Green-Primary)',
  grey: 'var(--Colors-Use-Grey-Primary)',
  orange: 'var(--Colors-Use-Orange-Primary)',
  purple: 'var(--Colors-Use-Purple-Primary)',
  red: 'var(--Colors-Use-Error-Primary)',
  yellow: 'var(--Colors-Use-Yellow-Primary)',
}

/** 单色单元格背景色 token：与 scss 的 $allColors 对应 */
const cellSolidColorVars: Record<string, string> = {
  blue: 'var(--Colors-Use-Blue-Border)',
  cyan: 'var(--Colors-Use-Cyan-Border)',
  green: 'var(--Colors-Use-Green-Border)',
  grey: 'var(--Colors-Use-Grey-Border)',
  orange: 'var(--Colors-Use-Orange-Border)',
  purple: 'var(--Colors-Use-Purple-Border)',
  red: 'var(--Colors-Use-Error-Primary)',
  yellow: 'var(--Colors-Use-Yellow-Border)',
}

/** 单色 hover/active 背景色 token：与 scss 的 $allColors-hover 对应 */
const cellHoverColorVars: Record<string, string> = {
  blue: 'var(--Colors-Use-Blue-Hover)',
  cyan: 'var(--yakit-colors-Cyan-50)',
  green: 'var(--yakit-colors-Green-50)',
  grey: 'var(--yakit-colors-Neutral-50)',
  orange: 'var(--yakit-colors-Orange-50)',
  purple: 'var(--yakit-colors-Purple-50)',
  red: 'var(--Colors-Use-Error-Pressed)',
  yellow: 'var(--yakit-colors-Yellow-50)',
}

/**
 * @name 解析数据里的颜色内容并生成单元格内联 CSS 变量
 * @description 替代 scss 递归组合展开（92 组合 × 6 状态 ≈ 552 条静态选择器）：
 * 颜色列表以 CSS 变量传给元素，样式侧只保留 cell/hover/active 三条状态规则。
 */
export const parseCellStyleVars = (content?: string): React.CSSProperties => {
  const colorTypes = parseColorTag(content)
  if (!colorTypes) return {}
  const colors = colorTypes.split('-')

  if (colors.length === 1) {
    const [type] = colors
    const isRed = type === 'red'
    const textColor = isRed ? 'var(--Colors-Use-Error-On-Primary)' : cellTextColorVars[type]
    return {
      '--vt-cell-bg': cellSolidColorVars[type],
      '--vt-cell-bg-hover': cellHoverColorVars[type],
      // hover 态沿用 cell 文字色（旧 hover+cell 组合行为），active 态红底换浅色文字
      '--vt-cell-text': textColor,
      '--vt-cell-text-hover': textColor,
      '--vt-cell-text-active': isRed ? 'var(--yakit-colors-Error-100)' : cellTextColorVars[type],
      ...(isRed ? { '--vt-cell-is-red': 'true' } : {}),
    } as React.CSSProperties
  }
  const gradient = colors.map((c) => cellGradientColorVars[c]).join(', ')
  // 预混透明度后的渐变（cell/hover/active 三态），避免 color-mix 无法展开多变量列表
  const gradientAlpha = (alpha: number) =>
    colors.map((c) => `color-mix(in srgb, ${cellGradientColorVars[c]} ${alpha}%, transparent)`).join(', ')
  return {
    '--vt-cell-gradient': gradient,
    '--vt-cell-gradient-20': gradientAlpha(20),
    '--vt-cell-gradient-30': gradientAlpha(30),
    '--vt-cell-gradient-40': gradientAlpha(40),
  } as React.CSSProperties
}

/**
 * @name 判断是否为单色单元格（含所有颜色，用于整行文字色继承）
 */
export const isCellRedSingleColor = (content?: string) => {
  if (!content) return false

  try {
    const colors: string[] = content.split(' ').filter((item) => !!item && item.indexOf('table-cell-bg-') > -1)
    return colors.length === 1
  } catch (error) {
    return false
  }
}

// 判断是否是红色/灰色的单色样式
export const getSingleColorType = (content?: string): 'red' | 'grey' | undefined => {
  if (!content) return

  try {
    const colors = content.split(' ').filter((item) => !!item && item.includes('table-cell-bg-'))

    if (colors.length === 1) {
      if (colors[0] === 'table-cell-bg-red') return 'red'
      if (colors[0] === 'table-cell-bg-grey') return 'grey'
    }
  } catch (e) {
    return
  }

  return
}

/** @name 参数列 icon 是否使用 Text-3（排除 red） */
export const shouldUseParamsIconText3 = (content?: string) => {
  if (!isCellRedSingleColor(content)) return false
  return getSingleColorType(content) !== 'red'
}

/**
 * Clear the DOM state retained by a virtual list after its data becomes empty.
 * Returns true when the caller should also ask the virtual-list hook to
 * recalculate from index zero.
 */
export const resetEmptyVirtualTableViewport = (
  dataLength: number,
  container?: HTMLElement | null,
  wrapper?: HTMLElement | null,
) => {
  if (dataLength !== 0) return false
  if (container) container.scrollTop = 0
  if (wrapper) {
    wrapper.style.height = '0px'
    wrapper.style.marginTop = '0px'
  }
  return true
}
