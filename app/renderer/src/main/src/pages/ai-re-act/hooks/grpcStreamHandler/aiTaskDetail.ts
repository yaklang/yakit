import type { AIMessageHandler } from '../type'
import type { AIAgentGrpcApi } from '../grpcApi'
import { Uint8ArrayToString } from '@/utils/str'
import { handleTodoListData } from '../utils'
import cloneDeep from 'lodash/cloneDeep'
import isArray from 'lodash/isArray'
import isEmpty from 'lodash/isEmpty'
import { v4 as uuidv4 } from 'uuid'
import type { PlanItemDetailsData } from '../aiRender'
import { DefaultPlanItemDetailsData } from '../defaultConstant'

type CapabilityFields = Pick<PlanItemDetailsData, 'tool' | 'forges' | 'skills' | 'plugins' | 'mcp'>

const emptyCapabilityFields = (): CapabilityFields => ({
  tool: { fixed: [], dynamic: [] },
  forges: { fixed: [], dynamic: [] },
  skills: { fixed: [], dynamic: [] },
  plugins: { fixed: [], dynamic: [] },
  mcp: { fixed: [], dynamic: [] },
})

/**
 * 将 legacy PlanItemDetails（fixed/dynamic）写入 CapabilityFields。
 * 注意：fixed.mcp_servers 有意不读——与 legacy capability_inventory 一致（原「暂时没有这个数据」），
 * UI 仅有 mcp 工具桶（category=mcp），无 mcp_server 独立展示位；勿误以为漏写映射。
 */
