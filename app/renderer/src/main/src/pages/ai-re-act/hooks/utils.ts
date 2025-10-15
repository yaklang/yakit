/**
 * chat 对话数据相关处理工具
 */

import {generateTaskChatExecution} from "@/pages/ai-agent/defaultConstant"
import {Uint8ArrayToString} from "@/utils/str"
import {v4 as uuidv4} from "uuid"
import {AIAgentGrpcApi, AIOutputEvent, AIStartParams} from "./grpcApi"
import {AIChatQSData} from "./aiRender"
import {convertNodeIdToVerbose} from "./defaultConstant"

/** 将接口数据(AIOutputEvent)转换为日志数据(AIAgentGrpcApi.Log), 并push到日志队列中 */
export const handleGrpcDataPushLog = (params: {
    type: string
    info: AIOutputEvent
    pushLog: (log: AIChatQSData) => void
}) => {
    try {
        const {type, info, pushLog} = params
        let ipcContent = Uint8ArrayToString(info.Content) || ""
        const logInfo: AIChatQSData = {
            id: uuidv4(),
            type: "log",
            data: {
                NodeId: info.NodeId,
                NodeIdVerbose: info.NodeIdVerbose || convertNodeIdToVerbose(info.NodeId),
                level: type || "info",
                message: `${JSON.stringify({...info, Content: ipcContent, StreamDelta: undefined})}`
            },
            Timestamp: info.Timestamp
        }
        pushLog(logInfo)
    } catch (error) {}
}

/** 将树结构任务列表转换成一维数组 */
export const handleFlatAITree = (sum: AIAgentGrpcApi.PlanTask[], task: AIAgentGrpcApi.PlanTask) => {
    if (!Array.isArray(sum)) return null
    sum.push(generateTaskChatExecution(task))
    if (task.subtasks && task.subtasks.length > 0) {
        for (let subtask of task.subtasks) {
            handleFlatAITree(sum, subtask)
        }
    }
}

/** 判断接口请求参数里，是否自动继续执行 review 操作 */
export const isAutoContinueReview = (getFunc?: () => AIStartParams | undefined) => {
    try {
        if (getFunc) {
            const request = getFunc()
            return request ? request.ReviewPolicy === "yolo" : false
        }
        return false
    } catch (error) {
        return false
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
/** 判断是否为工具执行的流程类型数据(call-tools 和 tool-xxx-stdout) */
export const isToolExecStream = (nodeID: string) => {
    if (nodeID === "call-tools") return true
    if (isToolStdoutStream(nodeID)) return true
    return false
}
