import {Dispatch, SetStateAction, createContext} from "react"
import {FileNodeProps, FileTreeListProps} from "../FileTree/FileTreeType"
import {AreaInfoProps} from "../YakRunnerType"
import {FileDetailInfo} from "../RunnerTabs/RunnerTabsType"

export interface YakRunnerContextStore {
    fileTree: FileTreeListProps[]
    projectNmae: string | undefined
    loadTreeType: "file" | "audit"
    areaInfo: AreaInfoProps[]
    activeFile: FileDetailInfo | undefined
    runnerTabsId: string | undefined
}

export interface YakRunnerContextDispatcher {
    setFileTree?: Dispatch<SetStateAction<FileTreeListProps[]>>
    setProjectNmae?: Dispatch<SetStateAction<string | undefined>>
    setLoadTreeType?: Dispatch<SetStateAction<"file" | "audit">>
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
        projectNmae: undefined,
        loadTreeType: "file",
        areaInfo: [],
        activeFile: undefined,
        runnerTabsId: undefined
    },
    dispatcher: {
        setFileTree: undefined,
        setProjectNmae: undefined,
        setLoadTreeType: undefined,
        handleFileLoadData: undefined,
        setAreaInfo: undefined,
        setActiveFile: undefined,
        setRunnerTabsId: undefined
    }
})
