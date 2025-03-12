import {AIAgentTab} from "./aiAgentType"
import {MCPTransportType} from "./mcpClient/type"

export const AIAgentTabList: {key: AIAgentTab; title: string}[] = [{key: "mcp", title: "MCP"}]

export const MCPTransportTypeList: {value: MCPTransportType; label: string}[] = [
    {label: "SSE", value: "sse"},
    {label: "STDIO", value: "stdio"}
]
