import { useRef } from 'react'
import useStore from './useStore'
import useDispatcher from './useDispatcher'
import { YakRunnerContextDispatcher, YakRunnerContextStore } from './YakRunnerContext'

export type YakRunnerStoreRefsCurrent = YakRunnerContextStore & YakRunnerContextDispatcher

export interface YakRunnerStoreRefs {
  current: YakRunnerStoreRefsCurrent
}

/** 在父级订阅 store，通过稳定 ref 向子树提供最新数据，避免每个树节点因 store 变更而重渲染 */
export default function useYakRunnerStoreRefs(): YakRunnerStoreRefs {
  const { fileTree, areaInfo, activeFile, runnerTabsId } = useStore()
  const { setFileTree, handleFileLoadData, setAreaInfo, setActiveFile, setRunnerTabsId } = useDispatcher()
  const container = useRef<YakRunnerStoreRefs>({
    current: {
      fileTree: [],
      areaInfo: [],
      activeFile: undefined,
      runnerTabsId: undefined,
      setFileTree: undefined,
      handleFileLoadData: undefined,
      setAreaInfo: undefined,
      setActiveFile: undefined,
      setRunnerTabsId: undefined,
    },
  })
  const current = container.current.current
  current.fileTree = fileTree
  current.areaInfo = areaInfo
  current.activeFile = activeFile
  current.runnerTabsId = runnerTabsId
  current.setFileTree = setFileTree
  current.handleFileLoadData = handleFileLoadData
  current.setAreaInfo = setAreaInfo
  current.setActiveFile = setActiveFile
  current.setRunnerTabsId = setRunnerTabsId
  return container.current
}
