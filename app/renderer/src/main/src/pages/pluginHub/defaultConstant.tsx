import {ReactNode} from "react"
import {PluginSourceType} from "./type"
import {
    OutlineAdjustmentsIcon,
    OutlineLocalPluginIcon,
    OutlineOnlinePluginIcon,
    OutlineOwnPluginIcon,
    OutlineTrashSecondIcon
} from "@/assets/icon/outline"
import {YakScript} from "../invoker/schema"
import {YakitPluginOnlineDetail} from "../plugins/online/PluginsOnlineType"
import {ExportYakScriptStreamRequest} from "../plugins/local/PluginsLocalType"
import {defaultFilter, defaultSearch} from "../plugins/builtInData"
import {convertLocalPluginsRequestParams} from "../plugins/utils"

export const HubSideBarList: {key: PluginSourceType; title: string; icon: ReactNode; hint: string}[] = [
    {key: "online", title: "插件商店", icon: <OutlineOnlinePluginIcon />, hint: "插件商店"},
    {key: "own", title: "我的", icon: <OutlineOwnPluginIcon />, hint: "我的插件"},
    {key: "local", title: "本地", icon: <OutlineLocalPluginIcon />, hint: "本地插件"},
    {key: "setting", title: "配置", icon: <OutlineAdjustmentsIcon />, hint: "配置"},
    {key: "recycle", title: "回收站", icon: <OutlineTrashSecondIcon />, hint: "回收站"}
]

/** @name 插件导出-默认参数 */
export const DefaultExportRequest: ExportYakScriptStreamRequest = {
    OutputFilename: "",
    Password: "",
    Filter: {
        ...convertLocalPluginsRequestParams({
            filter: defaultFilter,
            search: defaultSearch
        })
    }
}

/** @name 插件相关操作提示语 */
export const PluginOperateHint: Record<string, string> = {
    /** 删除本地插件提示语 */
    delLocal: "确认删除后，插件将彻底删除",
    /** 删除我的插件提示语 */
    delOnline: "确认删除插件后，插件将会放在回收站",
    /** 删除回收站插件提示语 */
    delRecycle: "确认后插件将彻底删除，无法找回",
    /** 禁用线上功能的提示语 */
    banOnlineOP: "请上传后再使用",
    /** 禁用本地功能的提示语 */
    banLocalOP: "请下载后再使用",
    /** 内置插件禁用功能的提示语 */
    banCorePluginOP: "内置插件无该功能"
}

/** @name 本地插件信息的默认模板 */
export const DefaultLocalPlugin: YakScript = {
    Id: 0,
    ScriptName: "",
    Content: "",
    Type: "yak",
    Params: [],
    CreatedAt: 0,
    Help: "",
    Level: "",
    Author: "",
    Tags: "",
    IsHistory: false,
    OnlineId: 0,
    OnlineScriptName: "",
    OnlineContributors: "",
    UserId: 0,
    UUID: ""
}

/** @name 线上插件信息的默认模板 */
export const DefaultOnlinePlugin: YakitPluginOnlineDetail = {
    id: 0,
    created_at: 0,
    updated_at: 0,
    type: "yak",
    script_name: "",
    tags: "",
    content: "",
    authors: "",
    head_img: "",
    published_at: 0,
    downloaded_total: 0,
    stars: 0,
    status: 0,
    official: false,
    is_stars: false,
    uuid: "",
    is_private: false
}

/** @name 插件详情-可用tab类型 */
export const PluginDetailAvailableTab = {
    /** 线上 */
    online: ["online", "log"],
    /** 本地 */
    local: ["exectue", "local", "setting"]
}
