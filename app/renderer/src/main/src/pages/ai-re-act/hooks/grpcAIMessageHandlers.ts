import type { AIMessageHandler, AIMessageHandlerParams, UpdateRenderDataParams } from './type'
import type {
  AIChatQSData,
  AIChatQSDataType,
  ChatStream,
  ReActChatBaseInfo,
  ReActChatGroupElement,
  ReActChatElement,
  ReActChatRenderItem,
  ReActChatTaskElement,
  ReActChatTaskElementSub,
} from './aiRender'

import { genErrorLogData } from './utils'
import { AIChatQSDataTypeEnum } from './aiRender'
import { AIStreamContentType } from './defaultConstant'
import cloneDeep from 'lodash/cloneDeep'
import { AIChatData } from '@/pages/ai-agent/type/aiChat'
import { AIOutputEvent } from './grpcApi'
// #region Common Utils
/** 自由对话：是否为子 agent 任务（planDetailsMap 用子任务 ID；contents 用复合 ID） */
const isCasualSubAgentTask = (
  chatStore: AIChatData,
  res: AIOutputEvent,
  getTaskId?: AIMessageHandlerParams['getTaskId'],
) => {
  if (chatStore.casualChat.planDetailsMap.has(res.TaskId)) return true
  const parentTaskId = getTaskId?.()
  if (!parentTaskId || !res.TaskId) return false
  return (
    chatStore.casualChat.contents.get(`${parentTaskId}-${res.TaskId}`)?.type === AIChatQSDataTypeEnum.TASK_NODE_GROUP
  )
}

type ApplyCasualPlanDetailsFields = (
  target: PlanItemDetailsData,
  ctx: { isMainCasualTask: boolean; taskId: string },
) => void

/** 主任务 planDetails 为单例，新一轮提问后 taskId 必须覆盖；子 agent 走 planDetailsMap */
const resolvePlanDetailsTaskId = (target: PlanItemDetailsData, ctx: { isMainCasualTask: boolean; taskId: string }) => {
  target.taskId = ctx.isMainCasualTask ? ctx.taskId : target.taskId || ctx.taskId
}

const updateCasualPlanItemDetails = (
  chatStore: AIChatData,
  res: AIOutputEvent,
  getTaskId: AIMessageHandlerParams['getTaskId'],
  applyFields: ApplyCasualPlanDetailsFields,
) => {
  if (!res.TaskId) return
  const isSubAgentTask = isCasualSubAgentTask(chatStore, res, getTaskId)
  const chatDetail = isSubAgentTask
    ? chatStore.casualChat.planDetailsMap.get(res.TaskId) || cloneDeep(DefaultPlanItemDetailsData)
    : chatStore.casualChat.planDetails || cloneDeep(DefaultPlanItemDetailsData)
  applyFields(chatDetail, { isMainCasualTask: !isSubAgentTask, taskId: res.TaskId })
  if (isSubAgentTask) {
    chatStore.casualChat.planDetailsMap.set(res.TaskId, chatDetail)
  } else {
    chatStore.casualChat.planDetails = chatDetail
  }
}
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

/**
 * 在 elements 树中查找并更新指定渲染项（含 Task 组 / stream 组嵌套）
 * 只是更新renderNum，不包含新建逻辑
 */
const bumpRenderItem = (list: ReActChatRenderItem[], info: UpdateRenderDataParams): boolean => {
  for (const item of list) {
    if (item.token === info.mapKey && item.type === info.type) {
      item.renderNum += 1
      return true
    }
    if (item.kind === 'task') {
      for (const child of item.children) {
        if (child.token === info.mapKey && child.type === info.type) {
          child.renderNum += 1
          item.renderNum += 1
          return true
        }
        if (child.kind === 'group') {
          const sub = child.children.find((c) => c.token === info.mapKey && c.type === info.type)
          if (sub) {
            sub.renderNum += 1
            child.renderNum += 1
            item.renderNum += 1
            return true
          }
        }
      }
    }
    if (item.kind === 'group') {
      const sub = item.children.find((c) => c.token === info.mapKey && c.type === info.type)
      if (sub) {
        sub.renderNum += 1
        item.renderNum += 1
        return true
      }
    }
  }
  return false
}

/**
 * 将新渲染项追加到 elements（只包含普通节点 和 Task 任务组，单节点不会出现在 Stream 组内）
 * 只是新建逻辑，不包含更新renderNum
 */
const appendRenderItem = (
  old: ReActChatRenderItem[],
  element: ReActChatRenderItem,
  isHistory: boolean,
  options?: { taskId: AIChatQSData['taskId']; getContentMap: AIMessageHandlerParams['getContentMap'] },
): ReActChatRenderItem[] => {
  if (options?.taskId) {
    const taskGroupKey = options?.taskId
    const groupIndex = old.findIndex((item) => item.kind === 'task' && item.token === taskGroupKey)
    if (groupIndex >= 0) {
      const list = [...old]
      const group = list[groupIndex] as ReActChatTaskElement
      const children = (
        isHistory ? [element, ...group.children] : [...group.children, element]
      ) as ReActChatTaskElementSub[]
      list[groupIndex] = { ...group, children, renderNum: group.renderNum + 1 }
      return list
    }
  }
  return isHistory ? [element, ...old] : [...old, element]
}

