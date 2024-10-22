import {FileTreeListProps} from "@/pages/yakRunner/FileTree/FileTreeType"
import {FileDetailInfo} from "@/pages/yakRunner/RunnerTabs/RunnerTabsType"
import {AreaInfoProps} from "@/pages/yakRunner/YakRunnerType"
import {AuditCodePageInfoProps} from "@/store/pageInfo"
import {Dispatch, SetStateAction, createContext} from "react"

export interface YakRunnerContextStore {
    pageInfo?: AuditCodePageInfoProps
    fileTree: FileTreeListProps[]
    projectNmae: string | undefined
    areaInfo: AreaInfoProps[]
    activeFile: FileDetailInfo | undefined
}

export interface YakRunnerContextDispatcher {
    setPageInfo?: Dispatch<SetStateAction<AuditCodePageInfoProps | undefined>>
    setFileTree?: Dispatch<SetStateAction<FileTreeListProps[]>>
    setProjectNmae?: Dispatch<SetStateAction<string | undefined>>
    handleFileLoadData?: (path: string) => Promise<any>
    setAreaInfo?: Dispatch<SetStateAction<AreaInfoProps[]>>
    setActiveFile?: Dispatch<SetStateAction<FileDetailInfo | undefined>>
}

export interface YakRunnerContextValue {
    store: YakRunnerContextStore
    dispatcher: YakRunnerContextDispatcher
}

export default createContext<YakRunnerContextValue>({
    store: {
        pageInfo: undefined,
        fileTree: [],
        projectNmae: undefined,
        areaInfo: [],
        activeFile: undefined
    },
    dispatcher: {
        setPageInfo: undefined,
        setFileTree: undefined,
        setProjectNmae: undefined,
        handleFileLoadData: undefined,
        setAreaInfo: undefined,
        setActiveFile: undefined
    }
})
