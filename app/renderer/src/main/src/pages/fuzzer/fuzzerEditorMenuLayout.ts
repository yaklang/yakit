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
 * 4. 光标在左/中/上优先向右/下展开，在右/下优先向左/上展开；这一侧更挤时改用更空的一侧
 */

const MENU_PANEL_MAX_WIDTH = 360
const MENU_PANEL_MAX_HEIGHT = 320
export const MENU_PANEL_EDGE = 8
/** 面板与工具条之间的空隙，上下展开共用 */
export const MENU_PANEL_GAP = 1

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

/**
 * 量编辑器里代码实际露出来的矩形（屏幕坐标）。
 * 右边界避开 minimap 和竖向滚动条，底边避开横向滚动条，避免浮层被盖住。
 */
export const readEditorHostBox = (node: HTMLElement): HostBox => {
  // hostRef may be an ancestor of monaco (e.g. .yakit-editor-wrapper); fall back to querySelector
  let scrollable = node.closest('.monaco-scrollable-element') as HTMLElement | null
  let guard = node.closest('.overflow-guard') as HTMLElement | null
  if (!scrollable) scrollable = node.querySelector('.monaco-scrollable-element') as HTMLElement | null
  if (!guard) guard = node.querySelector('.overflow-guard') as HTMLElement | null
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
  // 竖向滚动条 track 隐藏时可能仍占满宽，只在真实窄条时收右边界
  const vertical = scrollable?.querySelector(':scope > .scrollbar.vertical') as HTMLElement | null
  if (vertical) {
    const cover = vertical.getBoundingClientRect()
    if (cover.width < 48 && cover.width > 2 && cover.left > rect.left + 8 && cover.left < hostRight) {
      hostRight = cover.left
    }
  }
  const horizontal = scrollable?.querySelector(':scope > .scrollbar.horizontal') as HTMLElement | null
  if (horizontal) {
    const cover = horizontal.getBoundingClientRect()
    if (cover.height < 48 && cover.height > 2 && cover.top > rect.top + 8 && cover.top < hostBottom) {
      hostBottom = cover.top
    }
  }
  return { hostLeft: rect.left, hostRight, hostTop: rect.top, hostBottom }
}

const currentBarMargin = (bar: HTMLElement) => parseFloat(bar.style.marginLeft) || 0

/**
 * 在一条横轴上把盒子贴着锚点放进编辑器。
 * 光标在右优先向左长，在左/中优先向右长；这一侧放不下且另一侧更空时换边，最后再夹进可视区域。
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
  // 默认两侧都留 EDGE。只有光标落在贴边那条 EDGE 带里时，才取消这一侧的顶开，避免整条被夹出视口。
  let minEdge = hostLeft + MENU_PANEL_EDGE
  let maxEdge = hostRight - MENU_PANEL_EDGE
  if (!growLeft && preferredLeft >= hostLeft && preferredLeft < minEdge) minEdge = hostLeft
  if (growLeft && preferredLeft + size <= hostRight && preferredLeft + size > maxEdge) maxEdge = hostRight
  if (maxEdge < minEdge) maxEdge = minEdge
  const viewLeft = size > 0 ? clampStart(preferredLeft, size, minEdge, maxEdge) : preferredLeft
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
    direction?.x === 'right',
  )
  return viewLeft - caret
}

/** Monaco 改浮层 left/top 时，从工具条往上盯到 overflow-guard 的 style，变了就重算位置。 */
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
 * 按上下两侧可用空间选展开方向，并给出该侧高度预算。
 * sideRoom===0 时退到 otherRoom；两侧都为 0 时 heightBudget 为 0（调用方不得再 || undefined 丢掉 CSS 上限）。
 */
export const pickVerticalHeightBudget = (
  spaceAbove: number,
  spaceBelow: number,
  preferGrowUp: boolean,
  panelHeight = 0,
) => {
  let growUp = preferGrowUp
  const preferredRoom = growUp ? spaceAbove : spaceBelow
  const otherRoom = growUp ? spaceBelow : spaceAbove
  if (panelHeight > 0 && preferredRoom < panelHeight && otherRoom > preferredRoom) growUp = !growUp
  const sideRoom = growUp ? spaceAbove : spaceBelow
  const heightBudget = sideRoom > 0 ? sideRoom : otherRoom
  return { growUp, sideRoom, otherRoom, heightBudget }
}

/** 锚点上下两侧相对 host 的可用竖直空间（已扣 EDGE + GAP） */
export const verticalRoomsBesideAnchor = (
  hostTop: number,
  hostBottom: number,
  anchorTop: number,
  anchorBottom: number,
) => {
  const spaceBelow = Math.max(0, hostBottom - MENU_PANEL_EDGE - anchorBottom - MENU_PANEL_GAP)
  const spaceAbove = Math.max(0, anchorTop - (hostTop + MENU_PANEL_EDGE) - MENU_PANEL_GAP)
  return { spaceAbove, spaceBelow }
}

/**
 * 把面板 preferredTop 夹进锚点一侧的竖直区间，不压住工具条。
 * growUp 时上沿不低于 hostTop+EDGE、下沿不越过 anchorTop-GAP；向下同理。
 */
