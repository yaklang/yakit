import {yakitNotify} from "@/utils/notification"
import {RenderResourcesTemplates, RenderTools, RenderToolsParam} from "./aiAgentType"
import cloneDeep from "lodash/cloneDeep"
import moment from "moment"

/** 处理默认值不同数据类型 */
const handleDefaultValue = (value: any): string => {
    if (typeof value === "number") return `${value}`
    if (value === null) return "null"
    if (value === true) return "true"
    if (value === false) return "false"
    return `${value || ""}`
}

/** 将 tools 里的参数格式化成前端结构 */
const formatMCPToolsParam = (key: string, params: any): RenderToolsParam => {
    if (!params || typeof params !== "object" || !params.type) throw new Error("数据格式错误")

    try {
        const data: RenderToolsParam = {
            key: key,
            type: "",
            description: "",
            default: "",
            required: false,
            extra: [],
            children: []
        }

        // 处理 string 类型
        if (params.type === "string") {
            data.type = "string"
            data.description = params.description || ""
            data.default = handleDefaultValue(params.default)

            const extra: string[] = []
            if (params?.minLength) extra.push(`minLength: ${JSON.stringify(params.minLength)}`)
            if (params?.maxLength) extra.push(`maxLength: ${JSON.stringify(params.maxLength)}`)
            if (params?.pattern) extra.push(`pattern: ${JSON.stringify(params.pattern)}`)
            if (params?.enum) extra.push(`enum: ${JSON.stringify(params.enum)}`)
            if (extra.length > 0) data.extra = extra
        }
        // 处理 number 类型
        if (params.type === "number") {
            data.type = "number"
            data.description = params.description || ""
            data.default = handleDefaultValue(params.default)

            const extra: string[] = []
            if (params?.minimum) extra.push(`minimum: ${JSON.stringify(params.minimum)}`)
            if (params?.maximum) extra.push(`maximum: ${JSON.stringify(params.maximum)}`)
            if (params?.exclusiveMinimum) extra.push(`exclusiveMinimum: ${JSON.stringify(params.exclusiveMinimum)}`)
            if (params?.exclusiveMaximum) extra.push(`exclusiveMaximum: ${JSON.stringify(params.exclusiveMaximum)}`)
            if (params?.multipleOf) extra.push(`multipleOf: ${JSON.stringify(params.multipleOf)}`)
            if (params?.enum) extra.push(`enum: ${JSON.stringify(params.enum)}`)
            if (extra.length > 0) data.extra = extra
        }
        // 处理 boolean 类型
        if (params.type === "boolean") {
            data.type = "boolean"
            data.description = params.description || ""
            data.default = handleDefaultValue(params.default)
        }
        // 处理 array 类型
        if (params.type === "array") {
            data.type = "array"
            data.description = params.description || ""

            if (params.items) {
                if (Array.isArray(params.items)) {
                } else if (typeof params.items === "object") {
                    data.children &&
                        data.children.push(
                            formatMCPToolsParam("items", {
                                ...params.items,
                                enum: params.enum || params.items?.enum || undefined
                            })
                        )
                }
            }
        }
        // 处理 object 类型
        if (params.type === "object") {
            data.type = "object"
            data.description = params.description || ""
            if (params.properties) {
                for (let key in params.properties) {
                    data.children && data.children.push(formatMCPToolsParam(key, params.properties[key]))
                }
            }
        }
        // 处理 oneof/anyof/allof 条件
        if (params.type === "object") {
            ;["oneOf", "anyOf", "allOf"].forEach((el) => {
                if (params[el] && Array.isArray(params[el])) {
                    for (let elKey of params[el]) {
                        if (elKey && elKey.properties) {
                            Object.entries(elKey.properties).forEach(([key, value]) => {
                                data.children && data.children.push(formatMCPToolsParam(key, value))
                            })
                        }
                        if (elKey && elKey.required && data.children) {
                            data.children = data.children.map((el) => {
                                if (elKey.required.includes(el.key)) {
                                    el.required = true
                                }
                                return el
                            })
                        }
                    }
                }
            })
        }

        // 处理必填值
        if ("required" in params && params.required && Array.isArray(params.required) && data.children) {
            data.children = data.children.map((el) => {
                if (params.required.includes(el.key)) {
                    el.required = true
                }
                return el
            })
        }

        if (!data.type) throw new Error(`数据格式错误: ${data}`)

        return data
    } catch (error) {
        throw new Error(`${error}`)
    }
}

