import {CodeToInfoRequestProps, CodeToInfoResponseProps, PluginDataProps, YakParamProps} from "../pluginsType"
import {API} from "@/services/swagger/resposeType"
import {yakitNotify} from "@/utils/notification"
import {toolDelInvalidKV} from "@/utils/tool"
import {YakExtraParamProps} from "../operator/localPluginExecuteDetailHeard/LocalPluginExecuteDetailHeardType"
import {YakExecutorParam} from "@/pages/invoker/YakExecutorParams"
import {Uint8ArrayToString} from "@/utils/str"
import {pluginParamsConvertLocalToOnline, riskDetailConvertLocalToOnline} from "@/pages/pluginEditor/utils/convert"
import {APIFunc} from "@/apiUtils/type"

const {ipcRenderer} = window.require("electron")

/** -------------------- 数据结构转换 Start -------------------- */
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
        request.pluginEnvKey = modify.PluginEnvKey
    }

    // 没有tags就赋值为undefined
    if (request.tags?.length === 0) request.tags = undefined
    // 分组为空字符时清空值(影响后端数据处理)
    if (!request.group) request.group = undefined
    // 没有riskInfo就赋值为undefined
    if ((request.riskInfo || []).length === 0) request.riskInfo = undefined
    // 没有params就赋值为undefined
    if ((request.params || []).length === 0) request.params = undefined
    // 没有pluginEnvKey就赋值为undefined
    if ((request.pluginEnvKey || []).length === 0) request.pluginEnvKey = undefined

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
                    Tags: res.Tags || [],
                    PluginEnvKey: res.PluginEnvKey || []
                })
            })
            .catch((e: any) => {
                if (!hiddenError) yakitNotify("error", "通过源码获取参数、漏洞与风险信息以及 tag 信息失败")
                resolve(null)
            })
    })
}
