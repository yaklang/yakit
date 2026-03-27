import type {YakitMenuItemType} from "@/components/yakitUI/YakitMenu/YakitMenu"
import type {UseYakExecResultState} from "@/pages/ai-re-act/hooks/type"
import type {UseFileTreeEvents} from "@/pages/ai-re-act/hooks/useFileTree"
import type {FileNodeProps} from "@/pages/yakRunner/FileTree/FileTreeType"
import type {Dispatch, SetStateAction} from "react"

export enum TabKey {
    FileTree = "file-tree",
    OperationLog = "operation-log"
}
export interface AIFileSystemListProps {
    execFileRecord: UseYakExecResultState["execFileRecord"]
    activeKey?: TabKey
    setActiveKey?: (key: TabKey) => void
}

export interface FileTreeSystemListWapperProps {
    path: HistoryItem[]
    title: string
    isOpen?: boolean
    selected?: FileNodeProps
    setSelected: (v?: FileNodeProps) => void
    onTreeDragStart?: () => void
    onTreeDragEnd?: () => void
}

export interface FileTreeSystemListRef {
    onResetTreeList: () => void
    loadFolder: (path: string) => Promise<boolean>
    getDetailMap: UseFileTreeEvents["getDetailMap"]
}

export interface FileTreeSystemListProps {
    ref?: FileTreeSystemListRef
    path: string
    isFolder?: boolean
    treeData?: FileNodeProps[]
    setTreeData?: Dispatch<SetStateAction<FileNodeProps[]>>
    isOpen?: boolean
    selected?: FileTreeSystemListWapperProps["selected"]
    setSelected: FileTreeSystemListWapperProps["setSelected"]
    onTreeDragStart?: FileTreeSystemListWapperProps["onTreeDragStart"]
    onTreeDragEnd?: FileTreeSystemListWapperProps["onTreeDragEnd"]
    checkable?: boolean
    checkedKeys?: HistoryItem[]
    setCheckedKeys?: (v: boolean, nodeData: FileNodeProps) => void
    isShowRightMenu?: boolean
    treeMenuData?: (treeNode: FileNodeProps) => YakitMenuItemType[]
    handleTreeDropdown?: (treeNode: FileNodeProps, key: string) => void
    updateWatchTokenFun?: (token: string) => void
    onTreeNodeDelFun?: (path: string) => void
}
export interface FileTreeSystemItemProps {
    watchToken: string
    data: FileNodeProps
    isOpen?: boolean
    expanded?: boolean
    onResetTree?: () => void
    /**是否显示右键菜单 */
    isShowRightMenu?: boolean
    treeMenuData?: FileTreeSystemListProps["treeMenuData"]
    handleTreeDropdown?: FileTreeSystemListProps["handleTreeDropdown"]
    checkable?: boolean
    checked?: boolean
    setChecked?: (checked: boolean) => void
    selected?: FileTreeSystemListWapperProps["selected"]
    setSelected: FileTreeSystemListWapperProps["setSelected"]
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
    Equal = 0, // 已打开相同路径
    OriginContains = 1, // 已打开的是父路径
    IncomingContains = 2, // 已打开的是子路径
    None = 3, // 无包含关系
    Error = 4 // 异常
}
