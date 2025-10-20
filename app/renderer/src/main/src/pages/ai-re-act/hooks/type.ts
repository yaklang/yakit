import {StreamResult} from "@/hook/useHoldGRPCStream/useHoldGRPCStreamType"
import {AIChatQSData, AITokenConsumption, AIYakExecFileRecord} from "./aiRender"
import {AIAgentGrpcApi, AIInputEvent, AIOutputEvent, AIStartParams} from "./grpcApi"
import {Dispatch, SetStateAction} from "react"

/** 公共 hoos 事件 */
interface UseHookBaseParams {
    /** 将数据推送到日志集合中 */
    pushLog: (log: AIChatQSData) => void
}
interface UseHookBaseEvents {
    handleSetData: (res: AIOutputEvent) => void
    handleResetData: () => void
}
export type handleSendFunc = (params: {request: AIInputEvent; optionValue?: string; cb?: () => void}) => void

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
    /** 更新日志数据 */
    updateLog: Dispatch<SetStateAction<AIChatQSData[]>>
    /** 获取流接口请求参数 */
    getRequest: () => AIStartParams | undefined
    /** 触发 review-release 后的回调事件 */
    onReviewRelease?: (id: string) => void
}

export interface UseCasualChatState {
    /** 自由对话的 id */
    coordinatorId: string
    contents: AIChatQSData[]
}
export interface UseCasualChatEvents extends UseHookBaseEvents {
    handleSetCoordinatorId: (id: string) => void
    handleSend: handleSendFunc
}
// #endregion

// #region useTaskChat相关定义
export interface UseTaskChatParams extends UseHookBaseParams {
    /** 获取流接口请求参数 */
    getRequest: () => AIStartParams | undefined
    /** 更新日志数据 */
    updateLog: Dispatch<SetStateAction<AIChatQSData[]>>
    /** review 触发回调事件 */
    onReview?: (data: AIChatQSData) => void
    /** plan_review 补充数据 */
    onReviewExtra?: (data: AIAgentGrpcApi.PlanReviewRequireExtra) => void
    /** 触发 review-release 后的回调事件 */
    onReviewRelease?: (id: string) => void
}

export interface UseTaskChatState {
    /** 任务对话的 id */
    coordinatorId: string
    /** 正在执行的任务列表 */
    plan: AIAgentGrpcApi.PlanTask[]
    /** 流式输出 */
    streams: AIChatQSData[]
}
export interface UseTaskChatEvents extends UseHookBaseEvents {
    handleSetCoordinatorId: (id: string) => void
    handleSend: handleSendFunc
    /** 获取原始任务列表树 */
    fetchPlanTree: () => AIAgentGrpcApi.PlanTask | undefined
    /** 接口关闭后的后续执行逻辑 */
    handleCloseGrpc: () => void
}
// #endregion

// #region useChatIPC相关定义
export type ChatIPCSendType = "casual" | "task" | ""
export interface UseChatIPCParams {
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

export interface UseChatIPCState {
    /** 流执行状态 */
    execute: boolean
    /** 执行日志 */
    logs: AIChatQSData[]
    /** 插件输出的卡片数据 */
    yakExecResult: UseYakExecResultState
    /** AI性能相关数据 */
    aiPerfData: UseAIPerfDataState
    /** 自由对话相关数据 */
    casualChat: UseCasualChatState
    /** 任务规划相关数据 */
    taskChat: UseTaskChatState
}

/** 执行流途中发送消息的参数 */
export interface AIChatSendParams {
    token: string
    type: ChatIPCSendType
    params: AIInputEvent
    optionValue?: string
}

export interface UseChatIPCEvents {
    /** 获取当前执行接口流的唯一标识符 */
    fetchToken: () => string
    /** 获取当前执行接口流的请求参数 */
    fetchRequest: () => AIStartParams | undefined
    /** 开始执行接口流 */
    onStart: (token: string, params: AIInputEvent) => void
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
