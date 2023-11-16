import {YakScript} from "@/pages/invoker/schema"
import {PluginDataProps, YakParamProps, localYakInfo} from "../pluginsType"
import {API} from "@/services/swagger/resposeType"
import {NetWorkApi} from "@/services/fetch"
import {GetYakScriptByOnlineIDRequest} from "@/pages/yakitStore/YakitStorePage"
import {yakitNotify} from "@/utils/notification"
import {toolDelInvalidKV} from "@/utils/tool"
import {apiDownloadPluginMine} from "../utils"

const {ipcRenderer} = window.require("electron")

/** ---------- 数据结构转换 start ---------- */
/**
 * @name 本地插件参数数据(YakParamProps)-转换成-线上插件参数数据(API.YakitPluginParam)
 */
export const convertLocalToRemoteParams = (local: YakParamProps[]) => {
    return local.map((item) => {
        const obj: API.YakitPluginParam = {
            field: item.Field,
            field_verbose: item.FieldVerbose,
            required: item.Required,
            type_verbose: item.TypeVerbose,
            default_value: item.DefaultValue,
            extra_setting: item.ExtraSetting,
            help: item.Help,
            group: item.Group
        }
        return obj
    })
}
/**
 * @name 线上插件参数数据(API.YakitPluginParam)-转换成-本地插件参数数据(PluginParamDataProps)
 */
export const convertRemoteToLocalParams = (online: API.YakitPluginParam[]) => {
    return online.map((item) => {
        const obj: YakParamProps = {
            Field: item.field,
            FieldVerbose: item.field_verbose,
            Required: item.required,
            TypeVerbose: item.type_verbose,
            DefaultValue: item.default_value,
            ExtraSetting: item.extra_setting,
            Help: item.help,
            Group: item.group
        }
        return obj
    })
}

/**
 * @name 本地插件数据结构(YakScript)-转换成-本地进行保存的插件数据结构(localYakInfo)
 * @param idModify 是否为编辑状态
 */
export const convertLocalToLocalInfo = (
    isModify: boolean,
    data: {
        info?: YakScript
        modify: PluginDataProps
    }
) => {
    const {info, modify} = data
    // @ts-ignore
    let request: localYakInfo = {}
    if (isModify && info) {
        request = {
            ScriptName: info.ScriptName,
            Content: info.Content,
            Type: info.Type,
            Help: info.Help,
            RiskType: info.RiskType,
            RiskDetail: info.RiskDetail,
            RiskAnnotation: info.RiskAnnotation,
            Tags: info.Tags,
            Params: info.Params,
            EnablePluginSelector: info.EnablePluginSelector,
            PluginSelectorTypes: info.PluginSelectorTypes,
            Level: info.Level,
            IsHistory: info.IsHistory,
            IsIgnore: info.IsIgnore,
            IsGeneralModule: info.IsGeneralModule,
            GeneralModuleVerbose: info.GeneralModuleVerbose,
            GeneralModuleKey: info.GeneralModuleKey,
            FromGit: info.FromGit,
            IsCorePlugin: info.IsCorePlugin
        }
    }

    // 更新可编辑配置的内容
    request.ScriptName = modify.ScriptName
    request.Type = modify.Type
    request.Help = modify.Help
    request.RiskType = modify.RiskType
    request.RiskDetail = {
        CWEId: modify.RiskDetail?.CWEId || "",
        RiskType: modify.RiskDetail?.RiskType || "",
        Description: modify.RiskDetail?.Description || "",
        CWESolution: modify.RiskDetail?.CWESolution || ""
    }
    request.RiskAnnotation = modify.RiskAnnotation
    request.Tags = modify.Tags
    request.Params = modify.Params
    request.EnablePluginSelector = modify.EnablePluginSelector
    request.PluginSelectorTypes = modify.PluginSelectorTypes
    request.Content = modify.Content

    if (!request.RiskType) {
        // 非漏洞类型时，risk相关置为undefined
        request.RiskDetail = undefined
        request.RiskAnnotation = undefined
    } else {
        // 漏洞类型时，help置为undefined
        request.Help = undefined
    }

    return toolDelInvalidKV(request) as localYakInfo
}

