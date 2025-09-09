import {YakitSelectProps} from "@/components/yakitUI/YakitSelect/YakitSelectType"
import {StreamResult, HoldGRPCStreamProps} from "@/hook/useHoldGRPCStream/useHoldGRPCStreamType"
import {KVPair} from "@/models/kv"
import {ExecResult, PaginationSchema} from "@/pages/invoker/schema"
import {ThirdPartyApplicationConfig} from "@/components/configNetwork/ConfigNetworkPage"
import {UseCasualChatState, UseChatIPCState, UseTaskChatState} from "@/pages/ai-re-act/hooks/type"
// #region AI-(Task|Triage)
export interface McpConfig {
    Type: string
    Key: string
    Url: string
}
export interface AIStartParams {
    CoordinatorId?: string
    Sequence?: number

    McpServers?: McpConfig[]

    /** 问题 */
    UserQuery: string
    /** 是否允许使用文件系统工具权限 @default true */
    EnableSystemFileSystemOperator?: boolean
    /** 是否使用系统默认ai配置 @default true */
    UseDefaultAIConfig?: boolean

    /** AI 模板名 */
    ForgeName?: string
    /** 模板参数 */
    ForgeParams?: KVPair[]

    /** 是否禁用人机交互（AI 可能会主动问人问题）@default false */
    DisallowRequireForUserPrompt?: boolean

    /**
     * - Review 政策
     * - 一般来说，如果 Review Handler 被 Forge 接管了，这个就不应该可以设置。
     * - 普通的 Forge 并不会设置 Review 政策
     * - ReviewPolicy 可选的选项如下：
     * - 1. manual (全手动，大事小事所有的事情都由人来决策)
     * - 2. yolo (全自动，所有的事情，都直接执行，无需参与 - 效果差，危险程度高)
     * - 3. ai (AI 来进行初步决策，如果AI觉得风险程度比较高，则转交给人)
     * @default manual
     */
    ReviewPolicy?: "manual" | "yolo" | "ai"

    /**
     * - 如果 Review 交给 AI 来做的话，那么就会涉及到一个风险打分
     * - AIReviewRiskControlScore 就是低于这个分数，AI 自动同意。
     * - 如果高于这个分数，转成手动。
     */
    AIReviewRiskControlScore?: number

    /** 禁用任何外部工具，这就是一个纯聊天机器了 @default false */
    DisableToolUse?: boolean

    /** 默认是3，一般是说如果远端AI不稳定（网络原因）的时候，某一次对话重试几次？ @default 3 */
    AICallAutoRetry?: number

    /** 默认5，AI如果回答质量不高的时候，调大AITransactionRetry可以有效重试回答 @default 5 */
    AITransactionRetry?: number

    /** 是否启用AI搜索本地工具的功能 @default true */
    EnableAISearchTool?: boolean

    /** 是否启用AI搜索互联网搜索引擎的功能 @default false */
    EnableAISearchInternet?: boolean

    /** 建议工具名 */
    IncludeSuggestedToolNames?: string[]
    /** 建议工具关键词 */
    IncludeSuggestedToolKeywords?: string[]
    /** 禁用工具名 */
    ExcludeToolNames?: string[]

    /** ollama 本地模型部署可以使用 /nothink 关闭，使用这个选项可以移除 qwen3 的思考模式 */
    EnableQwenNoThinkMode?: boolean

    /** 在任务规划的时候，AI 是否被允许主动问用户问题 @default true */
    AllowPlanUserInteract?: boolean

    /** 在任务规划的时候，如果AI允许问用户问题，那么最多问几次 @default 3 */
    PlanUserInteractMaxCount?: number

    /** 是否允许生成报告，默认不允许 */
    AllowGenerateReport?: boolean
    /**选择 AI 服务 */
    AIService?: string
    ReActMaxIteration?: number
    /** 时间线上下文限制（默认100） */
    TimelineItemLimit?: number
    /** 时间线上下文大小（20*1024） */
    TimelineContentSizeLimit?: number
    /** 用户交互的最大次数限制,超过这个次数，AI 将不再被允许问用户问题 */
    UserInteractLimit?: number
}

export interface AIInputEvent {
    IsStart?: boolean
    Params?: AIStartParams // 提问问题相关

    IsInteractiveMessage?: boolean // 是否为交互消息(review)
    InteractiveId?: string // id
    InteractiveJSONInput?: string // {suggestion:"continue"}|{suggestion:"adjust_plan",extra_prompt:"xxx"}

    IsSyncMessage?: boolean
    SyncType?: string
    SyncJsonInput?: string

    IsFreeInput?: boolean
    FreeInput?: string // 自由输入的文本
}

