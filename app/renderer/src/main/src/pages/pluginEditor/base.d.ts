import {YakParamProps, YakRiskInfoProps} from "../plugins/pluginsType"
import {TextareaForImage} from "./pluginImageTextarea/PluginImageTextareaType"

/** @name 获取插件信息的关键参数(前端逻辑专属) */
export interface KeyParamsFetchPluginDetail {
    id: number
    uuid: string
    name: string
}

/** @name 插件基础信息(前端逻辑专属) */
export interface YakitPluginBaseInfo {
    /** 插件类型 */
    Type: string
    /** 插件名称 */
    ScriptName: string
    /** 插件描述 */
    Help?: string
    /** 插件tags */
    Tags: string[]
    /** 是否激活插件联动 */
    EnablePluginSelector?: boolean
    /** 插件联动类型 */
    PluginSelectorTypes?: string[]
}

/** @name 插件全部信息(前端逻辑专属使用) */
export interface YakitPluginInfo extends YakitPluginBaseInfo {
    Id?: string
    Content: string
    /** 漏洞类型详情 */
    RiskDetail?: YakRiskInfoProps[]
    /** 参数信息 */
    Params?: YakParamProps[]
    /** 全局变量 */
    PluginEnvKey?: string[]
}

/** @name 插件补充资料 */
export interface YakitPluginSupplement {
    text: string
    imgs: TextareaForImage[]
    fileInfo: {url: string; fileName: string}
}