/** 将 tools 里的信息格式化成前端结构 */
export const formatMCPTools = (data: any[]): RenderTools[] => {
    const tools: RenderTools[] = []
    if (!data || !Array.isArray(data) || data.length === 0) return tools

    try {
        for (let item of data) {
            const obj: RenderTools = {name: "", description: "", params: []}
            if (!item || typeof item !== "object") continue
            if (item?.name) obj.name = item.name
            if (item?.description) obj.description = item.description
            if (item?.inputSchema) {
                obj.params = formatMCPToolsParam("", item.inputSchema).children || []
            }
            if (obj.name && obj.params.length > 0) tools.push(obj)
        }
    } catch (error) {
        yakitNotify("error", `工具数据格式化失败: ${error}`)
    }

    return tools
}

/**
 * @name 将多维 tools 转换成一维 tools
 * @description 只转换上面两层数据，后面数据全部变为 JSON 放入 children 里
 */
export const convertMCPTools = (key: string, data: RenderToolsParam[], newData: RenderToolsParam[]): void => {
    for (let item of data) {
        const node = cloneDeep(item)
        if (key) node.key = `${key}.${node.key}`
        const child = node.children
        node.children = []
        if (!!key && child && child.length > 0) node.substructure = JSON.stringify(child)
        newData.push(node)
        if (child && child.length > 0 && !key) convertMCPTools(node.key, child, newData)
    }
}

/** 将 resourceTemplates 里的信息格式化成前端结构 */
export const formatMCPResourceTemplates = (templates: any[]): RenderResourcesTemplates[] => {
    const data: RenderResourcesTemplates[] = []
    if (!templates || !Array.isArray(templates) || templates.length === 0) return data

    try {
        for (let item of templates) {
            const info: RenderResourcesTemplates = {name: "", uriTemplate: ""}
            if (!item || typeof item !== "object") continue
            if (item?.uriTemplate) info.uriTemplate = item.uriTemplate
            if (item?.name) info.name = item.name
            if (info.uriTemplate && info.name) data.push(info)
        }
    } catch (error) {
        yakitNotify("error", "资源模板数据格式化失败")
    }
    return data
}

/** @name 将时间戳转换为 YYYY-MM-DD HH:mm:ss */
export const formatTime = (time: number): string => {
    return moment(time).format("YYYY-MM-DD HH:mm:ss")
}

/** @name 将纳秒转换为 YYYY-MM-DD HH:mm:ss */
export const formatTimeNS = (time: number): string => {
    const timestampNs = BigInt(`${time}`)
    const divisor = BigInt(1000000) // 1e6

    const quotient = timestampNs / divisor
    const remainder = timestampNs % divisor

    const timestampMs = Number(quotient) + Number(remainder) / 1e6

    return moment(timestampMs).format("YYYY-MM-DD HH:mm:ss")
}

/** @name 将unix时间戳转换为 YYYY-MM-DD HH:mm:ss */
export const formatTimeUnix = (time: number): string => {
    return moment.unix(time).format("YYYY-MM-DD HH:mm:ss")
}

// #region chat相关工具
/** @name 将Token转换为K/M等带单位字符 */
export const formatNumberUnits = (num: number) => {
    if (num >= 1048576) {
        return (num / 1048576).toFixed(1) + "M"
    } else if (num >= 1024) {
        return (num / 1024).toFixed(1) + "K"
    } else {
        return num.toString()
    }
}
// #endregion
