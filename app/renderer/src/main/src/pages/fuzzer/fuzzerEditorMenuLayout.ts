import { useLayoutEffect, useRef, useState, type CSSProperties, type RefObject } from 'react'
import { useMemoizedFn } from 'ahooks'

/**
 * Fuzzer 编辑器浮层菜单的布局纯逻辑（工具条 + 下拉面板）。
 *
 * 和 `editerMenuFun.tsx` 的分工：
 * - editerMenuFun：Monaco content widget 这一层——把菜单 DOM 挂到光标旁
 *   （getPosition / preference / menuAnchorSize 报宽 0 防 Monaco 推 left）。
 * - 本文件：菜单已经挂上之后，在编辑器可视矩形里二次对齐——
 *   工具条用 marginLeft 贴光标并避免出边；下拉面板用 placeMenuPanel 摆进宿主。
 *
 * 目标（选区菜单只调显示，不改插入/编解码功能；标签数量不固定，宽高按当前渲染测量）：
 * 1. 放不下整条文案或被宿主剪切时，只显示图标
 * 2. 放得下且未被剪切时显示图标和文案
 * 3. 下拉面板完整落在编辑器可视区域内
 * 4. 光标在左/中/上优先向右/下展开，在右/下优先向左/上展开；这一侧更挤时改用更空的一侧
 */

/** 光标相对编辑器可视区的大致方位，来自外层量到的 editorInfo.direction */
export interface CountDirectionProps {
  x?: 'middle' | 'left' | 'right'
  y?: 'bottom' | 'top'
}

/**
 * 打开菜单时外层塞进 content widget 的几何快照。
 * top/bottom/left/right 等是编辑器相关矩形；focus* / lineHeight / scrollTop 给浮层（如智能解码）用。
 */
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

/** 面板与编辑器边缘、滚动条之间至少留这么多像素 */
const MENU_PANEL_MAX_WIDTH = 360
const MENU_PANEL_MAX_HEIGHT = 320
export const MENU_PANEL_EDGE = 8
/** 面板与工具条之间的空隙，上下展开共用 */
export const MENU_PANEL_GAP = 1

/** editorInfo.left/right 推算出的内容区宽度（非 DOM 实测） */
const editorContentWidth = (editorInfo?: EditorDetailInfoProps) => {
  const left = editorInfo?.left ?? 0
  const right = editorInfo?.right ?? 0
  return Math.max(0, right - left)
}

/** 从 editorInfo 抽出摆放浮层常用的盒子字段 */
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

/** 当前工具条里的标签 id 签名；顺序或数量变了都要重新量「带文案时的宽度」 */
const menuItemSignature = (bar: HTMLElement) =>
  Array.from(bar.querySelectorAll('[data-menu-item]'))
    .map((el) => el.getAttribute('data-menu-item') || '')
    .join('\n')

/**
 * 智能解码等「非锚点下拉」浮层用的宽高/方位样式。
 * 工具条下拉面板改由 placeMenuPanel 按实际空白摆放，不要再走这里。
 */
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

/** 编辑器可视区在屏幕坐标下的可用矩形（含行号槽、竖/横向滚动条、minimap） */
export interface HostBox {
  /** 含行号槽的左缘（智能解码拖拽可用；也是整编辑器左界） */
  hostLeft: number
  hostRight: number
  hostTop: number
  hostBottom: number
}

/**
 * 量编辑器可视区矩形（屏幕坐标）：左侧含行号槽；右/底含竖向与横向滚动条及 minimap（浮层可叠放）。
 * hostRef / content widget 可能在 monaco 内外；找不到就往 .monaco-editor 里再找。
 */
export const readEditorHostBox = (node: HTMLElement): HostBox => {
  // hostRef / content widget 可能在 monaco 内外；找不到就往 .monaco-editor 里再找一次
  let scrollable = node.closest('.monaco-scrollable-element') as HTMLElement | null
  let guard = node.closest('.overflow-guard') as HTMLElement | null
  if (!scrollable) scrollable = node.querySelector('.monaco-scrollable-element') as HTMLElement | null
  if (!guard) guard = node.querySelector('.overflow-guard') as HTMLElement | null
  if (!scrollable || !guard) {
    const editorRoot = node.closest('.monaco-editor') as HTMLElement | null
    if (editorRoot) {
      if (!scrollable) scrollable = editorRoot.querySelector('.monaco-scrollable-element') as HTMLElement | null
      if (!guard) guard = editorRoot.querySelector('.overflow-guard') as HTMLElement | null
    }
  }
  const base = scrollable ?? guard
  if (!base) return { hostLeft: 0, hostRight: 0, hostTop: 0, hostBottom: 0 }
  const rect = base.getBoundingClientRect()
  // hostLeft：overflow-guard 左缘（含行号槽；整编辑器左界）
  const guardRect = guard?.getBoundingClientRect()
  let hostLeft = rect.left
  let hostTop = rect.top
  if (guardRect && guardRect.width > 0 && guardRect.left <= rect.left) hostLeft = guardRect.left
  if (guardRect && guardRect.height > 0 && guardRect.top <= rect.top) hostTop = guardRect.top
  // hostRight：overflow-guard 右缘（含竖向滚动条与 minimap）
  let hostRight = rect.right
  if (guardRect && guardRect.width > 0 && guardRect.right >= rect.right) hostRight = guardRect.right
  let hostBottom = rect.bottom
  // hostBottom：overflow-guard 底缘（含横向滚动条）
  if (guardRect && guardRect.height > 0 && guardRect.bottom >= rect.bottom) hostBottom = guardRect.bottom
  // 宿主含 gutter/minimap/滚动条，不收窄；浮层靠 allowEditorOverflow + z-index≥20 叠在滚动条上
  return { hostLeft, hostRight, hostTop, hostBottom }
}

