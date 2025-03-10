import {AIAgentServerType, AIAgentTab} from "./aiAgentType"

export const AIAgentTabList: {key: AIAgentTab; title: string}[] = [{key: "mcp", title: "MCP"}]

export const AIAgentServerTypeList: {value: AIAgentServerType; label: string}[] = [
    {label: "SSE", value: "sse"},
    {label: "STDIO", value: "stdio"}
]