const planItemDetailsToCapabilityFields = (payload: AIAgentGrpcApi.PlanItemDetails): CapabilityFields => {
  const itemData = emptyCapabilityFields()
  const { fixed, dynamic } = payload

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
  if (fixed?.forges) {
    itemData.forges.fixed = fixed.forges
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
  if (dynamic?.forges) {
    itemData.forges.dynamic = dynamic.forges
  }

  // 技能按加载状态分类，不沿用后端的 fixed/dynamic 位置。
  for (const skill of [...(fixed?.skills || []), ...(dynamic?.skills || [])]) {
    if (skill.skill_load_state === 'loaded') {
      itemData.skills.fixed.push({
        ...skill,
        verbose_name: 'verbose_name' in skill ? skill.verbose_name : skill.name,
      })
    } else {
      itemData.skills.dynamic.push({
        ...skill,
        category: 'skill',
        skill_load_state: skill.skill_load_state ?? '',
      })
    }
  }

  return itemData
}

/** 对齐后端 CapabilityInventoryPayloadFromItems：扁平 capabilities → PlanItemDetails */
const capabilityInventoryItemsToPlanItemDetails = (
  items: AIAgentGrpcApi.CapabilityInventoryItem[] | undefined,
): AIAgentGrpcApi.PlanItemDetails => {
  const payload: AIAgentGrpcApi.PlanItemDetails = {
    fixed: { tools: [], mcp_servers: [], forges: [], skills: [] },
    dynamic: { tools: [], skills: [], forges: [] },
  }
  if (!items?.length) return payload

  for (const item of items) {
    const name = (item.name || '').trim()
    if (!name) continue
    const isDynamic = item.position === 'Dynamic'
    const base = {
      name,
      verbose_name: item.verbose_name || name,
      description: item.description || '',
    }

    switch (item.type) {
      case 'skill': {
        const skillLoadState =
          typeof item.data?.skill_load_state === 'string'
            ? (item.data.skill_load_state as 'metadata' | 'loaded' | '')
            : item.stage === 'loaded'
              ? 'loaded'
              : 'metadata'
        const skill: AIAgentGrpcApi.PlanItemDetailsFixedItem & AIAgentGrpcApi.PlanItemDetailsDynamicSkillsItem = {
          ...base,
          category: 'skill',
          skill_load_state: skillLoadState,
          token_count: item.data?.token_count as number,
        }
        if (isDynamic) payload.dynamic.skills.push(skill)
        else payload.fixed.skills.push(skill)
        break
      }
      case 'forge': {
        const named = { ...base, category: 'forge' as const }
        if (isDynamic) payload.dynamic.forges.push(named)
        else payload.fixed.forges.push(named)
        break
      }
      case 'mcp_server':
        // 仅对齐后端 payload 形状；下游 planItemDetailsToCapabilityFields 不消费 mcp_servers（见该函数注释）
        payload.fixed.mcp_servers.push({ ...base, category: 'mcp_server' })
        break
      default: {
        const category =
          item.type === 'mcp' ? ('mcp' as const) : item.type === 'plugin' ? ('yak_plugin' as const) : ('tool' as const)
        const tool = { ...base, category }
        if (isDynamic) payload.dynamic.tools.push(tool)
        else payload.fixed.tools.push(tool)
        break
      }
    }
  }
  return payload
}

const applyCapabilityFieldsToTarget = (target: PlanItemDetailsData, fields: CapabilityFields, taskId: string) => {
  target.uuid = uuidv4()
  target.taskId = target.taskId || taskId
  target.tool = fields.tool
  target.forges = fields.forges
  target.skills = fields.skills
  target.plugins = fields.plugins
  target.mcp = fields.mcp
}

const mapSessionPerceptionToPerceptionData = (
  perception: AIAgentGrpcApi.SessionSnapshotPerception | undefined,
): AIAgentGrpcApi.PerceptionData | undefined => {
  if (!perception) return undefined
  const summaryRaw = perception.summary
  const summary = isArray(summaryRaw) ? summaryRaw.join(',') : summaryRaw || ''
  return {
    summary,
    topics: perception.topics || [],
    keywords: perception.keywords || [],
    changed: !!perception.changed,
    confidence: perception.confidence ?? 0,
    trigger: perception.last_trigger || '',
    epoch: perception.epoch ?? 0,
    intent_shift: perception.intent_shift || 'none',
    timestamp: perception.last_update_at ?? 0,
  }
}

const handleCapabilityInventory: AIMessageHandler = (requestInfo) => {
  const { res, rawData, store } = requestInfo
  if (res.Type !== 'structured' || res.NodeId !== 'capability_inventory') return
  if (!res.TaskId) return

  const ipcContent = Uint8ArrayToString(res.Content) || ''
  const payload = JSON.parse(ipcContent) as AIAgentGrpcApi.PlanItemDetails
  if (isEmpty(payload)) return

  const fields = planItemDetailsToCapabilityFields(payload)
  const oldData = rawData.taskDetailsMap.get(res.TaskId) || cloneDeep(DefaultPlanItemDetailsData)
  applyCapabilityFieldsToTarget(oldData, fields, res.TaskId)
  rawData.taskDetailsMap.set(res.TaskId, oldData)
  store.getState().updateStateCount('taskDetailsUpdate')
}

const handlePerception: AIMessageHandler = (requestInfo) => {
  const { res, rawData, store } = requestInfo
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
  store.getState().updateStateCount('taskDetailsUpdate')
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
    // iteration_index 是后端 ReAct 主循环的真实迭代轮数, 快照尚未携带 execution_rounds 时作为其数据源；
    // 与 session_snapshot 一致用 Math.max，避免乱序/回放把已展示的步骤回退
    if (typeof data.iteration_index === 'number' && data.iteration_index >= 0) {
      target.execution = {
        ...(target.execution || {}),
        execution_rounds: Math.max(target.execution?.execution_rounds ?? 0, data.iteration_index),
      }
    }
  }

  const oldData = rawData.taskDetailsMap.get(res.TaskId) || cloneDeep(DefaultPlanItemDetailsData)
  applyTodoListFields(oldData)
  rawData.taskDetailsMap.set(res.TaskId, oldData)
  store.getState().updateStateCount('taskDetailsUpdate')
  if (chatType === 'reAct') {
    store.getState().updateStateCount('chatTodoListUpdate')
  }
}

