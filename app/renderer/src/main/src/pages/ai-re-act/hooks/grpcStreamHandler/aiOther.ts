import type { AIMessageHandler, AIMessageHandlerParams } from '../type'
import { AIInputEventSyncTypeEnum, AITaskStatus, type AIAgentGrpcApi, type AIOutputEvent } from '../grpcApi'
import { Uint8ArrayToString } from '@/utils/str'
import { genBaseAIChatData, generateTaskNodeID, genErrorLogData, genExecTasks } from '../utils'
import { type AIChatQSData, AIChatQSDataTypeEnum } from '../aiRender'
import cloneDeep from 'lodash/cloneDeep'
import { DefaultCurrentExecTaskTree, DefaultPlanLoadingStatus, DefaultTodoListCardData } from '../defaultConstant'
import has from 'lodash/has'

/** grpc流数据转换成错误信息输出到日志中 */
const handleErrorGRPCToLog: (
  /** 该条grpc流数据是历史数据 */
  isHistory: AIMessageHandlerParams['res']['IsSync'],
  pushLog: AIMessageHandlerParams['pushLog'],
  error: ReturnType<typeof genErrorLogData>,
) => void = (isHistory, pushLog, error) => {
  if (isHistory) return
  pushLog(error)
}

const handleHttpFuzzRequestChange: AIMessageHandler = (request) => {
  const { res, store, rawData } = request
  if (res.Type !== 'http_fuzz_request_change') return
  if (res.IsSync) return

  const ipcContent = Uint8ArrayToString(res.Content) || ''
  const httpFuzzRequest = JSON.parse(ipcContent) as AIAgentGrpcApi.HttpFuzzRequestChange
  rawData.httpFuzzRequest = httpFuzzRequest
  store.getState().updateStateCount('httpFuzzRequestUpdate')
}

const handleHttpFlowFuzzStatus: AIMessageHandler = (request) => {
  const { res, store, rawData } = request
  if (res.Type !== 'http_flow_fuzz_status') return
  if (res.IsSync) return

  const ipcContent = Uint8ArrayToString(res.Content) || ''
  const httpFlowFuzzStatus = JSON.parse(ipcContent) as AIAgentGrpcApi.GetHttpFlowFuzzStatus
  rawData.httpFlowFuzzStatus = httpFlowFuzzStatus
  store.getState().updateStateCount('httpFlowFuzzStatusUpdate')
}

const handleSessionTitle: AIMessageHandler = (request) => {
  const { res, store, rawData, pushLog } = request
  if (res.Type !== 'structured' || res.NodeId !== 'session_title') return
  if (res.IsSync) return

  const ipcContent = Uint8ArrayToString(res.Content) || ''
  const nameInfo = JSON.parse(ipcContent) as { title: string }
  if (!nameInfo || !nameInfo.title) {
    handleErrorGRPCToLog(
      res.IsSync,
      pushLog,
      genErrorLogData(res.Timestamp, `${res.NodeId}数据, 数据错误: ${JSON.stringify(nameInfo.title)}`),
    )
    return
  }
  rawData.sessionTitle = nameInfo.title
  store.getState().updateStateCount('sessionTitleUpdate')
}

