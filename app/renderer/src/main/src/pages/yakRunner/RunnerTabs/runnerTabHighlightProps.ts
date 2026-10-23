import type { Selection } from './RunnerTabsType'

/** RunnerTabPane → YakitEditor：搜索高亮装饰 + 滚到首个命中 */
export const getRunnerEditorHighlightProps = (highLightRange?: Selection | Selection[]) => {
  const highLightFind = !highLightRange ? [] : Array.isArray(highLightRange) ? highLightRange : [highLightRange]
  return {
    highLightFind,
    highLightFindClass: Array.isArray(highLightRange) ? 'hight-light-file-search-hit' : 'hight-light-yak-runner-color',
    isPositionHighLightCursor: highLightFind.length > 0,
  }
}
