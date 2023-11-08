import {API} from "@/services/swagger/resposeType"

/** ---------- 前端插件数据结构定义 start ---------- */
/** 插件类型信息 */
export interface PluginTypeParamProps {
    /** 插件脚本类型 */
    Type: string
    /** 插件种类类型(漏洞|其他) */
    Kind: string
}
/** 插件基础信息 */
export interface PluginBaseParamProps {
    /** 插件名称 */
    ScriptName: string
    /** 插件描述 */
    Help?: string
    /** 漏洞类型 */
    RiskType?: string
    /** 漏洞类型详情 */
    RiskDetail?: QueryYakScriptRiskDetailByCWEResponse
    /** 漏洞补充说明 */
    RiskAnnotation?: string
    /** 插件tags */
    Tags?: string[]
}
/** 插件配置信息 */
export interface PluginSettingParamProps {
    /** 参数列表 */
    Params: PluginParamDataProps[]
    /** 是否启用插件联动 */
    EnablePluginSelector?: boolean
    /** 联动插件类型 */
    PluginSelectorTypes?: string
    /** 源码 */
    Content: string
}
/** 插件参数详细信息 */
export interface PluginParamDataProps extends Omit<YakParamProps, "ExtraSetting"> {
    /** 类型附带额外参数 */
    ExtraSetting?: PluginParamDataSelectProps
}
export interface PluginParamDataSelectProps {
    double?: boolean
    data: {label: string; value: string}[]
}
/** 可编辑插件配置数据 */
export interface PluginDataProps {
    ScriptName: string
    Type: string
    Kind: string
    Help?: string
    /** 漏洞类型 */
    RiskType?: string
    /** 漏洞类型详情 */
    RiskDetail?: QueryYakScriptRiskDetailByCWEResponse
    /** 漏洞补充说明 */
    RiskAnnotation?: string
    Tags?: string
    Params?: YakParamProps[]
    EnablePluginSelector?: boolean
    PluginSelectorTypes?: string
    Content: string
    /** 修改插件的原因 */
    modifyDescription?: string
}

/** ---------- grpc插件数据结构定义 start ---------- */
/** 漏洞类型的描述和修复建议 */
export interface QueryYakScriptRiskDetailByCWEResponse {
    Id: string
    CWEName: string
    Description: string
    CWESolution: string
}
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
    /** 值 */
    Value?: any
}
/** 本地插件信息 */
export interface localYakInfo {
    ScriptName: string
    Content: string
    Type: string
    Help?: string
    RiskType?: string
    RiskDetail?: QueryYakScriptRiskDetailByCWEResponse
    RiskAnnotation?: string
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
}