/** 更新UI-State变量数据(独立单条数据) */
const handleUpdateUISingleState = (
  setElements: AIMessageHandlerParams['setElements'],
  getContentMap: AIMessageHandlerParams['getContentMap'],
  isHistory: AIMessageHandlerParams['res']['IsSync'],
  info: UpdateRenderDataParams & { chatType: ReActChatBaseInfo['chatType'] },
) => {
  try {
    setElements((old) => {
      if (bumpRenderItem(old, info)) {
        return [...old]
      }

      const element: ReActChatRenderItem = {
        chatType: info.chatType,
        token: info.mapKey,
        type: info.type,
        kind: 'item',
        renderNum: 1,
      }
      const chatDetail = getContentMap(info.mapKey)
      if (!chatDetail || chatDetail.id !== info.mapKey) return old
      return appendRenderItem(old, element, isHistory, {
        taskId: chatDetail?.taskId,
        getContentMap,
      })
    })
  } catch {}
}

/** 更新UI-State变量数据(组数据) */
const handleUpdateUIGroupState: (
  /** group数据 */
  group: { mapKey: string; type: AIChatQSDataType },
  /** sub数据 */
  sub: { mapKey: string; type: AIChatQSDataType },
  setElement: AIMessageHandlerParams['setElements'],
  /** 父 TaskId 集合组 token */
  taskNodeKey?: string,
) => void = (group, sub, setElement, taskNodeKey) => {
  try {
    setElement((old) => {
      const scope: ReActChatRenderItem[] = taskNodeKey
        ? (old.find((item) => item.kind === 'task' && item.token === taskNodeKey) as ReActChatTaskElement | undefined)
            ?.children || []
        : old

      const find = scope.find((item) => item.token === group.mapKey && item.type === group.type)
      if (find && find.kind === 'group') {
        const subFind = find.children.find((item) => item.token === sub.mapKey && item.type === sub.type)
        if (subFind) subFind.renderNum += 1
        find.renderNum += 1
        if (taskNodeKey) {
          const taskGroup = old.find((item) => item.kind === 'task' && item.token === taskNodeKey) as
            | ReActChatTaskElement
            | undefined
          if (taskGroup) taskGroup.renderNum += 1
        }
        return [...old]
      }

      return old
    })
  } catch {}
}
// #endregion

// #region 单项流数据转换为独立UI数据
/** Type='thought' 问题的思考 */
const handleThought: AIMessageHandler = (request) => {
  const { res, info, setContentMap } = request
  if (res.Type !== 'thought') return

  const ipcContent = Uint8ArrayToString(res.Content) || ''
  const { thought } = (JSON.parse(ipcContent) as AIAgentGrpcApi.AIChatThought) || {}
  const chatData: AIChatQSData = {
    ...genBaseAIChatData(res),
    chatType: info.chatType,
    type: AIChatQSDataTypeEnum.THOUGHT,
    data: thought || '',
    taskId: generateTaskId({
      chatType: info.chatType,
      res,
      getCurrentTaskPlanID: request.getCurrentTaskPlanID,
      getTaskId: request.getTaskId,
      getContentMap: request.getContentMap,
    }),
  }
  setContentMap(chatData.id, chatData)
  handleUpdateUISingleState(request.setElements, request.getContentMap, res.IsSync, {
    mapKey: chatData.id,
    type: chatData.type,
    chatType: chatData.chatType,
  })
}

/** Type='result' 问题一次性的结果输出 */
const handleResult: AIMessageHandler = (request) => {
  const { res, info, setContentMap } = request
  if (res.Type !== 'result') return

  const ipcContent = Uint8ArrayToString(res.Content) || ''
  const { result, after_stream } = (JSON.parse(ipcContent) as AIAgentGrpcApi.AIChatResult) || {}
  if (after_stream) return

  const chatData: AIChatQSData = {
    ...genBaseAIChatData(res),
    chatType: info.chatType,
    type: AIChatQSDataTypeEnum.THOUGHT,
    data: result || '',
    taskId: generateTaskId({
      chatType: info.chatType,
      res,
      getCurrentTaskPlanID: request.getCurrentTaskPlanID,
      getTaskId: request.getTaskId,
      getContentMap: request.getContentMap,
    }),
  }
  setContentMap(chatData.id, chatData)
  handleUpdateUISingleState(request.setElements, request.getContentMap, res.IsSync, {
    mapKey: chatData.id,
    type: chatData.type,
    chatType: chatData.chatType,
  })
}