export interface AITriageInputEvent {
    IsStart?: boolean
    Params?: AIStartParams // 上下文AI配置

    IsInteractiveMessage?: boolean // 暂无用
    InteractiveId?: string // 暂无用
    InteractiveJSONInput?: string // 暂无用

    IsFreeInput?: boolean
    FreeInput?: string
}

export interface AIOutputEvent {
    CoordinatorId: string
    Type: string
    NodeId: string
    // 系统输出
    IsSystem: boolean
    // AI正常输出
    IsStream: boolean
    // AI思考输出
    IsReason: boolean
    StreamDelta: Uint8Array
    IsJson: boolean
    Content: Uint8Array
    Timestamp: number
    // 任务索引
    TaskIndex: string
    /** 是否是同步消息 */
    IsSync: boolean
    /**用于同步消息的 ID */
    SyncID: string
    /** 事件的唯一标识 */
    EventUUID: string
}

/** UI 渲染, Review相关信息 */
export interface AIChatReview {
    type: "plan_review_require" | "tool_use_review_require" | "task_review_require" | "require_user_interactive"
    data:
        | AIChatMessage.PlanReviewRequire
        | AIChatMessage.ToolUseReviewRequire
        | AIChatMessage.TaskReviewRequire
        | AIChatMessage.AIReviewRequire
}

export interface AIChatReviewExtra {
    type: "plan_task_analysis"
    data: AIChatMessage.PlanReviewRequireExtra
}

/** 非 AI 交互型的review 选项 */
export type NoAIChatReviewSelector = Exclude<AIChatReview["data"], AIChatMessage.AIReviewRequire>
/** UI 渲染, 信息流相关信息 */
export interface AIChatStreams {
    nodeId: string
    timestamp: number
    data: {
        system: string
        reason: string
        stream: string
    }
    /**工具相关输出数据聚合 */
    toolAggregation?: AIChatMessage.AIToolData
}

/** UI-chat 信息 */
export interface AIChatInfo {
    /** 唯一标识 */
    id: string
    /** 对话名称 */
    name: string
    /** 对话问题 */
    question: string
    /** 时间 */
    time: number
    /** 请求参数 */
    request: AIStartParams
    /** 回答 */
    answer?: {
        /**@deprecated */
        pressure: AIChatMessage.Pressure[]
        /**@deprecated */
        firstCost: AIChatMessage.AICostMS[]
        /**@deprecated */
        totalCost: AIChatMessage.AICostMS[]
        /**@deprecated */
        consumption: Record<string, AIChatMessage.Consumption>
        /**@deprecated */
        plans?: AIChatMessage.PlanTask
        /**@deprecated */
        taskList: AIChatMessage.PlanTask[]
        /**@deprecated */
        logs: AIChatMessage.Log[]
        /**@deprecated */
        streams: Record<string, AIChatStreams[]>
        /**@deprecated */
        systemOutputs: AIChatMessage.AIChatSystemOutput[]

        aiPerfData: UseChatIPCState["aiPerfData"]
        logs: UseChatIPCState["logs"]
        casualChat: UseChatIPCState["casualChat"]
        taskChat: UseChatIPCState["taskChat"]
    }
}
/**QueryAIEvent 接口请求 */
export interface AIEventQueryRequest {
    ProcessID: string
}
/**QueryAIEvent 接口返回 */
export interface AIEventQueryResponse {
    Events: AIOutputEvent[]
}
export declare namespace AIChatMessage {
    /** 输出 Token */
    export interface Consumption {
        input_consumption: number
        output_consumption: number
        consumption_uuid: string
    }

    /** 上下文压力 */
    export interface Pressure {
        current_cost_token_size: number
        pressure_token_size: number
        timestamp: number
    }

    /**  (首字符响应|总对话)耗时 */
    export interface AICostMS {
        ms: number
        second: number
        timestamp: number
    }

    /** 审阅自动执行后的通知 */
    export interface ReviewRelease {
        id: string
        params: any
    }

    /** 日志 */
    export interface Log {
        id: string
        level: string
        message: string
    }

    /** 计划 */
    export interface PlanTask {
        index: string
        /** 任务名 */
        name: string
        /** 正文 */
        goal: string
        /** 后端发送的任务状态 */
        progress?: string
        subtasks?: PlanTask[]
        /**评阅时树节点是否被删 */
        isRemove: boolean
        /**关联工具 */
        tools: string[]
        /**工具解释描述 */
        description: string
        /**是否为用户添加的节点 */
        isUserAdd?: boolean
    }
    /** 计划审阅选项 */
    export interface ReviewSelector {
        id?: string
        value: string
        prompt: string
        prompt_english: string
        allow_extra_prompt: boolean
        allow_params_modification?: boolean
        param_schema: string
    }
    /** 计划审阅请求 */
    export interface PlanReviewRequire {
        id: string
        plans: {root_task: PlanTask}
        selectors: ReviewSelector[]
        plans_id: string
    }

