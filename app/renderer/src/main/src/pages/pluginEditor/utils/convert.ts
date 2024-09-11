import {YakScript} from "@/pages/invoker/schema"
import {GetPluginLanguage} from "@/pages/plugins/builtInData"
import {onCodeToInfo} from "@/pages/plugins/editDetails/utils"
import cloneDeep from "lodash/cloneDeep"
import {YakitPluginBaseInfo, YakitPluginInfo} from "../base"
import {API} from "@/services/swagger/resposeType"
import {DefaultAPIPluginsRequest, DefaultGRPCSavePluginRequest} from "../defaultconstants"
import {toolDelInvalidKV} from "@/utils/tool"
import {YakParamProps, YakRiskInfoProps, localYakInfo} from "@/pages/plugins/pluginsType"
import {
    CustomPluginExecuteFormValue,
    PluginExecuteExtraFormValue
} from "@/pages/plugins/operator/localPluginExecuteDetailHeard/LocalPluginExecuteDetailHeardType"
import {defPluginExecuteFormValue} from "@/pages/plugins/operator/localPluginExecuteDetailHeard/constants"
import {KVPair} from "@/models/kv"

/**
 * @name 本地插件参数数据(YakParamProps)-转换成-线上插件参数数据(API.YakitPluginParam)
 */
export const pluginParamsConvertLocalToOnline = (local: YakParamProps[]) => {
    return local.map((item) => {
        const obj: API.YakitPluginParam = {
            field: item.Field,
            field_verbose: item.FieldVerbose,
            required: item.Required,
            type_verbose: item.TypeVerbose,
            default_value: item.DefaultValue,
            extra_setting: item.ExtraSetting,
            help: item.Help,
            group: item.Group,
            method_type: item.MethodType || ""
        }
        return obj
    })
}

/**
 * @name 线上插件参数数据(API.YakitPluginParam)-转换成-本地插件参数数据(YakParamProps)
 */
export const pluginParamsConvertOnlineToLocal = (online: API.YakitPluginParam[]) => {
    return online.map((item) => {
        const obj: YakParamProps = {
            Field: item.field,
            FieldVerbose: item.field_verbose,
            Required: item.required,
            TypeVerbose: item.type_verbose,
            DefaultValue: item.default_value,
            ExtraSetting: item.extra_setting,
            Help: item.help,
            Group: item.group,
            MethodType: item.method_type || ""
        }
        return obj
    })
}

/**
 * @name 本地插件风险数据(YakRiskInfoProps)-转换成-线上插件风险数据(API.PluginsRiskDetail)
 */
export const riskDetailConvertLocalToOnline = (risks?: YakRiskInfoProps[]) => {
    const arr: API.PluginsRiskDetail[] = []
    const local = risks || []
    for (let item of local) {
        if (item.Level && item.CVE && item.TypeVerbose) {
            arr.push({
                level: item.Level,
                cve: item.CVE,
                typeVerbose: item.TypeVerbose,
                description: item.Description,
                solution: item.Solution
            })
        }
    }
    return arr
}

/**
 * @name 线上插件风险数据(API.PluginsRiskDetail)-转换成-本地插件风险数据(YakRiskInfoProps)
 */
export const riskDetailConvertOnlineToLocal = (risks?: API.PluginsRiskDetail[]) => {
    const arr: YakRiskInfoProps[] = []
    const local = risks || []
    for (let item of local) {
        if (item.level && item.cve && item.typeVerbose) {
            arr.push({
                Level: item.level,
                CVE: item.cve,
                TypeVerbose: item.typeVerbose,
                Description: item.description,
                Solution: item.solution
            })
        }
    }
    return arr
}

/**
 * @name 本地插件结构(YakScript)转换前端插件结构(YakitPluginBaseInfo)
 */
export const pluginConvertLocalToUI = async (value: YakScript) => {
    if (!value.Type || !value.ScriptName) return undefined
    const data: YakScript = cloneDeep(value)

    let newTags: string[] = []
    if (data.Tags === "null" || !data.Tags) {
        newTags = []
    } else {
        newTags = (data.Tags || "").split(",")
    }
    const codeInfo =
        GetPluginLanguage(data.Type) === "yak"
            ? await onCodeToInfo({type: data.Type || "yak", code: data.Content})
            : null
    if (codeInfo && codeInfo.Tags.length > 0)
        newTags = newTags.concat(codeInfo.Tags).filter((item, index, self) => {
            return self.indexOf(item) === index
        })

    const newPluginSelectorTypes: string[] = (data.PluginSelectorTypes || "").split(",") || []

    const info: YakitPluginBaseInfo = {
        Type: data.Type,
        ScriptName: data.ScriptName,
        Help: data.Help || undefined,
        Tags: [...newTags],
        EnablePluginSelector: data.EnablePluginSelector || false,
        PluginSelectorTypes: [...newPluginSelectorTypes]
    }

    return info
}

/**
 * @name 前端插件结构(YakitPluginBaseInfo)转换本地保存结构(localYakInfo)
 */
