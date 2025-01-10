import {AuditYakUrlProps} from "./AuditCode/AuditCodeType"
import {FileDetailInfo, Selection} from "./RunnerTabs/RunnerTabsType"
import {StreamResult} from "@/hook/useHoldGRPCStream/useHoldGRPCStreamType"
import { AuditCodePageInfoProps } from "@/store/pageInfo"
export interface YakRunnerAuditCodeProps {
    auditCodePageInfo?: AuditCodePageInfoProps
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
    Body?: string
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


export interface AuditCodeStreamData {
    Progress: number
    Speed: string
    CostDurationVerbose: string
    RestDurationVerbose: string
    Message: string
}

export interface AuditCodeStatusInfoProps {
    title: string
    streamData: AuditCodeStreamData
    cancelRun: () => void
    logInfo: StreamResult.Log[]
    // 是否显示 剩余时间-耗时-下载速度 默认不显示
    showDownloadDetail?: boolean
    // 是否自动关闭
    autoClose?: boolean
    // 关闭
    onClose?: () => void
}
