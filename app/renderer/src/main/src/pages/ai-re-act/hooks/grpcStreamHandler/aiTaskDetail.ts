import type { AIMessageHandler, AIMessageHandlerParams } from '../type'
import type { AIAgentGrpcApi, AIOutputEvent } from '../grpcApi'
import { Uint8ArrayToString } from '@/utils/str'
import { handleTodoListData } from '../utils'
import cloneDeep from 'lodash/cloneDeep'
import isArray from 'lodash/isArray'
import isEmpty from 'lodash/isEmpty'
import { v4 as uuidv4 } from 'uuid'
import { AIChatQSDataTypeEnum, type PlanItemDetailsData } from '../aiRender'
import { DefaultPlanItemDetailsData } from '../defaultConstant'

/** 自由对话：是否为子 agent 任务（planDetailsMap 用子任务 ID；contents 用复合 ID） */
const isCasualSubAgentTask = (
  rawData: AIMessageHandlerParams['rawData'],
  store: AIMessageHandlerParams['store'],
  res: AIOutputEvent,
) => {
  if (rawData.casualChat.planDetailsMap.has(res.TaskId)) return true

  if (!store.getState().currentCasualTaskID || !res.TaskId) return false
  return (
    rawData.contents.get(`${store.getState().currentCasualTaskID}-${res.TaskId}`)?.type ===
    AIChatQSDataTypeEnum.TASK_NODE_GROUP
  )
}

const handleCapabilityInventory: AIMessageHandler = (requestInfo) => {
  const { res, chatType, rawData, store } = requestInfo
  if (res.Type !== 'structured' || res.NodeId !== 'capability_inventory') return
  if (!res.TaskId) return

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

  // 只能通过字段重新赋值的方式修改，不能解构赋值
  const applyCapabilityFields = (target: PlanItemDetailsData) => {
    target.uuid = itemData.uuid
    target.taskId = target.taskId || res.TaskId
    target.tool = itemData.tool
    target.forges = itemData.forges
    target.skills = itemData.skills
    target.plugins = itemData.plugins
    target.mcp = itemData.mcp
  }

  if (chatType === 'task') {
    const oldData = rawData.taskChat.planDetailsMap.get(res.TaskId) || cloneDeep(DefaultPlanItemDetailsData)
    applyCapabilityFields(oldData)
    rawData.taskChat.planDetailsMap.set(res.TaskId, oldData)
  } else if (chatType === 'reAct') {
    const isSubAgentTask = isCasualSubAgentTask(rawData, store, res)
    const chatDetail = isSubAgentTask
      ? rawData.casualChat.planDetailsMap.get(res.TaskId) || cloneDeep(DefaultPlanItemDetailsData)
      : rawData.casualChat?.planDetails || cloneDeep(DefaultPlanItemDetailsData)
    applyCapabilityFields(chatDetail)
    if (isSubAgentTask) {
      rawData.casualChat.planDetailsMap.set(res.TaskId, chatDetail)
    } else {
      rawData.casualChat.planDetails = chatDetail
    }
  }
}

const handlePerception: AIMessageHandler = (requestInfo) => {
  const { res, chatType, rawData, store } = requestInfo
  if (res.Type !== 'perception' || res.NodeId !== 'perception') return
  if (!res.TaskId) return

  const ipcContent = Uint8ArrayToString(res.Content) || ''
  const perception = (JSON.parse(ipcContent) as AIAgentGrpcApi.PerceptionData) || {}
  if (isEmpty(perception)) return

  perception.summary = isArray(perception.summary) ? perception.summary.join(',') : perception.summary
  const applyPerceptionFields = (target: PlanItemDetailsData) => {
    target.uuid = uuidv4()
    target.taskId = target.taskId || res.TaskId
    target.perception = perception
  }

  if (chatType === 'task') {
    const oldData = rawData.taskChat.planDetailsMap.get(res.TaskId) || cloneDeep(DefaultPlanItemDetailsData)
    applyPerceptionFields(oldData)
    rawData.taskChat.planDetailsMap.set(res.TaskId, oldData)
  } else if (chatType === 'reAct') {
    const isSubAgentTask = isCasualSubAgentTask(rawData, store, res)
    const chatDetail = isSubAgentTask
      ? rawData.casualChat.planDetailsMap.get(res.TaskId) || cloneDeep(DefaultPlanItemDetailsData)
      : rawData.casualChat?.planDetails || cloneDeep(DefaultPlanItemDetailsData)
    applyPerceptionFields(chatDetail)
    if (isSubAgentTask) {
      rawData.casualChat.planDetailsMap.set(res.TaskId, chatDetail)
    } else {
      rawData.casualChat.planDetails = chatDetail
    }
  }
}

