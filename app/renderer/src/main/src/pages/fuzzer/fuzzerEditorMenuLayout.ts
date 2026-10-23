import { useLayoutEffect, useRef, useState, type CSSProperties, type RefObject } from 'react'
import { useMemoizedFn } from 'ahooks'

export interface CountDirectionProps {
  x?: 'middle' | 'left' | 'right'
  y?: 'bottom' | 'top'
}

export interface EditorDetailInfoProps {
  direction: CountDirectionProps
  top: number
  bottom: number
  left: number
  right: number
  focusX: number
  focusY: number
  lineHeight: number
  scrollTop: number
}

/**
 * 选区菜单只调整显示，不改插入、编码、解码这些功能。
 * 标签数量不固定，宽度和面板位置都按当前渲染出来的标签测量。
 * 1. 编辑器放不下整条文案时只显示图标
 * 2. 放得下时显示图标和文案
 * 3. 下拉面板完整落在编辑器可视区域内
 * 4. 光标在左/上优先向右/下展开，在右/中/下优先向左/上展开；这一侧更挤时改用更空的一侧
 */

const MENU_PANEL_MAX_WIDTH = 360
const MENU_PANEL_MAX_HEIGHT = 320
const MENU_PANEL_EDGE = 8
const MENU_PANEL_GAP = 0

const editorContentWidth = (editorInfo?: EditorDetailInfoProps) => {
  const left = editorInfo?.left ?? 0
  const right = editorInfo?.right ?? 0
  return Math.max(0, right - left)
}

const editorBox = (editorInfo?: EditorDetailInfoProps) => {
  const top = editorInfo?.top ?? 0
  const bottom = editorInfo?.bottom ?? 0
  return {
    top,
    bottom,
    editorWidth: editorContentWidth(editorInfo),
    editorHeight: Math.max(0, bottom - top),
    direction: editorInfo?.direction,
    focusY: editorInfo?.focusY ?? 0,
  }
}

/** 当前工具条里的标签，顺序和数量变了都要重新量宽度 */
const menuItemSignature = (bar: HTMLElement) =>
  Array.from(bar.querySelectorAll('[data-menu-item]'))
    .map((el) => el.getAttribute('data-menu-item') || '')
    .join('\n')

/** 智能解码浮层用的宽高。下拉菜单改由 placeMenuPanel 按实际空白摆放 */
export const getMenuPanelStyle = (
  editorInfo?: EditorDetailInfoProps,
  options?: { alignLeftOffset?: number },
): CSSProperties => {
  const { top, bottom, editorWidth, editorHeight, direction, focusY } = editorBox(editorInfo)
  const focus = focusY > 0 ? focusY : top + editorHeight / 2
  const verticalRoom = direction?.y === 'bottom' ? Math.max(80, focus - top - 40) : Math.max(80, bottom - focus - 40)
  const maxHeight = Math.min(verticalRoom, Math.max(80, editorHeight - 40))
  const width = Math.min(MENU_PANEL_MAX_WIDTH, Math.max(0, editorWidth - MENU_PANEL_EDGE * 2))
  const style: CSSProperties = {
    width: width || undefined,
    maxHeight,
  }
  if (direction?.y === 'bottom') style.bottom = '32px'
  else style.top = '28px'
  if (direction?.x === 'right' || direction?.x === 'middle') style.right = 0
  else style.left = options?.alignLeftOffset ?? 0
  return style
}

interface HostBox {
  hostLeft: number
  hostRight: number
  hostTop: number
  hostBottom: number
}

