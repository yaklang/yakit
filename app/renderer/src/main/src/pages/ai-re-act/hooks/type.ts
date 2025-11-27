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
    onGrpcFolder?: (path: string) => void
    /** 向接口发送消息 */
    sendRequest?: (request: AIInputEvent) => void
    /** 获取问题队列信息 */
    getQuestionQueue?: () => AIQuestionQueues
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
    onGrpcFolder?: (path: string) => void
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
export type ChatIPCSendType = "casual" | "task" | ""
export interface UseChatIPCParams {
    /** 获取流接口请求参数 */
    getRequest?: () => AIAgentSetting | undefined
    /** 出现任务规划的触发回调(id 是 coordinatorId) */
    onTaskStart?: (id: string) => void
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
}

export interface AIQuestionQueues {
    total: number
    data: AIAgentGrpcApi.QuestionQueueItem[]
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
    grpcFolders: string[]
    /** 问题队列信息 */
    questionQueue: AIQuestionQueues
}

/** 开始启动流接口的唯一token、请求参数和额外参数 */
export interface AIChatIPCStartParams {
    token: string
    params: AIInputEvent
    /** 供前端处理逻辑和UI的额外参数 */
    extraValue?: CustomPluginExecuteFormValue
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
    onSend: (AIChatSendParams) => void
    /** 主动结束正在执行中的接口流 */
    onClose: (
        token: string,
        option?: {
            tip: () => void
        }
    ) => void
    /** 重置所有数据 */
    onReset: () => void
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
    pushLog: (log: AIChatLogData) => string
    /** 都劝我 */
    sendStreamLog: (uuid: string) => void
    /** 获取当前执行接口流的请求参数 */
    clearLogs: () => AIStartParams | undefined
    /** 关闭展示日志的页面窗口 */
    cancelLogsWin: () => void
}
// #endregion
