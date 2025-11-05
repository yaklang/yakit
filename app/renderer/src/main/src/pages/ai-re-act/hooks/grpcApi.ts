import {HoldGRPCStreamProps, StreamResult} from "@/hook/useHoldGRPCStream/useHoldGRPCStreamType"
import {KVPair} from "@/models/kv"
import {ExecResult} from "@/pages/invoker/schema"
import { AITaskInfoProps } from "./aiRender"

// #region 双工接口请求和响应结构
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

    /** 是否禁用人机交互（AI 可能会主动问人问题）@default true */
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

    /** ollama 本地模型部署可以使用 /nothink 关闭，使用这个选项可以移除 qwen3 的思考模式 @default false */
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
    /** timeline sessionID  用于多轮对话保持上下文 */
    TimelineSessionID?: string
}

/**
 * - SyncType类型:
 *
 *  SYNC_TYPE_PLAN                      = "plan"
 *
 *  SYNC_TYPE_CONSUMPTION               = "consumption"
 *
 *  SYNC_TYPE_PING                      = "ping"
 *
 *  SYNC_TYPE_SET_CONFIG                = "set_config"
 *
 *  SYNC_TYPE_PROCESS_EVENT             = "sync_process_event"
 *
 *  SYNC_TYPE_QUEUE_INFO                = "queue_info"
 *
 *  SYNC_TYPE_TIMELINE                  = "timeline"
 *
 *  SYNC_TYPE_KNOWLEDGE                 = "enhance_knowledge"
 *
 *  SYNC_TYPE_UPDATE_CONFIG             = "update_config"
 *
 *  SYNC_TYPE_MEMORY_CONTEXT            = "memory_sync"
 *
 *  SYNC_TYPE_REACT_CANCEL_CURRENT_TASK = "react_cancel_current_
 *
 *  SYNC_TYPE_REACT_JUMP_QUEUE          = "react_jump_queue"
 *
 *  SYNC_TYPE_REACT_REMOVE_TASK         = "react_remove_task"
 *
 */

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

export interface AIOutputI18n {
    Zh: string
    En: string
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
    IsResult: boolean
    Content: Uint8Array
    Timestamp: number
    // 任务索引
    TaskIndex: string
    /** 是否禁用 markdown 渲染 UI */
    DisableMarkdown: boolean
    /** 是否是同步消息 */
    IsSync: boolean
    /**用于同步消息的 ID */
    SyncID: string
    /** 事件的唯一标识 */
    EventUUID: string
    /** 节点 ID 的展示内容, 包含18n */
    NodeIdVerbose: AIOutputI18n
    /** 内容的类型: markdown / yaklang_code / plain_code / text/plain */
    ContentType: string
    /** 如果是调用工具相关的事件，那么这里是调用的ID */
    CallToolID: string
    /** 如果是 AI 服务相关的事件，那么这里是 AI 服务的名称 */
    AIService: string
}
// #endregion

export declare namespace AIAgentGrpcApi {
    /** 上传/下载 Token 量 */
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

    /** 普通日志 */
    export interface Log {
        /** 等级 */
        level: string
        /** 信息 */
        message: string
    }

    /** 启动任务规划，并通过 coordinator_id 区分流中数据为(自由对话|任务规划) */
    export interface AIStartPlanAndExecution {
        coordinator_id: string
        "re-act_id": string
        "re-act_task": string
    }

    export interface AIChatThought {
        thought: string
    }

    export interface AIChatResult {
        finished: boolean
        result: string
        success: boolean
        timestamp: number
        /** 在流中已经输出显示了如果为 true, 代表不展示 */
        after_stream: boolean
    }

    /** structured|stream-finished 代表一个流式输出已经结束 */
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

    /** review_release 释放消息 */
    export interface ReviewRelease {
        /** review对应的id */
        id: string
        params: any
    }

    /** review 对应的可选项 */
    export interface ReviewSelector {
        id?: string
        value: string
        prompt: string
        prompt_english: string
        allow_extra_prompt: boolean
        allow_params_modification?: boolean
        param_schema: string
    }

    /** 计划内单个任务的详情 */
    export interface PlanTask {
        index: string
        /** 任务名 */
        name: string
        /** 正文 */
        goal: string
        /** 后端发送的任务状态 */
        progress?: string
        subtasks?: AITaskInfoProps[]
        /**评阅时树节点是否被删 */
        isRemove: boolean
        /**关联工具 */
        tools: string[]
        /**工具解释描述 */
        description: string
        /**是否为用户添加的节点 */
        isUserAdd?: boolean
        /** 执行工具的总数 */
        total_tool_call_count: number
        /** 执行工具成功的总数 */
        success_tool_call_count: number
        /** 执行工具失败的总数 */
        fail_tool_call_count: number
        /** 任务执行后的总结 */
        summary: string
    }
    /** 改变任务状态 */
    export interface ChangeTask {
        task: PlanTask
        type: string
    }
    /** 更新任务状态、收集任务总结 */
    export interface UpdateTaskInfo {
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
    /** 任务执行的 prompt */
    export interface TaskLog {
        prompt: string
        step: string
        system: boolean
    }

