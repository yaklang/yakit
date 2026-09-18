export type EditorRectLike = {
  top: number
  left: number
  right: number
  bottom: number
}

export type HunkBarRowLayout = {
  /** 行在视口中的 top（viewport px） */
  rowTop: number
  rowHeight: number
  /** 行尾文本右缘（viewport px） */
  textRight: number
  /** getScrolledVisiblePosition(col=1).top，相对编辑器 */
  visCol1Top: number
}

export type HunkBarLayoutInput = {
  editorRect: EditorRectLike
  row: HunkBarRowLayout
  barW: number
  barHeight: number
  stackIndex: number
}

export const HUNK_BAR_LAYOUT = {
  marginX: 10,
  gapX: 8,
  gapY: 4,
  pad: 4,
  stackGap: 4,
} as const

/**
 * Keep/Undo 浮条视口定位：优先行尾右侧，放不下则行上方，并钳在可见编辑器矩形内。
 */
export function clampHunkBarPosition(input: HunkBarLayoutInput): { top: number; left: number } {
  const { editorRect, row, barW, barHeight, stackIndex } = input
  const { marginX, gapX, gapY, pad, stackGap } = HUNK_BAR_LAYOUT
  const clipTop = editorRect.top + pad
  const clipBottom = editorRect.bottom - pad
  const clipLeft = editorRect.left + marginX
  const clipRight = editorRect.right - marginX

  let leftPx = row.textRight + gapX
  const fitsRightOfText = leftPx + barW <= clipRight
  if (!fitsRightOfText) {
    leftPx = Math.max(clipLeft, clipRight - barW)
  }

  const stackOffset = stackIndex * (barHeight + stackGap)
  let baseTop: number
  if (fitsRightOfText) {
    baseTop = row.rowTop + Math.max(0, (row.rowHeight - barHeight) / 2)
  } else {
    baseTop = row.rowTop - barHeight - gapY
  }
  let topPx = baseTop + (fitsRightOfText ? stackOffset : -stackOffset)

  if (topPx + barHeight > clipBottom) {
    const aboveTail = row.rowTop - barHeight - gapY - (fitsRightOfText ? stackOffset : 0)
    const aboveFirst = editorRect.top + row.visCol1Top - barHeight - gapY
    if (aboveTail >= clipTop) {
      topPx = aboveTail
    } else if (aboveFirst >= clipTop) {
      topPx = aboveFirst
    } else {
      topPx = Math.max(clipTop, clipBottom - barHeight)
    }
  }
  if (topPx < clipTop) {
    topPx = clipTop
  }
  if (topPx + barHeight > clipBottom) {
    topPx = Math.max(clipTop, clipBottom - barHeight)
  }

  leftPx = Math.max(clipLeft, Math.min(leftPx, clipRight - barW))
  return { top: topPx, left: leftPx }
}