/** 编辑器里能看见代码的区域。滚动条是浮层，不拿来缩小这块区域。 */
const readEditorHostBox = (node: HTMLElement): HostBox => {
  const scrollable = node.closest('.monaco-scrollable-element') as HTMLElement | null
  const guard = node.closest('.overflow-guard') as HTMLElement | null
  const base = scrollable ?? guard
  if (!base) return { hostLeft: 0, hostRight: 0, hostTop: 0, hostBottom: 0 }
  const rect = base.getBoundingClientRect()
  let hostRight = rect.right
  let hostBottom = rect.bottom
  const minimap = guard?.querySelector(':scope > .minimap') as HTMLElement | null
  if (minimap) {
    const cover = minimap.getBoundingClientRect()
    if (cover.width > 8 && cover.left > rect.left + 8 && cover.left < hostRight) hostRight = cover.left
  }
  const horizontal = scrollable?.querySelector(':scope > .scrollbar.horizontal') as HTMLElement | null
  if (horizontal) {
    const cover = horizontal.getBoundingClientRect()
    if (cover.height > 2 && cover.top > rect.top + 8 && cover.top < hostBottom) hostBottom = cover.top
  }
  return { hostLeft: rect.left, hostRight, hostTop: rect.top, hostBottom }
}

const currentBarMargin = (bar: HTMLElement) => parseFloat(bar.style.marginLeft) || 0

/**
 * 在一条横轴上把盒子贴着锚点放进编辑器。
 * 光标在右/中优先向左长，在左优先向右长；这一侧放不下且另一侧更空时换边，最后再夹进可视区域。
 */
const placeHorizontal = (
  anchorLeft: number,
  anchorRight: number,
  size: number,
  hostLeft: number,
  hostRight: number,
  preferLeft: boolean,
) => {
  const spaceRight = Math.max(0, hostRight - anchorLeft - MENU_PANEL_EDGE)
  const spaceLeft = Math.max(0, anchorRight - hostLeft - MENU_PANEL_EDGE)
  let growLeft = preferLeft
  const preferredSpace = growLeft ? spaceLeft : spaceRight
  const otherSpace = growLeft ? spaceRight : spaceLeft
  if (size > 0 && preferredSpace < size && otherSpace > preferredSpace) growLeft = !growLeft
  const preferredLeft = growLeft ? anchorRight - size : anchorLeft
  const viewLeft =
    size > 0 ? clampStart(preferredLeft, size, hostLeft + MENU_PANEL_EDGE, hostRight - MENU_PANEL_EDGE) : preferredLeft
  return { viewLeft, growLeft, stuckToAnchor: Math.abs(viewLeft - preferredLeft) <= 1 }
}

/**
 * 工具条相对光标的 marginLeft。
 * 光标是一个点：向右长时左边贴着光标，向左长时右边贴着光标。不用 transform。
 */
const desiredEditorBarMargin = (bar: HTMLElement, direction?: CountDirectionProps) => {
  const rect = bar.getBoundingClientRect()
  const current = currentBarMargin(bar)
  if (rect.width <= 0 || rect.height <= 0) return current
  const host = readEditorHostBox(bar)
  if (host.hostRight <= host.hostLeft) return current
  const caret = rect.left - current
  const { viewLeft } = placeHorizontal(
    caret,
    caret,
    rect.width,
    host.hostLeft,
    host.hostRight,
    direction?.x === 'right' || direction?.x === 'middle',
  )
  return viewLeft - caret
}

const watchStyleUntilOverflowGuard = (start: HTMLElement | null, onChange: () => void) => {
  if (!start) return () => undefined
  const mutation = new MutationObserver(onChange)
  let node: HTMLElement | null = start
  while (node && !node.classList.contains('overflow-guard')) {
    mutation.observe(node, { attributes: true, attributeFilter: ['style'] })
    node = node.parentElement
  }
  return () => mutation.disconnect()
}

const panelStyleSame = (prev: CSSProperties, next: CSSProperties) =>
  prev.left === next.left &&
  prev.right === next.right &&
  prev.top === next.top &&
  prev.bottom === next.bottom &&
  prev.width === next.width &&
  prev.maxWidth === next.maxWidth &&
  prev.maxHeight === next.maxHeight &&
  prev.visibility === next.visibility

/** 把起点收进 [min, max]，保证面板整块落在编辑器里 */
const clampStart = (start: number, size: number, minEdge: number, maxEdge: number) => {
  const minStart = minEdge
  const maxStart = Math.max(minEdge, maxEdge - size)
  return Math.min(Math.max(start, minStart), maxStart)
}

