import {Dispatch, SetStateAction, createContext} from "react"
import {FileNodeProps} from "../FileTree/FileTreeType"
import { TabFileProps } from "../YakRunnerType"

export interface YakRunnerContextStore {
    fileTree: FileNodeProps[]
    tabsFile: TabFileProps[]
}

export interface YakRunnerContextDispatcher {
    setFileTree?: Dispatch<SetStateAction<FileNodeProps[]>>
    handleFileLoadData?: (node: FileNodeProps) => Promise<any>
    setTabsFile?: Dispatch<SetStateAction<TabFileProps[]>>
}

export interface YakRunnerContextValue {
    store: YakRunnerContextStore
    dispatcher: YakRunnerContextDispatcher
}

export default createContext<YakRunnerContextValue>({
    store: {
        fileTree: [],
        tabsFile: []
    },
    dispatcher: {
        setFileTree: undefined,
        handleFileLoadData: undefined,
        setTabsFile: undefined
    }
})
