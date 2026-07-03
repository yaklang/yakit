import type { AIMessageHandler } from '../type'
import { AIInputEventSyncTypeEnum, AITaskStatus, type AIAgentGrpcApi, type AIOutputEvent } from '../grpcApi'
import { Uint8ArrayToString } from '@/utils/str'
import { genBaseAIChatData, generateTaskNodeDataID, generateTaskNodeID, isValidTaskIndex } from '../utils'
import { type AIChatQSData, AIChatQSDataTypeEnum, type ReportFinishCardData } from '../aiRender'
import { convertNodeIdToVerbose } from '../defaultConstant'

const handleThought: AIMessageHandler = (requestInfo) => {
  const { res, chatType, store, rawData, meta } = requestInfo
  if (res.Type !== 'thought') return

  const ipcContent = Uint8ArrayToString(res.Content) || ''
  const { thought } = (JSON.parse(ipcContent) as AIAgentGrpcApi.AIChatThought) || {}
  const chatData: AIChatQSData = {
    ...genBaseAIChatData(res),
    chatType: chatType,
    type: AIChatQSDataTypeEnum.THOUGHT,
    data: thought || '',
    taskIndex: generateTaskNodeDataID({
      chatType,
      planID: meta.currentTaskPlanID?.taskID,
      taskID: res.TaskIndex,
      isExist: (key) => rawData.contents.has(key),
    }),
  }
  rawData.contents.set(chatData.id, chatData)
  store.getState().dispatchStreamingNode({
    chatType: chatType,
    parentTaskId: chatData.taskIndex,
    node: {
      token: chatData.id,
      kind: 'item',
      type: chatData.type,
      isHistory: res.IsSync,
    },
  })
}

const handleResult: AIMessageHandler = (requestInfo) => {
  const { res, chatType, store, rawData, meta } = requestInfo
  if (res.Type !== 'result') return

  const ipcContent = Uint8ArrayToString(res.Content) || ''
  const { result, after_stream } = (JSON.parse(ipcContent) as AIAgentGrpcApi.AIChatResult) || {}
  if (after_stream) return

  const chatData: AIChatQSData = {
    ...genBaseAIChatData(res),
    chatType: chatType,
    type: AIChatQSDataTypeEnum.RESULT,
    data: result || '',
    taskIndex: generateTaskNodeDataID({
      chatType,
      planID: meta.currentTaskPlanID?.taskID,
      taskID: res.TaskIndex,
      isExist: (key) => rawData.contents.has(key),
    }),
  }
  rawData.contents.set(chatData.id, chatData)
  store.getState().dispatchStreamingNode({
    chatType: chatType,
    parentTaskId: chatData.taskIndex,
    node: {
      token: chatData.id,
      kind: 'item',
      type: chatData.type,
      isHistory: res.IsSync,
    },
  })
}

const handleFailReactTask: AIMessageHandler = (requestInfo) => {
  const { res, chatType, store, rawData, meta } = requestInfo
  if (res.Type !== 'fail_react_task') return

  const ipcContent = Uint8ArrayToString(res.Content) || ''
  const chatData: AIChatQSData = {
    ...genBaseAIChatData(res),
    chatType: chatType,
    type: AIChatQSDataTypeEnum.FAIL_REACT,
    data: {
      content: ipcContent,
      NodeId: res.NodeId,
      NodeIdVerbose: res.NodeIdVerbose || convertNodeIdToVerbose(res.NodeId),
    },
    taskIndex: generateTaskNodeDataID({
      chatType,
      planID: meta.currentTaskPlanID?.taskID,
      taskID: res.TaskIndex,
      isExist: (key) => rawData.contents.has(key),
    }),
  }
  rawData.contents.set(chatData.id, chatData)
  store.getState().dispatchStreamingNode({
    chatType: chatType,
    parentTaskId: chatData.taskIndex,
    node: {
      token: chatData.id,
      kind: 'item',
      type: chatData.type,
      isHistory: res.IsSync,
    },
  })
}