/** 工具条当前已写入的 marginLeft（px 数值） */
const currentBarMargin = (bar: HTMLElement) => parseFloat(bar.style.marginLeft) || 0

/**
 * 在一条横轴上把盒子贴着锚点放进编辑器。
 * 光标在右优先向左长，在左/中优先向右长；这一侧放不下且另一侧更空时换边，最后再夹进可视区域。
 * 默认两侧都留 EDGE；只有锚点落在贴边 EDGE 带里时才取消该侧顶开，避免整条被夹出视口。
 */
export const placeHorizontal = (
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
 * 工具条相对光标的 marginLeft（二次对齐，发生在 Monaco widget 锚点之后）。
 * 光标是一个点：向右长时左边贴着光标，向左长时右边贴着光标。不用 transform。
 */
const desiredEditorBarMargin = (bar: HTMLElement, direction?: CountDirectionProps) => {
  const rect = bar.getBoundingClientRect()
  const current = currentBarMargin(bar)
  if (rect.width <= 0 || rect.height <= 0) return current
  const host = readEditorHostBox(bar)
  if (host.hostRight <= host.hostLeft) return current
  // 去掉已有 margin 得到「Monaco 留下的光标锚点」屏幕 x
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

/**
 * Monaco 改浮层 left/top 时，从工具条往上盯到 overflow-guard 的 style，变了就重算位置。
 * 返回 disconnect 函数，卸载时调用。
 */
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

/** 浅比较面板定位相关字段，避免无意义 setState */
const panelStyleSame = (prev: CSSProperties, next: CSSProperties) =>
  prev.left === next.left &&
  prev.right === next.right &&
  prev.top === next.top &&
  prev.bottom === next.bottom &&
  prev.width === next.width &&
  prev.maxWidth === next.maxWidth &&
  prev.maxHeight === next.maxHeight &&
  prev.visibility === next.visibility

/** 把起点收进 [min, max]，保证尺寸为 size 的盒子整块落在区间内 */
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
 * 按当前按钮在编辑器里的位置摆下拉面板，返回应写到面板上的 CSS。
 * 宽度跟内容走，上限 360；这一侧放不下时挪到更空的一侧。
 * 若工具条 margin 尚未写上，先按即将发生的位移（pendingShift）摆，避免面板和按钮错开。
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
  // 竖直锚点优先用整条工具条，避免点某个按钮时面板贴着按钮上下跳
  const anchorTop = barRect?.top ?? anchor.top
  const anchorBottom = barRect?.bottom ?? anchor.bottom
  const parentLeft = parent.left + pendingShift
  const parentRight = parent.right + pendingShift
  if (host.hostRight - host.hostLeft < 40) {
    return { visibility: 'visible', marginTop: 0 }
  }

  // 横轴按整编辑器（hostLeft~hostRight）：含行号槽 / 滚动条 / minimap（配合 allowEditorOverflow）
  const maxWidth = Math.min(MENU_PANEL_MAX_WIDTH, Math.max(0, host.hostRight - host.hostLeft - MENU_PANEL_EDGE * 2))

  const hostMaxHeight = Math.min(
    MENU_PANEL_MAX_HEIGHT,
    Math.max(0, host.hostBottom - host.hostTop - MENU_PANEL_EDGE * 2),
  )
  // 相对工具条上下可用空间（已扣掉 EDGE），clamp 时不能再压进工具条
  const { spaceAbove, spaceBelow } = verticalRoomsBesideAnchor(host.hostTop, host.hostBottom, anchorTop, anchorBottom)

  let panelWidth = 0
  let panelHeight = 0
  /** 临时改面板 style 量真实宽高，量完写回，避免 max-content 留在节点上触发 Observer 空转 */
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
    // 未量到宽或已被夹离锚点时用 left，避免 right+max-content 朝左长出 hostLeft 被裁
    ...(stuckToAnchor && growLeft && panelWidth > 0
      ? { right: parentRight - anchorRight, left: 'auto' }
      : { left: viewLeft - parentLeft, right: 'auto' }),
  }
}

