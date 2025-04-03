import {AIAgentSetting, AIAgentTab} from "./aiAgentType"
import {MCPTransportType} from "./type/mcpClient"

export const AIAgentTabList: {key: AIAgentTab; title: string}[] = [
    {key: "mcp", title: "MCP"},
    {key: "setting", title: "配置"},
    {key: "log", title: "日志"}
]

export const DefaultAIAgentSetting: AIAgentSetting = {
    autoExecute: false,
    EnableSystemFileSystemOperator: false,
    UseDefaultAIConfig: true
}

export const MCPTransportTypeList: {value: MCPTransportType; label: string}[] = [
    {label: "SSE", value: "sse"},
    {label: "STDIO", value: "stdio"}
]
