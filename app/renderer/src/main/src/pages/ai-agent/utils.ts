import {MCPServeToolsParam, MCPServeResourcesTemplates} from "./aiAgentType"

/** 将 tools 里的参数格式化成前端结构 */
export const formatMCPToolsParams = (params: any[]): MCPServeToolsParam[] => {
    return []
}

/** 将 resourceTemplates 里的信息格式化成前端结构 */
export const formatMCPResourceTemplates = (templates: any[]): MCPServeResourcesTemplates[] => {
    const data: MCPServeResourcesTemplates[] = []
    try {
        for (let item of templates) {
            const info: MCPServeResourcesTemplates = {name: "", uriTemplate: ""}
        }
    } catch (error) {}
    return data
}
