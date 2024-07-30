import {FileNodeProps} from "./FileTree/FileTreeType"
import { FileDetailInfo } from "./RunnerTabs/RunnerTabsType";
import {AuditYakUrlProps} from "./AuditCode/AuditCodeType"
export interface YakRunnerProps {
    initCode?: YakRunnerCodeProps
}

export interface YakRunnerCodeProps {
    /** 源码 */
    content: string
    /** 源码语言 */
    language: string
    /** 绝对路径 */
    paht?: string
    /** 文件名字 */
    name?: string
}

export interface ViewsInfoProps {
    direction: "vertical" | "horizontal" | ""
    views: ViewFileProps | ViewsInfoProps[] | null
}

export interface YakRunnerHistoryProps {
    // 是否为文件
    isFile: boolean
    // 展示名称
    name: string
    // 路径
    path: string
}

export interface TabFileProps {
    // 窗口唯一标识符
    id: string;
    // 窗口中打开的文件列表          
    files:FileDetailInfo[]
}

// 编辑器分块信息
export interface AreaInfoProps {
    elements: TabFileProps[]
}

// 打开文件信息
export interface OpenFileByPathProps {
    params: {
        path: string
        name: string
        parent?: string | null
    }
    // 是否记录历史
    isHistory?: boolean
}

export interface AuditEmiterYakUrlProps extends AuditYakUrlProps {
    Body: string
}