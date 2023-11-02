import {YakScript} from "@/pages/invoker/schema"
import {PluginDataProps, YakParamProps, localYakInfo} from "../pluginsType"
import {API} from "@/services/swagger/resposeType"
import {NetWorkApi} from "@/services/fetch"
import {DownloadOnlinePluginProps} from "@/pages/yakitStore/YakitPluginInfoOnline/YakitPluginInfoOnline"
import {GetYakScriptByOnlineIDRequest} from "@/pages/yakitStore/YakitStorePage"
import {yakitNotify} from "@/utils/notification"
import {YakitRoute} from "@/routes/newRoute"

const {ipcRenderer} = window.require("electron")

/** ---------- 数据结构转换 start ---------- */
/**
 * @name 本地插件参数数据(YakParamProps)-转换成-线上插件参数数据(API.YakitPluginParam)
 */
const convertLocalToRemoteParams = (local: YakParamProps[]) => {
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
const convertRemoteToLocalParams = (online: API.YakitPluginParam[]) => {
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
            Id: info.Id,
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
        Id: modify.RiskDetail?.Id || "",
        CWEName: modify.RiskDetail?.CWEName || "",
        Description: modify.RiskDetail?.Description || "",
        CWESolution: modify.RiskDetail?.CWESolution || ""
    }
    request.RiskAnnotation = modify.RiskAnnotation
    request.Tags = modify.Tags
    request.Params = modify.Params
    request.EnablePluginSelector = modify.EnablePluginSelector
    request.PluginSelectorTypes = modify.PluginSelectorTypes
    request.Content = modify.Content

    return request
}

/**
 * @name 本地插件数据结构(YakScript)-转换成-线上插件数据结构(API.PluginsEditRequest)
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
    let request: API.PluginsEditRequest = {}
    if (isModify && info) {
        request = {
            type: info.Type,
            script_name: info.ScriptName,
            help: info.Help,
            riskType: info.RiskType,
            riskDetail: info.RiskDetail
                ? {
                      cweId: info.RiskDetail.Id,
                      riskType: info.RiskDetail.CWEName,
                      description: info.RiskDetail.Description,
                      solution: info.RiskDetail.CWESolution
                  }
                : undefined,
            annotation: info.RiskAnnotation,
            tags: info.Tags.split(",") || [],
            params: convertLocalToRemoteParams(info.Params),
            enable_plugin_selector: info.EnablePluginSelector,
            plugin_selector_types: info.PluginSelectorTypes,
            content: info.Content,

            is_general_module: info.IsGeneralModule,
            is_private: info.OnlineIsPrivate,
            group: info.OnlineGroup,
            isCorePlugin: info.IsCorePlugin,

            uuid: info.UUID
        }
    }

    // 更新可编辑配置的内容
    request.script_name = modify.ScriptName
    request.type = modify.Type
    request.help = modify.Help
    request.riskType = modify.RiskType
    request.riskDetail = {
        cweId: modify.RiskDetail?.Id || "",
        riskType: modify.RiskDetail?.CWEName || "",
        description: modify.RiskDetail?.Description || "",
        solution: modify.RiskDetail?.CWESolution || ""
    }
    request.annotation = modify.RiskAnnotation
    request.tags = modify.Tags?.split(",") || []
    request.params = modify.Params ? convertLocalToRemoteParams(modify.Params) : undefined
    request.enable_plugin_selector = modify.EnablePluginSelector
    request.plugin_selector_types = modify.PluginSelectorTypes
    request.content = modify.Content
    request.logDescription = modify.modifyDescription

    return request
}
/** ---------- 数据结构转换 end ---------- */

/**
 * @name 插件上传到online-整体上传逻辑
 */
export const uploadOnlinePlugin = (info: API.PluginsEditRequest, callback?: (plugin?: YakScript) => any) => {
    console.log(1111111, JSON.stringify(info))
    NetWorkApi<API.PluginsEditRequest, API.PluginsResponse>({
        method: "post",
        url: "plugins",
        data: info
    })
        .then((res) => {
            ipcRenderer
                .invoke("DownloadOnlinePluginById", {
                    OnlineID: res.id,
                    UUID: res.uuid
                } as DownloadOnlinePluginProps)
                .then(() => {
                    setTimeout(() => ipcRenderer.invoke("change-main-menu"), 100)
                    ipcRenderer
                        .invoke("GetYakScriptByOnlineID", {
                            OnlineID: res.id,
                            UUID: res.uuid
                        } as GetYakScriptByOnlineIDRequest)
                        .then((newSrcipt: YakScript) => {
                            if (callback) callback(newSrcipt)
                            yakitNotify("success", "同步成功")
                            ipcRenderer
                                .invoke("send-close-tab", {
                                    router: YakitRoute.AddYakitScript
                                })
                                .finally(() => ipcRenderer.invoke("send-local-script-list"))
                        })
                        .catch((e) => {
                            console.log(333)
                            if (callback) callback()
                            yakitNotify("error", `查询本地插件错误:${e}`)
                        })
                })
                .catch((err) => {
                    console.log(222)
                    if (callback) callback()
                    yakitNotify("error", "插件下载本地失败:" + err)
                })
        })
        .catch((err) => {
            console.log(111)
            yakitNotify("error", "插件上传失败:" + err)
        })
}
