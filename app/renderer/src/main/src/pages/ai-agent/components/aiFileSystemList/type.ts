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
    path: HistoryItem[]
    title: string
    isOpen?: boolean
    selected?: FileNodeProps
    historyFolder?: HistoryItem[]
    setSelected: (v?: FileNodeProps) => void
    setOpenFolder?: (v: string, isFolder: boolean) => void
    onTreeDragStart?: () => void
    onTreeDragEnd?: () => void
}

export interface FileTreeSystemListProps {
    path: string
    isFolder?: boolean
    isOpen?: boolean
    selected?: FileTreeSystemListWapperProps["selected"]
    setSelected: FileTreeSystemListWapperProps["setSelected"]
    onTreeDragStart?: FileTreeSystemListWapperProps["onTreeDragStart"]
    onTreeDragEnd?: FileTreeSystemListWapperProps["onTreeDragEnd"]
    checkedKeys?: HistoryItem[]
    setCheckedKeys?: (v: boolean, nodeData: FileNodeProps) => void
    isShowRightMenu?: boolean
    checkable?: boolean
}
export interface FileTreeSystemItemProps {
    data: FileNodeProps
    isOpen?: boolean
    expanded?: boolean
    onResetTree?: () => void
    /**是否显示右键菜单 */
    isShowRightMenu?: boolean
    checkable?: boolean
    checked?: boolean
    setChecked?: (checked: boolean) => void
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
    History = "history"
}

export interface HistoryItem {
    path: string
    isFolder: boolean
}

export enum PathIncludeResult {
    Equal = 0,          // 已打开相同路径
    OriginContains = 1, // 已打开的是父路径
    IncomingContains = 2, // 已打开的是子路径
    None = 3,           // 无包含关系
    Error = 4           // 异常
}