/** Type='fail_react_task' ReAct任务(自由对话)崩溃的错误信息 */
const handleFailReactTask: AIMessageHandler = (request) => {
  const { res, info, setContentMap } = request
  if (res.Type !== 'fail_react_task') return

  const ipcContent = Uint8ArrayToString(res.Content) || ''
  const chatData: AIChatQSData = {
    ...genBaseAIChatData(res),
    chatType: info.chatType,
    type: AIChatQSDataTypeEnum.FAIL_REACT,
    data: {
      content: ipcContent,
      NodeId: res.NodeId,
      NodeIdVerbose: res.NodeIdVerbose || convertNodeIdToVerbose(res.NodeId),
    },
    taskId: generateTaskId({
      chatType: info.chatType,
      res,
      getCurrentTaskPlanID: request.getCurrentTaskPlanID,
      getTaskId: request.getTaskId,
      getContentMap: request.getContentMap,
    }),
  }
  setContentMap(chatData.id, chatData)
  handleUpdateUISingleState(request.setElements, request.getContentMap, res.IsSync, {
    mapKey: chatData.id,
    type: chatData.type,
    chatType: chatData.chatType,
  })
}

/** Type='tool_call_decision' 工具决策 */
const handleToolCallDecision: AIMessageHandler = (request) => {
  const { res, info, setContentMap } = request
  if (res.Type !== 'tool_call_decision') return

  const ipcContent = Uint8ArrayToString(res.Content) || ''
  const data = JSON.parse(ipcContent) as AIAgentGrpcApi.ToolCallDecision
  const i18n = data?.i18n || { zh: data.action, en: data.action }
  const chatData: AIChatQSData = {
    ...genBaseAIChatData(res),
    chatType: info.chatType,
    type: AIChatQSDataTypeEnum.TOOL_CALL_DECISION,
    data: {
      ...data,
      i18n: {
        Zh: i18n.zh,
        En: i18n.en,
      },
    },
    taskId: generateTaskId({
      chatType: info.chatType,
      res,
      getCurrentTaskPlanID: request.getCurrentTaskPlanID,
      getTaskId: request.getTaskId,
      getContentMap: request.getContentMap,
    }),
  }
  setContentMap(chatData.id, chatData)
  handleUpdateUISingleState(request.setElements, request.getContentMap, res.IsSync, {
    mapKey: chatData.id,
    type: chatData.type,
    chatType: chatData.chatType,
  })
}

/** Type='fail_plan_and_execution' 任务规划崩溃的错误信息[在任务规划启动就崩溃时，出现在自由对话中] */
const handleFailPlanAndExecution: AIMessageHandler = (request) => {
  const { res, info, setContentMap } = request
  if (res.Type !== 'fail_plan_and_execution') return

  const ipcContent = Uint8ArrayToString(res.Content) || ''
  const chatData: AIChatQSData = {
    ...genBaseAIChatData(res),
    chatType: info.chatType,
    type: AIChatQSDataTypeEnum.FAIL_PLAN_AND_EXECUTION,
    data: {
      content: ipcContent,
      NodeId: res.NodeId,
      NodeIdVerbose: res.NodeIdVerbose || convertNodeIdToVerbose(res.NodeId),
    },
    taskId: generateTaskId({
      chatType: info.chatType,
      res,
      getCurrentTaskPlanID: request.getCurrentTaskPlanID,
      getTaskId: request.getTaskId,
      getContentMap: request.getContentMap,
    }),
  }
  setContentMap(chatData.id, chatData)
  handleUpdateUISingleState(request.setElements, request.getContentMap, res.IsSync, {
    mapKey: chatData.id,
    type: chatData.type,
    chatType: chatData.chatType,
  })
}

/** Type='structured'&NodeId='react_task_dequeue' 生成用户问题到自由对话的UI上展示 */
const handleReactTaskDequeue: AIMessageHandler = (request) => {
  const { res, info, setContentMap, getContentMap, setElements, getChatDataStore } = request
  if (res.Type !== 'structured' || res.NodeId !== 'react_task_dequeue') return
  // 任务规划-该类型数据为无效数据
  if (info.chatType === 'task') return

  const ipcContent = Uint8ArrayToString(res.Content) || ''
  const data = JSON.parse(ipcContent) as AIAgentGrpcApi.QuestionQueueStatusChange
  const chatData: AIChatQSData = {
    id: res.TaskId || data.react_task_id,
    chatType: 'reAct',
    type: AIChatQSDataTypeEnum.QUESTION,
    Timestamp: res.Timestamp,
    data: { qs: data.react_task_input || '', setting: {} },
    AIService: '',
    AIModelName: '',
    // showQS为了UI渲染方便，重新构建的字段
    extraValue: { showQS: data.react_task_input || '' },
    taskId: generateTaskId({
      chatType: info.chatType,
      res,
      getCurrentTaskPlanID: request.getCurrentTaskPlanID,
      getTaskId: request.getTaskId,
      getContentMap: request.getContentMap,
    }),
  }
  setContentMap(chatData.id, chatData)

  if (data.react_task_user_input_uuid) {
    const qsDetail = getContentMap(data.react_task_user_input_uuid)
    if (qsDetail && qsDetail.type === AIChatQSDataTypeEnum.QUESTION) {
      // getChatDataStore()?.casualChat.contents.delete(data.react_task_user_input_uuid)
      // setElements((old) =>
      //   old.map((item) => {
      //     if (item.token === data.react_task_user_input_uuid) {
      //       return { ...item, token: data.react_task_id }
      //     }
      //     return item
      //   }),
      // )
      return
    }
  }

  handleUpdateUISingleState(request.setElements, request.getContentMap, res.IsSync, {
    mapKey: chatData.id,
    type: chatData.type,
    chatType: chatData.chatType,
  })
}

