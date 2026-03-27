import {PaginationSchema} from "@/pages/invoker/schema"
import {AIChatInfo} from "./aiChat"

export interface GrpcPageResponse<T = unknown> {
    Pagination: PaginationSchema
    Data: T
    Total: number
}

/** forge 详情数据字段 */
export interface AIForge {
    Id: number
    ForgeName: string
    // yak type is yak script, config type is empty
    /** yak 类型为脚本代码, config 类型为空 */
    ForgeContent?: string
    // yak, config or skillmd
    ForgeType: "yak" | "config" | "skillmd"
    Description?: string
    // json config for UI
    ParamsUIConfig?: string
    /** @deprecated cli parameters */
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
    /**给用户看的展示名称 */
    ForgeVerboseName?: string
    /** 技能模板目录，仅在编辑详情按需解压时返回 */
    SkillPath?: string
}

/** forge 相关的过滤条件 */
export interface AIForgeFilter {
    /** name 模糊搜索 */
    ForgeName?: string
    ForgeNames?: string[]
    ForgeType?: AIForge["ForgeType"]
    /** 多个字段的内容进行模糊搜索 */
    Keyword?: string
    Tag?: string
    Id?: number
}

/** forge 列表的请求参数 */
export interface QueryAIForgeRequest {
    Pagination: PaginationSchema
    Filter?: AIForgeFilter
}
/** forge 列表的响应数据结构 */
export interface QueryAIForgeResponse {
    Pagination: PaginationSchema
    Data: AIForge[]
    Total: number
}
export interface GetAIForgeRequest {
    ID?: number
    ForgeName?: string
    InflateSkillPath?: boolean
}

export interface AIFocus {
    Name: string
    Description: string
    OutputExamplePrompt: string
    UsagePrompt: string
    VerboseName: string
    VerboseNameZh: string
}
export interface QueryAIFocusRequest {}
export interface QueryAIFocusResponse {
    Data: AIFocus[]
}

export type QueryAISessionResponse = GrpcPageResponse<AIChatInfo[]>

export interface DeleteAISessionFilter {
    /**
     * 会话ID列表
     */
    SessionID?: string[]

    /**
     * 删除该时间戳之后的数据（毫秒时间戳）
     */
    AfterTimestamp?: number

    /**
     * 删除该时间戳之前的数据（毫秒时间戳）
     */
    BeforeTimestamp?: number
}

export interface DeleteAISessionRequest {
    /**
     * 删除过滤条件
     */
    Filter?: DeleteAISessionFilter

    /**
     * 是否删除全部
     */
    DeleteAll?: boolean
}