/**
 * 按当前按钮在编辑器里的位置摆面板。
 * 宽度跟内容走，上限 360。这一侧放不下时，挪到编辑器里还有空的一侧。
 */
export const placeMenuPanel = (
  parentEl: HTMLElement,
  anchorEl: HTMLElement,
  direction?: CountDirectionProps,
  panelEl?: HTMLElement | null,
): CSSProperties => {
  const host = readEditorHostBox(parentEl)
  const bar = parentEl.closest('[data-menu-bar]') as HTMLElement | null
  // 工具条若还没把 margin 写上，先按即将发生的位移摆面板，避免面板和按钮错开。
  const pendingShift = bar ? desiredEditorBarMargin(bar, direction) - currentBarMargin(bar) : 0
  const anchor = anchorEl.getBoundingClientRect()
  const parent = parentEl.getBoundingClientRect()
  const barRect = bar?.getBoundingClientRect()
  const anchorLeft = anchor.left + pendingShift
  const anchorRight = anchor.right + pendingShift
  const anchorTop = barRect?.top ?? anchor.top
  const anchorBottom = barRect?.bottom ?? anchor.bottom
  const parentLeft = parent.left + pendingShift
  const parentRight = parent.right + pendingShift
  if (host.hostRight - host.hostLeft < 40) {
    return { visibility: 'visible', marginTop: 0 }
  }

  const maxWidth = Math.min(MENU_PANEL_MAX_WIDTH, Math.max(0, host.hostRight - host.hostLeft - MENU_PANEL_EDGE * 2))
  const maxHeight = Math.min(MENU_PANEL_MAX_HEIGHT, Math.max(0, host.hostBottom - host.hostTop - MENU_PANEL_EDGE * 2))
  let panelWidth = 0
  let panelHeight = 0
  if (panelEl) {
    panelEl.style.boxSizing = 'border-box'
    panelEl.style.width = 'max-content'
    panelEl.style.maxWidth = maxWidth ? `${maxWidth}px` : ''
    panelEl.style.maxHeight = maxHeight ? `${maxHeight}px` : ''
    panelWidth = panelEl.offsetWidth
    panelHeight = panelEl.offsetHeight
    // 量完立刻写回边框盒宽度。样式没变化时不会再 setState，不能把 max-content 留在节点上。
    if (panelWidth > 0) panelEl.style.width = `${panelWidth}px`
  }

  const placed = placeHorizontal(
    anchorLeft,
    anchorRight,
    panelWidth,
    host.hostLeft,
    host.hostRight,
    direction?.x === 'right' || direction?.x === 'middle',
  )
  const { viewLeft, growLeft, stuckToAnchor } = placed

  const spaceBelow = Math.max(0, host.hostBottom - anchorBottom - MENU_PANEL_GAP)
  const spaceAbove = Math.max(0, anchorTop - host.hostTop - MENU_PANEL_GAP)
  let growUp = direction?.y === 'bottom'
  const preferredRoom = growUp ? spaceAbove : spaceBelow
  const otherRoom = growUp ? spaceBelow : spaceAbove
  if (panelHeight > 0 && preferredRoom < panelHeight && otherRoom > preferredRoom) growUp = !growUp
  const preferredTop = growUp ? anchorTop - MENU_PANEL_GAP - panelHeight : anchorBottom + MENU_PANEL_GAP
  const viewTop = clampStart(
    preferredTop,
    panelHeight,
    host.hostTop + MENU_PANEL_EDGE,
    host.hostBottom - MENU_PANEL_EDGE,
  )

  return {
    boxSizing: 'border-box',
    // 用测到的边框盒宽度，避免 max-content 在收进编辑器之后又往右长出去。
    width: panelWidth > 0 ? panelWidth : 'max-content',
    maxWidth: maxWidth || undefined,
    maxHeight: maxHeight || undefined,
    marginTop: 0,
    visibility: 'visible',
    top: viewTop - parent.top,
    bottom: 'auto',
    // 贴着按钮的那条边定位。列表异步变宽时，只会朝展开方向长，不会漂到按钮另一侧。
    ...(stuckToAnchor && growLeft
      ? { right: parentRight - anchorRight, left: 'auto' }
      : { left: viewLeft - parentLeft, right: 'auto' }),
  }
}