/** Type='api_request_failed'&NodeId='ai_call_failure' 模型/API 请求失败 */
const handleApiRequestFailed: AIMessageHandler = (request) => {
  const { res, info, setContentMap } = request
  if (res.Type !== 'api_request_failed' || res.NodeId !== 'ai_call_failure') return
  // 历史数据无用-不处理
  if (res.IsSync) return

  const ipcContent = Uint8ArrayToString(res.Content) || ''
  const data = JSON.parse(ipcContent) as AIAgentGrpcApi.AIApiRequestFailedPayload
  const chatData: AIChatQSData = {
    ...genBaseAIChatData(res),
    chatType: info.chatType,
    type: AIChatQSDataTypeEnum.AI_API_REQUEST_FAILED,
    data,
    taskId: generateTaskId({
      chatType: info.chatType,
      res,
      getCurrentTaskPlanID: request.getCurrentTaskPlanID,
      getTaskId: request.getTaskId,
      getContentMap: request.getContentMap,
    }),
  }
  setContentMap(chatData.id, chatData)
  handleUpdateUISingleState(request.setElements, request.getContentMap, res.IsSync, {
    mapKey: chatData.id,
    type: chatData.type,
    chatType: chatData.chatType,
  })
}

/** Type='http_flow_fuzz_status' 发包统计卡片：按 fuzz_id 维护一张 HTTP_FLOW_FUZZ_STATUS 卡片 */
const handleHttpFlowFuzzStatus: AIMessageHandler = (request) => {
  const { res, info, setContentMap, getContentMap, pushLog } = request
  if (res.Type !== 'http_flow_fuzz_status') return
  // 历史数据无用-不处理
  if (res.IsSync) return

  const ipcContent = Uint8ArrayToString(res.Content) || ''
  const payload = JSON.parse(ipcContent) as AIAgentGrpcApi.GetHttpFlowFuzzStatus
  const { fuzz_id, runtime_id, reason, status } = payload
  if (!fuzz_id) {
    handleErrorGRPCToLog(res.IsSync, pushLog, genErrorLogData(res.Timestamp, `${res.Type} 数据缺少 fuzz_id`))
    return
  }

  const cardType = AIChatQSDataTypeEnum.HTTP_FLOW_FUZZ_STATUS
  const existing = getContentMap(fuzz_id)
  const isExistingCard = existing?.type === cardType

  // 引擎结束态没有对应卡片时直接丢弃，保留原行为
  if (status === 'finish' && !isExistingCard) return

  const nextData: HttpFlowFuzzStatusCardData = {
    fuzz_id,
    runtime_id,
    reason,
    engine_status: status,
    // 仅 `working` 覆盖 progress；其它状态保留上一次（新建时默认 undefined）
    progress: status === 'working' ? payload.progress : isExistingCard ? existing!.data.progress : undefined,
  }

  if (isExistingCard) {
    Object.assign(existing!.data, nextData)
  } else {
    const chatData: AIChatQSData = {
      ...genBaseAIChatData(res),
      id: fuzz_id,
      chatType: info.chatType,
      type: cardType,
      data: nextData,
      taskId: generateTaskId({
        chatType: info.chatType,
        res,
        getCurrentTaskPlanID: request.getCurrentTaskPlanID,
        getTaskId: request.getTaskId,
        getContentMap: request.getContentMap,
      }),
    }
    setContentMap(fuzz_id, chatData)
  }

  handleUpdateUISingleState(request.setElements, request.getContentMap, res.IsSync, {
    mapKey: fuzz_id,
    type: cardType,
    chatType: info.chatType,
  })
}