const handleToolCallDecision: AIMessageHandler = (requestInfo) => {
  const { res, chatType, store, rawData, meta } = requestInfo
  if (res.Type !== 'tool_call_decision') return

  const ipcContent = Uint8ArrayToString(res.Content) || ''
  const data = JSON.parse(ipcContent) as AIAgentGrpcApi.ToolCallDecision
  const i18n = data?.i18n || { zh: data.action, en: data.action }
  const chatData: AIChatQSData = {
    ...genBaseAIChatData(res),
    chatType: chatType,
    type: AIChatQSDataTypeEnum.TOOL_CALL_DECISION,
    data: {
      ...data,
      i18n: {
        Zh: i18n.zh,
        En: i18n.en,
      },
    },
    taskIndex: generateTaskNodeDataID({
      chatType,
      planID: meta.currentTaskPlanID?.taskID,
      taskID: res.TaskIndex,
      isExist: (key) => rawData.contents.has(key),
    }),
  }
  rawData.contents.set(chatData.id, chatData)
  store.getState().dispatchStreamingNode({
    chatType: chatType,
    parentTaskId: chatData.taskIndex,
    node: {
      token: chatData.id,
      kind: 'item',
      type: chatData.type,
      isHistory: res.IsSync,
    },
  })
}

const handleFailPlanAndExecution: AIMessageHandler = (requestInfo) => {
  const { res, chatType, store, rawData, meta } = requestInfo
  if (res.Type !== 'fail_plan_and_execution') return

  const ipcContent = Uint8ArrayToString(res.Content) || ''
  const chatData: AIChatQSData = {
    ...genBaseAIChatData(res),
    chatType: chatType,
    type: AIChatQSDataTypeEnum.FAIL_PLAN_AND_EXECUTION,
    data: {
      content: ipcContent,
      NodeId: res.NodeId,
      NodeIdVerbose: res.NodeIdVerbose || convertNodeIdToVerbose(res.NodeId),
    },
    taskIndex: generateTaskNodeDataID({
      chatType,
      planID: meta.currentTaskPlanID?.taskID,
      taskID: res.TaskIndex,
      isExist: (key) => rawData.contents.has(key),
    }),
  }
  rawData.contents.set(chatData.id, chatData)
  store.getState().dispatchStreamingNode({
    chatType: chatType,
    parentTaskId: chatData.taskIndex,
    node: {
      token: chatData.id,
      kind: 'item',
      type: chatData.type,
      isHistory: res.IsSync,
    },
  })
}

const handleApiRequestFailed: AIMessageHandler = (requestInfo) => {
  const { res, chatType, store, rawData, meta } = requestInfo
  if (res.Type !== 'api_request_failed' || res.NodeId !== 'ai_call_failure') return
  // 历史数据无用-不处理
  if (res.IsSync) return

  const ipcContent = Uint8ArrayToString(res.Content) || ''
  const data = JSON.parse(ipcContent) as AIAgentGrpcApi.AIApiRequestFailedPayload
  const chatData: AIChatQSData = {
    ...genBaseAIChatData(res),
    chatType: chatType,
    type: AIChatQSDataTypeEnum.AI_API_REQUEST_FAILED,
    data,
    taskIndex: generateTaskNodeDataID({
      chatType,
      planID: meta.currentTaskPlanID?.taskID,
      taskID: res.TaskIndex,
      isExist: (key) => rawData.contents.has(key),
    }),
  }
  rawData.contents.set(chatData.id, chatData)
  store.getState().dispatchStreamingNode({
    chatType: chatType,
    parentTaskId: chatData.taskIndex,
    node: {
      token: chatData.id,
      kind: 'item',
      type: chatData.type,
      isHistory: res.IsSync,
    },
  })
}

