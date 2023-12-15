import {
    SolidYakitPluginIcon,
    SolidPluginYakMitmIcon,
    SolidPluginProtScanIcon,
    SolidSparklesPluginIcon,
    SolidDocumentSearchPluginIcon,
    SolidCollectionPluginIcon,
    SolidCloudpluginIcon,
    SolidPrivatepluginIcon
} from "@/assets/icon/colors"
import {ReactNode} from "react"
import {CodecPluginTemplate} from "../invoker/data/CodecPluginTemplate"
import {MITMPluginTemplate, PortScanPluginTemplate} from "../pluginDebugger/defaultData"
import {SolidFlagIcon, SolidBadgecheckIcon, SolidBanIcon} from "@/assets/icon/solid"
import {TypeSelectOpt} from "./funcTemplateType"

export function GetPluginLanguage(type: string): string {
    return pluginTypeToName[type]?.language || type
}

/** 插件类型对应的详细信息 */
interface PluginTypeInfoProps {
    /** 插件类型名 */
    name: string
    /** 插件类型描述 */
    description: string
    /** 插件类型icon */
    icon: ReactNode
    /** 插件类型展示颜色 */
    color: string
    /** 插件类型默认源码 */
    content: string
    /** 插件类型使用编程语言 */
    language: string
}

/** @name 插件类型对应的详细信息 */
export const pluginTypeToName: Record<string, PluginTypeInfoProps> = {
    yak: {
        name: "Yak 原生插件",
        description: "内置了众多网络安全常用库，可快速编写安全小工具，该原生模块只支持手动调用",
        icon: <SolidYakitPluginIcon />,
        color: "warning",
        content: "yakit.AutoInitYakit()\n\n# Input your code!\n\n",
        language: "yak"
    },
    mitm: {
        name: "Yak-MITM 模块",
        description: "专用于 MITM 模块中的模块，编写 MITM 插件，可以轻松对经过的流量进行修改",
        icon: <SolidPluginYakMitmIcon />,
        color: "blue",
        content: MITMPluginTemplate,
        language: "yak"
    },
    "port-scan": {
        name: "Yak-端口扫描",
        description: "该插件会对目标进行端口扫描，再对扫描的指纹结果做进一步的处理，常用场景先指纹识别，再 Poc 检测",
        icon: <SolidPluginProtScanIcon />,
        color: "success",
        content: PortScanPluginTemplate,
        language: "yak"
    },
    codec: {
        name: "Yak-Codec",
        description: "Yakit 中的编解码模块，可以自定义实现所需要的编解码、加解密",
        icon: <SolidSparklesPluginIcon />,
        color: "purple",
        content: CodecPluginTemplate,
        language: "yak"
    },
    lua: {
        name: "Lua 模块",
        description: "监修中，无法使用",
        icon: <SolidDocumentSearchPluginIcon />,
        color: "bluePurple",
        content: "",
        language: "lua"
    },
    nuclei: {
        name: "Nuclei YamI 模块",
        description: "使用 YakVM 构建了一个沙箱，可以兼容执行 Nuclei DSL ，无感使用 Nuclei 自带的 Yaml 模板",
        icon: <SolidCollectionPluginIcon />,
        color: "cyan",
        content: "# Add your nuclei formatted PoC!",
        language: "yaml"
    }
}
/** @name 类型选择-脚本类型选项信息 */
export const DefaultTypeList: {icon: ReactNode; name: string; description: string; key: string}[] = [
    {...pluginTypeToName["yak"], key: "yak"},
    {...pluginTypeToName["mitm"], key: "mitm"},
    {...pluginTypeToName["port-scan"], key: "port-scan"},
    {...pluginTypeToName["codec"], key: "codec"},
    {...pluginTypeToName["lua"], key: "lua"},
    {...pluginTypeToName["nuclei"], key: "nuclei"}
]

/** @name 插件功能相关-本地缓存数据-键值变量 */
export enum PluginGV {
    /**
     * @name 插件删除是否需要不再提醒的选中状态
     * @description 适用页面:我的插件
     */
    UserPluginRemoveCheck = "user_plugin_remove_check",
    /**
     * @name 插件删除是否需要不再提醒的选中状态
     * @description 适用页面:回收站
     */
    RecyclePluginRemoveCheck = "recycle_plugin_remove_check",
    /**
     * @name 插件删除是否需要不再提醒的选中状态
     * @description 适用页面:本地插件
     */
    LocalPluginRemoveCheck = "local_plugin_remove_check",

    /** @name 插件信息-yak类型额外参数(用于自定义DNSLOG)对应tag值 */
    PluginYakDNSLogSwitch = "custom-dnslog-platform",
    /** @name 插件信息-codec类型额外参数(用于自定义HTTP数据包变形)对应tag值 */
    PluginCodecHttpSwitch = "allow-custom-http-packet-mutate",

    /**
     * @name 本地插件组缓存字段 filter_cache_list_common_data
     * @description 第一版本地插件组还是在本地，第二版后端给接口
     */
    Fetch_Local_Plugin_Group = "FILTER_CACHE_LIST_COMMON_DATA",

    /** @name 审核页左侧筛选条件栏是否关闭 */
    AuditFilterCloseStatus = "audit-filter-close-status",
    /** @name 商店页左侧筛选条件栏是否关闭 */
    StoreFilterCloseStatus = "store-filter-close-status",
    /** @name 我的页左侧筛选条件栏是否关闭 */
    OwnerFilterCloseStatus = "owner-filter-close-status",
    /** @name 本地页左侧筛选条件栏是否关闭 */
    LocalFilterCloseStatus = "local-filter-close-status",
    /**@name 本地插件执行模块,额外参数中,[请求路径]的缓存字段 */
    LocalExecuteExtraPath = "local-execute-extra-path",
}

/** @name 审核状态对应展示名称 */
export const aduitStatusToName: Record<string, {name: string; icon: ReactNode}> = {
    "0": {name: "待审核", icon: <SolidFlagIcon className='aduit-status-flag-color' />},
    "1": {name: "已通过", icon: <SolidBadgecheckIcon className='aduit-status-badge-check-color' />},
    "2": {name: "未通过", icon: <SolidBanIcon className='aduit-status-ban-color' />}
}
/** @name 审核状态选择列表 */
export const DefaultStatusList: TypeSelectOpt[] = [
    {key: "0", ...aduitStatusToName["0"]},
    {key: "1", ...aduitStatusToName["1"]},
    {key: "2", ...aduitStatusToName["2"]}
]

/** @name 公开状态对应展示信息 */
export const publicStatusToInfo: Record<string, {name: string; icon: ReactNode}> = {
    "1": {name: "公开", icon: <SolidCloudpluginIcon />},
    "2": {name: "私密", icon: <SolidPrivatepluginIcon />}
}
/** @name 公开状态选择列表 */
export const DefaultPublicStatusList: TypeSelectOpt[] = [
    {key: "1", ...publicStatusToInfo["1"]},
    {key: "2", ...publicStatusToInfo["2"]}
]