/** Type='report_finish' NodeId='report-finish' 报告生成完成：展示报告路径 */
const handleReportFinish: AIMessageHandler = (request) => {
  const { res, info, setContentMap, pushLog } = request
  if (res.Type !== 'report_finish' || res.NodeId !== 'report-finish') return

  const ipcContent = Uint8ArrayToString(res.Content) || '{}'

  const parsed = JSON.parse(ipcContent) as AIAgentGrpcApi.ReportFinishPayload
  let report_path = parsed?.report_path ?? ''
  let title = parsed?.title ?? ''
  let content = parsed?.summary_markdown ?? ''

  if (!report_path) {
    handleErrorGRPCToLog(res.IsSync, pushLog, genErrorLogData(res.Timestamp, `${res.Type} 数据缺少 report_path`))
    return
  }

  const cardType = AIChatQSDataTypeEnum.REPORT_FINISH
  const nextData: ReportFinishCardData = { reportPath: report_path, title, content }

  const chatData: AIChatQSData = {
    ...genBaseAIChatData(res),
    chatType: info.chatType,
    type: cardType,
    data: nextData,
  }
  setContentMap(chatData.id, chatData)
  handleUpdateUISingleState(request.setElements, request.getContentMap, res.IsSync, {
    mapKey: chatData.id,
    type: cardType,
    chatType: info.chatType,
  })
}
/** Type='current_task_todo_list_update'&NodeId='current_task_todo_list' todolist */
const handleCurrentTaskTodoListUpdate: AIMessageHandler = (request) => {
  const { res, info, getChatDataStore, getTaskId, callback } = request
  if (!res.TaskId) return
  if (res.Type !== 'current_task_todo_list_update' || res.NodeId !== 'current_task_todo_list') return

  const chatStore = getChatDataStore?.()
  if (!chatStore) return

  const ipcContent = Uint8ArrayToString(res.Content) || ''
  // 更新待办清单卡片数据
  const data = JSON.parse(ipcContent) as AIAgentGrpcApi.TodoListUpdate
  if (isEmpty(data)) return

  const newData = handleTodoListData(data.items, data.task_id)
  const applyTodoListFields: ApplyCasualPlanDetailsFields = (target, ctx) => {
    target.uuid = uuidv4()
    resolvePlanDetailsTaskId(target, ctx)
    target.todoList = newData
  }

  if (info.chatType === 'task') {
    const oldData = chatStore.taskChat.planDetailsMap.get(res.TaskId) || cloneDeep(DefaultPlanItemDetailsData)
    applyTodoListFields(oldData, { isMainCasualTask: false, taskId: res.TaskId })
    chatStore.taskChat.planDetailsMap.set(res.TaskId, oldData)
  } else if (info.chatType === 'reAct') {
    updateCasualPlanItemDetails(chatStore, res, getTaskId, applyTodoListFields)
    callback?.(res)
  }
}
/** Type='structured'&NodeId='capability_inventory' 能力清单(tool/skills/forge/yak_plugin/mac) */
const handleCapabilityInventory: AIMessageHandler = (request) => {
  const { res, info, getChatDataStore, getTaskId } = request
  if (!res.TaskId) return
  if (res.Type !== 'structured' || res.NodeId !== 'capability_inventory') return

  const chatStore = getChatDataStore?.()
  if (!chatStore) return

  const ipcContent = Uint8ArrayToString(res.Content) || ''
  const payload = JSON.parse(ipcContent) as AIAgentGrpcApi.PlanItemDetails
  if (isEmpty(payload)) return
  const { fixed, dynamic } = payload

  const itemData: Pick<PlanItemDetailsData, 'uuid' | 'tool' | 'forges' | 'skills' | 'plugins' | 'mcp'> = {
    uuid: uuidv4(),
    tool: {
      fixed: [],
      dynamic: [],
    },
    forges: {
      fixed: [],
      dynamic: [],
    },
    skills: {
      fixed: [],
      dynamic: [],
    },
    plugins: {
      fixed: [],
      dynamic: [],
    },
    mcp: {
      fixed: [],
      dynamic: [],
    },
  }

  if (!!fixed?.tools) {
    for (const item of fixed.tools) {
      switch (item.category) {
        case 'tool':
          itemData.tool.fixed.push(item)
          break
        case 'yak_plugin':
          itemData.plugins.fixed.push(item)
          break
        case 'mcp':
          itemData.mcp.fixed.push(item)
          break
        default:
          break
      }
    }
  }
  /** 暂时目前没有这个数据 */
  // if (!!fixed?.mcp_servers) {
  //   itemData.mcpServices.fixed = fixed.mcp_servers
  // }
  if (!!fixed?.forges) {
    itemData.forges.fixed = fixed.forges
  }
  if (!!fixed?.skills) {
    itemData.skills.fixed = fixed.skills
  }

  if (!!dynamic?.tools) {
    for (const item of dynamic.tools) {
      switch (item.category) {
        case 'tool':
          itemData.tool.dynamic.push(item)
          break
        case 'yak_plugin':
          itemData.plugins.dynamic.push(item)
          break
        case 'mcp':
          itemData.mcp.dynamic.push(item)
          break
        default:
          break
      }
    }
  }
  if (!!dynamic?.skills) {
    itemData.skills.dynamic = dynamic.skills
  }
  if (!!dynamic?.forges) {
    itemData.forges.dynamic = dynamic.forges
  }
  const applyCapabilityFields: ApplyCasualPlanDetailsFields = (target, ctx) => {
    target.uuid = itemData.uuid
    resolvePlanDetailsTaskId(target, ctx)
    target.tool = itemData.tool
    target.forges = itemData.forges
    target.skills = itemData.skills
    target.plugins = itemData.plugins
    target.mcp = itemData.mcp
  }
  if (info.chatType === 'task') {
    const oldData = chatStore.taskChat.planDetailsMap.get(res.TaskId) || cloneDeep(DefaultPlanItemDetailsData)
    applyCapabilityFields(oldData, { isMainCasualTask: false, taskId: res.TaskId })
    chatStore.taskChat.planDetailsMap.set(res.TaskId, oldData)
  } else if (info.chatType === 'reAct') {
    updateCasualPlanItemDetails(chatStore, res, getTaskId, applyCapabilityFields)
  }
}
/** Type='perception'&NodeId='perception' 意图感知 */
const handlePerception: AIMessageHandler = (request) => {
  const { res, info, getChatDataStore, getTaskId } = request
  if (!res.TaskId) return
  if (res.Type !== 'perception' || res.NodeId !== 'perception') return
  const chatStore = getChatDataStore?.()
  if (!chatStore) return
  const ipcContent = Uint8ArrayToString(res.Content) || ''
  const perception = (JSON.parse(ipcContent) as AIAgentGrpcApi.PerceptionData) || {}
  if (isEmpty(perception)) return
  perception.summary = isArray(perception.summary) ? perception.summary.join(',') : perception.summary
  const applyPerceptionFields: ApplyCasualPlanDetailsFields = (target, ctx) => {
    target.uuid = uuidv4()
    resolvePlanDetailsTaskId(target, ctx)
    target.perception = perception
  }
  if (info.chatType === 'task') {
    const oldData = chatStore.taskChat.planDetailsMap.get(res.TaskId) || cloneDeep(DefaultPlanItemDetailsData)
    applyPerceptionFields(oldData, { isMainCasualTask: false, taskId: res.TaskId })
    chatStore.taskChat.planDetailsMap.set(res.TaskId, oldData)
  } else if (info.chatType === 'reAct') {
    updateCasualPlanItemDetails(chatStore, res, getTaskId, applyPerceptionFields)
  }
}

