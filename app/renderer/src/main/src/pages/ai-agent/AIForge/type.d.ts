import {PaginationSchema} from "@/pages/invoker/schema"

/** forge 详情数据字段 */
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
}
