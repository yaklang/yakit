/**
 * Enter 是否应由 mention 键盘导航拦截（阻止编辑器默认换行/发送）。
 * 面板未启用、不在视口、空结果或无选中时放行。
 */
export function shouldInterceptMentionEnter(params: {
  enabled?: boolean
  inViewport?: boolean
  dataLength: number
  hasSelected: boolean
}): boolean {
  const enabled = params.enabled !== false
  const inViewport = params.inViewport !== false
  if (!(enabled && inViewport)) return false
  if (!params.dataLength || !params.hasSelected) return false
  return true
}

/**
 * 方向键下一项索引。
 * @returns null 表示不切换（已到边界或无有效选中）
 */
export function resolveMentionArrowSelect(params: {
  currentIndex: number
  dataLength: number
  direction: 'up' | 'down'
}): number | null {
  const { currentIndex, dataLength, direction } = params
  if (dataLength <= 0) return null
  if (currentIndex < 0) return 0
  if (direction === 'up') {
    if (currentIndex <= 0) return null
    return currentIndex - 1
  }
  if (currentIndex >= dataLength - 1) return null
  return currentIndex + 1
}

/**
 * 是否应滚动、以及滚动量。
 * 可视区内自由移动；目标项进入底部/顶部「约 1 个自身高度」缓冲区后再滚，
 * 使选中停在倒数第二（向下）或正数第二（向上），而不是每按一次都顶到列表顶部。
 * 若目标已完全离开容器（如鼠标大幅滚动后），整段拉回至对应缓冲线可见。
 */
export function resolveMentionArrowScroll(params: {
  direction: 'up' | 'down'
  containerRect: { top: number; bottom: number }
  itemRect: { top: number; bottom: number; height: number }
}): { shouldScroll: boolean; delta: number } {
  const { direction, containerRect, itemRect } = params
  const margin = itemRect.height > 0 ? itemRect.height : 0
  if (direction === 'down') {
    const edge = containerRect.bottom - margin
    // 完全在容器上方，或越过底部缓冲线 → 对齐到倒数第二缓冲线
    const fullyAbove = itemRect.bottom < containerRect.top
    const pastBottomBuffer = itemRect.bottom > edge
    if (fullyAbove || pastBottomBuffer) {
      return { shouldScroll: true, delta: itemRect.bottom - edge }
    }
    return { shouldScroll: false, delta: 0 }
  }
  const edge = containerRect.top + margin
  // 完全在容器下方，或越过顶部缓冲线 → 对齐到正数第二缓冲线
  const fullyBelow = itemRect.top > containerRect.bottom
  const pastTopBuffer = itemRect.top < edge
  if (fullyBelow || pastTopBuffer) {
    return { shouldScroll: true, delta: itemRect.top - edge }
  }
  return { shouldScroll: false, delta: 0 }
}

/**
 * 虚拟列表尚未挂载目标 DOM 时的 scrollTop 回退（固定行高）。
 * 向下：选中落在倒数第二；向上：选中落在正数第二。
 */
export function resolveMentionVirtualScrollTop(params: {
  nextIndex: number
  clientHeight: number
  itemHeight: number
  direction: 'up' | 'down'
}): number {
  const { nextIndex, clientHeight, itemHeight, direction } = params
  if (itemHeight <= 0) return 0
  const visibleCount = Math.max(1, Math.floor(clientHeight / itemHeight))
  if (direction === 'down') {
    const targetFirst = Math.max(0, nextIndex - (visibleCount - 2))
    return targetFirst * itemHeight
  }
  return Math.max(0, (nextIndex - 1) * itemHeight)
}