    /** 计划审阅请求 root_task中得补充解释和工具数据 */
    export interface PlanReviewRequireExtra {
        description: string
        index: string
        keywords: string[]
        plans_id: string
    }

    /** 改变计划 */
    export interface ChangeTask {
        task: PlanTask
        type: string
    }
    /** 更新计划状态 */
    export interface UpdateTask {
        task: {
            executed: boolean
            executing: boolean
            goal: string
            long_summary: string
            name: string
            summary: string
        }
        type: string
    }

    /** 执行任务日志 */
    export interface TaskLog {
        prompt: string
        step: string
        system: boolean
    }

    /** 工具审阅请求 */
    export interface ToolUseReviewRequire {
        id: string
        params: Record<string, any>
        selectors: ReviewSelector[]
        tool: string
        tool_description: string
    }

    /** 任务审阅请求 */
    export interface TaskReviewRequire {
        id: string
        long_summary: string
        selectors: ReviewSelector[]
        short_summary: string
        task: PlanTask
    }

    /** AI交互审阅请求的选项 */
    export interface AIRequireOption {
        index: number
        prompt_title: string
        prompt: string
    }

    /** AI交互审阅请求 */
    export interface AIReviewRequire {
        id: string
        prompt: string
        options: AIRequireOption[]
    }

    /**AI工具聚合数据 前端使用 */
    export interface AIToolData {
        callToolId: string
        /**工具名称 */
        toolName: string
        /**工具执行完成的状态 default是后端没有发送状态type时前端默认值 */
        status: "default" | "success" | "failed" | "user_cancelled"
        /**执行完后的总结 */
        summary: string
        /**总结的时间 */
        time: number
        /**ai工具按钮 */
        selectors: ReviewSelector[]
        /**出现ai工具按钮后，按钮功能发送信息的时候需要的id */
        interactiveId: string
        /**tool stdout 内容展示前200个字符 */
        toolStdoutContent: {
            content: string
            isShowAll: boolean
        }
    }
    /**AI工具 接口返回的JSON结构 */
    export interface AIToolCall {
        call_tool_id: string
        tool_name?: string
        status?: string
        summary?: string
        tool?: {name?: string; description?: string}
    }

    /**AI工具 tool_call_watcher 返回的数据接口 */
    export interface AIToolCallWatcher {
        call_tool_id: string
        id: string
        selectors: ReviewSelector[]
        tool: string
        tool_description: string
    }
    export interface AIPluginExecResult extends Partial<Omit<ExecResult, "Message">> {
        Message: string
    }
    export interface AICard extends StreamResult.Card {}
    export interface AICardMessage extends StreamResult.Message {}
    export interface AICacheCard extends HoldGRPCStreamProps.CacheCard {}
    export interface AIInfoCard extends HoldGRPCStreamProps.InfoCards {}

    /** UI 渲染, 系统输出相关信息 */
    export interface AIChatSystemOutput {
        nodeId: string
        timestamp: number
        data: string
        type: "ai" | "user"
    }

    export interface AIStreamOutput {
        NodeId: AIOutputEvent["NodeId"]
        EventUUID: AIOutputEvent["EventUUID"]
        status: "start" | "end"
        stream: {
            system: string
            reason: string
            stream: string
        }
        toolAggregation?: AIChatMessage.AIToolData
    }
    export interface AIStreamFinished {
        coordinator_id: string
        duration_ms: number
        event_writer_id: string
        is_reason: boolean
        is_system: boolean
        node_id: string
        start_timestamp: number
        task_index: string
    }

    export interface AITaskStreamOutput extends AIStreamOutput {
        timestamp: number
    }

    export interface AIChatThought {
        thought: string
        timestamp: number
    }
    export interface AIChatResult {
        finished: boolean
        result: string
        success: boolean
        timestamp: number
    }

    export interface AIChatToolResult {
        NodeId: AIOutputEvent["NodeId"]
        toolAggregation: AIChatMessage.AIToolData
    }

    /** 表示启动了任务规划流程，并通过coordinator_id字段标识属于任务规划的流信息 */
    export interface AIStartPlanAndExecution {
        coordinator_id: string
        "re-act_id": string
        "re-act_task": string
    }

