import {YakScript} from "@/pages/invoker/schema"
import {
    CodeToInfoRequestProps,
    CodeToInfoResponseProps,
    PluginDataProps,
    YakParamProps,
    localYakInfo
} from "../pluginsType"
import {API} from "@/services/swagger/resposeType"
import {NetWorkApi} from "@/services/fetch"
import {GetYakScriptByOnlineIDRequest} from "@/pages/yakitStore/YakitStorePage"
import {yakitNotify} from "@/utils/notification"
import {toolDelInvalidKV} from "@/utils/tool"
import {apiDownloadPluginMine} from "../utils"
import {YakExtraParamProps} from "../operator/localPluginExecuteDetailHeard/LocalPluginExecuteDetailHeardType"
import {YakExecutorParam} from "@/pages/invoker/YakExecutorParams"
import {Uint8ArrayToString} from "@/utils/str"
import {APIFunc} from "@/pages/pluginHub/utils/apiType"
import {pluginParamsConvertLocalToOnline, riskDetailConvertLocalToOnline} from "@/pages/pluginEditor/utils/convert"

const {ipcRenderer} = window.require("electron")

/** -------------------- 数据结构转换 Start -------------------- */
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
            Id: +info.Id || undefined,
            ScriptName: info.ScriptName,
            Content: info.Content,
            Type: info.Type,
            Help: info.Help,
            RiskInfo: info.RiskInfo,
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
    request.RiskInfo = (modify.RiskDetail || []).filter((item) => item.CVE && item.TypeVerbose && item.Level)
    request.Tags = modify.Tags
    request.Params = modify.Params
    request.EnablePluginSelector = modify.EnablePluginSelector
    request.PluginSelectorTypes = modify.PluginSelectorTypes
    request.Content = modify.Content

    // 没有RiskDetail就赋值为undefined
    if (request.RiskInfo.length === 0) {
        request.RiskInfo = undefined
    }
    // 没有Params就赋值为undefined
    if ((request.Params || []).length === 0) {
        request.Params = undefined
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
            riskInfo: riskDetailConvertLocalToOnline(info.RiskInfo),
            tags: (info.Tags || "").split(",") || [],
            params: pluginParamsConvertLocalToOnline(info.Params || []),
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
    request.riskInfo = riskDetailConvertLocalToOnline(modify.RiskDetail)
    request.tags = modify.Tags?.split(",") || []
    request.params = modify.Params ? pluginParamsConvertLocalToOnline(modify.Params) : undefined
    request.enable_plugin_selector = modify.EnablePluginSelector
    request.plugin_selector_types = modify.PluginSelectorTypes
    request.content = modify.Content

    // 没有tags就赋值为undefined
    if (request.tags?.length === 0) request.tags = undefined
    // 分组为空字符时清空值(影响后端数据处理)
    if (!request.group) request.group = undefined
    // 没有riskInfo就赋值为undefined
    if (request.riskInfo.length === 0) request.riskInfo = undefined

    return toolDelInvalidKV(request) as API.PluginsRequest
}

/**
 * @name 线上插件数据结构(API.PluginsDetail)-转换成-提交修改插件数据结构(API.PluginsRequest)
 * @param idModify 线上插件详细信息
 * @param modify 提交修改插件编辑信息
 */
export const convertRemoteToRemoteInfo = (info: API.PluginsDetail, modify?: PluginDataProps) => {
    // @ts-ignore
    const request: API.PluginsRequest = {
        ...info,
        tags: undefined,
        download_total: +info.downloaded_total || 0
    }
    try {
        request.tags = (info.tags || "").split(",") || []
    } catch (error) {}

    if (!!modify) {
        // 更新可编辑配置的内容
        request.script_name = modify.ScriptName
        request.type = modify.Type
        request.help = modify.Help
        request.riskInfo = riskDetailConvertLocalToOnline(modify.RiskDetail)
        request.tags = modify.Tags?.split(",") || []
        request.params = modify.Params ? pluginParamsConvertLocalToOnline(modify.Params) : undefined
        request.enable_plugin_selector = modify.EnablePluginSelector
        request.plugin_selector_types = modify.PluginSelectorTypes
        request.content = modify.Content
    }

    // 没有tags就赋值为undefined
    if (request.tags?.length === 0) request.tags = undefined
    // 分组为空字符时清空值(影响后端数据处理)
    if (!request.group) request.group = undefined
    // 没有riskInfo就赋值为undefined
    if ((request.riskInfo || []).length === 0) request.riskInfo = undefined
    // 没有params就赋值为undefined
    if ((request.params || []).length === 0) request.params = undefined

    return toolDelInvalidKV(request) as API.PluginsRequest
}
/** -------------------- 数据结构转换 End -------------------- */