const handleStartPlanAndExecution: AIMessageHandler = (request) => {
  const { res, store, rawData, meta, pushLog, sendRequest } = request
  if (res.Type !== 'start_plan_and_execution') return
  if (res.IsSync) return

  // 清空任务规划的todo-list数据
  rawData.taskChat.planDetailsMap.clear()

  const ipcContent = Uint8ArrayToString(res.Content) || ''
  const startInfo = JSON.parse(ipcContent) as AIAgentGrpcApi.AIStartPlanAndExecution
  if (!startInfo.coordinator_id) {
    handleErrorGRPCToLog(res.IsSync, pushLog, genErrorLogData(res.Timestamp, `${res.Type}数据, coordinator_id 为空`))
    return
  }
  meta.currentTaskPlanID = {
    taskID: startInfo['re-act_task'],
    status: AITaskStatus.inProgress,
    // 取消任务规划需要的数据id
    coordinatorId: startInfo.coordinator_id,
  }
  // 开始任务规划后，刷新历史任务树
  sendRequest({ IsSyncMessage: true, SyncType: AIInputEventSyncTypeEnum.SYNC_TYPE_PLAN_EXEC_TASKS })
  /** 获取最新任务树状态 */
  sendRequest({ IsSyncMessage: true, SyncType: AIInputEventSyncTypeEnum.SYNC_TYPE_PLAN })
  store.getState().updateState({
    taskStatus: { loading: true, plan: '加载中...', task: '加载中...' },
    showPlanList: true,
    cancelTaskLoading: false,
  })

  // 生成任务规划里的默认任务聚合组
  const taskID = generateTaskNodeID(meta.currentTaskPlanID.taskID, 'unknown')
  const chatData: AIChatQSData = {
    ...genBaseAIChatData(res),
    id: taskID,
    chatType: 'task',
    type: AIChatQSDataTypeEnum.TASK_DEFAULT_GROUP,
  } as AIChatQSData
  rawData.contents.set(chatData.id, chatData)
  store.getState().dispatchStreamingNode({
    chatType: 'task',
    node: {
      token: chatData.id,
      kind: 'task',
      type: chatData.type,
      dataOrigin: 'grpc_realtime_data',
    },
    groupTokenGenerator: () => '',
  })
}
const handleEndPlanAndExecution: AIMessageHandler = (request) => {
  const { res, store, rawData, meta, pushLog } = request
  if (res.Type !== 'end_plan_and_execution') return
  if (res.IsSync) return

  const ipcContent = Uint8ArrayToString(res.Content) || ''
  const startInfo = JSON.parse(ipcContent) as AIAgentGrpcApi.AIStartPlanAndExecution
  if (!startInfo.coordinator_id) {
    handleErrorGRPCToLog(res.IsSync, pushLog, genErrorLogData(res.Timestamp, `${res.Type}数据, coordinator_id 为空`))
    return
  }
  if (startInfo.coordinator_id === meta.currentTaskPlanID?.coordinatorId) {
    const chatData: AIChatQSData = {
      ...genBaseAIChatData(res),
      chatType: 'task',
      type: AIChatQSDataTypeEnum.END_PLAN_AND_EXECUTION,
      data: '',
    }
    rawData.contents.set(chatData.id, chatData)
    store.getState().dispatchStreamingNode({
      chatType: 'task',
      node: { token: chatData.id, kind: 'item', type: chatData.type, dataOrigin: 'grpc_realtime_data' },
      groupTokenGenerator: () => '',
    })
    const actives = Array.from(meta.currentTaskPlanActiveNode)
    meta.currentTaskPlanActiveNode.clear()
    for (const active of actives) {
      const taskNodeInfo = rawData.contents.get(active)
      if (!taskNodeInfo || taskNodeInfo.type !== AIChatQSDataTypeEnum.TASK_NODE_GROUP) {
        continue
      }
      taskNodeInfo.data.status = AITaskStatus.error
      store.getState().incrementNodeVersion(taskNodeInfo.id, 'task')
    }
    const newPlanTree = store.getState().taskChat.plan
    newPlanTree.task_tree = newPlanTree.task_tree.map((item) => {
      if (item.progress === AITaskStatus.inProgress) item.progress = AITaskStatus.error
      return item
    })
    store.getState().updatePlanTree(newPlanTree)
    store.getState().updateState({ taskStatus: cloneDeep(DefaultPlanLoadingStatus) })
  }
}

