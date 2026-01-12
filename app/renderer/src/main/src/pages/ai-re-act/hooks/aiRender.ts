import {StreamResult} from "@/hook/useHoldGRPCStream/useHoldGRPCStreamType"
import {AIAgentGrpcApi, AIInputEvent, AIOutputEvent, AIOutputI18n} from "./grpcApi"
import {AIChatIPCStartParams} from "./type"

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
    /** 工具介绍 */
    toolDescription: string
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
    /** 执行错误相关信息 */
    execError: string
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

/** 插件执行中的文件操作记录 */
export interface AIYakExecFileRecord extends StreamResult.Log {
    /** 前端主动对接口流输出的文件记录进行先后操作的记录 */
    order: number
}

/** 工具执行结果的决策展示数据 */
export interface AIToolCallDecision extends Omit<AIAgentGrpcApi.ToolCallDecision, "i18n"> {
    i18n: AIOutputI18n
}

/** 任务规划-可执行任务的数据结构 */
export interface AITaskInfoProps extends AIAgentGrpcApi.PlanTask {
    /** 层级(代表在树里的第几层) */
    level: number
    /** 是否是叶子任务节点 */
    isLeaf: boolean
}

/** 任务规划-执行崩溃后的错误信息展示 */
export interface FailTaskChatError {
    NodeId: AIOutputEvent["NodeId"]
    NodeIdVerbose: AIOutputEvent["NodeIdVerbose"]
    content: string
}

/** 自由对话崩溃的错误信息 */
export interface FailReactError {
    NodeId: AIOutputEvent["NodeId"]
    NodeIdVerbose: AIOutputEvent["NodeIdVerbose"]
    content: string
}

export enum AIChatQSDataTypeEnum {
    /**用户的自由输入 */
    QUESTION = "question",
    /**日志 */
    LOG = "log",
    /**流 */
    STREAM = "stream",
    /**思考 */
    THOUGHT = "thought",
    /**结果 */
    RESULT = "result",
    /**工具总结 */
    TOOL_RESULT = "tool_result",
    /**计划审阅 */
    PLAN_REVIEW_REQUIRE = "plan_review_require",
    /**任务审阅 */
    TASK_REVIEW_REQUIRE = "task_review_require",
    /**工具审阅 */
    TOOL_USE_REVIEW_REQUIRE = "tool_use_review_require",
    /**AI主动询问 */
    REQUIRE_USER_INTERACTIVE = "require_user_interactive",
    /**智能体/forge审阅 */
    EXEC_AIFORGE_REVIEW_REQUIRE = "exec_aiforge_review_require",
    /**Divider Card */
    TASK_INDEX_NODE = "task_index_node",
    /**工具决策 */
    TOOL_CALL_DECISION = "tool_call_decision",
    /**当前任务规划结束标志 */
    END_PLAN_AND_EXECUTION = "end_plan_and_execution",
    /** 任务规划崩溃的错误信息 */
    FAIL_PLAN_AND_EXECUTION = "fail_plan_and_execution",
    /** ReAct任务崩溃的错误信息 */
    FAIL_REACT = "fail_react_task",
    /** 工具结果 */
    TOOL_CALL_RESULT = "tool_call_result",
    /** 参考资料 */
    Reference_Material = "reference_material"
}

/** 控制UI渲染的数据数组元素 */
export interface ReActChatElement {
    chatType: "reAct" | "task"
    token: string
    type: AIChatQSDataTypeEnum
    /** 触发渲染的次数, 无实际逻辑意义 */
    renderNum: number
}

// #region chat 问答内容组件的类型集合(包括了类型推导)
interface AIChatQSDataBase<T extends string, U> {
    type: T
    data: U
    id: string
    AIService: AIOutputEvent["AIService"]
    AIModelName: AIOutputEvent["AIModelName"]
    Timestamp: AIOutputEvent["Timestamp"]
    /** 前端专属数据，供前端逻辑和UI处理使用 */
    extraValue?: AIChatIPCStartParams["extraValue"]
    /** 参考资料 */
    reference?: AIAgentGrpcApi.ReferenceMaterialPayload[]
}

type ChatQuestion = AIChatQSDataBase<AIChatQSDataTypeEnum.QUESTION, {qs: string; setting: AIInputEvent}>
/** @deprecated 日志类型已无用，迁移成一个新页面 */
type ChatLog = AIChatQSDataBase<AIChatQSDataTypeEnum.LOG, UIAIOutputLog>
export type ChatStream = AIChatQSDataBase<AIChatQSDataTypeEnum.STREAM, AIStreamOutput>
type ChatToolCallResult = AIChatQSDataBase<AIChatQSDataTypeEnum.TOOL_CALL_RESULT, AIStreamOutput>
type ChatThought = AIChatQSDataBase<AIChatQSDataTypeEnum.THOUGHT, string>
type ChatResult = AIChatQSDataBase<AIChatQSDataTypeEnum.RESULT, string>
type ChatToolResult = AIChatQSDataBase<AIChatQSDataTypeEnum.TOOL_RESULT, AIToolResult>
type ChatPlanReviewRequire = AIChatQSDataBase<AIChatQSDataTypeEnum.PLAN_REVIEW_REQUIRE, UIPlanReview>
type ChatTaskReviewRequire = AIChatQSDataBase<AIChatQSDataTypeEnum.TASK_REVIEW_REQUIRE, UITaskReview>
type ChatToolUseReviewRequire = AIChatQSDataBase<AIChatQSDataTypeEnum.TOOL_USE_REVIEW_REQUIRE, UIToolUseReview>
type ChatRequireUserInteractive = AIChatQSDataBase<
    AIChatQSDataTypeEnum.REQUIRE_USER_INTERACTIVE,
    UIRequireUserInteractive
>
type ChatExecAIForgeReview = AIChatQSDataBase<AIChatQSDataTypeEnum.EXEC_AIFORGE_REVIEW_REQUIRE, UIExecAIForgeReview>
type ChatTaskIndexNode = AIChatQSDataBase<AIChatQSDataTypeEnum.TASK_INDEX_NODE, AITaskStartInfo>
export type ChatToolCallDecision = AIChatQSDataBase<AIChatQSDataTypeEnum.TOOL_CALL_DECISION, AIToolCallDecision>
type ChatPlanExecEnd = AIChatQSDataBase<AIChatQSDataTypeEnum.END_PLAN_AND_EXECUTION, string>
type ChatFailPlanAndExecution = AIChatQSDataBase<AIChatQSDataTypeEnum.FAIL_PLAN_AND_EXECUTION, FailTaskChatError>
type ChatFailReact = AIChatQSDataBase<AIChatQSDataTypeEnum.FAIL_REACT, FailReactError>
type ChatReferenceMaterial = AIChatQSDataBase<
    AIChatQSDataTypeEnum.Reference_Material,
    {NodeId: AIOutputEvent["NodeId"]; NodeIdVerbose: AIOutputEvent["NodeIdVerbose"]}
>

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
    | ChatTaskIndexNode
    | ChatToolCallDecision
    | ChatPlanExecEnd
    | ChatFailPlanAndExecution
    | ChatFailReact
    | ChatToolCallResult
    | ChatReferenceMaterial
// #endregion
