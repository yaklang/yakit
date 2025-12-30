import {StreamResult} from "@/hook/useHoldGRPCStream/useHoldGRPCStreamType"
import {AIChatQSData, AIStreamOutput, AITaskInfoProps, AITokenConsumption, AIYakExecFileRecord} from "./aiRender"
import {AIAgentGrpcApi, AIInputEvent, AIOutputEvent, AIStartParams} from "./grpcApi"
import {AIAgentSetting} from "@/pages/ai-agent/aiAgentType"
import {CustomPluginExecuteFormValue} from "@/pages/plugins/operator/localPluginExecuteDetailHeard/LocalPluginExecuteDetailHeardType"

/** 公共 hoos 事件 */
interface UseHookBaseParams {
    /** 将数据推送到日志集合中 */
    pushLog: (log: AIChatLogData) => void
}
interface UseHookBaseEvents {
    handleSetData: (res: AIOutputEvent) => void
    handleResetData: () => void
}
export type handleSendFunc = (params: {
    request: AIInputEvent
    optionValue?: string
    extraValue?: AIChatIPCStartParams["extraValue"]
    cb?: () => void
}) => void

// #region useAIPerfData相关定义
export interface UseAIPerfDataParams extends UseHookBaseParams {}

export interface UseAIPerfDataState {
    consumption: AITokenConsumption
    pressure: AIAgentGrpcApi.Pressure[]
    firstCost: AIAgentGrpcApi.AICostMS[]
    totalCost: AIAgentGrpcApi.AICostMS[]
}
export interface UseAIPerfDataEvents extends UseHookBaseEvents {}
// #endregion

// #region useYakExecResult相关定义
export interface UseYakExecResultParams extends UseHookBaseParams {}

export interface UseYakExecResultState {
    card: AIAgentGrpcApi.AIInfoCard[]
    execFileRecord: Map<string, AIYakExecFileRecord[]>
    yakExecResultLogs: StreamResult.Log[]
}
export interface UseYakExecResultEvents extends UseHookBaseEvents {}
// #endregion

// #region useCasualChat相关定义
export interface UseCasualChatParams extends UseHookBaseParams {
    /** 获取流接口请求参数 */
    getRequest: () => AIAgentSetting | undefined
    /** 触发 review-release 后的回调事件 */
    onReviewRelease?: (id: string) => void
    /** 接口里返回文件夹路径时的回调事件 */
    onGrpcFolder?: (path: AIFileSystemPin) => void
    /** 向接口发送消息 */
    sendRequest?: (request: AIInputEvent) => void
    /** 通知消息回调 */
    onNotifyMessage?: UseChatIPCParams["onNotifyMessage"]
    /** 系统消息的收集(isSystem=true&type=stream) */
    onSystemStream?: (uuid: string, content: string) => void
}

export interface UseCasualChatState {
    contents: AIChatQSData[]
}
export interface UseCasualChatEvents extends UseHookBaseEvents {
    handleSend: handleSendFunc
}
// #endregion

// #region useTaskChat相关定义
export interface UseTaskChatParams extends UseHookBaseParams {
    /** 获取流接口请求参数 */
    getRequest: () => AIAgentSetting | undefined
    /** review 触发回调事件 */
    onReview?: (data: AIChatQSData) => void
    /** plan_review 补充数据 */
    onReviewExtra?: (data: AIAgentGrpcApi.PlanReviewRequireExtra) => void
    /** 触发 review-release 后的回调事件 */
    onReviewRelease?: (id: string) => void
    /** 向接口发送消息 */
    sendRequest?: (request: AIInputEvent) => void
    /** 接口里返回文件夹路径时的回调事件 */
    onGrpcFolder?: (path: AIFileSystemPin) => void
    /** 通知消息回调 */
    onNotifyMessage?: UseChatIPCParams["onNotifyMessage"]
    onTaskStart: UseChatIPCParams["onTaskStart"]
    /** 系统消息的收集(isSystem=true&type=stream) */
    onSystemStream?: (uuid: string, content: string) => void
}

export interface UseTaskChatState {
    /** 正在执行的任务列表 */
    plan: AITaskInfoProps[]
    /** 流式输出 */
    streams: AIChatQSData[]
}
export interface UseTaskChatEvents extends UseHookBaseEvents {
    handleSend: handleSendFunc
    /** 获取原始任务列表树 */
    fetchPlanTree: () => AIAgentGrpcApi.PlanTask | undefined
    /** 接口关闭后的后续执行逻辑 */
    handleCloseGrpc: () => void
    /** 任务规划结束的触发回调 */
    handlePlanExecEnd: (res: AIOutputEvent) => void
}
// #endregion

// #region useChatIPC相关定义
/** 会话类型 */
export type ChatIPCSendType = "casual" | "task" | ""
/** 会话-通知消息回调 */
export interface AIChatIPCNotifyMessage {
    Type: AIOutputEvent["Type"]
    NodeId: AIOutputEvent["NodeId"]
    NodeIdVerbose: AIOutputEvent["NodeIdVerbose"]
    Content: string
    Timestamp: AIOutputEvent["Timestamp"]
}

