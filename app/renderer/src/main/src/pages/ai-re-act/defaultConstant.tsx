import {ReactNode} from "react"
import {AIReActSetting, AIReActTab} from "./aiReActType"
import {OutlineCogIcon, OutlineSparklesIcon} from "@/assets/icon/outline"
import {AIChatMessage} from "../ai-agent/type/aiChat"

/** AI-ReAct 页面的唯一 id */
export const YakitAIReActPageID = "yakit-ai-re-act"

export const AIReActTabList: {key: AIReActTab; title: string; icon: ReactNode}[] = [
    {key: "history", title: "历史会话", icon: <OutlineSparklesIcon />},
    {key: "setting", title: "配置", icon: <OutlineCogIcon />}
]

/** ai-re-act 聊天全局配置参数默认值 */
export const AIReActSettingDefault: AIReActSetting = {
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

/**
 * @name 生成一个[AIChatMessage.PlanTask]任务信息
 * @description 生成的信息内不存在subtasks字段值
 */
export const generateTaskChatExecution: (info?: AIChatMessage.PlanTask) => AIChatMessage.PlanTask = (info) => {
    let data: AIChatMessage.PlanTask = {
        index: "",
        description: "",
        isDone: false,
        isSkipped: false,
        isAction: false,
        isPlanning: false,
        isExecuting: false,
        isFailed: false,
        isCompleted: false,
        isExpanded: false,
        timestamp: 0,
        runtime: {
            total: 0,
            input: 0,
            output: 0,
            cost: 0
        },
        ...info
    }

    return data
}

/** 根据任务状态确定任务的图标类型 */
export const conversionTaskStatus: (info: AIChatMessage.PlanTask) => AIChatMessage.PlanTask["status"] = (info) => {
    if (info.isFailed) return "failed"
    if (info.isCompleted) return "finished"
    if (info.isSkipped) return "skipped"
    if (info.isExecuting) return "executing"
    if (info.isPlanning) return "planning"
    if (info.isDone) return "finished"
    return "default"
}