/** -------------------- 插件参数数据处理工具 Start -------------------- */
/**
 * @description 根据组名将参数分组
 * @returns 返回处理好分组后的数据
 */
export const ParamsToGroupByGroupName = (arr: YakParamProps[]): YakExtraParamProps[] => {
    let map = {}
    let paramsGroupList: YakExtraParamProps[] = []
    for (var i = 0; i < arr.length; i++) {
        var ai = arr[i]
        if (!map[ai.Group || "default"]) {
            paramsGroupList.push({
                group: ai.Group || "default",
                data: [ai]
            })
            map[ai.Group || "default"] = ai
        } else {
            for (var j = 0; j < paramsGroupList.length; j++) {
                var dj = paramsGroupList[j]
                if (dj.group === (ai.Group || "default")) {
                    dj.data.push(ai)
                    break
                }
            }
        }
    }
    return paramsGroupList || []
}

/**
 * @description 表单显示的值,根据类型返回对应的类型的值
 */
export const getValueByType = (defaultValue, type: string): number | string | boolean | string[] => {
    let value
    switch (type) {
        case "uint":
            value = parseInt(defaultValue || "0")
            break
        case "float":
            value = parseFloat(defaultValue || "0.0")
            break
        case "boolean":
            value = defaultValue === "true" || defaultValue === true
            break
        case "select":
            // 考虑(defaultValue)的数据可能本身就是一个数组
            if (Array.isArray(defaultValue)) {
                value = defaultValue.length > 0 ? defaultValue : []
            } else {
                const newVal = defaultValue ? defaultValue.split(",") : []
                value = newVal.length > 0 ? newVal : []
            }
            break
        default:
            value = defaultValue ? defaultValue : ""
            break
    }
    return value
}

/**
 * @description 处理最后的执行参数
 * @param {{[string]:any}} object
 * @returns {YakExecutorParam[]}
 */
export const getYakExecutorParam = (object) => {
    let newValue: YakExecutorParam[] = []
    Object.entries(object).forEach(([key, val]) => {
        if (val instanceof Buffer) {
            newValue = [
                ...newValue,
                {
                    Key: key,
                    Value: Uint8ArrayToString(val)
                }
            ]
            return
        }
        if (val === true) {
            newValue = [
                ...newValue,
                {
                    Key: key,
                    Value: true
                }
            ]
            return
        }
        if (val === false || val === undefined) {
            return
        }
        newValue = [
            ...newValue,
            {
                Key: key,
                Value: val
            }
        ]
    })
    return newValue
}
/** -------------------- 插件参数数据处理工具 End -------------------- */

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
    // console.log("method:post|api:plugins", JSON.stringify(info))

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
    // console.log("method:post|api:copy/plugins", JSON.stringify(info))

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

interface PluginCodeToInfoRequest {
    /** 插件类型 */
    type: string
    /** 插件源码 */
    code: string
}
/** @name 获取源码中的参数和风险信息 */
export const onCodeToInfo: APIFunc<PluginCodeToInfoRequest, CodeToInfoResponseProps | null> = (params, hiddenError) => {
    return new Promise((resolve, reject) => {
        const request: CodeToInfoRequestProps = {
            YakScriptType: params.type,
            YakScriptCode: params.code
        }
        // console.log("onCodeToInfo-request", JSON.stringify(request))
        ipcRenderer
            .invoke("YaklangInspectInformation", request)
            .then((res: CodeToInfoResponseProps) => {
                // console.log("源码提取参数和风险信息", res)
                resolve({
                    Information: res.Information || [],
                    CliParameter: res.CliParameter || [],
                    RiskInfo: res.RiskInfo || [],
                    Tags: res.Tags || []
                })
            })
            .catch((e: any) => {
                if (!hiddenError) yakitNotify("error", "通过源码获取参数、漏洞与风险信息以及 tag 信息失败")
                resolve(null)
            })
    })
}