const handleMemoryContext: AIMessageHandler = (request) => {
  const { res, chatType, store, rawData, meta } = request
  if (res.Type !== 'memory_context') return

  const ipcContent = Uint8ArrayToString(res.Content) || ''
  const lists = JSON.parse(ipcContent) as AIAgentGrpcApi.MemoryEntryList
  if (chatType === 'reAct') {
    meta.casualMemoryList = lists
  } else {
    meta.taskMemoryList = lists
  }
  try {
    const newMemoryEntryList: AIAgentGrpcApi.MemoryEntryList = {
      memories: [...(meta.taskMemoryList.memories || []), ...(meta.casualMemoryList.memories || [])],
      memory_pool_limit:
        Number(meta.taskMemoryList.memory_pool_limit) + Number(meta.casualMemoryList.memory_pool_limit),
      memory_session_id: meta.casualMemoryList.memory_session_id,
      total_memories: Number(meta.taskMemoryList.total_memories) + Number(meta.casualMemoryList.total_memories),
      total_size: Number(meta.taskMemoryList.total_size) + Number(meta.casualMemoryList.total_size),
      score_overview: {
        A_total:
          Number(meta.taskMemoryList.score_overview.A_total) + Number(meta.casualMemoryList.score_overview.A_total),
        C_total:
          Number(meta.taskMemoryList.score_overview.C_total) + Number(meta.casualMemoryList.score_overview.C_total),
        E_total:
          Number(meta.taskMemoryList.score_overview.E_total) + Number(meta.casualMemoryList.score_overview.E_total),

        O_total:
          Number(meta.taskMemoryList.score_overview.O_total) + Number(meta.casualMemoryList.score_overview.O_total),
        P_total:
          Number(meta.taskMemoryList.score_overview.P_total) + Number(meta.casualMemoryList.score_overview.P_total),
        R_total:
          Number(meta.taskMemoryList.score_overview.R_total) + Number(meta.casualMemoryList.score_overview.R_total),
        T_total:
          Number(meta.taskMemoryList.score_overview.T_total) + Number(meta.casualMemoryList.score_overview.T_total),
      },
    }
    rawData.memoryList = newMemoryEntryList
    store.getState().updateStateCount('memoryListUpdate')
  } catch (error) {}
}

const handleFileSystemPin: AIMessageHandler = (request) => {
  const { res, store } = request
  if (res.Type !== 'filesystem_pin_directory' && res.Type !== 'filesystem_pin_filename') return
  if (res.IsSync) return

  const ipcContent = Uint8ArrayToString(res.Content) || ''
  const { path } = JSON.parse(ipcContent) as AIAgentGrpcApi.FileSystemPin
  store.getState().updateFolders({ path, isFolder: res.Type === 'filesystem_pin_directory' })
}

const handleTimelineItem: AIMessageHandler = (request) => {
  const { res, store } = request
  if (res.Type !== 'structured' || res.NodeId !== 'timeline_item') return
  if (res.IsSync) return

  const ipcContent = Uint8ArrayToString(res.Content) || ''
  const timelineItem = JSON.parse(ipcContent) as AIAgentGrpcApi.TimelineItem
  store.getState().updateTimeLineItem(timelineItem)
}

