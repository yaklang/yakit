import {AIChatMessage, AIInputEvent, AIOutputEvent, AIStartParams} from "@/pages/ai-agent/type/aiChat"

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

// #region useExecCard相关定义
export interface UseExecCardParams {
    pushLog: (log: AIChatMessage.Log) => void
}

export type UseExecCardState = AIChatMessage.AIInfoCard[]
export interface UseExecCardEvents extends UseHookBaseEvents {}
// #endregion

// #region useCasualChat相关定义
export interface UseCasualChatParams {
    /** 将数据存入日志信息队列中 */
    pushLog: (log: AIChatMessage.Log) => void
    /** 获取流接口请求参数 */
    getRequest: () => AIStartParams | undefined
    /** 触发 review-relaese 后的回调事件 */
    onReviewRelease: (id: string) => voud
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

// #region useChatIPC相关定义
export interface UseChatIPCParams {
    /** 主动 review-release 的回调事件 */
    onReviewRelease: (type: "casual" | "task", id: string) => void
    /** 接口结束断开的回调事件 */
    onEnd: () => void
}

export interface UseChatIPCState {
    /** 流执行状态 */
    execute: boolean
    /** 执行日志 */
    logs: AIChatMessage.Log[]
    /** 插件输出的卡片数据 */
    card: UseExecCardState
    /** AI性能相关数据 */
    aiPerfData: UseAIPerfDataState
    /** 自由对话相关数据 */
    casualChat: UseCasualChatState
}
export interface UseChatIPCEvents {
    /** 获取当前执行接口流的唯一标识符 */
    fetchToken: () => string
    /** 获取当前执行接口流的请求参数 */
    fetchRequest: () => AIStartParams | undefined
    /** 开始执行接口流 */
    onStart: (token: string, params: AIInputEvent) => void
    /** 向执行中的接口流主动输入信息 */
    onSend: (token: string, type: "casual" | "task", params: AIInputEvent) => void
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
