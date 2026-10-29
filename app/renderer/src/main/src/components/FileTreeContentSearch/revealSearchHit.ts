export interface SearchHitRevealEditor {
  revealPositionInCenter: (position: { lineNumber: number; column: number }) => void
}

export interface SearchHitRevealPayload {
  path: string
  lineNumber: number
  column: number
}

/** 已打开编辑器滚到搜索命中；路径不一致或 payload 非法则忽略 */
export const revealSearchHitOnEditor = (
  editor: SearchHitRevealEditor | undefined,
  currentPath: string | undefined,
  data: string,
) => {
  try {
    const { path, lineNumber, column } = JSON.parse(data) as Partial<SearchHitRevealPayload>
    if (!editor || !currentPath || path !== currentPath) return
    if (typeof lineNumber !== 'number' || typeof column !== 'number') return
    editor.revealPositionInCenter({ lineNumber, column })
  } catch (error) {}
}