const handleReactTaskEnqueue: AIMessageHandler = (request) => {
  const { res, chatType, sendRequest } = request
  if (res.Type !== 'structured' || res.NodeId !== 'react_task_enqueue') return
  if (res.IsSync || chatType === 'task') return

  sendRequest({ IsSyncMessage: true, SyncType: AIInputEventSyncTypeEnum.SYNC_TYPE_QUEUE_INFO })
}
const handleReactTaskDequeue: AIMessageHandler = (request) => {
  const { res, chatType, store, rawData, meta, sendRequest } = request
  if (res.Type !== 'structured' || res.NodeId !== 'react_task_dequeue') return
  if (chatType === 'task') return

  const ipcContent = Uint8ArrayToString(res.Content) || ''
  const data = JSON.parse(ipcContent) as AIAgentGrpcApi.QuestionQueueStatusChange

  // 实时数据里，记录用户问题的状态和专注模式信息
  if (!res.IsSync) {
    sendRequest({ IsSyncMessage: true, SyncType: AIInputEventSyncTypeEnum.SYNC_TYPE_QUEUE_INFO })
    meta.currentCasualTaskID = data.react_task_id
    rawData.casualChat.planDetails = cloneDeep(DefaultPlanItemDetailsData)
    meta.focusOfTaskID = data.focus_mode ? data.react_task_id : ''
    store.getState().updateState({ focusMode: data.focus_mode ? data.focus_mode : '', casualLoading: true })
  }

  // 用户问题的UI回显
  const chatData: AIChatQSData = {
    id: data.react_task_id,
    chatType: 'reAct',
    type: AIChatQSDataTypeEnum.QUESTION,
    Timestamp: res.Timestamp,
    data: { qs: data.react_task_input || '', setting: {} },
    AIService: '',
    AIModelName: '',
    // showQS为了UI渲染方便，重新构建的字段
    extraValue: { showQS: data.react_task_input || '' },
  }
  rawData.contents.set(chatData.id, chatData)
  store.getState().dispatchStreamingNode({
    chatType: 'reAct',
    node: {
      token: chatData.id,
      kind: 'item',
      type: chatData.type,
      dataOrigin: res.IsSync ? 'grpc_history_data' : 'grpc_realtime_data',
    },
    groupTokenGenerator: () => '',
  })
}

const handleNotify: AIMessageHandler = (request) => {
  const { res, store, meta } = request
  if (res.Type !== 'notify') return
  if (res.IsSync) return

  const ipcContent = Uint8ArrayToString(res.Content) || ''
  const data = JSON.parse(ipcContent) as AIAgentGrpcApi.Notify
  if (meta.notifyMessageTimer !== null) {
    clearTimeout(meta.notifyMessageTimer)
    meta.notifyMessageTimer = null
  }
  const { type, content } = data
  store.getState().updateState({ notifyMessage: { type, content, label: res.NodeIdVerbose } })

  let durationMs = 0
  if (typeof data.duration_ms === 'number' && !Number.isNaN(data.duration_ms) && data.duration_ms > 0) {
    durationMs = data.duration_ms
  } else if (
    typeof data.duration_seconds === 'number' &&
    !Number.isNaN(data.duration_seconds) &&
    data.duration_seconds > 0
  ) {
    durationMs = data.duration_seconds * 1000
  } else if (typeof data.duration === 'number' && !Number.isNaN(data.duration) && data.duration > 0) {
    durationMs = data.duration * 1000
  }
  if (durationMs > 0) {
    meta.notifyMessageTimer = setTimeout(() => {
      meta.notifyMessageTimer = null
      store.getState().updateState({ notifyMessage: null })
    }, durationMs)
  }
}

const handlePlanExecTasks: AIMessageHandler = (request) => {
  const { res, store } = request
  if (res.Type !== 'plan_exec_tasks') return

  const ipcContent = Uint8ArrayToString(res.Content) || ''
  const list = JSON.parse(ipcContent) as AIAgentGrpcApi.PlanHistoryList
  try {
    const arr = cloneDeep(list.records)
    if (!arr || arr.length === 0) {
      store.getState().updateState({ planHistoryList: { ...list } })
      return
    }
    const newArr = arr
      .map((item) => {
        // 因为后端给过来的task_progress是一个json的string类型数据
        item.task_progress = JSON.parse(item.task_progress as unknown as string) as AIAgentGrpcApi.PlanHistoryProgress
        // 因为后端给过来的task_tree是一个json的string类型数据，所以需要转换成树形结构的数据，供UI展示使用
        const tree = JSON.parse(item.task_tree as unknown as string) as AIAgentGrpcApi.PlanTask
        // 记录任务树根节点的名字，供UI展示使用
        item.root_task_name = tree.name
        item.task_tree = genExecTasks(tree)
        return item
      })
      .filter((item) => item.task_progress.phase !== 'Completed')
    store.getState().updateState({ planHistoryList: { ...list, records: newArr } })
  } catch (error) {}
}

