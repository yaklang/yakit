import {Dispatch, SetStateAction, createContext} from "react"
import {FileNodeProps, FileTreeListProps} from "../FileTree/FileTreeType"
import {AreaInfoProps} from "../YakRunnerType"
import {FileDetailInfo} from "../RunnerTabs/RunnerTabsType"

export interface YakRunnerContextStore {
    fileTree: FileTreeListProps[]
    auditTree: string | undefined
    areaInfo: AreaInfoProps[]
    activeFile: FileDetailInfo | undefined
    runnerTabsId: string | undefined
}

export interface YakRunnerContextDispatcher {
    setFileTree?: Dispatch<SetStateAction<FileTreeListProps[]>>
    setAuditTree?: Dispatch<SetStateAction<string | undefined>>
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
        auditTree: undefined,
        areaInfo: [],
        activeFile: undefined,
        runnerTabsId: undefined
    },
    dispatcher: {
        setFileTree: undefined,
        setAuditTree: undefined,
        handleFileLoadData: undefined,
        setAreaInfo: undefined,
        setActiveFile: undefined,
        setRunnerTabsId: undefined
    }
})
