import {API} from "@/services/swagger/resposeType"
import {YakitPluginInfo} from "./base"
import {localYakInfo} from "../plugins/pluginsType"

/**
 * @name 插件编辑页-内置的 tags 标签
 */
export const PluginEditorBuiltInTags: string[] = [
    "IOT",
    "主流CMS",
    "中间件",
    "代码研发",
    "功能类型",
    "应用类型",
    "网络设备",
    "大数据平台",
    "数据库服务",
    "虚拟化服务",
    "邮件服务器",
    "集权管控类",
    "主流应用框架",
    "协同办公套件",
    "通用漏洞检测",
    "主流第三方服务",
    "信息收集",
    "数据处理",
    "暴力破解",
    "指纹识别",
    "目录爆破",
    "加解密工具",
    "威胁情报",
    "空间引擎",
    "AI工具"
]

/**
 * @name 插件编辑页面-开关与 tag 的映射关系
 */
export enum PluginSwitchToTag {
    /** @name yak类型额外参数(用于自定义DNSLOG平台)对应tag值 */
    PluginYakDNSLogSwitch = "custom-dnslog-platform",
    /** @name codec类型额外参数(用于HTTP数据包变形)对应tag值 */
    PluginCodecHttpSwitch = "allow-custom-http-packet-mutate",
    /** @name codec类型额外参数(用于数据包右键)对应tag值 */
    PluginCodecContextMenuExecuteSwitch = "allow-custom-context-menu-execute",
    /** @name codec类型额外参数(用于history右键(单选))对应tag值 */
    PluginCodecSingleHistorySwitch = "allow-custom-single-history-mutate",
    /** @name codec类型额外参数(用于history右键(多选))对应tag值 */
    PluginCodecMultipleHistorySwitch = "allow-custom-multiple-history-mutate"
}
/**
 * @name 插件编辑页面-开关 tag 对应的展示内容
 */
export const PluginSwitchTagToContent: Record<PluginSwitchToTag, string> = {
    "custom-dnslog-platform": "用于自定义 DNSLOG 平台",
    "allow-custom-http-packet-mutate": "用于HTTP数据包变形",
    "allow-custom-context-menu-execute": "用于数据包右键",
    "allow-custom-single-history-mutate": "用于history右键(单选)",
    "allow-custom-multiple-history-mutate": "用于history右键(多选)"
}

/**
 * @name yak 类型的开关配置
 */
export const YakTypePluginSwitchs: string[] = [PluginSwitchToTag.PluginYakDNSLogSwitch]
/**
 * @name codec 类型的开关配置
 */
export const CodecTypePluginSwitchs: string[] = [
    PluginSwitchToTag.PluginCodecHttpSwitch,
    PluginSwitchToTag.PluginCodecContextMenuExecuteSwitch,
    PluginSwitchToTag.PluginCodecSingleHistorySwitch,
    PluginSwitchToTag.PluginCodecMultipleHistorySwitch
]

/** @name YakitPluginInfo定义的默认值 */
export const DefaultYakitPluginInfo: YakitPluginInfo = {
    Type: "",
    ScriptName: "",
    Tags: [],
    Content: ""
}
/** @name API.PluginsRequest定义的默认值 */
export const DefaultAPIPluginsRequest: API.PluginsRequest = {
    script_name: ""
}
/** @name localYakInfo定义的默认值 */
export const DefaultGRPCSavePluginRequest: localYakInfo = {
    Type: "",
    ScriptName: "",
    Content: ""
}
