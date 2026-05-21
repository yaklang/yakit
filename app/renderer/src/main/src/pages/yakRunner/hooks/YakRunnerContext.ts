import { Dispatch, SetStateAction, createContext } from 'react'
import { FileNodeProps, FileTreeListProps } from '../FileTree/FileTreeType'
import { AreaInfoProps } from '../YakRunnerType'
import { FileDetailInfo } from '../RunnerTabs/RunnerTabsType'

export interface YakRunnerContextStore {
  fileTree: FileTreeListProps[]
  areaInfo: AreaInfoProps[]
  activeFile: FileDetailInfo | undefined
  runnerTabsId: string | undefined
  pageId?: string
}

export interface YakRunnerContextDispatcher {
  setFileTree?: Dispatch<SetStateAction<FileTreeListProps[]>>
  handleFileLoadData?: (path: string) => Promise<any>
  setAreaInfo?: Dispatch<SetStateAction<AreaInfoProps[]>>
  setActiveFile?: Dispatch<SetStateAction<FileDetailInfo | undefined>>
  setRunnerTabsId?: Dispatch<SetStateAction<string | undefined>>
  addFileTab?: (params?: { name?: string; code: string; language?: string }) => void
  applyContentToActiveFile?: (content: string) => void
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
    pageId: undefined,
  },
  dispatcher: {
    setFileTree: undefined,
    handleFileLoadData: undefined,
    setAreaInfo: undefined,
    setActiveFile: undefined,
    setRunnerTabsId: undefined,
    addFileTab: undefined,
    applyContentToActiveFile: undefined,
  },
})