/** 下拉打开后，跟着按钮和编辑器的位置把面板摆进可视区域 */
export const useAnchoredMenuPanel = (
  open: boolean,
  parentRef: RefObject<HTMLElement | null>,
  anchorRef: RefObject<HTMLElement | null>,
  direction?: CountDirectionProps,
  anchorKey?: string,
  /** 为 false 时只测量不显示，避免内容变高后从下侧翻到上侧 */
  reveal = true,
) => {
  const [style, setStyle] = useState<CSSProperties>({ visibility: 'hidden' })
  useLayoutEffect(() => {
    const place = () => {
      if (!open) return
      const parent = parentRef.current
      const anchor = anchorRef.current
      if (!parent || !anchor) return
      const panel = parent.querySelector(':scope > [data-menu-panel]') as HTMLElement | null
      const next = placeMenuPanel(parent, anchor, direction, panel)
      if (!reveal) next.visibility = 'hidden'
      setStyle((prev) => (panelStyleSame(prev, next) ? prev : next))
    }
    place()
    const parent = parentRef.current
    const panel = parent?.querySelector(':scope > [data-menu-panel]')
    const resize = new ResizeObserver(place)
    const content = new MutationObserver(place)
    if (panel) {
      resize.observe(panel)
      content.observe(panel, { childList: true, subtree: true, characterData: true })
    }
    const stopWatch = watchStyleUntilOverflowGuard(parent ?? null, place)
    return () => {
      resize.disconnect()
      content.disconnect()
      stopWatch()
    }
  }, [open, anchorRef, anchorKey, reveal, direction?.x, direction?.y])
  return style
}

/**
 * 整条菜单：按当前标签的实际宽度决定要不要文案。
 * 位置和面板同一套：贴着光标向空的一侧展开，再收进编辑器。用 margin，不用 transform。
 * active 为 false 时不改这层节点，避免嵌在别的工具条里时重复位移。
 */
export const useMenuBarLayout = (
  barRef: RefObject<HTMLDivElement | null>,
  lang: string,
  active = true,
  direction?: CountDirectionProps,
) => {
  const [showLabel, setShowLabel] = useState(true)
  const labeledWidthRef = useRef(0)
  const signatureRef = useRef('')

  const fitBarInEditor = useMemoizedFn(() => {
    const bar = barRef.current
    if (!bar || !active) return
    const host = readEditorHostBox(bar)
    const hostWidth = host.hostRight - host.hostLeft
    if (hostWidth > 0) {
      const limit = Math.max(0, hostWidth - MENU_PANEL_EDGE * 2)
      const signature = `${lang}\n${menuItemSignature(bar)}`
      if (signature !== signatureRef.current) {
        signatureRef.current = signature
        labeledWidthRef.current = 0
      }
      if (labeledWidthRef.current === 0 && !showLabel) {
        setShowLabel(true)
      } else if (showLabel) {
        labeledWidthRef.current = bar.offsetWidth
        if (bar.offsetWidth > limit) setShowLabel(false)
      } else if (labeledWidthRef.current <= limit) {
        setShowLabel(true)
      }
    }
    const margin = Math.round(desiredEditorBarMargin(bar, direction))
    const next = margin ? `${margin}px` : ''
    if (bar.style.marginLeft !== next) bar.style.marginLeft = next
  })

  useLayoutEffect(() => {
    if (!active) return
    const bar = barRef.current
    if (!bar) return
    fitBarInEditor()
    const resize = new ResizeObserver(() => fitBarInEditor())
    resize.observe(bar)
    const scrollable = bar.closest('.monaco-scrollable-element')
    if (scrollable) resize.observe(scrollable)
    const stopWatch = watchStyleUntilOverflowGuard(bar.parentElement, fitBarInEditor)
    return () => {
      resize.disconnect()
      stopWatch()
    }
  }, [lang, active, direction?.x, direction?.y])

  return showLabel
}
