import {YakScript} from "@/pages/invoker/schema"
import {GetPluginLanguage} from "@/pages/plugins/builtInData"
import {onCodeToInfo} from "@/pages/plugins/editDetails/utils"
import cloneDeep from "lodash/cloneDeep"
import {YakitPluginBaseInfo} from "../base"

/**
 * @name 本地插件结构(YakScript)转变成前端插件结构(YakitPluginBaseInfo)
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