const handleSessionSnapshot: AIMessageHandler = (request) => {
  const { res, info, getChatDataStore, getTaskId } = request
  if (!res.TaskId) return
  if (res.NodeId !== 'session_snapshot') return

  const chatStore = getChatDataStore?.()
  if (!chatStore) return

  const ipcContent = Uint8ArrayToString(res.Content) || ''
  const snapshot = (JSON.parse(ipcContent) as AIAgentGrpcApi.SessionSnapshot) || {}
  if (isEmpty(snapshot)) return
  const applySnapshotFields: ApplyCasualPlanDetailsFields = (target, ctx) => {
    target.uuid = uuidv4()
    resolvePlanDetailsTaskId(target, ctx)
    target.execution = snapshot.execution
    target.backgroundProcesses = snapshot.background_processes
  }
  if (info.chatType === 'task') {
    const oldData = chatStore.taskChat.planDetailsMap.get(res.TaskId) || cloneDeep(DefaultPlanItemDetailsData)
    applySnapshotFields(oldData, { isMainCasualTask: false, taskId: res.TaskId })
    chatStore.taskChat.planDetailsMap.set(res.TaskId, oldData)
  } else if (info.chatType === 'reAct') {
    updateCasualPlanItemDetails(chatStore, res, getTaskId, applySnapshotFields)
  }
}
// #endregion

// #region stream数据相关逻辑
/**
 * - 存放 Type:stream NodeId:tool-xxx-stderr 的内容数据
 * - call_tool_id => {content:string uuid:string status:"start" | "end"}
 * - 当stream-finished触发后，将内容全部设置到工具结果对象中的execError字段中
 * - 本NodeId和stream类型中的其他NodeId有一样的后端逻辑，但是前端需要将其区分出来
 */
const ToolResultForStreamError: Map<string, { content: string; uuid: string; status: 'start' | 'end' }> = new Map()

