import {ReactNode} from "react"
import {AIAgentTab} from "./aiAgentType"
import {MCPTransportType} from "./type/mcpClient"
import {OutlineCogIcon, OutlineSparklesIcon} from "@/assets/icon/outline"

/** AI-Agent 页面的唯一 id */
export const YakitAIAgentPageID = "yakit-ai-agent"

export const AIAgentTabList: {key: AIAgentTab; title: string; icon: ReactNode}[] = [
    // {key: "mcp", title: "MCP"},
    {key: "history", title: "历史会话", icon: <OutlineSparklesIcon />},
    {key: "setting", title: "配置", icon: <OutlineCogIcon />}
]

export const MCPTransportTypeList: {value: MCPTransportType; label: string}[] = [
    {label: "SSE", value: "sse"},
    {label: "STDIO", value: "stdio"}
]
