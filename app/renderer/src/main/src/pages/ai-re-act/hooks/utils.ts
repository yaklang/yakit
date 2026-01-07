/**
 * chat 对话数据相关处理工具
 */

import {generateTaskChatExecution} from "@/pages/ai-agent/defaultConstant"
import {Uint8ArrayToString} from "@/utils/str"
import {v4 as uuidv4} from "uuid"
import {AIAgentGrpcApi, AIOutputEvent} from "./grpcApi"
import {AITaskInfoProps} from "./aiRender"
import {AIAgentSetting} from "@/pages/ai-agent/aiAgentType"
import {AIChatLogData, AIChatLogToInfo} from "./type"

/** 生成AI-UI展示的必须基础数据 */
export const genBaseAIChatData = (info: AIOutputEvent) => {
    return {
        id: uuidv4(),
        AIService: info.AIService,
        AIModelName: info.AIModelName,
        Timestamp: info.Timestamp
    }
}

/** 生成一个异常日志数据的对象 */
export const genErrorLogData = (
    Timestamp: AIChatLogToInfo["Timestamp"],
    message: AIChatLogToInfo["data"]["message"]
): AIChatLogToInfo => {
    return {
        type: "log",
        Timestamp,
        data: {level: "error", message: message}
    }
}

/** 将接口数据(AIOutputEvent)转换为日志数据(AIAgentGrpcApi.Log), 并push到日志队列中 */
export const handleGrpcDataPushLog = (params: {info: AIOutputEvent; pushLog: (log: AIChatLogData) => void}) => {
    try {
        const {info, pushLog} = params
        // 这类类型的数据从日志数据中屏蔽掉，后续的stream类型逻辑会使用到
        if (info.Type === "stream_start") return
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

    if (!Array.isArray(task.subtasks) || task.subtasks.length === 0) {
        tasks.push({...task, subtasks: undefined, level, isLeaf: true})
        return
    } else {
        tasks.push({...task, subtasks: undefined, level, isLeaf: false})
    }

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

/** 是否自动执行review的continue操作 */
export const isAutoExecuteReviewContinue = (params: {type?: string; getFunc?: () => AIAgentSetting | undefined}) => {
    try {
        const {type, getFunc} = params
        if (!!type && ["require_user_interactive"].includes(type)) {
            // AI交互review不自动执行
            return false
        } else {
            if (getFunc) {
                const request = getFunc()
                return request ? request.ReviewPolicy === "yolo" : false
            }
            return false
        }
    } catch (error) {
        return false
    }
}

/** 判断是否为tool_xxx_stdout类型数据 */
export const isToolStdoutStream = (nodeID: string) => {
    if (!nodeID) return false
    return nodeID.startsWith("tool-") && nodeID.endsWith("-stdout")
}
/** 判断是否为tool_xxx_stderr类型数据 */
export const isToolStderrStream = (nodeID: string) => {
    if (!nodeID) return false
    return nodeID.startsWith("tool-") && nodeID.endsWith("-stderr")
}
/** 判断是否为工具执行的流程类型数据(call-tools 和 tool-xxx-stdout) */
export const isToolExecStream = (nodeID: string) => {
    if (nodeID === "call-tools") return true
    if (isToolStdoutStream(nodeID)) return true
    return false
}