/** Type='stream_start' stream类型数据初始化 */
const handleStreamStart: AIMessageHandler = (request) => {
  const { res, info, setContentMap, getContentMap, pushLog } = request
  if (res.Type !== 'stream_start') return
  // 属于日志数据的不进入UI展示
  if (res.IsSystem || res.IsReason) return

  const { CallToolID, NodeId } = res
  if (!NodeId) return

  const ipcContent = Uint8ArrayToString(res.Content) || ''
  const { event_writer_id } = JSON.parse(ipcContent) as { event_writer_id: string }
  // event_writer_id为空
  if (!event_writer_id) {
    handleErrorGRPCToLog(
      res.IsSync,
      pushLog,
      genErrorLogData(res.Timestamp, `${res.Type}数据(NodeId: ${NodeId}), event_writer_id 为空`),
    )
    return
  }

  // tool-xxx-stdout 数据单独初始化逻辑
  if (isToolStdoutStream(NodeId)) {
    if (!CallToolID) {
      handleErrorGRPCToLog(
        res.IsSync,
        pushLog,
        genErrorLogData(res.Timestamp, `${res.Type}数据(NodeId: ${NodeId}), CallToolID 为空`),
      )
      return
    }
    let toolResult = getContentMap(CallToolID || '')
    if (!toolResult || toolResult.type !== AIChatQSDataTypeEnum.TOOL_RESULT) {
      handleErrorGRPCToLog(
        res.IsSync,
        pushLog,
        genErrorLogData(
          res.Timestamp,
          `NodeID: ${NodeId} 的stream数据没有对应的工具结果(CallToolID: ${CallToolID})初始化`,
        ),
      )
      return
    }

    // 这里是直接使用引用设置的值，所以不需要在使用setContentMap设置回去
    toolResult.data.stream.EventUUID = event_writer_id
    toolResult.data.type = 'stream'
    setContentMap(event_writer_id, {
      ...genBaseAIChatData(res),
      id: event_writer_id,
      chatType: info.chatType,
      type: AIChatQSDataTypeEnum.STREAM,
      data: {
        NodeId,
        NodeIdVerbose: res.NodeIdVerbose || convertNodeIdToVerbose(NodeId),
        CallToolID,
        EventUUID: event_writer_id,
        status: 'start',
        content: '',
        ContentType: res.ContentType,
      },
      taskId: generateTaskId({
        chatType: info.chatType,
        res,
        getCurrentTaskPlanID: request.getCurrentTaskPlanID,
        getTaskId: request.getTaskId,
        getContentMap: request.getContentMap,
      }),
    })
    return
  }
  // tool-xxx-stderr 数据单独初始化逻辑
  if (isToolStderrStream(NodeId) && CallToolID) {
    if (!CallToolID) {
      handleErrorGRPCToLog(
        res.IsSync,
        pushLog,
        genErrorLogData(res.Timestamp, `${res.Type}数据(NodeId: ${NodeId}), CallToolID 为空`),
      )
      return
    }
    if (!ToolResultForStreamError.has(CallToolID)) {
      ToolResultForStreamError.set(CallToolID, {
        content: '',
        uuid: event_writer_id,
        status: 'start',
      })
    }
    return
  }

  // 数据集合中对应的数据
  const streamData = getContentMap(event_writer_id)

  // 数据已存在，流数据输出顺序不对, 视为异常
  if (streamData) {
    handleErrorGRPCToLog(
      res.IsSync,
      pushLog,
      genErrorLogData(
        res.Timestamp,
        `异常 ${res.Type} 类型, NodeId: ${NodeId}, eventuuid: (${event_writer_id}), 已存在对应的数据`,
      ),
    )
    return
  }

  setContentMap(event_writer_id, {
    ...genBaseAIChatData(res),
    id: event_writer_id,
    chatType: info.chatType,
    type: AIChatQSDataTypeEnum.STREAM,
    data: {
      NodeId,
      NodeIdVerbose: res.NodeIdVerbose || convertNodeIdToVerbose(NodeId),
      CallToolID,
      EventUUID: event_writer_id,
      status: 'start',
      content: '',
      ContentType: res.ContentType,
    },
    taskId: generateTaskId({
      chatType: info.chatType,
      res,
      getCurrentTaskPlanID: request.getCurrentTaskPlanID,
      getTaskId: request.getTaskId,
      getContentMap: request.getContentMap,
    }),
  })
}

/** 将 task 容器内 children 写回顶层 list，并给renderNum加一 */
const writeBackTaskGroupChildren = (
  list: ReActChatRenderItem[],
  taskGroupIndex: number,
  children: ReActChatTaskElementSub[],
): ReActChatRenderItem[] => {
  const taskGroup = list[taskGroupIndex] as ReActChatTaskElement
  list[taskGroupIndex] = { ...taskGroup, children, renderNum: taskGroup.renderNum + 1 }
  return list
}

