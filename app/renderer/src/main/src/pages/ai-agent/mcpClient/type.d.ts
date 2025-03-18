import {Client} from "@modelcontextprotocol/sdk/client/index"

/** MCP的 transport 类型 */
export type MCPTransportType = "sse" | "stdio"

/** 客户端配置信息 */
export interface MCPClientInfo {
    /** 唯一标识 */
    id: string
    type: MCPTransportType

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
}

/** MCP客户端池信息 */
export interface MCPClientPoolInfo {
    /** 客户端 */
    client: Client
    /** 客户端配置 */
    info: MCPClientInfo
    /** 连接状态 */
    connected: boolean
}

/** MCP客户端资源 */
export interface MCPClientResource {
    tools: any[]
    resourceTemplates: any[]
}

/** MCP-progress */
export interface MCPDataProgress {
    /** 进度 */
    progress: number
    /** 总量 */
    total: string
}
/** MCP-Data */
export interface MCPData {
    content: {type: string; text: string}[]
}
