import {ReactNode} from "react"
import {AIAgentSetting, AIAgentTab} from "./aiAgentType"
import {MCPTransportType} from "./type/mcpClient"
import {OutlineCogIcon, OutlineSparklesIcon, OutlineTemplateIcon, OutlineWrenchIcon} from "@/assets/icon/outline"
import {AIChatMessage} from "./type/aiChat"
import {YakitSideTabProps} from "@/components/yakitSideTab/YakitSideTabType"
import {genDefaultPagination, PaginationSchema} from "../invoker/schema"
import {YakitTagColor} from "@/components/yakitUI/YakitTag/YakitTagType"
import {
    ChatGLMIcon,
    ComateIcon,
    DeepSeekIcon,
    GeminiIcon,
    MoonshotIcon,
    OllamaIcon,
    OpenAIIcon,
    OpenRouterIcon,
    SiliconFlowIcon,
    TongyiIcon,
    YakIcon
} from "./aiModelList/icon"

/** AI-Agent 页面的唯一 id */
export const YakitAIAgentPageID = "yakit-ai-agent"

export const AIAgentTabList: {key: AIAgentTab; title: string; icon: ReactNode}[] = [
    // {key: "mcp", title: "MCP"},
    {key: "history", title: "历史会话", icon: <OutlineSparklesIcon />},
    {key: "setting", title: "配置", icon: <OutlineCogIcon />},
    {key: "forgeName", title: "模板", icon: <OutlineTemplateIcon />},
    {key: "tool", title: "工具", icon: <OutlineWrenchIcon />},
    {key: "AIModel", title: "AI模型", icon: <OutlineWrenchIcon />}
]

/** ai-agent 聊天全局配置参数默认值 */
export const AIAgentSettingDefault: AIAgentSetting = {
    EnableSystemFileSystemOperator: true,
    UseDefaultAIConfig: true,
    ForgeName: "",
    DisallowRequireForUserPrompt: true,
    ReviewPolicy: "manual",
    AIReviewRiskControlScore: 0.5,
    DisableToolUse: false,
    AICallAutoRetry: 3,
    AITransactionRetry: 5,
    EnableAISearchTool: true,
    EnableAISearchInternet: true,
    EnableQwenNoThinkMode: true,
    AllowPlanUserInteract: true,
    PlanUserInteractMaxCount: 3,
    AIService: "",
    ReActMaxIteration: 100,
    TimelineItemLimit: 100,
    TimelineContentSizeLimit: 20 * 1024,
    UserInteractLimit: 0
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

export enum AITabsEnum {
    Task_Content = "task-content",
    File_System = "file-system",
    HTTP = "http",
    Risk = "risk"
}
/** @name AI 默认展示的tab集合 */
export const AITabs: YakitSideTabProps["yakitTabs"] = [
    {label: "任务内容", value: AITabsEnum.Task_Content},
    {label: "更新文件系统", value: AITabsEnum.File_System},
    {label: "HTTP 流量", value: AITabsEnum.HTTP},
    {label: "漏洞与风险", value: AITabsEnum.Risk}
]

/** AI-Forge 列表查询条件里的页码默认条件 */
export const AIForgeListDefaultPagination: PaginationSchema = {
    ...genDefaultPagination(20),
    OrderBy: "id"
}

export const tagColors: YakitTagColor[] = [
    "blue",
    "bluePurple",
    "cyan",
    "green",
    "info",
    "purple",
    "success",
    "warning",
    "yellow"
]

export const AIOnlineModelIconMap: Record<string, ReactNode> = {
    openai: <OpenAIIcon />,
    chatglm: <ChatGLMIcon />,
    moonshot: <MoonshotIcon />,
    tongyi: <TongyiIcon />,
    comate: <ComateIcon />,
    deepseek: <DeepSeekIcon />,
    siliconflow: <SiliconFlowIcon />,
    ollama: <OllamaIcon />,
    openrouter: <OpenRouterIcon />,
    gemini: <GeminiIcon />,
    "yaklang-writer": <YakIcon />,
    "yaklang-rag": <YakIcon />,
    "yaklang-com-search": <YakIcon />,
    "yakit-plugin-search": <YakIcon />,
    aibalance: <YakIcon />
}

export enum AILocalModelTypeEnum {
    AIChat = "aichat",
    Embedding = "embedding",
    SpeechToText = "speech-to-text"
}