    /** 自由对话的问答数据信息 */
    export interface AICasualChatQAStream {
        id: string
        type: "answer" | "question"
        /**
         * - stream 流式输出 [AIStreamOutput]
         * - thought 自由问题思考 [string]
         * - result 问题结果 [string]
         * - toolResult 工具执行经过 [AIChatToolResult]
         * - tool_use_review_require 工具 review [ToolUseReviewRequire]
         * - require_user_interactive AI 人机交互review [AIReviewRequire]
         */
        uiType: "stream" | "thought" | "result" | "toolResult" | "tool_use_review_require" | "require_user_interactive"
        Timestamp: AIOutputEvent["Timestamp"]
        data: AIStreamOutput | string | AIChatToolResult | ToolUseReviewRequire | AIReviewRequire
    }
}
/**@deprecated */
export declare namespace AIReActChatMessage {
    export interface AIReActChatItem extends Omit<AIChatInfo, "answer"> {
        /** 回答 */
        answer?: {
            aiPerfData: {
                consumption: Record<string, AIChatMessage.Consumption>
                pressure: AIChatMessage.Pressure[]
                firstCost: AIChatMessage.AICostMS[]
                totalCost: AIChatMessage.AICostMS[]
            }
            logs: AIChatMessage.Log[]
            casualChat: {contents: AIChatMessage.AICasualChatQAStream[]}
        }
    }
}
// #endregion

//#region ai tool
export interface AITool {
    Name: string
    Description: string
    Content: string
    ToolPath: string
    Keywords: string[]
    IsFavorite: boolean
    ID: number
}
export interface GetAIToolListRequest {
    Query: string
    ToolName: string
    Pagination: PaginationSchema
    OnlyFavorites: boolean
    ToolID?: number
}
export interface GetAIToolListResponse {
    Tools: AITool[]
    Pagination: PaginationSchema
    Total: number
}
export interface ToggleAIToolFavoriteRequest {
    /**@deprecated */
    ToolName?: string
    ID: number
}
export interface ToggleAIToolFavoriteResponse {
    IsFavorite: boolean
    Message: string
}
export interface SaveAIToolRequest {
    Name: string
    Description: string
    Content: string
    ToolPath: string
    Keywords: string[]
}
export interface SaveAIToolV2Response {
    IsSuccess: boolean
    Message: string
    AITool: AITool
}
export interface UpdateAIToolRequest extends SaveAIToolRequest {
    ID: number
}
export interface DeleteAIToolRequest {
    /**@deprecated */
    ToolNames?: string
    IDs: number[]
}
export interface AIToolGenerateMetadataRequest {
    ToolName: string
    Content: string
}
export interface AIToolGenerateMetadataResponse {
    Name: string
    Description: string
    Keywords: string[]
}
//#endregion
//#region  ai model
export interface GeneralResponse {
    Ok: boolean
    Reason: string
}
export interface LocalModelConfig {
    Name: string
    Type: string
    FileName: string
    DownloadURL: string
    Description: string
    DefaultPort: number
    IsReady: boolean
    IsLocal: boolean
    Path: string
    Status: LocalModelStatus | null
}

export interface LocalModelStatus {
    Status: "stopped" | "starting" | "running" | "stopping" | "error"
    Host: string
    Port: number
    Model: string
    ModelPath: string
    LlamaServerPath: string
    ContextSize: number
    ContBatching: boolean
    BatchSize: number
    Threads: number
    Detached: boolean
    Debug: boolean
    Pooling: string
    StartupTimeout: number
    Args: string[]
}

export interface GetSupportedLocalModelsResponse {
    Models: LocalModelConfig[]
}
export interface IsLlamaServerReadyResponse extends GeneralResponse {}
export interface InstallLlamaServerRequest {
    Proxy: string
    token: string
}
export interface DownloadLocalModelRequest {
    ModelName: string
    Proxy: string
    token: string
}
export interface IsLocalModelReadyRequest {
    ModelName: string
}
export interface IsLocalModelReadyResponse extends GeneralResponse {}
export interface StartLocalModelRequest {
    token: string
    ModelName: string
    Host: string
    Port: number
}

export interface StopLocalModelRequest {
    ModelName: string
}

export interface AddLocalModelRequest {
    Name: string
    ModelType: string
    Description: string
    Path: string
}

export interface DeleteLocalModelRequest {
    Name: string
    DeleteSourceFile: boolean
}

export interface UpdateLocalModelRequest extends AddLocalModelRequest {}

export interface GetAllStartedLocalModelsResponse {
    Models: StartedLocalModelInfo[]
}
export interface StartedLocalModelInfo {
    Name: string
    ModelType: string
    Host: string
    Port: number
}
export interface ClearAllModelsRequest {
    DeleteSourceFile: boolean
}
export interface GetAIModelListResponse {
    onlineModels: ThirdPartyApplicationConfig[]
    localModels: StartedLocalModelInfo[]
}
//#endregion