const handleHttpFlowFuzzStatus: AIMessageHandler = (requestInfo) => {
  const { res, chatType, store, rawData, meta } = requestInfo
  if (res.Type !== 'http_flow_fuzz_status') return
  // 历史数据无用-不处理
  if (res.IsSync) return

  const ipcContent = Uint8ArrayToString(res.Content) || ''
  const payload = JSON.parse(ipcContent) as AIAgentGrpcApi.GetHttpFlowFuzzStatus
  const { fuzz_id, runtime_id, reason, status } = payload
  if (!fuzz_id) {
    requestInfo.pushLog({ level: 'error', message: `${res.Type}数据异常: ${ipcContent}` })
    return
  }

  const chatDetail = rawData.contents.get(fuzz_id)

  if (chatDetail && chatDetail.type === AIChatQSDataTypeEnum.HTTP_FLOW_FUZZ_STATUS) {
    chatDetail.data.runtime_id = runtime_id
    chatDetail.data.reason = reason
    chatDetail.data.engine_status = status
    chatDetail.data.progress = status === 'working' ? payload.progress : chatDetail.data.progress
    store.getState().incrementNodeVersion(chatDetail.id, 'item')
  } else {
    // 引擎结束态没有对应卡片时直接丢弃，保留原行为
    if (status === 'finish') return
    const chatData: AIChatQSData = {
      ...genBaseAIChatData(res),
      id: fuzz_id,
      chatType: chatType,
      type: AIChatQSDataTypeEnum.HTTP_FLOW_FUZZ_STATUS,
      data: {
        fuzz_id,
        runtime_id,
        reason,
        engine_status: status,
        // 仅 `working` 覆盖 progress；其它状态保留上一次（新建时默认 undefined）
        progress: status === 'working' ? payload.progress : undefined,
      },
      taskIndex: generateTaskNodeDataID({
        chatType,
        planID: meta.currentTaskPlanID?.taskID,
        taskID: res.TaskIndex,
        isExist: (key) => rawData.contents.has(key),
      }),
    }
    rawData.contents.set(chatData.id, chatData)
    store.getState().dispatchStreamingNode({
      chatType: chatType,
      parentTaskId: chatData.taskIndex,
      node: {
        token: chatData.id,
        kind: 'item',
        type: chatData.type,
        isHistory: res.IsSync,
      },
    })
  }
}

const handleReportFinish: AIMessageHandler = (requestInfo) => {
  const { res, chatType, store, rawData, meta } = requestInfo
  if (res.Type !== 'report_finish' || res.NodeId !== 'report-finish') return

  const ipcContent = Uint8ArrayToString(res.Content) || '{}'

  const parsed = JSON.parse(ipcContent) as AIAgentGrpcApi.ReportFinishPayload
  let report_path = parsed?.report_path ?? ''
  let title = parsed?.title ?? ''
  let content = parsed?.summary_markdown ?? ''

  if (!report_path) {
    requestInfo.pushLog({ level: 'error', message: `${res.Type}数据缺少 report_path` })
    return
  }

  const cardType = AIChatQSDataTypeEnum.REPORT_FINISH
  const nextData: ReportFinishCardData = { reportPath: report_path, title, content }

  const chatData: AIChatQSData = {
    ...genBaseAIChatData(res),
    chatType: chatType,
    type: cardType,
    data: nextData,
    taskIndex: generateTaskNodeDataID({
      chatType,
      planID: meta.currentTaskPlanID?.taskID,
      taskID: res.TaskIndex,
      isExist: (key) => rawData.contents.has(key),
    }),
  }
  rawData.contents.set(chatData.id, chatData)
  store.getState().dispatchStreamingNode({
    chatType: chatType,
    parentTaskId: chatData.taskIndex,
    node: {
      token: chatData.id,
      kind: 'item',
      type: chatData.type,
      isHistory: res.IsSync,
    },
  })
}

