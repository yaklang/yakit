import {AIAgentGrpcApi, AIOutputEvent} from "./grpcApi"

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
export interface AIStreamOutput {
    NodeId: AIOutputEvent["NodeId"]
    /** NodeId 字段对应 UI 展示内容(由前端独立赋值) */
    NodeLabel: string
    EventUUID: AIOutputEvent["EventUUID"]
    status: "start" | "end"
    content: string
    selectors?: ToolStreamSelectors
    /** 是否禁用 markdown 渲染 */
    DisableMarkdown: AIOutputEvent["DisableMarkdown"]
}

/** 工具结果的信息内容 */
// 原名叫 AIToolData
export interface AIToolResult {
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
        isShowAll: boolean
    }
}

// #region chat-review 相关类型集合(包括了类型推导)
interface AIChatReviewBase<T extends string, U> {
    type: T
    data: U
}

type ChatReviewPlanReviewRequire = AIChatReviewBase<"plan_review_require", AIAgentGrpcApi.PlanReviewRequire>
type ChatReviewTaskReviewRequire = AIChatReviewBase<"task_review_require", AIAgentGrpcApi.TaskReviewRequire>
type ChatReviewToolUseReviewRequire = AIChatReviewBase<"tool_use_review_require", AIAgentGrpcApi.ToolUseReviewRequire>
type ChatReviewRequireUserInteractive = AIChatReviewBase<"require_user_interactive", AIAgentGrpcApi.AIReviewRequire>
type ChatReviewExecAIForgeReview = AIChatReviewBase<"exec_aiforge_review_require", AIAgentGrpcApi.ExecForgeReview>

export type AIChatReview =
    | ChatReviewPlanReviewRequire
    | ChatReviewTaskReviewRequire
    | ChatReviewToolUseReviewRequire
    | ChatReviewRequireUserInteractive
    | ChatReviewExecAIForgeReview
// #endregion

// #region chat 问答内容组件的类型集合(包括了类型推导)
interface AIChatQSDataBase<T extends string, U> extends AIChatReviewBase<T, U> {
    id: string
    Timestamp: AIOutputEvent["Timestamp"]
}

type ChatQuestion = AIChatQSDataBase<"question", string>
type ChatLog = AIChatQSDataBase<"log", AIAgentGrpcApi.Log>
type ChatStream = AIChatQSDataBase<"stream", AIStreamOutput>
type ChatThought = AIChatQSDataBase<"thought", string>
type ChatResult = AIChatQSDataBase<"result", string>
type ChatToolResult = AIChatQSDataBase<"tool_result", AIToolResult>
type ChatToolUseReviewRequire = AIChatQSDataBase<"tool_use_review_require", AIAgentGrpcApi.ToolUseReviewRequire>
type ChatRequireUserInteractive = AIChatQSDataBase<"require_user_interactive", AIAgentGrpcApi.AIReviewRequire>
type ChatExecAIForgeReview = AIChatQSDataBase<"exec_aiforge_review_require", AIAgentGrpcApi.ExecForgeReview>

export type AIChatQSData =
    | ChatQuestion
    | ChatLog
    | ChatStream
    | ChatThought
    | ChatResult
    | ChatToolResult
    | ChatToolUseReviewRequire
    | ChatRequireUserInteractive
    | ChatExecAIForgeReview
// #endregion