const handleSessionSnapshot: AIMessageHandler = (requestInfo) => {
  const { res, rawData, store } = requestInfo
  if (res.Type !== 'structured' || res.NodeId !== 'session_snapshot') return

  const ipcContent = Uint8ArrayToString(res.Content) || ''
  const snapshot = (JSON.parse(ipcContent) as AIAgentGrpcApi.SessionSnapshot) || {}
  if (isEmpty(snapshot)) return

  // 任务索引用会话级水位（勿绑单任务 revision）；乱序旧包不得回退下拉列表
  if (Array.isArray(snapshot.tasks)) {
    const listRev = typeof snapshot.revision === 'number' ? snapshot.revision : 0
    const cachedListRev = store.getState().sessionTaskListRevision ?? 0
    if (!(listRev > 0 && listRev <= cachedListRev)) {
      store.getState().updateState({
        sessionTaskList: snapshot.tasks,
        ...(listRev > 0 ? { sessionTaskListRevision: listRev } : {}),
      })
    }
  }

  if (!res.TaskId) return

  const oldData = rawData.taskDetailsMap.get(res.TaskId) || cloneDeep(DefaultPlanItemDetailsData)
  if (
    typeof snapshot.revision === 'number' &&
    snapshot.revision > 0 &&
    snapshot.revision <= (oldData.sessionSnapshotRevision ?? 0)
  ) {
    return
  }

  const applySnapshotFields = (target: PlanItemDetailsData) => {
    target.uuid = uuidv4()
    target.taskId = target.taskId || res.TaskId
    const recordedExecutionRounds = Math.max(
      target.execution?.execution_rounds ?? 0,
      snapshot.execution?.execution_rounds ?? 0,
    )
    target.execution = {
      ...snapshot.execution,
      execution_rounds: recordedExecutionRounds > 0 ? recordedExecutionRounds : undefined,
    }
    target.backgroundProcesses = snapshot.background_processes
    if (typeof snapshot.revision === 'number' && snapshot.revision > 0) {
      target.sessionSnapshotRevision = snapshot.revision
    }
  }

  applySnapshotFields(oldData)
  rawData.taskDetailsMap.set(res.TaskId, oldData)
  store.getState().updateStateCount('taskDetailsUpdate')
}

const handleTaskSnapshot: AIMessageHandler = (requestInfo) => {
  const { res, rawData, store, chatType } = requestInfo
  if (res.Type !== 'structured' || res.NodeId !== 'task_snapshot') return

  const ipcContent = Uint8ArrayToString(res.Content) || ''
  // 错误回包（如 not found）无完整结构，静默忽略
  let payload: AIAgentGrpcApi.SessionTaskSnapshot
  try {
    payload = JSON.parse(ipcContent) as AIAgentGrpcApi.SessionTaskSnapshot
  } catch {
    return
  }
  const taskId = (payload.task_id || res.TaskId || '').trim()
  if (!taskId || isEmpty(payload)) return
  if (!payload.snapshot && !payload.todo) return

  const oldData = rawData.taskDetailsMap.get(taskId) || cloneDeep(DefaultPlanItemDetailsData)
  // 仅与本通道 taskSnapshotRevision 比较；勿复用 session 水位，否则同 rev 的互补包会被整包丢掉
  if (
    typeof payload.revision === 'number' &&
    payload.revision > 0 &&
    payload.revision <= (oldData.taskSnapshotRevision ?? 0)
  ) {
    return
  }

  oldData.uuid = uuidv4()
  oldData.taskId = taskId

  const nested = payload.snapshot
  if (nested?.execution) {
    const recordedExecutionRounds = Math.max(
      oldData.execution?.execution_rounds ?? 0,
      nested.execution.execution_rounds ?? 0,
    )
    oldData.execution = {
      ...nested.execution,
      execution_rounds: recordedExecutionRounds > 0 ? recordedExecutionRounds : undefined,
    }
  }
  if (nested?.background_processes) {
    oldData.backgroundProcesses = nested.background_processes
  }
  if (typeof payload.revision === 'number' && payload.revision > 0) {
    oldData.taskSnapshotRevision = payload.revision
  }

  const perception = mapSessionPerceptionToPerceptionData(nested?.perception)
  if (perception) {
    oldData.perception = perception
  }

  let todoUpdated = false
  if (payload.todo?.items) {
    oldData.todoList = handleTodoListData(payload.todo.items, taskId)
    todoUpdated = true
  }

  if (nested && Array.isArray(nested.capabilities)) {
    const fields = planItemDetailsToCapabilityFields(capabilityInventoryItemsToPlanItemDetails(nested.capabilities))
    applyCapabilityFieldsToTarget(oldData, fields, taskId)
  }

  rawData.taskDetailsMap.set(taskId, oldData)
  store.getState().updateStateCount('taskDetailsUpdate')
  // 与 current_task_todo_list_update 一致：通知聊天待办条从 map 重读
  if (todoUpdated && chatType === 'reAct') {
    store.getState().updateStateCount('chatTodoListUpdate')
  }
}

/** 单条grpc流数据对应一个独立的UI数据 */
export const aiTaskDetailDataHandlers = {
  capability_inventory: handleCapabilityInventory,
  perception: handlePerception,
  current_task_todo_list_update: handleCurrentTaskTodoListUpdate,
  session_snapshot: handleSessionSnapshot,
  task_snapshot: handleTaskSnapshot,
} as const
