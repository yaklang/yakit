import {AIAgentTab} from "./aiAgentType"
import {MCPTransportType} from "./type/mcpClient"

/** AI-Agent 页面的唯一 id */
export const YakitAIAgentPageID = "yakit-ai-agent"

export const AIAgentTabList: {key: AIAgentTab; title: string}[] = [
    // {key: "mcp", title: "MCP"},
    {key: "setting", title: "配置"},
    {key: "history", title: "历史对话"}
]

export const MCPTransportTypeList: {value: MCPTransportType; label: string}[] = [
    {label: "SSE", value: "sse"},
    {label: "STDIO", value: "stdio"}
]
