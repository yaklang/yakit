import {KVPair} from "@/models/kv"
import {PaginationSchema} from "@/pages/invoker/schema"

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
}

export interface AIInputEvent {
    IsStart?: boolean
    Params?: AIStartParams // 提问问题相关

    IsInteractiveMessage?: boolean // 是否为交互消息(review)
    InteractiveId?: string // id
    InteractiveJSONInput?: string // {suggestion:"continue"}|{suggestion:"adjust_plan",extra_prompt:"xxx"}

    IsSyncMessage?: boolean
    SyncType?: string
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
/** 非 AI 交互型的review 选项 */
export type NoAIChatReviewSelector = Exclude<AIChatReview["data"], AIChatMessage.AIReviewRequire>
/** UI 渲染, 信息流相关信息 */
export interface AIChatStreams {
    type: string
    timestamp: number
    data: {system: string; reason: string; stream: string}
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
    /** 回答 */
    answer?: {
        pressure: AIChatMessage.Pressure[]
        firstCost: AIChatMessage.AICostMS[]
        totalCost: AIChatMessage.AICostMS[]
        consumption: AIChatMessage.Consumption
        plans?: AIChatMessage.PlanTask
        taskList: AIChatMessage.PlanTask[]
        logs: AIChatMessage.Log[]
        streams: Record<string, AIChatStreams[]>
    }
}

export declare namespace AIChatMessage {
    /** 输出 Token */
    export interface Consumption {
        input_consumption: number
        output_consumption: number
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
        /** 前端渲染专属属性, proto 上不存在 */
        state?: "success" | "error" | "wait" | "in-progress"
        subtasks?: PlanTask[]
        /**评阅时树节点是否被删 */
        isRemove: boolean
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
}
// #endregion

// #region AI-Forge
export interface AIForge {
    Id: number
    ForgeName: string
    // yak type is yak script, config type is empty
    /** yak 类型为脚本代码, config 类型为空 */
    ForgeContent?: string
    // yak or config
    ForgeType: "yak" | "config"
    Description?: string
    // json config for UI
    ParamsUIConfig?: string
    // cli parameters
    Params?: string
    // for user preferences
    UserPersistentData?: string
    /** 可选，列表 */
    ToolNames?: string[]
    /** 可选，手输 */
    ToolKeywords?: string[]
    Action?: string
    /** 可选，手输 */
    Tag?: string[]
    // 初始提示语
    InitPrompt?: string
    // 持久化提示语
    PersistentPrompt?: string
    // 计划提示语
    PlanPrompt?: string
    // 结果提示语
    ResultPrompt?: string
}

export interface AIForgeFilter {
    /** name 模糊搜索 */
    ForgeName?: string
    ForgeNames?: string[]
    ForgeType?: AIForge["ForgeType"]
    /** 多个字段的内容进行模糊搜索 */
    Keyword?: string
    Tag?: string
}

export interface QueryAIForgeRequest {
    Pagination: PaginationSchema
    Filter?: AIForgeFilter
}

export interface QueryAIForgeResponse {
    Pagination: PaginationSchema
    Data: AIForge[]
    Total: number
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
}
export interface GetAIToolListRequest {
    Query: string
    ToolName: string
    Pagination: PaginationSchema
    OnlyFavorites: boolean
}
export interface GetAIToolListResponse {
    Tools: AITool[]
    Pagination: PaginationSchema
    Total: number
}
export interface ToggleAIToolFavoriteRequest {
    ToolName: string
}
export interface ToggleAIToolFavoriteResponse {
    IsFavorite: boolean
    Message: string
}
//#endregion
