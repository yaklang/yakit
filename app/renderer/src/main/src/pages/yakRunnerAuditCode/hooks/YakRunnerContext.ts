import type { FileTreeListProps } from '@/pages/yakRunner/FileTree/FileTreeType'
import type { AuditCodePageInfoProps } from '@/store/pageInfo'
import { type Dispatch, type SetStateAction, createContext } from 'react'
import type { FileDetailInfo } from '../RunnerTabs/RunnerTabsType'
import type { AreaInfoProps } from '../YakRunnerAuditCodeType'

export interface YakRunnerContextStore {
  pageInfo?: AuditCodePageInfoProps
  fileTree: FileTreeListProps[]
  projectName: string | undefined
  areaInfo: AreaInfoProps[]
  activeFile: FileDetailInfo | undefined
  auditRule: string
  auditExecuting: boolean
  runtimeID: string
  // 文件树是否展示全部文件（false=仅展示增量最后一次 diff，true=聚合全树）
  showAllFiles: boolean
  // 当前打开的 program 是否为增量编译（仅此时展示"展示全部文件"勾选框）
  isIncrementalProject: boolean
}

export interface YakRunnerContextDispatcher {
  setPageInfo?: Dispatch<SetStateAction<AuditCodePageInfoProps | undefined>>
  setFileTree?: Dispatch<SetStateAction<FileTreeListProps[]>>
  setProjectName?: Dispatch<SetStateAction<string | undefined>>
  handleFileLoadData?: (path: string) => Promise<any>
  setAreaInfo?: Dispatch<SetStateAction<AreaInfoProps[]>>
  setActiveFile?: Dispatch<SetStateAction<FileDetailInfo | undefined>>
  setAuditRule?: Dispatch<SetStateAction<string>>
  setAuditExecuting?: Dispatch<SetStateAction<boolean>>
  setRuntimeID?: Dispatch<SetStateAction<string>>
  setShowAllFiles?: (showAll: boolean) => void
  setIsIncrementalProject?: Dispatch<SetStateAction<boolean>>
}

export interface YakRunnerContextValue {
  store: YakRunnerContextStore
  dispatcher: YakRunnerContextDispatcher
}

export default createContext<YakRunnerContextValue>({
  store: {
    pageInfo: undefined,
    fileTree: [],
    projectName: undefined,
    areaInfo: [],
    activeFile: undefined,
    auditRule: '',
    auditExecuting: false,
    runtimeID: '',
    showAllFiles: false,
    isIncrementalProject: false,
  },
  dispatcher: {
    setPageInfo: undefined,
    setFileTree: undefined,
    setProjectName: undefined,
    handleFileLoadData: undefined,
    setAreaInfo: undefined,
    setActiveFile: undefined,
    setAuditRule: undefined,
    setAuditExecuting: undefined,
    setRuntimeID: undefined,
    setShowAllFiles: undefined,
    setIsIncrementalProject: undefined,
  },
})
