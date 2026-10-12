/**
 * @name 单元格背景色类型
 * @description 该类型必须按照升序排列
 */
import type { CSSProperties } from 'react'
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

/**
 * @name 解析数据里传递的颜色内容并生成对应的颜色类名后缀
 * @description 传入的内容中, 对应颜色的内容是由 filterColorTag 生成的
 */
export const parseColorTag = (content?: string) => {
  if (!content) return ''

  let colors: string[] = []
  try {
    colors = content
      .split(' ')
      .map((item) => (item.split('-').pop() || '').toLowerCase())
      .filter((item) => !!item)
      .sort()
      .slice(0, 3)
  } catch (error) {}
  return colors.length === 0 ? '' : colors.join('-')
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

type CellPaint = { bg: string; hover: string; text: string; activeText?: string; bold?: boolean }

const CELL_PAINT: Record<string, CellPaint> = {
  blue: {
    bg: 'var(--Colors-Use-Blue-Border)',
    hover: 'var(--Colors-Use-Blue-Hover)',
    text: 'var(--yakit-colors-Blue-100)',
  },
  cyan: {
    bg: 'var(--Colors-Use-Cyan-Border)',
    hover: 'var(--yakit-colors-Cyan-50)',
    text: 'var(--yakit-colors-Cyan-100)',
  },
  green: {
    bg: 'var(--Colors-Use-Green-Border)',
    hover: 'var(--yakit-colors-Green-50)',
    text: 'var(--yakit-colors-Green-100)',
  },
  grey: {
    bg: 'var(--Colors-Use-Grey-Border)',
    hover: 'var(--yakit-colors-Neutral-50)',
    text: 'var(--yakit-colors-Neutral-100)',
  },
  orange: {
    bg: 'var(--Colors-Use-Orange-Border)',
    hover: 'var(--yakit-colors-Orange-50)',
    text: 'var(--yakit-colors-Orange-100)',
  },
  purple: {
    bg: 'var(--Colors-Use-Purple-Border)',
    hover: 'var(--yakit-colors-Purple-50)',
    text: 'var(--yakit-colors-Purple-100)',
  },
  red: {
    bg: 'var(--Colors-Use-Error-Primary)',
    hover: 'var(--Colors-Use-Error-Pressed)',
    text: 'var(--Colors-Use-Error-On-Primary)',
    activeText: 'var(--yakit-colors-Error-100)',
    bold: true,
  },
  yellow: {
    bg: 'var(--Colors-Use-Yellow-Border)',
    hover: 'var(--yakit-colors-Yellow-50)',
    text: 'var(--yakit-colors-Yellow-100)',
  },
}

const CELL_GRADIENT: Record<string, string> = {
  blue: 'var(--Colors-Use-Blue-Primary)',
  cyan: 'var(--Colors-Use-Cyan-Primary)',
  green: 'var(--Colors-Use-Green-Primary)',
  grey: 'var(--Colors-Use-Grey-Primary)',
  orange: 'var(--Colors-Use-Orange-Primary)',
  purple: 'var(--Colors-Use-Purple-Primary)',
  red: 'var(--Colors-Use-Error-Primary)',
  yellow: 'var(--Colors-Use-Yellow-Primary)',
}

const mixStops = (names: string[], alpha: number) =>
  names
    .map((name) => CELL_GRADIENT[name])
    .filter(Boolean)
    .map((color) => `color-mix(in srgb, ${color} ${alpha}%, transparent)`)
    .join(', ')

/** 虚拟表格单元格颜色。单色用描边色，多色用主色渐变，代替全排列类名。 */
export const virtualTableCellColorStyle = (
  colorTypes: string,
  state: { hover: boolean; active: boolean },
): CSSProperties | undefined => {
  if (!colorTypes) return
  const names = colorTypes.split('-')
  if (names.length === 1) {
    const paint = CELL_PAINT[names[0]]
    if (!paint) return
    const emphasized = state.hover || state.active
    return {
      background: emphasized ? paint.hover : paint.bg,
      color: names[0] === 'red' && state.active ? paint.activeText : paint.text,
      fontWeight: paint.bold ? 'bold' : undefined,
    }
  }
  const alpha = state.active ? 40 : state.hover ? 30 : 20
  const stops = mixStops(names, alpha)
  if (!stops) return
  return {
    background: `linear-gradient(${stops})`,
    color: 'var(--Colors-Use-Neutral-Text-1-Title)',
  }
}

/** WebSocket 帧列表行颜色，hover 交给 CSS 变量。 */
export const websocketRowColorVars = (colorTypes: string): CSSProperties | undefined => {
  if (!colorTypes) return
  const names = colorTypes.split('-')
  if (names.length === 1) {
    const paint = CELL_PAINT[names[0]]
    if (!paint) return
    return {
      '--ws-row-bg': paint.bg,
      '--ws-row-hover-bg': paint.hover,
      '--ws-row-fg': 'var(--Colors-Use-Neutral-Text-1-Title)',
      '--ws-row-weight': paint.bold ? 'bold' : 'normal',
    } as CSSProperties
  }
  const base = mixStops(names, 20)
  const hover = mixStops(names, 30)
  if (!base) return
  return {
    '--ws-row-bg': `linear-gradient(${base})`,
    '--ws-row-hover-bg': `linear-gradient(${hover})`,
    '--ws-row-fg': 'var(--Colors-Use-Neutral-Text-1-Title)',
  } as CSSProperties
}

/**
 * 虚拟列表 wrapper 的几何（公式与 ahooks useVirtualList 一致）：
 * margin = 首行 index × 行高，height = 剩余总高（下限 0）。
 * 渲染期以内联 style 写入，使其与 list 同一次提交生效，避免 ahooks 在
 * passive effect 补写前出现一帧错位/白屏。
 */
export const getVirtualListWrapperGeometry = (
  list: { index: number }[],
  dataLength: number,
  itemHeight: number,
): { marginTop: number; height: number } => {
  const startIndex = list[0]?.index ?? 0
  return {
    marginTop: startIndex * itemHeight,
    height: Math.max(0, (dataLength - startIndex) * itemHeight),
  }
}
