import {AIToolResult} from "./aiRender"
import {AIOutputI18n} from "./grpcApi"
import {AIQuestionQueues} from "./type"

export const DefaultAIToolResult: AIToolResult = {
    callToolId: "",
    toolName: "-",
    status: "default",
    summary: "",
    toolStdoutContent: {
        content: "",
        isShowAll: false
    },
    execError: ""
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

export const CasualDefaultToolResultSummary: Record<string, {label: string}> = {
    failed: {label: "执行失败"},
    success: {label: "执行成功"},
    user_cancelled: {label: "用户取消"}
}

export const TaskDefaultReToolResultSummary: Record<string, {label: string}> = {
    failed: {label: "获取失败原因中..."},
    success: {label: "执行结果正在总结中..."},
    user_cancelled: {label: "工具调用取消中..."}
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

export const DeafultAIQuestionQueues: AIQuestionQueues = {
    total: 0,
    data: []
}

export enum AIInputEventSyncTypeEnum {
    /** 获取树 */
    SYNC_TYPE_PLAN = "plan",
    SYNC_TYPE_CONSUMPTION = "consumption",
    SYNC_TYPE_PING = "ping",
    SYNC_TYPE_SET_CONFIG = "set_config",
    SYNC_TYPE_PROCESS_EVENT = "sync_process_event",
    /** 获取队列信息 */
    SYNC_TYPE_QUEUE_INFO = "queue_info",
    /** 查看上下文 */
    SYNC_TYPE_TIMELINE = "timeline",
    SYNC_TYPE_KNOWLEDGE = "enhance_knowledge",
    /**@deprecated 更新AI配置 更改为hotpatchType*/
    SYNC_TYPE_UPDATE_CONFIG = "update_config",
    SYNC_TYPE_MEMORY_CONTEXT = "memory_sync",
    SYNC_TYPE_REACT_CANCEL_CURRENT_TASK = "react_cancel_current_task",
    /** 队列置顶 */
    SYNC_TYPE_REACT_JUMP_QUEUE = "react_jump_queue",
    /** 移除队列 */
    SYNC_TYPE_REACT_REMOVE_TASK = "react_remove_task",
    /** 清空队列 */
    SYNC_TYPE_REACT_CLEAR_TASK = "react_clear_task"
}

export enum AIInputEventHotPatchTypeEnum {
    HotPatchType_AllowRequireForUserInteract = "AllowRequireForUserInteract",
    HotPatchType_AgreePolicy = "AgreePolicy",
    HotPatchType_AIService = "AIService",
    HotPatchType_RiskControlScore = "RiskControlScore"
}
