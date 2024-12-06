import {FileTreeListProps} from "@/pages/yakRunner/FileTree/FileTreeType"
import {AuditCodePageInfoProps} from "@/store/pageInfo"
import {Dispatch, SetStateAction, createContext} from "react"
import { FileDetailInfo } from "../RunnerTabs/RunnerTabsType"
import { AreaInfoProps } from "../YakRunnerAuditCodeType"

export interface YakRunnerContextStore {
    pageInfo?: AuditCodePageInfoProps
    fileTree: FileTreeListProps[]
    projectName: string | undefined
    areaInfo: AreaInfoProps[]
    activeFile: FileDetailInfo | undefined
    auditRule: string,
    auditExecuting: boolean
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
        auditRule: "",
        auditExecuting: false
    },
    dispatcher: {
        setPageInfo: undefined,
        setFileTree: undefined,
        setProjectName: undefined,
        handleFileLoadData: undefined,
        setAreaInfo: undefined,
        setActiveFile: undefined,
        setAuditRule: undefined,
        setAuditExecuting: undefined
    }
})