/**
 * @name 本地插件数据结构(YakScript)-转换成-提交修改插件数据结构(API.PluginsRequest)
 * @param idModify 是否为编辑状态
 */
export const convertLocalToRemoteInfo = (
    isModify: boolean,
    data: {
        info?: YakScript
        modify: PluginDataProps
    }
) => {
    const {info, modify} = data
    // @ts-ignore
    let request: API.PluginsRequest = {}
    if (isModify && info) {
        request = {
            type: info.Type,
            script_name: info.ScriptName,
            help: info.Help,
            riskType: info.RiskType,
            riskDetail: {
                cweId: info.RiskDetail?.CWEId || "",
                riskType: info.RiskDetail?.RiskType || "",
                description: info.RiskDetail?.Description || "",
                solution: info.RiskDetail?.CWESolution || ""
            },
            annotation: info.RiskAnnotation,
            tags: (info.Tags || "").split(",") || [],
            params: convertLocalToRemoteParams(info.Params || []),
            enable_plugin_selector: info.EnablePluginSelector,
            plugin_selector_types: info.PluginSelectorTypes,
            content: info.Content,

            is_general_module: info.IsGeneralModule,
            is_private: info.OnlineIsPrivate,
            group: info.OnlineGroup,
            isCorePlugin: info.IsCorePlugin
        }
    }

    // 更新可编辑配置的内容
    request.script_name = modify.ScriptName
    request.type = modify.Type
    request.help = modify.Help
    request.riskType = modify.RiskType
    request.riskDetail = {
        cweId: modify.RiskDetail?.CWEId || "",
        riskType: modify.RiskDetail?.RiskType || "",
        description: modify.RiskDetail?.Description || "",
        solution: modify.RiskDetail?.CWESolution || ""
    }
    request.annotation = modify.RiskAnnotation
    request.tags = modify.Tags?.split(",") || []
    request.params = modify.Params ? convertLocalToRemoteParams(modify.Params) : undefined
    request.enable_plugin_selector = modify.EnablePluginSelector
    request.plugin_selector_types = modify.PluginSelectorTypes
    request.content = modify.Content

    // 没有tags就赋值为undefined
    if (request.tags?.length === 0) request.tags = undefined
    // 非漏洞类型的插件清空漏洞类型详情
    if (!request.riskType) request.riskDetail = undefined
    // 分组为空字符时清空值(影响后端数据处理)
    if (!request.group) request.group = undefined

    return toolDelInvalidKV(request) as API.PluginsRequest
}

/**
 * @name 线上插件数据结构(API.PluginsDetail)-转换成-提交修改插件数据结构(API.PluginsRequest)
 * @param idModify 线上插件详细信息
 * @param modify 本地插件编辑信息
 */
export const convertRemoteToRemoteInfo = (info: API.PluginsDetail, modify: PluginDataProps) => {
    // @ts-ignore
    const request: API.PluginsRequest = {
        ...info,
        annotation: info.risk_annotation,
        tags: undefined
    }
    try {
        request.tags = JSON.parse(info.tags)
    } catch (error) {}

    // 更新可编辑配置的内容
    request.script_name = modify.ScriptName
    request.type = modify.Type
    request.help = modify.Help
    request.riskType = modify.RiskType
    request.riskDetail = {
        cweId: modify.RiskDetail?.CWEId || "",
        riskType: modify.RiskDetail?.RiskType || "",
        description: modify.RiskDetail?.Description || "",
        solution: modify.RiskDetail?.CWESolution || ""
    }
    request.annotation = modify.RiskAnnotation
    request.tags = modify.Tags?.split(",") || []
    request.params = modify.Params ? convertLocalToRemoteParams(modify.Params) : undefined
    request.enable_plugin_selector = modify.EnablePluginSelector
    request.plugin_selector_types = modify.PluginSelectorTypes
    request.content = modify.Content

    // 没有tags就赋值为undefined
    if (request.tags?.length === 0) request.tags = undefined
    // 非漏洞类型的插件清空漏洞类型详情
    if (!request.riskType) request.riskDetail = undefined
    // 分组为空字符时清空值(影响后端数据处理)
    if (!request.group) request.group = undefined

    return toolDelInvalidKV(request) as API.PluginsRequest
}
/** ---------- 数据结构转换 end ---------- */

