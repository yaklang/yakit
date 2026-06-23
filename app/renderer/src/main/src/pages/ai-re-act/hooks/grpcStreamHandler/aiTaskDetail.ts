import type { AIMessageHandler } from '../type'
import type { AIAgentGrpcApi, AIOutputEvent } from '../grpcApi'
import { Uint8ArrayToString } from '@/utils/str'
import { handleTodoListData } from '../utils'
import cloneDeep from 'lodash/cloneDeep'
import isArray from 'lodash/isArray'
import isEmpty from 'lodash/isEmpty'
import { v4 as uuidv4 } from 'uuid'

const handleCapabilityInventory: AIMessageHandler = (requestInfo) => {
  const { res, chatType, rawData } = requestInfo
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

  if (chatType === 'task') {
    // 只能通过字段重新赋值的方式修改，不能解构赋值
    const oldData = rawData.taskChat.planDetailsMap.get(res.TaskId) || cloneDeep(DefaultPlanItemDetailsData)
    oldData.uuid = itemData.uuid
    oldData.taskId = oldData?.taskId || res.TaskId
    oldData.tool = itemData.tool
    oldData.forges = itemData.forges
    oldData.skills = itemData.skills
    oldData.plugins = itemData.plugins
    oldData.mcp = itemData.mcp
    rawData.taskChat.planDetailsMap.set(res.TaskId, oldData)
  } else if (chatType === 'reAct') {
    // 只能通过字段重新赋值的方式修改，不能解构赋值
    const chatDetail = rawData.casualChat?.planDetails || cloneDeep(DefaultPlanItemDetailsData)
    chatDetail.uuid = itemData.uuid
    chatDetail.taskId = chatDetail?.taskId || res.TaskId
    chatDetail.tool = itemData.tool
    chatDetail.forges = itemData.forges
    chatDetail.skills = itemData.skills
    chatDetail.plugins = itemData.plugins
    chatDetail.mcp = itemData.mcp
    rawData.casualChat.planDetails = chatDetail
  }
}

const handlePerception: AIMessageHandler = (requestInfo) => {
  const { res, chatType, store, rawData, meta } = requestInfo
  if (res.Type !== 'perception' || res.NodeId !== 'perception') return
  if (!res.TaskId) return

  const ipcContent = Uint8ArrayToString(res.Content) || ''
  const perception = (JSON.parse(ipcContent) as AIAgentGrpcApi.PerceptionData) || {}
  if (isEmpty(perception)) return

  perception.summary = isArray(perception.summary) ? perception.summary.join(',') : perception.summary
  if (chatType === 'task') {
    const oldData = rawData.taskChat.planDetailsMap.get(res.TaskId) || cloneDeep(DefaultPlanItemDetailsData)
    oldData.taskId = oldData?.taskId || res.TaskId
    oldData.uuid = uuidv4()
    oldData.perception = perception
    rawData.taskChat.planDetailsMap.set(res.TaskId, oldData)
  } else if (chatType === 'reAct') {
    const chatDetail = rawData.casualChat?.planDetails || cloneDeep(DefaultPlanItemDetailsData)
    chatDetail.uuid = uuidv4()
    chatDetail.taskId = chatDetail.taskId || res.TaskId
    chatDetail.perception = perception
    rawData.casualChat.planDetails = chatDetail
  }
}

const handleCurrentTaskTodoListUpdate: AIMessageHandler = (requestInfo) => {
  const { res, chatType, store, rawData, meta } = requestInfo
  if (res.Type !== 'current_task_todo_list_update' || res.NodeId !== 'current_task_todo_list') return
  if (!res.TaskId) return

  const ipcContent = Uint8ArrayToString(res.Content) || ''
  // 更新待办清单卡片数据
  const data = JSON.parse(ipcContent) as AIAgentGrpcApi.TodoListUpdate
  if (isEmpty(data)) return

  const newData = handleTodoListData(data.items, data.task_id, data.task_index)
  if (chatType === 'task') {
    const oldData = rawData.taskChat.planDetailsMap.get(res.TaskId) || cloneDeep(DefaultPlanItemDetailsData)
    oldData.uuid = uuidv4()
    oldData.taskId = oldData.taskId || res.TaskId
    oldData.todoList = newData
    rawData.taskChat.planDetailsMap.set(res.TaskId, oldData)
  } else if (chatType === 'reAct') {
    const chatDetail = rawData.casualChat?.planDetails
    if (!chatDetail) return
    chatDetail.taskId = chatDetail.taskId || res.TaskId
    chatDetail.todoList = newData
    store.getState().updateCasualTodoList()
  }
}

const handleSessionSnapshot: AIMessageHandler = (requestInfo) => {
  const { res, chatType, store, rawData, meta } = requestInfo
  if (res.NodeId !== 'session_snapshot') return
  if (!res.TaskId) return

  const ipcContent = Uint8ArrayToString(res.Content) || ''
  const snapshot = (JSON.parse(ipcContent) as AIAgentGrpcApi.SessionSnapshot) || {}
  if (isEmpty(snapshot)) return
  if (chatType === 'task') {
    const oldData = rawData.taskChat.planDetailsMap.get(res.TaskId) || cloneDeep(DefaultPlanItemDetailsData)
    oldData.taskId = oldData?.taskId || res.TaskId
    oldData.uuid = uuidv4()
    oldData.execution = snapshot.execution
    rawData.taskChat.planDetailsMap.set(res.TaskId, oldData)
  } else if (chatType === 'reAct') {
    const chatDetail = rawData.casualChat?.planDetails || cloneDeep(DefaultPlanItemDetailsData)
    chatDetail.uuid = uuidv4()
    chatDetail.taskId = chatDetail.taskId || res.TaskId
    chatDetail.execution = snapshot.execution
    rawData.casualChat.planDetails = chatDetail
  }
}

/** 单条grpc流数据对应一个独立的UI数据 */
export const aiTaskDetailDataHandlers = {
  capability_inventory: handleCapabilityInventory,
  perception: handlePerception,
  current_task_todo_list_update: handleCurrentTaskTodoListUpdate,
  session_snapshot: handleSessionSnapshot,
} as const

const exampleHandle = (res: AIOutputEvent) => {
  let funcKey = res.Type
  if (res.Type === 'structured' && res.NodeId === 'capability_inventory') {
    funcKey = res.NodeId
  } else if (res.Type === 'perception' && res.NodeId === 'perception') {
    funcKey = res.Type
  } else if (res.Type === 'current_task_todo_list_update' && res.NodeId === 'current_task_todo_list') {
    funcKey = res.Type
  } else if (res.NodeId === 'session_snapshot') {
    funcKey = res.NodeId
  }
}
