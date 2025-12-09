import type {UseYakExecResultState} from "@/pages/ai-re-act/hooks/type"
import type {FileNodeProps} from "@/pages/yakRunner/FileTree/FileTreeType"

export enum TabKey {
    FileTree = "file-tree",
    OperationLog = "operation-log"
}
export interface AIFileSystemListProps {
    execFileRecord: UseYakExecResultState["execFileRecord"]
    activeKey?: TabKey
}

export interface FileTreeSystemListWapperProps {
    path: string[]
    title: string
    isFolder?: boolean
    isOpen?: boolean
    selected?: FileNodeProps
    historyFolder?: HistoryItem[]
    setSelected: (v?: FileNodeProps) => void
    setOpenFolder?: (v: string,isFolder:boolean) => void
}

export interface FileTreeSystemItemProps {
    data: FileNodeProps
    isOpen?: boolean
    expanded?: boolean
    onResetTree?: () => void
}

export interface FileInfo {
    path: string
    size: number
    isPlainText: boolean
    content: string
    language?: string
}

export enum FileListTileMenu {
    OpenFile = "openFile",
    OpenFolder = "openFolder",
    History = "history",
}

export interface HistoryItem {
    path: string;
    isFolder: boolean;  
}