export const pluginConvertUIToLocal = (value: YakitPluginInfo, local?: YakScript) => {
    let data: localYakInfo = cloneDeep(DefaultGRPCSavePluginRequest)

    if (!!local) {
        data = {
            ...data,
            Id: Number(local.Id || 0) || undefined,
            Level: local.Level,
            IsHistory: local.IsHistory,
            IsIgnore: local.IsIgnore,
            IsGeneralModule: local.IsGeneralModule,
            GeneralModuleVerbose: local.GeneralModuleVerbose,
            GeneralModuleKey: local.GeneralModuleKey,
            FromGit: local.FromGit,
            IsCorePlugin: local.IsCorePlugin
        }
    }

    // 更新可编辑配置的内容
    data.Type = value.Type
    data.ScriptName = value.ScriptName
    data.Help = value.Help
    data.Tags = (value.Tags || []).join(",") || undefined
    data.Params = value.Params
    data.EnablePluginSelector = value.EnablePluginSelector
    data.PluginSelectorTypes = (value.PluginSelectorTypes || []).join(",") || undefined
    data.Content = value.Content
    data.RiskInfo = (value.RiskDetail || []).filter((item) => item.CVE && item.TypeVerbose && item.Level)

    // 没有RiskDetail就赋值为undefined
    if (data.RiskInfo.length === 0) {
        data.RiskInfo = undefined
    }
    // 没有Params就赋值为undefined
    if ((data.Params || []).length === 0) {
        data.Params = undefined
    }

    return toolDelInvalidKV(data) as localYakInfo
}

/**
 * @name 前端插件结构(YakitPluginBaseInfo)转换线上保存结构(API.PluginsRequest)
 */
export const pluginConvertUIToOnline = (value: YakitPluginInfo, local?: YakScript) => {
    let data: API.PluginsRequest = cloneDeep(DefaultAPIPluginsRequest)

    if (!!local) {
        data = {
            script_name: local.ScriptName,
            is_general_module: local.IsGeneralModule,
            is_private: local.OnlineIsPrivate,
            group: local.OnlineGroup,
            isCorePlugin: local.IsCorePlugin
        }
    }

    data.type = value.Type
    data.script_name = value.ScriptName
    data.help = value.Help || undefined
    data.tags = value.Tags || []
    data.params = value.Params ? pluginParamsConvertLocalToOnline(value.Params) : undefined
    data.enable_plugin_selector = value.EnablePluginSelector
    data.plugin_selector_types = (value.PluginSelectorTypes || []).join(",") || undefined
    data.content = value.Content
    data.riskInfo = riskDetailConvertLocalToOnline(value.RiskDetail)

    if (data.tags.length === 0) {
        data.tags = undefined
    }
    if (!data.group) {
        data.group = undefined
    }
    if (data.riskInfo.length === 0) {
        data.riskInfo = undefined
    }

    return toolDelInvalidKV(data) as API.PluginsRequest
}

/**
 * @name 本地插件结构(YakScript)转换线上保存结构(API.PluginsRequest)
 */
export const pluginConvertLocalToOnline = (value: YakScript) => {
    let data: API.PluginsRequest = cloneDeep(DefaultAPIPluginsRequest)

    data.type = value.Type
    data.script_name = value.ScriptName
    data.help = value.Help || undefined

    let newTags: string[] = []
    if (value.Tags === "null" || !value.Tags) {
        newTags = []
    } else {
        newTags = (value.Tags || "").split(",")
    }
    data.tags = newTags
    data.params = value.Params ? pluginParamsConvertLocalToOnline(value.Params) : undefined
    data.enable_plugin_selector = value.EnablePluginSelector
    data.plugin_selector_types = value.PluginSelectorTypes || undefined
    data.content = value.Content
    data.riskInfo = riskDetailConvertLocalToOnline(value.RiskInfo)
    data.is_general_module = value.IsGeneralModule
    data.is_private = value.OnlineIsPrivate
    data.group = value.OnlineGroup
    data.isCorePlugin = value.IsCorePlugin

    if (data.tags.length === 0) {
        data.tags = undefined
    }
    if (!data.group) {
        data.group = undefined
    }
    if (data.riskInfo.length === 0) {
        data.riskInfo = undefined
    }

    return toolDelInvalidKV(data) as API.PluginsRequest
}

/**
 * @name 对比插件前后是否有修改，插件结构为(YakitPluginInfo)
 * 对比内容：名称、描述、源码、tags
 */
export const checkPluginIsModify = (newPlugin: YakitPluginInfo, oldPlugin: YakitPluginInfo) => {
    // 名称
    if (newPlugin.ScriptName !== oldPlugin.ScriptName) {
        return true
    }
    // 描述
    if (newPlugin.Help !== oldPlugin.Help) {
        return true
    }
    // 源码
    if (newPlugin.Content !== oldPlugin.Content) {
        return true
    }
    // tags
    const newTags = (newPlugin.Tags || []).sort().join(",")
    const oldTags = (oldPlugin.Tags || []).sort().join(",")
    if (newTags !== oldTags) {
        return true
    }

    return false
}

/**
 * @name 将插件参数数据拆分成两部分，一部分为固定参数数据，一部分为自定义参数数据
 */
export const splitPluginParamsData = (value: Record<string, any>, customs: YakParamProps[]) => {
    const customValue: CustomPluginExecuteFormValue = {}
    let fixedValue: PluginExecuteExtraFormValue = {...defPluginExecuteFormValue}

    const data = cloneDeep(value)
    for (let item of customs) {
        if (data[item.Field] !== undefined) {
            customValue[item.Field] = data[item.Field]
            delete data[item.Field]
        }
    }
    fixedValue = {...data} as PluginExecuteExtraFormValue

    return {customValue, fixedValue}
}

/**
 * @name 将插件执行参数-ExecParams里的非自定义参数键值对删除
 */
export const delInvalidPluginExecuteParams = (kvs: KVPair[], params: YakParamProps[]) => {
    const keys = params.map((item) => item.Field)
    return kvs.filter((item) => keys.includes(item.Key))
}
