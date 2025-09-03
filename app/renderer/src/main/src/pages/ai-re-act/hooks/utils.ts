/**
 * chat 对话数据相关处理工具
 */

import {generateTaskChatExecution} from "@/pages/ai-agent/defaultConstant"
import {AIChatMessage, AIOutputEvent, AIStartParams} from "@/pages/ai-agent/type/aiChat"
import {Uint8ArrayToString} from "@/utils/str"
import {v4 as uuidv4} from "uuid"

/** 将接口数据(AIOutputEvent)转换为日志数据(AIChatMessage.Log), 并push到日志队列中 */
export const handleGrpcDataPushLog = (params: {
    type: string
    info: AIOutputEvent
    pushLog: (log: AIChatMessage.Log) => void
}) => {
    try {
        const {type, info, pushLog} = params
        let ipcContent = Uint8ArrayToString(info.Content) || ""
        const logInfo: AIChatMessage.Log = {
            id: uuidv4(),
            level: type || "info",
            message: `${JSON.stringify({...info, Content: ipcContent, StreamDelta: undefined})}`
        }
        pushLog(logInfo)
    } catch (error) {}
}

/** 将树结构任务列表转换成一维数组 */
export const handleFlatAITree = (sum: AIChatMessage.PlanTask[], task: AIChatMessage.PlanTask) => {
    if (!Array.isArray(sum)) return null
    sum.push(generateTaskChatExecution(task))
    if (task.subtasks && task.subtasks.length > 0) {
        for (let subtask of task.subtasks) {
            handleFlatAITree(sum, subtask)
        }
    }
}

/** 不跳过 review 的数据类型 */
export const noSkipReviewTypes = (type: string) => {
    return ["require_user_interactive"].includes(type)
}

/** 判断是否为tool_xxx_stdout类型数据 */
export const isToolStdoutStream = (nodeID: string) => {
    if (!nodeID) return false
    return nodeID.startsWith("tool-") && nodeID.endsWith("-stdout")
}
/** 判断是否为工具执行的流程类型数据 */
export const isToolExecStream = (nodeID: string) => {
    if (nodeID === "execute") return true
    if (nodeID === "call-tools") return true
    if (isToolStdoutStream(nodeID)) return true
    return false
}
