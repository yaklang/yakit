import {API} from "@/services/swagger/resposeType"
import {GRPCRange} from "./funcTemplateType"
import {YaklangInformation} from "@/utils/monacoSpec/yakEditor"

/** ---------- 前端插件数据结构定义 Start ---------- */
/** 插件基础信息 */
export interface PluginBaseParamProps {
    /** 插件名称 */
    ScriptName: string
    /** 插件描述 */
    Help?: string
    /** 漏洞类型详情 */
    RiskDetail?: YakRiskInfoProps[]
    /** 插件tags */
    Tags?: string[]
}

/** 插件配置信息 */
export interface PluginSettingParamProps {
    /** 是否启用插件联动 */
    EnablePluginSelector?: boolean
    /** 联动插件类型 */
    PluginSelectorTypes?: string
    /** 源码 */
    Content: string
}

/** 插件参数-下拉框-配置数据 */
export interface PluginParamDataSelectProps {
    double?: boolean
    data: {label: string; value: string}[]
}
/** 插件参数-编辑器-配置数据 */
export interface PluginParamDataEditorProps {
    language?: string
}

/** 可编辑插件配置数据 */
export interface PluginDataProps {
    ScriptName: string
    Type: string
    Help?: string
    /** 漏洞类型详情 */
    RiskDetail?: YakRiskInfoProps[]
    Tags?: string
    Params?: YakParamProps[]
    EnablePluginSelector?: boolean
    PluginSelectorTypes?: string
    Content: string
    /** 环境变量 */
    PluginEnvKey?: string[]
    /** 修改插件的原因 */
    modifyDescription?: string
}
/** ---------- 前端插件数据结构定义 End ---------- */

/** ---------- grpc插件数据结构定义 Start ---------- */
/** 插件参数配置数据 */
export interface YakParamProps {
    /** 参数名 */
    Field: string
    /** 参数展示名 */
    FieldVerbose: string
    /** 是否必填 */
    Required?: boolean
    /** 参数类型 */
    TypeVerbose: string
    /** 默认值 */
    DefaultValue: string
    /** 类型附带额外参数 */
    ExtraSetting?: string
    /** 帮助信息 */
    Help: string
    /** 参数组(非必填时选项) */
    Group?: string
    /** 后端自定义内容 */
    MethodType?: string
    JsonSchema?: string
    UISchema?: string
    /** 值 */
    Value?: any
    /** 建议表达式 */
    SuggestionDataExpression?: string

    /** 是否开启缓存(动态表单upload-folder-path:目前由前端决定) */
    cacheRef?: any
    cacheHistoryDataKey?: string
}

/** 本地插件信息 */
export interface localYakInfo {
    Id?: number

    ScriptName: string
    Content: string
    Type: string
    Help?: string
    RiskInfo?: YakRiskInfoProps[]
    Tags?: string
    Params?: YakParamProps[]
    EnablePluginSelector?: boolean
    PluginSelectorTypes?: string

    Level?: string
    IsHistory?: boolean
    IsIgnore?: boolean
    IsGeneralModule?: boolean
    GeneralModuleVerbose?: string
    GeneralModuleKey?: string
    FromGit?: string
    IsCorePlugin?: boolean

    /** 环境变量 */
    PluginEnvKey?: string[]
}
/** ---------- grpc插件数据结构定义 End ---------- */

/** 源码转换为参数和风险信息(request) */
export interface CodeToInfoRequestProps {
    YakScriptType: string
    YakScriptCode: string
    Range?: GRPCRange
}

/** 风险信息 */
export interface YakRiskInfoProps {
    Level: string
    TypeVerbose: string
    CVE: string
    Description: string
    Solution: string
}

/** 源码转换为参数和风险信息(response) */
export interface CodeToInfoResponseProps {
    Information: YaklangInformation[]
    CliParameter: YakParamProps[]
    RiskInfo: YakRiskInfoProps[]
    Tags: string[]
    PluginEnvKey: string[]
}
