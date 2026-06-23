/**
 * chat 对话数据相关处理工具
 */
import type { AIAgentSetting } from '@/pages/ai-agent/aiAgentType'
import type { DialogueRecord } from '@/pages/ai-agent/store/type'
import type {
  AITaskInfoProps,
  ReActChatRenderItem,
  AIChatQSDataType,
  TodoListCardData,
  ChatListRenderType,
} from './aiRender'
import type { AIChatLogToInfo, AIChatLogData } from './type'
import type { AIAgentGrpcApi, AIOutputEvent } from './grpcApi'
import { AIToDoListStatusEnum, generateTaskChatExecution } from '@/pages/ai-agent/defaultConstant'
import { Uint8ArrayToString } from '@/utils/str'
import { v4 as uuidv4 } from 'uuid'
import { JSONParseLog } from '@/utils/tool'

/** 生成任务节点的唯一ID */
export const generateTaskNodeID = (planID: string, taskID: string) => {
  return `${planID}-${taskID || 'unknown'}`
}
/**
 * 任务节点内的数据生成任务节点ID
 * @param isExist 生成的任务节点是否已经存在，不存在则不是任务节点数据，归为默认节点内的数据
 */
export const generateTaskNodeDataID = (params: {
  chatType: ChatListRenderType
  planID?: string
  taskID: AIOutputEvent['TaskIndex']
  isExist: (key: string) => boolean
}) => {
  const { chatType, planID, taskID, isExist } = params
  // 自由对话或者没有任务规划ID，则不生成任务节点ID
  if (chatType === 'reAct' || !planID) return undefined
  const keyLabel = `${planID}-${taskID || 'unknown'}`
  if (isExist(keyLabel)) return keyLabel
  return `${planID}-unknown`
}

/** TaskIndex 合法格式：数字与 `-` 组合，如 1-1、1-2 */
export const TASK_INDEX_PATTERN = /^\d+(?:-\d+)+$/
/** 校验 TaskIndex 是否符合任务子索引格式 */
export const isValidTaskIndex = (taskIndex?: string): boolean => !!taskIndex && TASK_INDEX_PATTERN.test(taskIndex)

/** 生成AI-UI展示的必须基础数据 */
export const genBaseAIChatData = (info: AIOutputEvent) => {
  return {
    id: uuidv4(),
    AIService: info.AIService,
    AIModelName: info.AIModelName,
    Timestamp: info.Timestamp,
  }
}

/** 生成一个异常日志数据的对象 */
export const genErrorLogData = (
  Timestamp: AIChatLogToInfo['Timestamp'],
  message: AIChatLogToInfo['data']['message'],
): AIChatLogToInfo => {
  return {
    type: 'log',
    Timestamp,
    data: { level: 'error', message: message },
  }
}

/** 将接口数据(AIOutputEvent)转换为日志数据(AIAgentGrpcApi.Log), 并push到日志队列中 */
export const handleGrpcDataPushLog = (params: { info: AIOutputEvent; pushLog: (log: AIChatLogData) => void }) => {
  try {
    const { info, pushLog } = params
    // 这类类型的数据从日志数据中屏蔽掉，后续的stream类型逻辑会使用到
    if (info.Type === 'stream_start') return
    let ipcContent = Uint8ArrayToString(info.Content) || ''
    const logInfo: AIChatLogData = {
      type: 'log',
      Timestamp: info.Timestamp,
      data: {
        level: `${info.Type}-${info.NodeId}`,
        message: ipcContent,
      },
    }
    pushLog(logInfo)
  } catch (error) {}
}

// #region 处理任务规划-任务树相关方法
/** 将传入任务区分出可执行任务和父任务两种情况 */
const genExecTask = (params: { task: AIAgentGrpcApi.PlanTask; level: number; tasks: AITaskInfoProps[] }) => {
  const { task, level, tasks } = params

  if (!Array.isArray(task.subtasks) || task.subtasks.length === 0) {
    tasks.push({ ...task, subtasks: undefined, level, isLeaf: true })
    return
  } else {
    tasks.push({ ...task, subtasks: undefined, level, isLeaf: false })
  }

  for (let subtask of task.subtasks) {
    genExecTask({ level: level + 1, task: subtask, tasks: tasks })
  }
}