/**
 * @name 插件上传到online-整体上传逻辑
 * @param info 上传到online的信息
 * @param isModify 是否为编辑操作
 */
export const uploadOnlinePlugin = (
    info: API.PluginsEditRequest,
    isModify: boolean,
    callback?: (plugin?: YakScript) => any
) => {
    console.log("api-upload", JSON.stringify(info))
    // 往线上上传插件
    NetWorkApi<API.PluginsEditRequest, API.PluginsResponse>({
        method: "post",
        url: "plugins",
        data: info
    })
        .then((res) => {
            if (isModify) {
                // @ts-ignore
                if (callback) callback(true)
                return
            }
            // 下载插件
            apiDownloadPluginMine({UUID: [res.uuid]})
                .then(() => {
                    // 刷新插件菜单
                    setTimeout(() => ipcRenderer.invoke("change-main-menu"), 100)
                    // 获取下载后本地最新的插件信息
                    ipcRenderer
                        .invoke("GetYakScriptByOnlineID", {
                            OnlineID: res.id,
                            UUID: res.uuid
                        } as GetYakScriptByOnlineIDRequest)
                        .then((newSrcipt: YakScript) => {
                            if (callback) callback(newSrcipt)
                            yakitNotify("success", "上传云端成功")
                        })
                        .catch((e) => {
                            // @ts-ignore
                            if (callback) callback(true)
                            yakitNotify("error", `查询本地插件错误:${e}`)
                        })
                })
                .catch((err) => {
                    // @ts-ignore
                    if (callback) callback(true)
                    yakitNotify("error", `插件下载本地失败:${err}`)
                })
        })
        .catch((err) => {
            if (callback) callback()
            yakitNotify("error", "插件上传失败:" + err)
        })
}

/**
 * @name 复制插件-整体逻辑
 * @param info 复制online的信息
 */
export const copyOnlinePlugin = (info: API.CopyPluginsRequest, callback?: (plugin?: YakScript) => any) => {
    console.log("copy-api", info)
    // 往线上上传插件
    NetWorkApi<API.CopyPluginsRequest, API.PluginsResponse>({
        method: "post",
        url: "copy/plugins",
        data: info
    })
        .then((res) => {
            // 下载插件
            apiDownloadPluginMine({UUID: [res.uuid]})
                .then(() => {
                    // 刷新插件菜单
                    setTimeout(() => ipcRenderer.invoke("change-main-menu"), 100)
                    // 获取下载后本地最新的插件信息
                    ipcRenderer
                        .invoke("GetYakScriptByOnlineID", {
                            OnlineID: res.id,
                            UUID: res.uuid
                        } as GetYakScriptByOnlineIDRequest)
                        .then((newSrcipt: YakScript) => {
                            if (callback) callback(newSrcipt)
                            yakitNotify("success", "复制插件成功")
                        })
                        .catch((e) => {
                            // @ts-ignore
                            if (callback) callback(true)
                            yakitNotify("error", `查询本地插件错误:${e}`)
                        })
                })
                .catch((err) => {
                    // @ts-ignore
                    if (callback) callback(true)
                    yakitNotify("error", `插件下载本地失败:${err}`)
                })
        })
        .catch((err) => {
            if (callback) callback()
            yakitNotify("error", "复制插件失败:" + err)
        })
}
