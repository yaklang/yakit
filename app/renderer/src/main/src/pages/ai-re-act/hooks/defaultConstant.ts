import {AIChatMessage} from "@/pages/ai-agent/type/aiChat"

export const DefaultAIToolResult: AIChatMessage.AIToolData = {
    callToolId: "",
    toolName: "-",
    status: "default",
    summary: "",
    time: 0,
    selectors: [],
    interactiveId: "",
    toolStdoutContent: {
        content: "",
        isShowAll: false
    }
}

/** AI 流式输出中, NodeId 对应展示的内容 */
export const AIStreamNodeIdToLabel: Record<string, {label: string}> = {
    "re-act-loop": {label: "推理与行动"},
    "call-forge": {label: "智能应用"},
    "call-tools": {label: "工具调用"},
    review: {label: "审查系统"},
    liteforge: {label: "轻量智能应用"},
    directly_answer: {label: "直接回答"},
    "memory-reducer": {label: "记忆裁剪"},
    "memory-timeline": {label: "记忆浓缩"},
    execute: {label: "执行"},
    summary: {label: "总结"},
    "create-subtasks": {label: "创建子任务"},
    "freedom-plan-review": {label: "计划审查"},
    "dynamic-plan": {label: "动态规划"},
    "re-act-verify": {label: "核实结果"},
    result: {label: "结果输出"},
    plan: {label: "任务规划"},
    decision: {label: "决策"},
    output: {label: "通用输出"},
    forge: {label: "智能应用"},
    "re-act-loop-thought": {label: "思考"}
}

/** AI 判断 review 的风险阈值等级对应的展示内容 */
export const AIReviewJudgeLevelMap: Record<string, {label: string}> = {
    low: {label: "低风险自动同意"},
    middle: {label: "等待用户否决"},
    high: {label: "需人工确认"}
}