const handlePushTask: AIMessageHandler = (requestInfo) => {
  const { res, chatType, store, rawData, meta } = requestInfo
  if (res.Type !== 'structured' || res.NodeId !== 'system') return
  // 历史数据和自由对话数据不处理
  if (res.IsSync || chatType === 'reAct') return

  const ipcContent = Uint8ArrayToString(res.Content) || ''
  const data = JSON.parse(ipcContent) || ''
  if (!data || typeof data !== 'object' || data?.type !== 'push_task') return

  const info = data as AIAgentGrpcApi.ChangeTask
  const newPlanTree = store.getState().taskChat.plan
  newPlanTree.task_tree = newPlanTree.task_tree.map((item) => {
    if (item.index === info.task.index) item.progress = AITaskStatus.inProgress
    return item
  })
  store.getState().updatePlanTree(newPlanTree)

  if (isValidTaskIndex(info.task.index) && meta.currentTaskPlanID?.taskID) {
    const taskID = generateTaskNodeID(meta.currentTaskPlanID.taskID, info.task.index)
    const chatDetail = rawData.contents.get(taskID)
    if (chatDetail && chatDetail.type !== AIChatQSDataTypeEnum.TASK_NODE_GROUP) {
      requestInfo.pushLog({ level: 'error', message: `${info.task.index}-push_task数据已存在` })
      return
    }
    const chatData: AIChatQSData = {
      ...genBaseAIChatData(res),
      id: taskID,
      chatType: 'task',
      type: AIChatQSDataTypeEnum.TASK_NODE_GROUP,
      data: {
        taskIndex: info.task.index,
        taskId: info.task.task_id,
        taskName: info.task.name,
        goal: info.task.goal,
        status: info.task.task_status || AITaskStatus.inProgress,
      },
    }
    rawData.contents.set(chatData.id, chatData)
    meta.currentTaskPlanActiveNode.add(chatData.id)
    // 这里要判断是否是最后一个默认任务组，直接添加不行
    // setElements((old) => {
    //   const exists = old.some((item) => item.token === chatData.id && item.type === chatData.type)
    //   if (exists) return old
    //   const last = old[old.length - 1]
    //   if (last.type === AIChatQSDataTypeEnum.TASK_DEFAULT_GROUP) {
    //     // 实时数据下，将默认任务聚合组置底
    //     old.splice(old.length - 1, 0, {
    //       token: chatData.id,
    //       type: chatData.type,
    //       renderNum: 1,
    //       chatType: 'task',
    //       kind: 'task',
    //       children: [],
    //     })
    //     return [...old]
    //   }
    //   return [
    //     ...old,
    //     { token: chatData.id, type: chatData.type, renderNum: 1, chatType: 'task', kind: 'task', children: [] },
    //   ]
    // })
    store.getState().dispatchStreamingNode({
      chatType: chatType,
      node: {
        token: chatData.id,
        kind: 'task',
        type: chatData.type,
        isHistory: res.IsSync,
      },
    })
  }
}

const handlePopTask: AIMessageHandler = (requestInfo) => {
  const { res, chatType, store, rawData, meta, sendRequest } = requestInfo
  if (res.Type !== 'structured' || res.NodeId !== 'system') return
  // 历史数据和自由对话数据不处理
  if (res.IsSync || chatType === 'reAct') return

  const ipcContent = Uint8ArrayToString(res.Content) || ''
  const data = JSON.parse(ipcContent) || ''
  if (!data || typeof data !== 'object' || data?.type !== 'pop_task') return

  const info = data as AIAgentGrpcApi.ChangeTask
  const newPlanTree = store.getState().taskChat.plan
  newPlanTree.task_tree = newPlanTree.task_tree.map((item) => {
    if (item.index === info.task.index) item.progress = info.task.task_status
    return item
  })
  store.getState().updatePlanTree(newPlanTree)

  if (isValidTaskIndex(info.task.index) && meta.currentTaskPlanID?.taskID) {
    const taskID = generateTaskNodeID(meta.currentTaskPlanID.taskID, info.task.index)
    const chatDetail = rawData.contents.get(taskID)
    if (!chatDetail || chatDetail.type !== AIChatQSDataTypeEnum.TASK_NODE_GROUP) {
      requestInfo.pushLog({ level: 'error', message: `${info.task.index}-pop_task数据不存在` })
      return
    }
    meta.currentTaskPlanActiveNode.delete(info.task.index)
    chatDetail.data.status = info.task.task_status
    store.getState().incrementNodeVersion(chatDetail.id, 'task')

    sendRequest && sendRequest({ IsSyncMessage: true, SyncType: AIInputEventSyncTypeEnum.SYNC_TYPE_PLAN })
  }
}

/** 单条grpc流数据对应一个独立的UI数据 */
export const aiSingleItemDataHandlers = {
  thought: handleThought,
  result: handleResult,
  fail_react_task: handleFailReactTask,
  tool_call_decision: handleToolCallDecision,
  fail_plan_and_execution: handleFailPlanAndExecution,
  ai_call_failure: handleApiRequestFailed,
  http_flow_fuzz_status: handleHttpFlowFuzzStatus,
  'report-finish': handleReportFinish,
  push_task: handlePushTask,
  pop_task: handlePopTask,
} as const