/**
 * 下拉打开后，跟着按钮和编辑器的位置把面板摆进可视区域。
 * - ResizeObserver：面板尺寸变了重摆
 * - MutationObserver：内容/拖拽标记变了重摆
 * - watchStyleUntilOverflowGuard：Monaco 挪 widget 时重摆
 * - 面板带 data-menu-panel-dragging 时暂停重摆并断开尺寸监听，松手后再挂上算一次
 * - reveal=false 时只测量不显示，避免 waitReady 内容变高后从下翻到上闪一下
 */
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
 * - 太窄或被宿主剪切时只留图标；够宽且未剪切再把文案加回来。
 * - 左右位移跟面板同一套 placeHorizontal 规则，写 marginLeft，不用 transform。
 * - active 为 false 时不动这层（外面已经管过 showLabel / 位置），避免嵌套工具条时挪两次。
 */
/** 工具条矩形是否已越出宿主（会被 overflow 剪切） */
export const menuBarClippedByHost = (
  barRect: { left: number; right: number; top: number; bottom: number },
  host: HostBox,
  slack = 0.5,
) => {
  if (host.hostRight <= host.hostLeft || host.hostBottom <= host.hostTop) return false
  return (
    barRect.left < host.hostLeft - slack ||
    barRect.right > host.hostRight + slack ||
    barRect.top < host.hostTop - slack ||
    barRect.bottom > host.hostBottom + slack
  )
}

/**
 * 有文案宽度能否经 placeHorizontal 横移后完整落入整编辑器宿主。
 * 宽度超宿主，或试摆后仍被裁切，则返回 false（随后收成图标）。
 */
export const menuBarLabeledFitsInHost = (
  labeledWidth: number,
  caretX: number,
  host: HostBox,
  preferLeft: boolean,
  barTop = 0,
  barBottom = 0,
) => {
  const hostWidth = host.hostRight - host.hostLeft
  if (labeledWidth <= 0 || hostWidth <= 0) return false
  const limit = Math.max(0, hostWidth - MENU_PANEL_EDGE * 2)
  if (labeledWidth > limit) return false
  const { viewLeft } = placeHorizontal(caretX, caretX, labeledWidth, host.hostLeft, host.hostRight, preferLeft)
  const top = barTop || host.hostTop
  const bottom = barBottom > barTop ? barBottom : top + 1
  return !menuBarClippedByHost({ left: viewLeft, right: viewLeft + labeledWidth, top, bottom }, host)
}

export const useMenuBarLayout = (
  barRef: RefObject<HTMLDivElement | null>,
  lang: string,
  active = true,
  direction?: CountDirectionProps,
) => {
  const [showLabel, setShowLabel] = useState(true)
  /** 最近一次「显示文案」时量到的条宽；语言或菜单项签名变了会清零重测 */
  const labeledWidthRef = useRef(0)
  const signatureRef = useRef('')
  /** 连续两次判定可展开才恢复文案，压住 ResizeObserver 抖动 */
  const expandStableRef = useRef(0)

  const fitBarInEditor = useMemoizedFn(() => {
    const bar = barRef.current
    if (!bar || !active) return
    const host = readEditorHostBox(bar)
    // 先按当前宽度贴边，再判断是否被剪切（否则用旧 margin 会误判）
    const margin = Math.round(desiredEditorBarMargin(bar, direction))
    const next = margin ? `${margin}px` : ''
    if (bar.style.marginLeft !== next) bar.style.marginLeft = next

    const hostWidth = host.hostRight - host.hostLeft
    if (hostWidth <= 0) return
    const signature = `${lang}\n${menuItemSignature(bar)}`
    if (signature !== signatureRef.current) {
      signatureRef.current = signature
      labeledWidthRef.current = 0
      expandStableRef.current = 0
    }
    const rect = bar.getBoundingClientRect()
    const caretX = rect.left - currentBarMargin(bar)
    const preferLeft = direction?.x === 'right'
    // 文案显隐：有文案宽度经 placeHorizontal 横移后能否落入宿主；放不下再收成图标

    if (labeledWidthRef.current === 0 && !showLabel) {
      setShowLabel(true)
      return
    }
    if (showLabel) {
      labeledWidthRef.current = bar.offsetWidth
      const fits = menuBarLabeledFitsInHost(bar.offsetWidth, caretX, host, preferLeft, rect.top, rect.bottom)
      // 整编辑器内横移后仍放不下有文案宽度 → 只留图标
      if (!fits) setShowLabel(false)
      expandStableRef.current = 0
      return
    }
    // 图标模式：以 caret 为锚、用有文案宽度试摆；连续两次 fits 再恢复文案
    // 签名仅跟踪 ids/lang；图标模式下标签文案漂移不触发重测，属可接受残差
    const labeledW = labeledWidthRef.current
    const fits = menuBarLabeledFitsInHost(labeledW, caretX, host, preferLeft, rect.top, rect.bottom)
    if (fits) {
      expandStableRef.current += 1
      if (expandStableRef.current >= 2) setShowLabel(true)
    } else {
      expandStableRef.current = 0
    }
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