    /** plan_review_require */
    export interface PlanReviewRequire {
        id: string
        plans: {root_task: PlanTask}
        selectors: ReviewSelector[]
        plans_id: string
    }
    /** plan_task_analysis 计划树中任务的补充解释和工具数据 */
    export interface PlanReviewRequireExtra {
        description: string
        index: string
        keywords: string[]
        plans_id: string
    }

    /** task_review_require */
    export interface TaskReviewRequire {
        id: string
        long_summary: string
        selectors: ReviewSelector[]
        short_summary: string
        task: PlanTask
    }

    /** AI 对 review 数据的风险评估 */
    export interface AIReviewJudgement {
        /** 对应 tool_review 的 id */
        interactive_id: string
        /** review 操作的得分 */
        score?: number
        /** 多少秒后自动执行 review 的 continue 操作 */
        seconds?: number
        /** AI 判断的风险阈值 */
        level?: string
        /** level 字段对应 UI 展示内容(由前端独立赋值) */
        levelLabel?: string
        /** AI 判断使用的意图 */
        reason?: string
    }

    /** tool_use_review_require */
    export interface ToolUseReviewRequire {
        id: string
        params: Record<string, any>
        selectors: ReviewSelector[]
        tool: string
        tool_description: string
        /** 前端自定义字段-展示 ai 评分使用 */
        aiReview?: AIReviewJudgement
    }

    /** exec_aiforge_review_require */
    export interface ExecForgeReview {
        id: string
        forge_name: string
        forge_verbose_name: string
        forge_desc: string
        forge_params: Record<string, any>
        selectors: ReviewSelector[]
        /** 前端自定义字段-展示 ai 评分使用 */
        aiReview?: AIReviewJudgement
    }

    /** AI交互 review 的选项数据 */
    export interface AIRequireOption {
        index: number
        prompt_title: string
        prompt: string
    }
    /** require_user_interactive */
    export interface AIReviewRequire {
        id: string
        prompt: string
        options: AIRequireOption[]
    }

    /** 工具相关信息、执行结果与总结 */
    export interface AIToolCall {
        /** 工具 ID */
        call_tool_id: string
        /** 工具执行状态 */
        status?: string
        /** 工具执行失败原因 */
        error?: string
        /** 工具执行总结(不论成功失败) */
        summary?: string
        /** 工具名和工具描述 */
        tool?: {name?: string; description?: string}
    }
    /** 工具执行时的可选操作(tool_call_watcher) */
    export interface AIToolCallWatcher {
        call_tool_id: string
        /** 选项传递的对应 InteractiveId */
        id: string
        /** 选项列表 */
        selectors: ReviewSelector[]
        tool: string
        tool_description: string
    }

    /** 插件结果输出信息(yak_exec_result) */
    export interface AIPluginExecResult extends Partial<Omit<ExecResult, "Message">> {
        Message: string
    }
    /** 插件结果数据 */
    export interface AICardMessage extends StreamResult.Message {}
    /** 插件结果-卡片数据 */
    export interface AICard extends StreamResult.Card {}
    export interface AICacheCard extends HoldGRPCStreamProps.CacheCard {}
    export interface AIInfoCard extends HoldGRPCStreamProps.InfoCards {}

    /** structured|timeline 类型数据结构 */
    export interface TimelineDumpOpt {
        timestamp: string
        type: string
        content: string
    }
    export interface TimelineDump {
        dump: string
        entries: TimelineDumpOpt[]
        limit: number
        total_entries: number
    }

    /** 文件系统操作相关 */
    export interface FileSystemPin {
        path: string
        timestamp: number
    }

    /** 工具决策总结相关 */
    export interface ToolCallDecision {
        action: string
        call_tool_id: string
        summary: string
        i18n: {zh: string; en: string}
    }
}

// #region AI相关普通接口的请求和定义结构
/** QueryAIEvent 接口请求 */
export interface AIEventQueryRequest {
    ProcessID: string
}
/** QueryAIEvent 接口响应 */
export interface AIEventQueryResponse {
    Events: AIOutputEvent[]
}
// #endregion
