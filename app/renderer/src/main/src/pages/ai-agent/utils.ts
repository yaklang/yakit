import {yakitNotify} from "@/utils/notification"
import {AIAgentSetting, RenderResourcesTemplates, RenderTools, RenderToolsParam} from "./aiAgentType"
import cloneDeep from "lodash/cloneDeep"
import isNil from "lodash/isNil"
import {AIAgentSettingDefault} from "./defaultConstant"
import {AIAgentGrpcApi} from "../ai-re-act/hooks/grpcApi"

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
/**
 * @name 将一维tree转换成树结构
 */
/**
 * 将扁平数组转换为树形结构
 * @param {AIAgentGrpcApi.PlanTask[]} items 扁平数据数组
 * @returns {AIAgentGrpcApi.PlanTask[]} 树形结构数组
 */
export const reviewListToTrees = (items: AIAgentGrpcApi.PlanTask[]): AIAgentGrpcApi.PlanTask[] => {
    // 创建映射表，以id为键存储所有节点
    const map = {}
    const tree: AIAgentGrpcApi.PlanTask[] = []

    // 首先构建所有节点的映射
    items.forEach((item) => {
        // 如果是用户添加的节点且没有名称、目标和工具，则跳过
        if (item.isUserAdd && !item.name && !item.goal && !item.tools.length) return
        // 创建节点副本并初始化children数组
        map[item.index] = {...item, subtasks: []}
    })

    // 构建树结构
    items.forEach((item) => {
        const node: AIAgentGrpcApi.PlanTask = map[item.index]
        if (!node) return // 如果节点不存在，跳过
        const parentId = getParentId(item.index)
        // 如果有父节点，则添加到父节点的children中
        if (parentId && map[parentId]) {
            map[parentId].subtasks.push(node)
        }
        // 否则作为根节点
        else {
            tree.push(node)
        }
    })

    return tree
}

/**
 * 从节点ID提取父节点ID
 * @param {String} id 当前节点ID
 * @returns {String|null} 父节点ID或null(如果是根节点)
 */
const getParentId = (id) => {
    const parts = id.split("-")
    if (parts.length <= 1) return null
    return parts.slice(0, -1).join("-")
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
/**是否为 tool stdout 节点 */
export const isToolStdout = (nodeID: string) => {
    if (!nodeID) return false
    return nodeID.startsWith("tool-") && nodeID.endsWith("-stdout")
}
/**是否显示有总结的tool card */
export const isToolSummaryCard = (nodeID: string) => {
    switch (nodeID) {
        case "tool_call_user_cancel":
        case "tool_call_done":
        case "tool_call_error":
        case "tool_call_summary":
            return true
        default:
            return false
    }
}
/**是否显示紫色主题的彩色卡片 */
export const isShowToolColorCard = (nodeID: string) => {
    if (nodeID === "call-tools") return true
    if (isToolStdout(nodeID)) return true
    return false
}

/**是否为AI tool 需要展示在页面上的节点 */
export const isToolSyncNode = (nodeID: string) => {
    if (nodeID === "execute") return true
    if (nodeID === "call-tools") return true
    if (isToolStdout(nodeID)) return true
    return false
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

/** @name 将全局配置信息转换为可以请求的数据结构 */
export const formatAIAgentSetting = (setting: AIAgentSetting): AIAgentSetting => {
    const data: AIAgentSetting = {}

    try {
        if (!isNil(setting?.EnableSystemFileSystemOperator)) {
            data.EnableSystemFileSystemOperator = setting.EnableSystemFileSystemOperator
        }
        if (!isNil(setting?.UseDefaultAIConfig)) {
            data.UseDefaultAIConfig = setting.UseDefaultAIConfig
        }
        if (!!setting?.ForgeName) {
            data.ForgeName = setting.ForgeName || ""
        }
        if (!isNil(setting?.DisallowRequireForUserPrompt)) {
            data.DisallowRequireForUserPrompt = setting.DisallowRequireForUserPrompt
        }

        if (!!setting?.ReviewPolicy) {
            data.ReviewPolicy = setting.ReviewPolicy || "manual"
        } else {
            data.ReviewPolicy = "manual"
        }

        if (!isNil(setting?.AIReviewRiskControlScore)) {
            data.AIReviewRiskControlScore = setting.AIReviewRiskControlScore || 0.5
        }
        if (!isNil(setting?.DisableToolUse)) {
            data.DisableToolUse = setting.DisableToolUse
        }
        if (!isNil(setting?.AICallAutoRetry)) {
            data.AICallAutoRetry = setting.AICallAutoRetry || 3
        }
        if (!isNil(setting?.AITransactionRetry)) {
            data.AITransactionRetry = setting.AITransactionRetry || 5
        }
        if (!isNil(setting?.EnableAISearchTool)) {
            data.EnableAISearchTool = setting.EnableAISearchTool
        }
        if (!isNil(setting?.EnableAISearchInternet)) {
            data.EnableAISearchInternet = setting.EnableAISearchInternet
        }
        if (!isNil(setting?.AllowPlanUserInteract)) {
            data.AllowPlanUserInteract = setting.AllowPlanUserInteract
        }
        if (setting?.AllowPlanUserInteract) {
            if (!isNil(setting?.PlanUserInteractMaxCount)) {
                data.PlanUserInteractMaxCount = setting.PlanUserInteractMaxCount || 3
            } else {
                data.PlanUserInteractMaxCount = 3
            }
        }
        if (!isNil(setting?.AIService)) {
            data.AIService = setting.AIService
        }
        if (!isNil(setting?.ReActMaxIteration)) {
            data.ReActMaxIteration = setting.ReActMaxIteration || AIAgentSettingDefault.ReActMaxIteration
        }
        if (!isNil(setting?.TimelineItemLimit)) {
            data.TimelineItemLimit = setting.TimelineItemLimit || AIAgentSettingDefault.TimelineItemLimit
        }
        if (!isNil(setting?.TimelineContentSizeLimit)) {
            data.TimelineContentSizeLimit =
                setting.TimelineContentSizeLimit || AIAgentSettingDefault.TimelineContentSizeLimit
        }
        if (!isNil(setting?.UserInteractLimit)) {
            data.UserInteractLimit = setting.UserInteractLimit || AIAgentSettingDefault.UserInteractLimit
        }
    } catch (error) {}

    return {...data}
}
// #endregion
