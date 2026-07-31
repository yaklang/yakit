import { type Dispatch, type SetStateAction, createContext } from 'react'
import type { FileTreeListProps } from '../FileTree/FileTreeType'
import type { AreaInfoProps } from '../YakRunnerType'
import type { FileDetailInfo } from '../RunnerTabs/RunnerTabsType'

export interface YakRunnerContextStore {
  fileTree: FileTreeListProps[]
  areaInfo: AreaInfoProps[]
  activeFile: FileDetailInfo | undefined
  runnerTabsId: string | undefined
}

export interface YakRunnerContextDispatcher {
  setFileTree?: Dispatch<SetStateAction<FileTreeListProps[]>>
  handleFileLoadData?: (path: string) => Promise<any>
  setAreaInfo?: Dispatch<SetStateAction<AreaInfoProps[]>>
  setActiveFile?: Dispatch<SetStateAction<FileDetailInfo | undefined>>
  setRunnerTabsId?: Dispatch<SetStateAction<string | undefined>>
}

export interface YakRunnerContextValue {
  store: YakRunnerContextStore
  dispatcher: YakRunnerContextDispatcher
}

export default createContext<YakRunnerContextValue>({
  store: {
    fileTree: [],
    areaInfo: [],
    activeFile: undefined,
    runnerTabsId: undefined,
  },
  dispatcher: {
    setFileTree: undefined,
    handleFileLoadData: undefined,
    setAreaInfo: undefined,
    setActiveFile: undefined,
    setRunnerTabsId: undefined,
  },
})
