import type { Selection } from './RunnerTabsType'

/** RunnerTabPane → YakitEditor：搜索高亮装饰 + 滚到首个命中 */
export const getRunnerEditorHighlightProps = (highLightRange?: Selection | Selection[]) => {
  const highLightFind = !highLightRange ? [] : Array.isArray(highLightRange) ? highLightRange : [highLightRange]
  // 无高亮与搜索多命中用搜索类；单个范围是代码引用样式。编辑器重画时会改用当前类名。
  const highLightFindClass =
    highLightRange != null && !Array.isArray(highLightRange)
      ? 'hight-light-yak-runner-color'
      : 'hight-light-file-search-hit'
  return {
    highLightFind,
    highLightFindClass,
    isPositionHighLightCursor: highLightFind.length > 0,
  }
}

/** 换文件后按当前高亮首段再滚一次。坐标与上一文件相同时高亮指纹不变，编辑器不会自己滚。 */
export const revealFirstHighlight = (
  editor: { revealPositionInCenter: (position: { lineNumber: number; column: number }) => void } | undefined,
  highLightRange?: Selection | Selection[],
) => {
  const hit = Array.isArray(highLightRange) ? highLightRange[0] : highLightRange
  if (!editor || typeof hit?.startLineNumber !== 'number' || typeof hit.startColumn !== 'number') return
  editor.revealPositionInCenter({
    lineNumber: hit.startLineNumber,
    column: hit.startColumn,
  })
}