const handleQueueInfo: AIMessageHandler = (request) => {
  const { res, chatType, store } = request
  if (res.Type !== 'structured' || res.NodeId !== 'queue_info') return
  if (chatType === 'task') return

  const ipcContent = Uint8ArrayToString(res.Content) || ''
  const { tasks, total_tasks } = JSON.parse(ipcContent) as AIAgentGrpcApi.QuestionQueues
  store.getState().updateState({
    questionQueue: {
      total: total_tasks,
      data: tasks ?? [],
    },
  })
}

const handleReactTaskStatusChanged: AIMessageHandler = (request) => {
  const { res, chatType, store, rawData, meta } = request
  if (res.Type !== 'structured' || res.NodeId !== 'react_task_status_changed') return
  if (res.IsSync || chatType === 'task') return

  const ipcContent = Uint8ArrayToString(res.Content) || ''
  const { react_task_id, react_task_now_status } = JSON.parse(ipcContent) as AIAgentGrpcApi.ReactTaskChanged
  if (['completed', 'aborted'].includes(react_task_now_status)) {
    if (meta.currentCasualTaskID && meta.currentCasualTaskID === react_task_id) {
      // 问题任务完成或者者被中止后，重置当前问题任务id
      meta.currentCasualTaskID = ''
      store.getState().updateState({ cancelCasualLoading: false })
    }
    if (meta.focusOfTaskID === react_task_id) {
      // 取消专注模式
      meta.focusOfTaskID = ''
      store.getState().updateState({ focusMode: '' })
    }
    store.getState().updateState({ casualLoading: false })
    rawData.casualChat.todoList = cloneDeep(DefaultTodoListCardData)
    store.getState().updateCasualTodoList()
    if (meta.currentTaskPlanID?.taskID === react_task_id) {
      // 该问题触发了任务规划, 所以需要将任务规划状态也调整
      meta.currentTaskPlanID.status = react_task_now_status as AITaskStatus
      store.getState().updateState({ cancelTaskLoading: false })
    }
  }
}

const handleStatus: AIMessageHandler = (request) => {
  const { res, chatType, store } = request
  if (res.Type !== 'structured' || res.NodeId !== 'status') return
  if (res.IsSync) return

  const ipcContent = Uint8ArrayToString(res.Content) || ''
  const data = JSON.parse(ipcContent) as { key: string; value: string }
  if (data.key === 're-act-loading-status-key') {
    if (chatType === 'task') {
      // 任务规划-loading展示标题
      store.getState().updateTaskLoadingStatus({ task: data.value || '加载中...' })
    } else {
      // 自由对话-loading展示标题
      store.getState().updateState({ casualTitle: data.value })
    }
  } else if (data.key === 'plan-executing-loading-status-key') {
    if (chatType === 'task') {
      // 任务规划-loading展示标题
      store.getState().updateTaskLoadingStatus({ plan: data.value || '加载中...' })
    }
  } else {
    // 执行状态卡片处理
    // yakExecResultEvent.handleSetData(res)
  }
}