const handleCurrentTaskTodoListUpdate: AIMessageHandler = (requestInfo) => {
  const { res, chatType, store, rawData } = requestInfo
  if (res.Type !== 'current_task_todo_list_update' || res.NodeId !== 'current_task_todo_list') return
  if (!res.TaskId) return

  const ipcContent = Uint8ArrayToString(res.Content) || ''
  // 更新待办清单卡片数据
  const data = JSON.parse(ipcContent) as AIAgentGrpcApi.TodoListUpdate
  if (isEmpty(data)) return

  const newData = handleTodoListData(data.items, data.task_id)
  const applyTodoListFields = (target: PlanItemDetailsData) => {
    target.uuid = uuidv4()
    target.taskId = target.taskId || res.TaskId
    target.todoList = newData
  }

  if (chatType === 'task') {
    const oldData = rawData.taskChat.planDetailsMap.get(res.TaskId) || cloneDeep(DefaultPlanItemDetailsData)
    applyTodoListFields(oldData)
    rawData.taskChat.planDetailsMap.set(res.TaskId, oldData)
  } else if (chatType === 'reAct') {
    const isSubAgentTask = isCasualSubAgentTask(rawData, store, res)
    const chatDetail = isSubAgentTask
      ? rawData.casualChat.planDetailsMap.get(res.TaskId) || cloneDeep(DefaultPlanItemDetailsData)
      : rawData.casualChat?.planDetails
    if (!chatDetail) return
    applyTodoListFields(chatDetail)
    if (isSubAgentTask) {
      rawData.casualChat.planDetailsMap.set(res.TaskId, chatDetail)
    }
    store.getState().updateCasualTodoList()
  }
}

const handleSessionSnapshot: AIMessageHandler = (requestInfo) => {
  const { res, chatType, rawData, store } = requestInfo
  if (res.NodeId !== 'session_snapshot') return
  if (!res.TaskId) return

  const ipcContent = Uint8ArrayToString(res.Content) || ''
  const snapshot = (JSON.parse(ipcContent) as AIAgentGrpcApi.SessionSnapshot) || {}
  if (isEmpty(snapshot)) return
  const applySnapshotFields = (target: PlanItemDetailsData) => {
    target.uuid = uuidv4()
    target.taskId = target.taskId || res.TaskId
    target.execution = snapshot.execution
    target.backgroundProcesses = snapshot.background_processes
  }

  if (chatType === 'task') {
    const oldData = rawData.taskChat.planDetailsMap.get(res.TaskId) || cloneDeep(DefaultPlanItemDetailsData)
    applySnapshotFields(oldData)
    rawData.taskChat.planDetailsMap.set(res.TaskId, oldData)
  } else if (chatType === 'reAct') {
    const isSubAgentTask = isCasualSubAgentTask(rawData, store, res)
    const chatDetail = isSubAgentTask
      ? rawData.casualChat.planDetailsMap.get(res.TaskId) || cloneDeep(DefaultPlanItemDetailsData)
      : rawData.casualChat?.planDetails || cloneDeep(DefaultPlanItemDetailsData)
    applySnapshotFields(chatDetail)
    if (isSubAgentTask) {
      rawData.casualChat.planDetailsMap.set(res.TaskId, chatDetail)
    } else {
      rawData.casualChat.planDetails = chatDetail
    }
  }
}

/** 单条grpc流数据对应一个独立的UI数据 */
export const aiTaskDetailDataHandlers = {
  capability_inventory: handleCapabilityInventory,
  perception: handlePerception,
  current_task_todo_list_update: handleCurrentTaskTodoListUpdate,
  session_snapshot: handleSessionSnapshot,
} as const
