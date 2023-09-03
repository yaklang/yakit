/** ---------- 插件列表相关 start ---------- */
/** 插件通用过滤条件 */
export interface PluginFilterParams {
    /** 插件类型 */
    type?: string[]
    /** 审核状态 */
    status?: string[]
    /** 标签 */
    tags?: string[]
    /** 插件组 */
    groups?: string[]
    /** 插件状态(公开/私密) */
    state?: string[]
}
/** 插件搜索条件 */
export interface PluginSearchParams {
    /** 关键词 */
    keyword: string
    /** 用户名 */
    userName: string
}
/** 插件列表页码条件 */
export interface PluginListPageMeta {
    page: number
    limit: number
}

/** ---------- 插件详细信息 start ---------- */
/** 插件类型信息 */
export interface PluginTypeParamProps {
    /** 插件脚本类型 */
    type: string
    /** 插件种类类型(漏洞|其他) */
    kind: string
}
/** 插件基础信息 */
export interface PluginBaseParamProps {
    /** 插件名称 */
    name: string
    /** 插件描述 */
    help?: string
    /** 漏洞类型 */
    bug?: string
    /** 漏洞描述 */
    bugHelp?: string
    /** 修复建议 */
    bugFix?: string
    /** 漏洞补充说明 */
    commnt?: string
    /** 插件tags */
    tags?: string[]
}
/** 插件配置信息 */
export interface PluginSettingParamProps {
    /** 参数列表 */
    params: PluginParamDataProps[]
    /** 是否启用插件联动 */
    EnablePluginSelector?: boolean
    /** 联动插件类型 */
    PluginSelectorTypes?: string
    /** 源码 */
    content: string
}

/** ---------- 插件参数详细信息 start ---------- */
export interface PluginParamDataProps {
    /** 参数名 */
    value: string
    /** 参数展示名 */
    label?: string
    /** 是否必填 */
    required?: boolean
    /** 参数类型 */
    type?: string
    /** 默认值 */
    defaultValue?: string
    /** 类型附带额外参数 */
    ExtraSetting?: PluginParamDataSelectProps
    /** 帮助信息 */
    help?: string
    /** 参数组(非必填时选项) */
    group?: string
}
export interface PluginParamDataSelectProps {
    double?: boolean
    data: {label: string; value: string}[]
}
