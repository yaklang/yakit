import {AuditYakUrlProps} from "./AuditCode/AuditCodeType"
import {FileDetailInfo, Selection} from "./RunnerTabs/RunnerTabsType"
export interface YakRunnerAuditCodeProps {
}

export interface Selection {
    startLineNumber: number // 开始-行号
    startColumn: number // 开始-字符位置
    endLineNumber: number // 结束-行号
    endColumn: number // 结束-字符位置
}

// 打开文件信息
export interface OpenFileByPathProps {
    params: {
        path: string
        name: string
        parent?: string | null
        highLightRange?: Selection
    }
    // 是否记录历史
    isHistory?: boolean
    // 是否为外部选择打开(用于审计文件树打开)
    isOutside?: boolean
}

export interface AuditEmiterYakUrlProps extends AuditYakUrlProps {
    Body: string
}


export interface TabFileProps {
    // 窗口唯一标识符
    id: string
    // 窗口中打开的文件列表
    files: FileDetailInfo[]
}

// 编辑器分块信息
export interface AreaInfoProps {
    elements: TabFileProps[]
}

export interface YakRunnerHistoryProps {
    // 是否为文件
    isFile: boolean
    // 展示名称
    name: string
    // 路径
    path: string
    // 加载的树类型
    loadTreeType?: "file" | "audit"
}