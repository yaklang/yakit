import {ReactNode} from "react"
import {AIAgentSetting, AIAgentTab} from "./aiAgentType"
import {MCPTransportType} from "./type/mcpClient"
import {OutlineCogIcon, OutlineSparklesIcon, OutlineTemplateIcon, OutlineWrenchIcon} from "@/assets/icon/outline"

/** AI-Agent 页面的唯一 id */
export const YakitAIAgentPageID = "yakit-ai-agent"

export const AIAgentTabList: {key: AIAgentTab; title: string; icon: ReactNode}[] = [
    // {key: "mcp", title: "MCP"},
    {key: "history", title: "历史会话", icon: <OutlineSparklesIcon />},
    {key: "setting", title: "配置", icon: <OutlineCogIcon />},
    {key: "forgeName", title: "模板", icon: <OutlineTemplateIcon />},
    {key: "tool", title: "工具", icon: <OutlineWrenchIcon />}
]

/** ai-agent 聊天全局配置参数默认值 */
export const AIAgentSettingDefault: AIAgentSetting = {
    EnableSystemFileSystemOperator: true,
    UseDefaultAIConfig: true,
    ForgeName: "",
    DisallowRequireForUserPrompt: false,
    ReviewPolicy: "manual",
    AIReviewRiskControlScore: 0.5,
    DisableToolUse: false,
    AICallAutoRetry: 3,
    AITransactionRetry: 5,
    EnableAISearchTool: true,
    EnableAISearchInternet: true,
    AllowPlanUserInteract: true,
    PlanUserInteractMaxCount: 3
}

/** mcp 自定义服务器配置类型选项 */
export const MCPTransportTypeList: {value: MCPTransportType; label: string}[] = [
    {label: "SSE", value: "sse"},
    {label: "STDIO", value: "stdio"}
]
