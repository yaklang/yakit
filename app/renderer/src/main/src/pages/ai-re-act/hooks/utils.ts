/**
 * chat 对话数据相关处理工具
 */

import {generateTaskChatExecution} from "@/pages/ai-agent/defaultConstant"
import {Uint8ArrayToString} from "@/utils/str"
import {v4 as uuidv4} from "uuid"
import {AIAgentGrpcApi, AIOutputEvent} from "./grpcApi"
import {AITaskInfoProps} from "./aiRender"
import {AIAgentSetting} from "@/pages/ai-agent/aiAgentType"
import {AIChatLogData} from "./type"

/** 生成AI-UI展示的必须基础数据 */
export const genBaseAIChatData = (info: AIOutputEvent) => {
    return {
        id: uuidv4(),
        AIService: info.AIService,
        Timestamp: info.Timestamp
    }
}

/** 将接口数据(AIOutputEvent)转换为日志数据(AIAgentGrpcApi.Log), 并push到日志队列中 */
export const handleGrpcDataPushLog = (params: {info: AIOutputEvent; pushLog: (log: AIChatLogData) => void}) => {
    try {
        const {info, pushLog} = params
        let ipcContent = Uint8ArrayToString(info.Content) || ""
        const logInfo: AIChatLogData = {
            type: "log",
            Timestamp: info.Timestamp,
            data: {
                level: `${info.Type}-${info.NodeId}`,
                message: ipcContent
            }
        }
        pushLog(logInfo)
    } catch (error) {}
}

// #region 处理任务规划-任务树相关方法
/** 将传入任务区分出可执行任务和父任务两种情况 */
const genExecTask = (params: {task: AIAgentGrpcApi.PlanTask; level: number; tasks: AITaskInfoProps[]}) => {
    const {task, level, tasks} = params

    tasks.push({...task, subtasks: undefined, level})
    if (!Array.isArray(task.subtasks) || task.subtasks.length === 0) return
    for (let subtask of task.subtasks) {
        genExecTask({level: level + 1, task: subtask, tasks: tasks})
    }
}

/** 将一颗任务树转换成可执行任务的一维数组 */
export const genExecTasks = (taskTree: AIAgentGrpcApi.PlanTask) => {
    const execTasks: AITaskInfoProps[] = []
    genExecTask({task: taskTree, level: 1, tasks: execTasks})
    execTasks.shift()
    return execTasks
}
// #endregion

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
export const isAutoContinueReview = (getFunc?: () => AIAgentSetting | undefined) => {
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