export interface UseChatIPCParams {
    /** 获取流接口请求参数 */
    getRequest?: () => AIAgentSetting | undefined
    /** 出现任务规划的触发回调(id 是 coordinatorId) */
    onTaskStart?: () => void
    /** 任务规划的 review 事件 */
    onTaskReview?: (data: AIChatQSData) => void
    /** 任务规划中 plan_review 事件的补充数据 */
    onTaskReviewExtra?: (data: AIAgentGrpcApi.PlanReviewRequireExtra) => void
    /** 主动 review-release 的回调事件 */
    onReviewRelease?: (type: ChatIPCSendType, id: string) => void
    /** timeline 时间线消息回调事件 */
    onTimelineMessage?: (message: string) => void
    /** 接口结束断开的回调事件 */
    onEnd?: () => void
    /** 通知消息的回调 */
    onNotifyMessage?: (message: AIChatIPCNotifyMessage) => void
}

/** 会话文件系统-pin */
export interface AIFileSystemPin {
    path: string
    isFolder: boolean
}

/** 自由对话-实时问题队列 */
export interface AIQuestionQueues {
    total: number
    data: AIAgentGrpcApi.QuestionQueueItem[]
}

/** 自由对话-loading状态信息 */
export interface CasualLoadingStatus {
    loading: boolean
    title: string
}

/** 任务规划-loading状态信息 */
export interface PlanLoadingStatus {
    loading: boolean
    plan: string
    task: string
}

export interface UseChatIPCState {
    /** 流执行状态 */
    execute: boolean
    /** 运行时的runtimeid合集 */
    runTimeIDs: string[]
    /** 插件输出的卡片数据 */
    yakExecResult: UseYakExecResultState
    /** AI性能相关数据 */
    aiPerfData: UseAIPerfDataState
    /** 自由对话相关数据 */
    casualChat: UseCasualChatState
    /** 任务规划相关数据 */
    taskChat: UseTaskChatState
    /** 接口运行过程中的数据文件夹合集 */
    grpcFolders: AIFileSystemPin[]
    /** 问题队列信息 */
    questionQueue: AIQuestionQueues
    /** 自由对话的loading状态信息 */
    casualStatus: CasualLoadingStatus
    /** 实时时间线 */
    reActTimelines: AIAgentGrpcApi.TimelineItem[]
    /** 记忆列表 */
    memoryList: AIAgentGrpcApi.MemoryEntryList
    /** 任务规划的loading状态信息 */
    taskStatus: PlanLoadingStatus
    /** 系统流信息(isSystem=true&type=stream) */
    systemStream: string
    /** 所有的 coordinatorID */
    coordinatorIDs: string[]
}

/** 开始启动流接口的唯一token、请求参数和额外参数 */
export interface AIChatIPCStartParams {
    token: string
    params: AIInputEvent
    /** 供前端处理逻辑和UI的额外参数 */
    extraValue?: CustomPluginExecuteFormValue | Record<string, CustomPluginExecuteFormValue[]>
}

/** 执行流途中发送消息的参数 */
export interface AIChatSendParams {
    token: string
    type: ChatIPCSendType
    params: AIInputEvent
    optionValue?: string
    extraValue?: AIChatIPCStartParams["extraValue"]
}

export interface UseChatIPCEvents {
    /** 获取当前执行接口流的唯一标识符 */
    fetchToken: () => string
    /** 获取当前执行任务规划的问题id */
    fetchReactTaskToAsync: () => string
    /** 清空当前执行任务规划的问题id */
    clearReactTaskToAsync: () => void
    /** 开始执行接口流 */
    onStart: (params: AIChatIPCStartParams) => void
    /** 向执行中的接口流主动输入信息 */
    onSend: (params: AIChatSendParams) => void
    /** 主动结束正在执行中的接口流 */
    onClose: (
        token: string,
        option?: {
            tip: () => void
        }
    ) => void
    /** 重置所有数据 */
    onReset: () => void
    /** 取消任务规划当前的Review */
    handleTaskReviewRelease: (id: string) => void
}
// #endregion

// #region useAIChatLog相关定义
export interface AIChatLogToInfo {
    type: "log"
    Timestamp: AIOutputEvent["Timestamp"]
    data: AIAgentGrpcApi.Log
}
export interface AIChatLogToStream {
    type: "stream"
    Timestamp: AIOutputEvent["Timestamp"]
    data: AIStreamOutput
}

export type AIChatLogData = AIChatLogToInfo | AIChatLogToStream

export interface UseAIChatLogEvents {
    /** 获取当前执行接口流的唯一标识符 */
    pushLog: (log: AIChatLogData) => void
    /** 都劝我 */
    sendStreamLog: (uuid: string) => void
    /** 获取当前执行接口流的请求参数 */
    clearLogs: () => AIStartParams | undefined
    /** 关闭展示日志的页面窗口 */
    cancelLogsWin: () => void
}
// #endregion
