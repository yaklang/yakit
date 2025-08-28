/**
 * chat 对话数据相关处理工具
 */

import {generateTaskChatExecution} from "@/pages/ai-agent/defaultConstant"
import {AIChatMessage, AIOutputEvent, AIStartParams} from "@/pages/ai-agent/type/aiChat"

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

/** 是否为自动执行reivew策略 */
export const isAutoExecReview = (request?: AIStartParams) => {
    if (request && request.ReviewPolicy === "yolo") return true
    return false
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
