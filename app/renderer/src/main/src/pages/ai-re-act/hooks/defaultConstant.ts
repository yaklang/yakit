import {AIToolResult} from "./aiRender"
import {AIAgentGrpcApi, AIOutputI18n} from "./grpcApi"
import {AIQuestionQueues, CasualLoadingStatus, PlanLoadingStatus} from "./type"

/** 工具执行结果-默认值 */
export const DefaultAIToolResult: AIToolResult = {
    type: "",
    callToolId: "",
    toolName: "-",
    toolDescription: "",
    startTime: 0,
    startTimeMS: 0,
    endTime: 0,
    endTimeMS: 0,
    durationMS: 0,
    durationSeconds: 0,
    stream: {
        EventUUID: "",
        NodeId: "",
        NodeIdVerbose: {Zh: "", En: ""},
        status: "start",
        content: "",
        ContentType: ""
    },
    tool: {
        status: "default",
        summary: "",
        execError: "",
        dirPath: "",
        resultDetails: ""
    }
}
/** 工作执行结果总结-不同阶段的默认展示内容 */
export const DefaultToolResultSummary: Record<string, {wait: string; result: string}> = {
    failed: {wait: "获取失败原因中...", result: "执行失败"},
    success: {wait: "执行结果正在总结中...", result: "执行成功"},
    user_cancelled: {wait: "工具调用取消中...", result: "用户取消"}
}

/** AI 流式输出中, NodeId 对应展示的内容 */
const AIStreamNodeIdToLabel: Record<string, {label: string}> = {
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
    "re-act-loop-thought": {label: "思考"},
    "re-act-loop-answer-payload": {label: "AI 响应"},
    "enhance-query": {label: "知识增强"}
}
/** 传入 NodeId, 输出展示内容的18n 结构 */
export const convertNodeIdToVerbose = (nodeId: string) => {
    const label = AIStreamNodeIdToLabel[nodeId]?.label || nodeId
    const verbose18n: AIOutputI18n = {
        Zh: label,
        En: label
    }
    return verbose18n
}

/** AI 判断 review 的风险阈值等级对应的展示内容 */
export const AIReviewJudgeLevelMap: Record<string, {label: string}> = {
    low: {label: "低风险自动同意"},
    middle: {label: "等待用户否决"},
    high: {label: "需人工确认"}
}

/**流内容的展示类型枚举 */
export enum AIStreamContentType {
    /**默认 */
    DEFAULT = "default",
    /**md格式 */
    TEXT_MARKDOWN = "text/markdown",
    /**YakitEditor */
    CODE_YAKLANG = "code/yaklang",
    /**请求包 */
    CODE_HTTP_REQUEST = "code/http-request",
    /**卡片/多行 */
    TEXT_PLAIN = "text/plain",
    /**tool 紫色卡片 */
    LOG_TOOL = "log/tool",
    /**tool 错误输出 */
    LOG_TOOL_ERROR_OUTPUT = "log/tool-error-output"
}

/** 问题队列-默认值 */
export const DeafultAIQuestionQueues: AIQuestionQueues = {
    total: 0,
    data: []
}

/** 记忆列表默认值 */
export const DefaultMemoryList: AIAgentGrpcApi.MemoryEntryList = {
    memories: [],
    memory_pool_limit: 0,
    memory_session_id: "default",
    total_memories: 0,
    total_size: 0,
    score_overview: {
        A_total: 0,
        C_total: 0,
        E_total: 0,
        O_total: 0,
        P_total: 0,
        R_total: 0,
        T_total: 0
    }
}

/** 自由对话(ReAct)loading-默认值 */
export const DefaultCasualLoadingStatus: CasualLoadingStatus = {
    loading: false,
    title: "thinking..."
}
/** 任务规划loading-默认值 */
export const DefaultPlanLoadingStatus: PlanLoadingStatus = {
    loading: false,
    plan: "加载中...",
    task: "加载中..."
}
