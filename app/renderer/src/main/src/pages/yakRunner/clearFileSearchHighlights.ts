import type { AreaInfoProps } from './YakRunnerType'
import type { FileDetailInfo } from './RunnerTabs/RunnerTabsType'

/** 清空分栏内文件搜索高亮；无高亮时 areaChanged/activeChanged 为 false，便于跳过 setState */
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
        if (!file.highLightRange) return file
        areaChanged = true
        return { ...file, highLightRange: undefined }
      }),
    })),
  }))
  const activeChanged = !!activeFile?.highLightRange
  return {
    areaInfo: nextAreaInfo,
    activeFile: activeChanged && activeFile ? { ...activeFile, highLightRange: undefined } : activeFile,
    areaChanged,
    activeChanged,
  }
}
