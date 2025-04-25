export interface McpConfig {
    Type: string
    Key: string
    Url: string
}

export interface AIStartParams {
    McpServers?: McpConfig[]

    UserQuery: string
    /** allow ai to use the fs */
    EnableSystemFileSystemOperator?: boolean
    UseDefaultAIConfig?: boolean
}
export interface AIInputEvent {
    IsStart?: boolean
    Params?: AIStartParams // 提问问题相关

    IsInteractiveMessage?: boolean // 是否为交互消息(review)
    InteractiveId?: string // id
    InteractiveJSONInput?: string // {suggestion:"continue"}|{suggestion:"adjust_plan",extra_prompt:"xxx"}
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
}

/** UI 渲染, 计划相关信息 */
export interface AIChatReview {
    type: "plan_review_require" | "tool_use_review_require" | "task_review_require"
    data: AIChatMessage.PlanReviewRequire | AIChatMessage.ToolUseReviewRequire | AIChatMessage.TaskReviewRequire
}
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
        consumption: AIChatMessage.Consumption
        logs: AIChatMessage.Log[]
        plan: AIChatMessage.PlanTask | undefined
        review: AIChatReview | undefined
        streams: AIChatStreams[]
    }
}

export declare namespace AIChatMessage {
    /** 输出 Token */
    export interface Consumption {
        input_consumption: number
        output_consumption: number
    }

    /** 日志 */
    export interface Log {
        level: string
        message: string
    }

    /** 计划 */
    export interface PlanTask {
        name: string
        goal: string
        /** 前端渲染专属属性, proto 上不存在 */
        state?: "exec" | "end" | "error" | ""
        subtasks?: PlanTask[]
    }
    /** 计划审阅选项 */
    export interface ReviewSelector {
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
}
