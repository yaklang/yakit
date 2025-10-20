import {StreamResult} from "@/hook/useHoldGRPCStream/useHoldGRPCStreamType"
import {AIAgentGrpcApi, AIOutputEvent} from "./grpcApi"

// #region 基础通用数据字段
interface AIOutputBaseInfo {
    NodeId: AIOutputEvent["NodeId"]
    NodeIdVerbose: AIOutputEvent["NodeIdVerbose"]
}
// #endregion

export type UIAIOutputLog = AIAgentGrpcApi.Log & AIOutputBaseInfo

/** AI Token 消耗量(上传/下载) */
export interface AITokenConsumption {
    [key: string]: AIAgentGrpcApi.Consumption
}

/** 工具流式输出里的可选操作列表 */
export interface ToolStreamSelectors {
    callToolId: string
    InteractiveId: string
    selectors: AIAgentGrpcApi.ReviewSelector[]
}

/** 流式输出的信息内容 */
export interface AIStreamOutput extends AIOutputBaseInfo {
    TaskIndex?: AIOutputEvent["TaskIndex"]
    CallToolID: AIOutputEvent["CallToolID"]
    EventUUID: AIOutputEvent["EventUUID"]
    status: "start" | "end"
    content: string
    ContentType: AIOutputEvent["ContentType"]
    selectors?: ToolStreamSelectors
}

/** 工具结果的信息内容 */
export interface AIToolResult {
    TaskIndex?: AIOutputEvent["TaskIndex"]
    callToolId: string
    /**工具名称 */
    toolName: string
    /**工具执行完成的状态 default是后端没有发送状态type时前端默认值 */
    status: "default" | "success" | "failed" | "user_cancelled"
    /**执行完后的总结 */
    summary: string
    /**tool stdout 内容展示前200个字符 */
    toolStdoutContent: {
        content: string
        /**@deprecated UI展示不显示 */
        isShowAll: boolean
    }
}

/** 任务开始节点的信息 */
export interface AITaskStartInfo {
    taskIndex: string
    taskName: string
}

interface ReviewSelectedOption {
    /** 已操作 review 的选项内容(json 模式) */
    selected?: string
    optionValue?: string
}
/** 对 review 数据进行操作后的记录, 专用于 UI 上的历史展示 */
export type UIPlanReview = AIAgentGrpcApi.PlanReviewRequire &
    ReviewSelectedOption & {taskExtra?: Map<string, AIAgentGrpcApi.PlanReviewRequireExtra>}
export type UITaskReview = AIAgentGrpcApi.TaskReviewRequire & ReviewSelectedOption
export type UIToolUseReview = AIAgentGrpcApi.ToolUseReviewRequire & ReviewSelectedOption
export type UIRequireUserInteractive = AIAgentGrpcApi.AIReviewRequire & ReviewSelectedOption
export type UIExecAIForgeReview = AIAgentGrpcApi.ExecForgeReview & ReviewSelectedOption

export type AIReviewType =
    | UIPlanReview
    | UITaskReview
    | UIToolUseReview
    | UIRequireUserInteractive
    | UIExecAIForgeReview

/** 文件系统操作结构(辅助UI渲染) */
export interface AIFileSystemPin {
    path: string
    isDir: boolean
    name: string
    suffix: string
}

/** 插件执行中的文件操作记录 */
export interface AIYakExecFileRecord extends StreamResult.Log {
    /** 前端主动对接口流输出的文件记录进行先后操作的记录 */
    order: number
}

// #region chat 问答内容组件的类型集合(包括了类型推导)
interface AIChatQSDataBase<T extends string, U> {
    type: T
    data: U
    id: string
    Timestamp: AIOutputEvent["Timestamp"]
}

type ChatQuestion = AIChatQSDataBase<"question", string>
type ChatLog = AIChatQSDataBase<"log", UIAIOutputLog>
type ChatStream = AIChatQSDataBase<"stream", AIStreamOutput>
type ChatThought = AIChatQSDataBase<"thought", string>
type ChatResult = AIChatQSDataBase<"result", string>
type ChatToolResult = AIChatQSDataBase<"tool_result", AIToolResult>
type ChatPlanReviewRequire = AIChatQSDataBase<"plan_review_require", UIPlanReview>
type ChatTaskReviewRequire = AIChatQSDataBase<"task_review_require", UITaskReview>
type ChatToolUseReviewRequire = AIChatQSDataBase<"tool_use_review_require", UIToolUseReview>
type ChatRequireUserInteractive = AIChatQSDataBase<"require_user_interactive", UIRequireUserInteractive>
type ChatExecAIForgeReview = AIChatQSDataBase<"exec_aiforge_review_require", UIExecAIForgeReview>
type ChatFileSystemPin = AIChatQSDataBase<"file_system_pin", AIFileSystemPin>
type ChatTaskIndexNode = AIChatQSDataBase<"task_index_node", AITaskStartInfo>

export type AIChatQSData =
    | ChatQuestion
    | ChatLog
    | ChatStream
    | ChatThought
    | ChatResult
    | ChatToolResult
    | ChatPlanReviewRequire
    | ChatTaskReviewRequire
    | ChatToolUseReviewRequire
    | ChatRequireUserInteractive
    | ChatExecAIForgeReview
    | ChatFileSystemPin
    | ChatTaskIndexNode
// #endregion
