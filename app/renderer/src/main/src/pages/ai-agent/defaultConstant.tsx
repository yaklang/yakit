import {ReactNode} from "react"
import {AIAgentSetting, AIAgentTab} from "./aiAgentType"
import {MCPTransportType} from "./type/mcpClient"
import {OutlineCogIcon, OutlineSparklesIcon, OutlineTemplateIcon, OutlineWrenchIcon} from "@/assets/icon/outline"
import {AIChatMessage} from "./type/aiChat"

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
    EnableQwenNoThinkMode: true,
    AllowPlanUserInteract: true,
    PlanUserInteractMaxCount: 3
}

/** mcp 自定义服务器配置类型选项 */
export const MCPTransportTypeList: {value: MCPTransportType; label: string}[] = [
    {label: "SSE", value: "sse"},
    {label: "STDIO", value: "stdio"}
]

/**
 * @name 生成一个[AIChatMessage.PlanTask]任务信息
 * @description 生成的信息内不存在subtasks字段值
 */
export const generateTaskChatExecution: (info?: AIChatMessage.PlanTask) => AIChatMessage.PlanTask = (info) => {
    let data: AIChatMessage.PlanTask = {
        index: "",
        name: "",
        goal: "",
        progress: "wait",
        isRemove: false,
        tools: [],
        description: ""
    }
    if (!!info) {
        data.index = info.index || ""
        data.name = info.name || ""
        data.goal = info.goal || ""
        data.progress = info.progress || "wait"
        data.isRemove = info.isRemove || false
        data.tools = info.tools || []
        data.description = info.description || ""
    }

    return data
}