/** 将一颗任务树转换成可执行任务的一维数组 */
export const genExecTasks = (taskTree: AIAgentGrpcApi.PlanTask) => {
  const execTasks: AITaskInfoProps[] = []
  genExecTask({ task: taskTree, level: 1, tasks: execTasks })
  execTasks.shift()
  // 将任务关联的任务名转换成task_index
  for (let item of execTasks) {
    if (item.depends_on && item.depends_on.length > 0) {
      item.depends_on = item.depends_on
        .map((depend) => {
          const dependTask = execTasks.find((t) => t.semantic_identifier === depend)
          return dependTask ? dependTask.index : ''
        })
        .filter(Boolean)
    }
  }
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
export const isAutoExecuteReviewContinue = (params: { type?: string; getFunc?: () => AIAgentSetting | undefined }) => {
  try {
    const { type, getFunc } = params
    if (!!type && ['require_user_interactive'].includes(type)) {
      // AI交互review不自动执行
      return false
    } else {
      if (getFunc) {
        const request = getFunc()
        return request ? request.ReviewPolicy === 'yolo' : false
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
  return nodeID.startsWith('tool-') && nodeID.endsWith('-stdout')
}
/** 判断是否为tool_xxx_stderr类型数据 */
export const isToolStderrStream = (nodeID: string) => {
  if (!nodeID) return false
  return nodeID.startsWith('tool-') && nodeID.endsWith('-stderr')
}
/** 判断是否为工具执行的流程类型数据(call-tools 和 tool-xxx-stdout) */
export const isToolExecStream = (nodeID: string) => {
  if (nodeID === 'call-tools') return true
  if (isToolStdoutStream(nodeID)) return true
  return false
}

/**
 * indexedDB 数据库数据转 ReActChatRenderItem
 */
export const indexedDBDataToReActChatRenderItem = (
  chatType: ChatListRenderType,
  data: DialogueRecord[],
): ReActChatRenderItem[] =>
  data.map((item) => {
    if (item.isGroup) {
      return {
        chatType,
        token: item.token,
        type: item.type as AIChatQSDataType,
        isGroup: true as const,
        children: JSONParseLog(item.children || '[]'),
        renderNum: 0,
        isCached: true,
        kind: item.kind,
      }
    }
    return {
      chatType,
      token: item.token,
      type: item.type as AIChatQSDataType,
      isGroup: false,
      renderNum: 0,
      children: JSONParseLog(item.children || '[]'),
      isCached: true,
      kind: 'item',
    }
  })

export function getTreeDataIds(tree: DialogueRecord[]): string[] {
  return tree.flatMap((item) => {
    let children: DialogueRecord[] = []
    if (item.children) {
      try {
        children = JSONParseLog(item.children)
      } catch {
        children = []
      }
    }

    return [item.token, ...getTreeDataIds(children)]
  })
}

export const toDialogueData = (elements: ReActChatRenderItem[], sessionId: string) =>
  elements.map((item, index) => ({
    token: item.token,
    type: item.type,
    kind: item.kind,
    isGroup: item.kind === 'group' || item.kind === 'task',
    children: JSON.stringify(item.kind === 'group' || item.kind === 'task' ? item.children : []),
    sessionId,
    cacheOrder: index,
  }))

/** 处理后端返回的todoList数据(全量数据，需要过滤出当前任务) */
export const handleTodoListData: (
  item: AIAgentGrpcApi.TodoListUpdateItem[],
  scopeTaskID: string,
  scopeTaskIndex: string,
) => TodoListCardData = (item, taskID, taskIndex) => {
  const scopeTaskID = (taskID || '').trim()
  const scopeTaskIndex = (taskIndex || '').trim()

  // 当前任务的todo-list
  const newItems = item.filter((item) => {
    if (!scopeTaskID && !scopeTaskIndex) return !item.scope_task_id && !item.scope_task_index
    const itemTaskID = (item.scope_task_id || '').trim()
    const itemTaskIndex = (item.scope_task_index || '').trim()
    return itemTaskID === scopeTaskID && itemTaskIndex === scopeTaskIndex
  })

  // 当前任务的todo状态统计
  const stats: AIAgentGrpcApi.TodoListUpdateStats = {
    deleted: 0,
    doing: 0,
    done: 0,
    pending: 0,
    skipped: 0,
  }
  for (const item of newItems) {
    switch (item.status) {
      case AIToDoListStatusEnum.Pending:
        stats.pending += 1
        break
      case AIToDoListStatusEnum.Doing:
        stats.doing += 1
        break
      case AIToDoListStatusEnum.Done:
        stats.done += 1
        break
      case AIToDoListStatusEnum.Deleted:
        stats.deleted += 1
        break
      case AIToDoListStatusEnum.Skipped:
        stats.skipped += 1
        break
      default:
        break
    }
  }

  return { items: newItems, stats, uuid: uuidv4() }
}
