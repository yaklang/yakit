import { FileTreeListProps } from "@/pages/YakRunner/FileTree/FileTreeType"
import { FileDetailInfo } from "@/pages/YakRunner/RunnerTabs/RunnerTabsType"
import { AreaInfoProps } from "@/pages/YakRunner/YakRunnerType"
import {Dispatch, SetStateAction, createContext} from "react"

export interface YakRunnerContextStore {
    fileTree: FileTreeListProps[]
    projectNmae: string | undefined
    areaInfo: AreaInfoProps[]
    activeFile: FileDetailInfo | undefined
}

export interface YakRunnerContextDispatcher {
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
        fileTree: [],
        projectNmae: undefined,
        areaInfo: [],
        activeFile: undefined,
    },
    dispatcher: {
        setFileTree: undefined,
        setProjectNmae: undefined,
        handleFileLoadData: undefined,
        setAreaInfo: undefined,
        setActiveFile: undefined,
    }
})
