import {AIChatMessage, AIOutputEvent} from "@/pages/ai-agent/type/aiChat"
import {AIAgentGrpcApi} from "./grpcApi"

/** AI Token 消耗量(上传/下载) */
export interface AITokenConsumption {
    [key: string]: AIAgentGrpcApi.Consumption
}

// #region chat 问答内容组件的类型集合(包括了类型推导)
interface AIChatQSDataBase<T extends string, U> {
    id: string
    type: T
    data: U
    Timestamp: AIOutputEvent["Timestamp"]
}

type ChatQuestion = AIChatQSDataBase<"question", string>
type ChatStream = AIChatQSDataBase<"stream", AIChatMessage.AIStreamOutput>
type ChatThought = AIChatQSDataBase<"thought", string>
type ChatResult = AIChatQSDataBase<"result", string>
type ChatToolResult = AIChatQSDataBase<"tool_result", AIChatMessage.AIChatToolResult>
type ChatToolUseReviewRequire = AIChatQSDataBase<"tool_use_review_require", AIChatMessage.ToolUseReviewRequire>
type ChatRequireUserInteractive = AIChatQSDataBase<"require_user_interactive", AIChatMessage.AIReviewRequire>
type ChatExecAIForgeReview = AIChatQSDataBase<"exec_aiforge_review_require", AIChatMessage.ExecForgeReview>

export type AIChatQSData =
    | ChatQuestion
    | ChatStream
    | ChatThought
    | ChatResult
    | ChatToolResult
    | ChatToolUseReviewRequire
    | ChatRequireUserInteractive
    | ChatExecAIForgeReview
// #endregion
