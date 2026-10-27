import type { AreaInfoProps } from './YakRunnerType'
import type { FileDetailInfo, Selection } from './RunnerTabs/RunnerTabsType'

/** 搜索高亮为 Selection[]；单对象为代码引用等原有高亮，清搜索时不得误删 */
const isFileSearchHighlight = (range?: Selection | Selection[]): range is Selection[] => Array.isArray(range)

/** 清空分栏内文件搜索高亮；无搜索高亮时 areaChanged/activeChanged 为 false，便于跳过 setState */
export const clearFileSearchHighlights = (
  areaInfo: AreaInfoProps[],
  activeFile?: FileDetailInfo,
): {
  areaInfo: AreaInfoProps[]
  activeFile?: FileDetailInfo
  areaChanged: boolean
  activeChanged: boolean
} => {
  let areaChanged = false
  const nextAreaInfo = areaInfo.map((item) => ({
    ...item,
    elements: item.elements.map((el) => ({
      ...el,
      files: el.files.map((file) => {
        if (!isFileSearchHighlight(file.highLightRange)) return file
        areaChanged = true
        return { ...file, highLightRange: undefined }
      }),
    })),
  }))
  const activeChanged = isFileSearchHighlight(activeFile?.highLightRange)
  return {
    areaInfo: nextAreaInfo,
    activeFile: activeChanged && activeFile ? { ...activeFile, highLightRange: undefined } : activeFile,
    areaChanged,
    activeChanged,
  }
}

/** 写入/读出上次打开文件历史时去掉搜索高亮，避免重启工程后关键字仍高亮 */
export const stripPersistedFileSearchHighlights = (areaInfo: AreaInfoProps[], activeFile?: FileDetailInfo) => {
  const next = clearFileSearchHighlights(areaInfo, activeFile)
  return { areaInfo: next.areaInfo, activeFile: next.activeFile }
}
