import {HTTPRequestBuilderParams} from "@/models/HTTPRequestBuilder"
import {ExecResult, QueryYakScriptRequest} from "@/pages/invoker/schema"

export type HybridScanModeType = "new" | "resume" | "pause" | "status"
export type HybridScanTaskSourceType = "pluginBatch" | "yakPoc"
export interface HybridScanControlRequest extends HybridScanControlAfterRequest {
    // 控制帧字段
    Control: boolean
    // new: 新任务
    // resume: 恢复任务
    // pause: 暂停任务
    // status: 查询任务状态
    HybridScanMode: HybridScanModeType
    ResumeTaskId: string
}

/**再发送 HybridScanMode 后再传的参数*/
export interface HybridScanControlAfterRequest {
    // 其他参数
    Concurrent?: number
    TotalTimeoutSecond?: number
    Proxy?: string
    SingleTimeoutSecond?: number
    Plugin?: HybridScanPluginConfig
    Targets?: HybridScanInputTarget
    HybridScanTaskSource?: HybridScanTaskSourceType
}

export interface HybridScanInputTarget {
    Input: string
    InputFile: string[]
    HTTPRequestTemplate: HTTPRequestBuilderParams
}

export interface HybridScanPluginConfig {
    PluginNames: string[]
    Filter?: QueryYakScriptRequest
}

export interface HybridScanStatisticResponse {
    // 计算整体任务进度等信息
    TotalTargets: number
    TotalPlugins: number
    TotalTasks: number
    FinishedTasks: number
    FinishedTargets: number
    ActiveTasks: number
    ActiveTargets: number

    // 混合扫描任务ID，一般用来恢复任务或者暂停任务
    HybridScanTaskId: string
}

export interface HybridScanResponse extends HybridScanStatisticResponse {
    CurrentPluginName: string
    ExecResult: ExecResult

    UpdateActiveTask?: HybridScanActiveTask
    /**@deprecated 后端已废弃 */
    ScanConfig?: string
    HybridScanConfig?: HybridScanControlRequest
}

export interface HybridScanActiveTask {
    Operator: "create" | "remove"
    Index: string

    IsHttps: boolean
    HTTPRequest: Uint8Array
    PluginName: string
    Url: string
}

export interface HybridScanTask {
    Id: number
    CreatedAt: number
    UpdatedAt: number
    TaskId: string
    Status: "executing" | "paused" | "done" | "error" // 如果 Status 有固定的几个值，可以使用联合类型
    TotalTargets: number
    TotalPlugins: number
    TotalTasks: number
    FinishedTasks: number
    FinishedTargets: number
    FirstTarget: string
    Reason: string
}