const handleTrafficCount: AIMessageHandler = (request) => {
  const { res, chatType, store, rawData, pushLog } = request

  const ipcContent = Uint8ArrayToString(res.Content) || ''
  const data = JSON.parse(ipcContent) as AIAgentGrpcApi.HTTPTrafficNotice & AIAgentGrpcApi.RiskTrafficNotice
  if (!data.runtime_id) {
    handleErrorGRPCToLog(res.IsSync, pushLog, genErrorLogData(res.Timestamp, `${res.Type}数据异常: ${ipcContent}`))
    return
  }

  // 更新流量表和风险表数据, 历史数据不处理
  if (!res.IsSync) {
    if (res.Type === 'yak_httpflow_count' && !rawData.httpRunTimeIDs.includes(data.runtime_id)) {
      rawData.httpRunTimeIDs.push(data.runtime_id)
      store.getState().updateHttpData()
    } else if (res.Type === 'yak_risk_count' && !rawData.riskRunTimeIDs.includes(data.runtime_id)) {
      rawData.riskRunTimeIDs.push(data.runtime_id)
      store.getState().updateRiskData()
    }
  }

  // 更新工具执行结果卡片里的流量和风险数量
  const toolResult = rawData.contents.get(data.runtime_id)
  if (!toolResult || toolResult.type !== AIChatQSDataTypeEnum.TOOL_RESULT || toolResult.chatType !== chatType) {
    handleErrorGRPCToLog(
      res.IsSync,
      pushLog,
      genErrorLogData(res.Timestamp, `${res.Type}数据(call_tool_id:${data.runtime_id})工具结果卡片数据不存在`),
    )
    return
  }
  let update = false
  switch (res.Type) {
    case 'yak_httpflow_count':
      if (data.http_flow_count !== toolResult.data.httpFlowDataCount) {
        toolResult.data.httpFlowDataCount = data.http_flow_count ?? 0
        update = true
      }
      break
    case 'yak_risk_count':
      if (data.risk_count !== toolResult.data.riskFlowDataCount) {
        toolResult.data.riskFlowDataCount = data.risk_count ?? 0
        update = true
      }
      break
    default:
      break
  }
  if (!update) return
  store.getState().incrementNodeVersion(toolResult.id, 'item')
}

const handlePlan: AIMessageHandler = (requestInfo) => {
  const { res, chatType, store } = requestInfo
  if (res.Type !== 'plan' || chatType === 'reAct') return

  const ipcContent = Uint8ArrayToString(res.Content) || ''
  const tasks = JSON.parse(ipcContent) as { root_task: AIAgentGrpcApi.PlanTask }
  if (has(tasks, 'root_task')) {
    const plans = genExecTasks(tasks.root_task)
    store.getState().updatePlanTree({ task_tree: cloneDeep(plans), root_task_name: tasks.root_task.name })
  } else {
    store.getState().updatePlanTree(cloneDeep(DefaultCurrentExecTaskTree))
  }
}

const handleYaklangCodeChange: AIMessageHandler = (requestInfo) => {
  const { res, rawData, store } = requestInfo
  if (res.Type !== 'yaklang_code_change') return
  if (res.IsSync) return

  const ipcContent = Uint8ArrayToString(res.Content) || ''
  const yaklangCodeChange = JSON.parse(ipcContent) as AIAgentGrpcApi.YaklangCodeChange
  rawData.yaklangCodeChange = yaklangCodeChange
  store.getState().updateStateCount('yaklangCodeChangeUpdate')
}

export const aiOtherDataHandlers = {
  http_fuzz_request_change: handleHttpFuzzRequestChange,
  http_flow_fuzz_status: handleHttpFlowFuzzStatus,
  session_title: handleSessionTitle,
  start_plan_and_execution: handleStartPlanAndExecution,
  end_plan_and_execution: handleEndPlanAndExecution,
  memory_context: handleMemoryContext,
  filesystem_pin_directory: handleFileSystemPin,
  filesystem_pin_filename: handleFileSystemPin,
  timeline_item: handleTimelineItem,
  react_task_enqueue: handleReactTaskEnqueue,
  react_task_dequeue: handleReactTaskDequeue,
  notify: handleNotify,
  plan_exec_tasks: handlePlanExecTasks,
  queue_info: handleQueueInfo,
  react_task_status_changed: handleReactTaskStatusChanged,
  status: handleStatus,
  yak_httpflow_count: handleTrafficCount,
  yak_risk_count: handleTrafficCount,
  plan: handlePlan,
  yaklang_code_change: handleYaklangCodeChange,
} as const

const exampleHandle = (res: AIOutputEvent) => {
  let funcKey = res.Type
  if (
    res.Type === 'structured' &&
    [
      'session_title',
      'timeline_item',
      'react_task_enqueue',
      'react_task_dequeue',
      'queue_info',
      'react_task_status_changed',
      'status',
    ].includes(res.NodeId)
  ) {
    // stream数据结束标识
    funcKey = res.NodeId
  }
}
