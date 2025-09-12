import {
    AIChatMessage,
    AIChatReview,
    AIChatReviewExtra,
    AIInputEvent,
    AIOutputEvent,
    AIStartParams
} from "@/pages/ai-agent/type/aiChat"

/** 公共 hoos 事件 */
interface UseHookBaseEvents {
    handleSetData: (res: AIOutputEvent) => void
    handleResetData: () => void
}

// #region useAIPerfData相关定义
export interface UseAIPerfDataParams {
    pushLog: (log: AIChatMessage.Log) => void
}

export interface UseAIPerfDataState {
    consumption: Record<string, AIChatMessage.Consumption>
    pressure: AIChatMessage.Pressure[]
    firstCost: AIChatMessage.AICostMS[]
    totalCost: AIChatMessage.AICostMS[]
}
export interface UseAIPerfDataEvents extends UseHookBaseEvents {}
// #endregion

// #region useYakExecResult相关定义
export interface UseYakExecResultParams {
    pushLog: (log: AIChatMessage.Log) => void
}

export interface UseYakExecResultState {
    card: AIChatMessage.AIInfoCard[]
}
export interface UseYakExecResultEvents extends UseHookBaseEvents {}
// #endregion

// #region useCasualChat相关定义
export interface UseCasualChatParams {
    /** 将数据存入日志信息队列中 */
    pushLog: (log: AIChatMessage.Log) => void
    /** 获取流接口请求参数 */
    getRequest: () => AIStartParams | undefined
    /** 触发 review-release 后的回调事件 */
    onReviewRelease?: (id: string) => void
}

export interface UseCasualChatState {
    /** 自由对话的 id */
    coordinatorId: string
    contents: AIChatMessage.AICasualChatQAStream[]
}
export interface UseCasualChatEvents extends UseHookBaseEvents {
    handleSetCoordinatorId: (id: string) => void
    handleSend: (request: AIInputEvent, cb?: () => void) => void
}
// #endregion

// #region useTaskChat相关定义
export interface UseTaskChatParams {
    /** 获取流接口请求参数 */
    getRequest: () => AIStartParams | undefined
    /** 将数据存入日志信息队列中 */
    pushLog: (log: AIChatMessage.Log) => void
    /** review 触发回调事件 */
    onReview?: (data: AIChatReview) => void
    /** plan_review 补充数据 */
    onReviewExtra?: (data: AIChatReviewExtra) => void
    /** 触发 review-release 后的回调事件 */
    onReviewRelease?: (id: string) => void
}

export interface UseTaskChatState {
    /** 任务对话的 id */
    coordinatorId: string
    /** 正在执行的任务列表 */
    plan: AIChatMessage.PlanTask[]
    /** 流式输出 */
    streams: Record<string, AIChatMessage.AITaskStreamOutput[]>
}
export interface UseTaskChatEvents extends UseHookBaseEvents {
    handleSetCoordinatorId: (id: string) => void
    handleSend: (request: AIInputEvent, cb?: () => void) => void
    /** 获取原始任务列表树 */
    fetchPlanTree: () => AIChatMessage.PlanTask | undefined
    /** 接口关闭后的后续执行逻辑 */
    handleCloseGrpc: () => void
}
// #endregion

// #region useChatIPC相关定义
export type ChatIPCSendType = "casual" | "task"
export interface UseChatIPCParams {
    /** 出现任务规划的触发回调(id 是 coordinatorId) */
    onTaskStart?: (id: string) => void
    /** 任务规划的 review 事件 */
    onTaskReview?: (data: AIChatReview) => void
    /** 任务规划中 plan_review 事件的补充数据 */
    onTaskReviewExtra?: (data: AIChatReviewExtra) => void
    /** 主动 review-release 的回调事件 */
    onReviewRelease?: (type: ChatIPCSendType, id: string) => void
    /** 接口结束断开的回调事件 */
    onEnd?: () => void
}

export interface UseChatIPCState {
    /** 流执行状态 */
    execute: boolean
    /** 执行日志 */
    logs: AIChatMessage.Log[]
    /** 插件输出的卡片数据 */
    yakExecResult: UseYakExecResultState
    /** AI性能相关数据 */
    aiPerfData: UseAIPerfDataState
    /** 自由对话相关数据 */
    casualChat: UseCasualChatState
    /** 任务规划相关数据 */
    taskChat: UseTaskChatState
}
export interface UseChatIPCEvents {
    /** 获取当前执行接口流的唯一标识符 */
    fetchToken: () => string
    /** 获取当前执行接口流的请求参数 */
    fetchRequest: () => AIStartParams | undefined
    /** 开始执行接口流 */
    onStart: (token: string, params: AIInputEvent) => void
    /** 向执行中的接口流主动输入信息 */
    onSend: (token: string, type: ChatIPCSendType, params: AIInputEvent) => void
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
