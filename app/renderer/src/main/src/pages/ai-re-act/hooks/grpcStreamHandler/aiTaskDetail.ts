import type { AIMessageHandler } from '../type'
import type { AIAgentGrpcApi } from '../grpcApi'
import { Uint8ArrayToString } from '@/utils/str'
import { handleTodoListData } from '../utils'
import cloneDeep from 'lodash/cloneDeep'
import isArray from 'lodash/isArray'
import isEmpty from 'lodash/isEmpty'
import { v4 as uuidv4 } from 'uuid'
import { type PlanItemDetailsData } from '../aiRender'
import { DefaultPlanItemDetailsData } from '../defaultConstant'

const handleCapabilityInventory: AIMessageHandler = (requestInfo) => {
  const { res, rawData } = requestInfo
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
  if (fixed?.tools) {
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
  if (fixed?.forges) {
    itemData.forges.fixed = fixed.forges
  }
  if (fixed?.skills) {
    itemData.skills.fixed = fixed.skills
  }

  if (dynamic?.tools) {
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
  if (dynamic?.skills) {
    itemData.skills.dynamic = dynamic.skills
  }
  if (dynamic?.forges) {
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

  const oldData = rawData.taskDetailsMap.get(res.TaskId) || cloneDeep(DefaultPlanItemDetailsData)
  applyCapabilityFields(oldData)
  rawData.taskDetailsMap.set(res.TaskId, oldData)
}

const handlePerception: AIMessageHandler = (requestInfo) => {
  const { res, rawData } = requestInfo
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

  const oldData = rawData.taskDetailsMap.get(res.TaskId) || cloneDeep(DefaultPlanItemDetailsData)
  applyPerceptionFields(oldData)
  rawData.taskDetailsMap.set(res.TaskId, oldData)
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

  const oldData = rawData.taskDetailsMap.get(res.TaskId) || cloneDeep(DefaultPlanItemDetailsData)
  applyTodoListFields(oldData)
  rawData.taskDetailsMap.set(res.TaskId, oldData)
  if (chatType === 'reAct') {
    store.getState().updateStateCount('chatTodoListUpdate')
  }
}

const handleSessionSnapshot: AIMessageHandler = (requestInfo) => {
  const { res, rawData } = requestInfo
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

  const oldData = rawData.taskDetailsMap.get(res.TaskId) || cloneDeep(DefaultPlanItemDetailsData)
  applySnapshotFields(oldData)
  rawData.taskDetailsMap.set(res.TaskId, oldData)
}

/** 单条grpc流数据对应一个独立的UI数据 */
export const aiTaskDetailDataHandlers = {
  capability_inventory: handleCapabilityInventory,
  perception: handlePerception,
  current_task_todo_list_update: handleCurrentTaskTodoListUpdate,
  session_snapshot: handleSessionSnapshot,
} as const
