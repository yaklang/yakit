export interface AIAgentProps {}

/** tab 类型 */
export type AIAgentTab = "mcp"

type AIAgentServerType = "sse" | "stdio"

/** resourcesTemplates */
export interface MCPServeResourcesTemplates {
    name: string
    uriTemplate: string
}

/** tool-param */
export interface MCPServeToolsParam {
    key: string
    type: string
    description: string
}
/** tools */
export interface MCPServeTools {
    name: string
    description: string
    params: MCPServeToolsParam[]
}

/** 服务器信息 */
export interface AIAgentServerInfo {
    id: string
    type: AIAgentServerType
    /** sse-url */
    url?: string
    /** stdio-command */
    command?: string
    /** stdio-args */
    args?: string[]
    /** stdio-env */
    env?: Record<string, string>
    /** stdio-cwd */
    cwd?: string

    /** 连接状态 */
    status: boolean

    tools: MCPServeTools[]
    resourceTemplates?: MCPServeResourcesTemplates[]
}

export interface ServerSettingProps {}

export interface AddServerModalProps {
    info?: AIAgentServerInfo
    visible: boolean
    onCallback: (result: boolean, info?: AIAgentServerInfo) => viod
}