/** stream数据初始化到UI上的逻辑处理 */
const handleIsGroupDisplayForStream: (
  /** grpc流数据 */
  res: AIMessageHandlerParams['res'],
  /** stream类型对应的详细数据 */
  streamDetail: ChatStream,
  /** 当前渲染的数据列表 */
  data: ReActChatRenderItem[],
  /** 获取详情数据映射的函数 */
  getContentMap: AIMessageHandlerParams['getContentMap'],
) => ReActChatRenderItem[] = (res, streamDetail, data, getContentMap) => {
  const taskNodeKey = streamDetail.taskId
  const list = [...data]
  /** 任务节点的索引 */
  let taskNodeIndex = -1
  /** task 容器内操作的列表；未命中时为顶层 list */
  let targetList: ReActChatTaskElementSub[] | ReActChatRenderItem[] = list

  if (taskNodeKey) {
    taskNodeIndex = list.findIndex((item) => item.kind === 'task' && item.token === taskNodeKey)
    if (taskNodeIndex >= 0) {
      const taskGroup = list[taskNodeIndex] as ReActChatTaskElement
      targetList = [...taskGroup.children]
    }
  }

  const { ContentType, IsSync } = res
  const element: ReActChatElement = {
    chatType: streamDetail.chatType,
    token: streamDetail.id,
    type: streamDetail.type,
    kind: 'item',
    renderNum: 1,
  }

  const commitIfInTaskGroup = (): ReActChatRenderItem[] | null => {
    if (taskNodeIndex < 0) return null
    return writeBackTaskGroupChildren(list, taskNodeIndex, targetList as ReActChatTaskElementSub[])
  }

  // 以下 判断stream数据已经渲染在UI上的逻辑处理
  const find = targetList.find((item) => item.token === element.token)
  if (find) {
    // 已经渲染到UI上, 是单个节点，或者是task节点下的单个节点/组数据的节点key命中
    if (find.kind === 'group') {
      const subFind = find.children.find((item) => item.token === element.token && item.type === element.type)
      if (subFind) subFind.renderNum += 1
    }
    find.renderNum += 1
    return commitIfInTaskGroup() ?? [...targetList]
  }
  if (streamDetail && streamDetail.parentGroupKey) {
    // 已经渲染到UI上, 不是组数据的key, 但是是组内数据, 找到组信息，并触发渲染更新
    const group = targetList.find(
      (item) => item.token === streamDetail.parentGroupKey && item.type === AIChatQSDataTypeEnum.STREAM_GROUP,
    )
    if (group && group.kind === 'group') {
      const subFind = group.children.find((item) => item.token === element.token && item.type === element.type)
      if (subFind) subFind.renderNum += 1
      group.renderNum += 1
    }
    return commitIfInTaskGroup() ?? [...targetList]
  }

  // 以下 stream数据没有渲染在UI上的逻辑处理
  if (ContentType !== AIStreamContentType.DEFAULT || !targetList.length) {
    // 新增不可成组类型数据
    IsSync ? targetList.unshift(element) : targetList.push(element)
    return commitIfInTaskGroup() ?? [...targetList]
  }

  const active = IsSync ? targetList[0] : targetList[targetList.length - 1]
  const activeDetail = getContentMap(active.token)
  if (!activeDetail || activeDetail.type !== AIChatQSDataTypeEnum.STREAM) {
    // UI详细数据没有或不是可成组类型，新增数据到UI上
    IsSync ? targetList.unshift(element) : targetList.push(element)
    return commitIfInTaskGroup() ?? [...targetList]
  }

  if (active.type === AIChatQSDataTypeEnum.STREAM && active.kind !== 'group') {
    if (activeDetail.data.NodeId === streamDetail.data.NodeId) {
      // 命中单项，准备整合成组数据，将原有单项的token当成组token
      const groupInfo: ReActChatGroupElement = {
        chatType: active.chatType,
        token: active.token,
        type: AIChatQSDataTypeEnum.STREAM_GROUP,
        renderNum: 1,
        kind: 'group',
        children: [],
      }
      groupInfo.children = IsSync
        ? [element, cloneDeep(active) as ReActChatElement]
        : [cloneDeep(active) as ReActChatElement, element]
      const arr = groupInfo.children.map((item) => item.token)
      for (let el of arr) {
        const info = getContentMap(el)
        if (info) info.parentGroupKey = active.token
      }
      IsSync ? targetList.shift() : targetList.pop()
      IsSync ? targetList.unshift(groupInfo) : targetList.push(groupInfo)
    } else {
      IsSync ? targetList.unshift(element) : targetList.push(element)
    }
    return commitIfInTaskGroup() ?? [...targetList]
  } else if (active.type === AIChatQSDataTypeEnum.STREAM_GROUP && active.kind === 'group') {
    if (activeDetail.data.NodeId === streamDetail.data.NodeId) {
      // 命中组内数据，追加到组内
      streamDetail.parentGroupKey = active.token
      IsSync ? active.children.unshift(element) : active.children.push(element)
      active.renderNum += 1
    } else {
      IsSync ? targetList.unshift(element) : targetList.push(element)
    }
    return commitIfInTaskGroup() ?? [...targetList]
  } else {
    IsSync ? targetList.unshift(element) : targetList.push(element)
    return commitIfInTaskGroup() ?? [...targetList]
  }
}

/**
 * grpc流数据的各种类型处理逻辑集合
 * 该逻辑集合里的方法处理，没有使用try-catch拦截，因为在hook层进行了同一try-catch拦截
 * 注意！别的地方单独使用时，请自行加入try-catch拦截错误
 */
export const grpcAIMessageHandlers: Record<string, AIMessageHandler> = {}
