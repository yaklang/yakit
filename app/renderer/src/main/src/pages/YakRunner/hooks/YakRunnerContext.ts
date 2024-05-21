import {Dispatch, SetStateAction, createContext} from "react"
import {FileNodeProps} from "../FileTree/FileTreeType"

export interface YakRunnerContextStore {
    fileTree: FileNodeProps[]
}

export interface YakRunnerContextDispatcher {
    setFileTree?: Dispatch<SetStateAction<FileNodeProps[]>>
    handleFileLoadData?: (node: FileNodeProps) => Promise<any>
}

export interface YakRunnerContextValue {
    store: YakRunnerContextStore
    dispatcher: YakRunnerContextDispatcher
}

export default createContext<YakRunnerContextValue>({
    store: {
        fileTree: []
    },
    dispatcher: {
        setFileTree: undefined,
        handleFileLoadData: undefined
    }
})