export const clampTopBesideAnchor = (
  preferredTop: number,
  panelHeight: number,
  growUp: boolean,
  hostTop: number,
  hostBottom: number,
  anchorTop: number,
  anchorBottom: number,
) => {
  const minEdge = growUp
    ? hostTop + MENU_PANEL_EDGE
    : Math.max(hostTop + MENU_PANEL_EDGE, anchorBottom + MENU_PANEL_GAP)
  const maxEdge = growUp
    ? Math.min(hostBottom - MENU_PANEL_EDGE, anchorTop - MENU_PANEL_GAP)
    : hostBottom - MENU_PANEL_EDGE
  return clampStart(preferredTop, panelHeight, minEdge, maxEdge)
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
  const hostMaxHeight = Math.min(
    MENU_PANEL_MAX_HEIGHT,
    Math.max(0, host.hostBottom - host.hostTop - MENU_PANEL_EDGE * 2),
  )
  // 相对工具条上下可用空间（已扣掉 EDGE），clamp 时不能再压进工具条
  const { spaceAbove, spaceBelow } = verticalRoomsBesideAnchor(host.hostTop, host.hostBottom, anchorTop, anchorBottom)

  let panelWidth = 0
  let panelHeight = 0
  const measurePanel = (heightCap: number) => {
    if (!panelEl) {
      panelWidth = 0
      panelHeight = 0
      return
    }
    // 测量会暂时改 style；量完一次性写回最终值，避免 max-content 留在节点上触发 Observer 空转。
    panelEl.style.boxSizing = 'border-box'
    panelEl.style.width = 'max-content'
    panelEl.style.maxWidth = maxWidth ? `${maxWidth}px` : ''
    panelEl.style.maxHeight = `${heightCap}px`
    panelWidth = panelEl.offsetWidth
    panelHeight = panelEl.offsetHeight
    const finalWidth = panelWidth > 0 ? `${panelWidth}px` : 'max-content'
    panelEl.style.width = finalWidth
    panelEl.style.maxWidth = maxWidth ? `${maxWidth}px` : ''
    panelEl.style.maxHeight = `${heightCap}px`
  }

  measurePanel(hostMaxHeight)

  const placed = placeHorizontal(
    anchorLeft,
    anchorRight,
    panelWidth,
    host.hostLeft,
    host.hostRight,
    direction?.x === 'right',
  )
  const { viewLeft, growLeft, stuckToAnchor } = placed

  const { growUp, heightBudget } = pickVerticalHeightBudget(
    spaceAbove,
    spaceBelow,
    direction?.y === 'bottom',
    panelHeight,
  )
  // 高度限制在所选一侧；两侧都为 0 时 maxHeight 为 0，绝不用 || undefined 丢掉 CSS 上限
  const maxHeight = Math.min(hostMaxHeight, heightBudget > 0 ? heightBudget : 0)
  if (panelEl && maxHeight > 0 && panelHeight > maxHeight) {
    measurePanel(maxHeight)
  }

  const preferredTop = growUp ? anchorTop - MENU_PANEL_GAP - panelHeight : anchorBottom + MENU_PANEL_GAP
  // 竖直夹紧时仍避开工具条占用的那一段
  const viewTop = clampTopBesideAnchor(
    preferredTop,
    panelHeight,
    growUp,
    host.hostTop,
    host.hostBottom,
    anchorTop,
    anchorBottom,
  )
  // top 相对含边框的 padding edge，扣掉 clientTop，避免朝下多出一条边框宽
  const padTop = parent.top + parentEl.clientTop

  return {
    boxSizing: 'border-box',
    // 用测到的边框盒宽度，避免 max-content 在收进编辑器之后又往右长出去。
    width: panelWidth > 0 ? panelWidth : 'max-content',
    maxWidth: maxWidth || undefined,
    maxHeight,
    marginTop: 0,
    visibility: 'visible',
    top: viewTop - padTop,
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
    const resize = new ResizeObserver(() => place())
    const content = new MutationObserver(() => place())
    let stopWatch: () => void = () => undefined
    let sizeWatching = false

    const attachSizeWatchers = (panel: HTMLElement | null, parent: HTMLElement | null) => {
      if (sizeWatching) return
      if (panel) resize.observe(panel)
      stopWatch = watchStyleUntilOverflowGuard(parent, place)
      sizeWatching = true
    }
    const detachSizeWatchers = () => {
      if (!sizeWatching) return
      resize.disconnect()
      stopWatch()
      stopWatch = () => undefined
      sizeWatching = false
    }

    const place = () => {
      if (!open) return
      const parent = parentRef.current
      const anchor = anchorRef.current
      if (!parent || !anchor) return
      const panel = parent.querySelector(':scope > [data-menu-panel]') as HTMLElement | null
      // 拖拽排序时 dnd 会频繁改 DOM：跳过重摆并断开尺寸 Observer，松手后再挂上并算一次
      if (panel?.hasAttribute('data-menu-panel-dragging')) {
        detachSizeWatchers()
        return
      }
      attachSizeWatchers(panel, parent)
      const next = placeMenuPanel(parent, anchor, direction, panel)
      if (!reveal) next.visibility = 'hidden'
      setStyle((prev) => (panelStyleSame(prev, next) ? prev : next))
    }

    place()
    const parent = parentRef.current
    const panel = parent?.querySelector(':scope > [data-menu-panel]') as HTMLElement | null
    if (panel) {
      content.observe(panel, {
        childList: true,
        subtree: true,
        characterData: true,
        attributes: true,
        attributeFilter: ['data-menu-panel-dragging'],
      })
    }
    if (!panel?.hasAttribute('data-menu-panel-dragging')) {
      attachSizeWatchers(panel, parent)
    }
    return () => {
      detachSizeWatchers()
      content.disconnect()
    }
    // parentRef / anchorRef 是稳定对象，不放进依赖
  }, [open, anchorKey, reveal, direction?.x, direction?.y])
  return style
}

/**
 * 管整条工具条要不要显示文字，以及条要贴在光标哪一侧。
 * 编辑器太窄时只留图标；够宽再把文案加回来。
 * 左右位移跟下面的面板同一套规则，用 marginLeft，不用 transform。
 * active 为 false 时不动这层（外面已经管过 showLabel / 位置），避免嵌套工具条时挪两次。
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
