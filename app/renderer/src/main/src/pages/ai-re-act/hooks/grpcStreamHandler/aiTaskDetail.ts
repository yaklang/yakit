import { AISkillLoadStateEnum } from '../grpcApi'
import type { SessionSkillItem } from '@/pages/ai-agent/type/aiChat'
import { yakitNotify } from '@/utils/notification'
import type { AIMessageHandler } from '../type'
import type { AIAgentGrpcApi } from '../grpcApi'
import { StringToUint8Array, Uint8ArrayToString } from '@/utils/str'
import { handleTodoListData } from '../utils'
import cloneDeep from 'lodash/cloneDeep'
import isArray from 'lodash/isArray'
import isEmpty from 'lodash/isEmpty'
import { v4 as uuidv4 } from 'uuid'
import { type PlanItemDetailsData } from '../aiRender'
import { DefaultPlanItemDetailsData } from '../defaultConstant'

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
        const rawSkillState = item.data?.skill_load_state ?? item.stage
        const skillLoadState = rawSkillState === 'loaded' ? 'loaded' : rawSkillState === 'metadata' ? 'metadata' : ''
        const skill: AIAgentGrpcApi.PlanItemDetailsFixedItem & AIAgentGrpcApi.PlanItemDetailsDynamicSkillsItem = {
          ...base,
          category: 'skill',
          skill_load_state: skillLoadState,
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
    if (snapshot.execution) target.execution = snapshot.execution
    if (snapshot.background_processes) target.backgroundProcesses = snapshot.background_processes
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
  if (!payload || typeof payload !== 'object') return
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
    oldData.execution = nested.execution
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
    // task_snapshot 已按 task_id 物化；旧引擎根任务项可能不带 scope_task_id。
    // 显式属于其它子任务的条目仍交给原过滤器排除。
    oldData.todoList = handleTodoListData(
      payload.todo.items.map((item) => (item.scope_task_id ? item : { ...item, scope_task_id: taskId })),
      taskId,
    )
    todoUpdated = true
  }

  rawData.taskDetailsMap.set(taskId, oldData)
  if (nested && Array.isArray(nested.capabilities)) {
    // Reuse the existing capability buckets; this batch does not change skill load semantics.
    handleCapabilityInventory({
      ...requestInfo,
      res: {
        ...res,
        Type: 'structured',
        NodeId: 'capability_inventory',
        TaskId: taskId,
        Content: StringToUint8Array(JSON.stringify(capabilityInventoryItemsToPlanItemDetails(nested.capabilities))),
      },
    })
  }

  rawData.taskDetailsMap.set(taskId, oldData)
  store.getState().updateStateCount('taskDetailsUpdate')
  // 与 current_task_todo_list_update 一致：通知聊天待办条从 map 重读
  if (todoUpdated && chatType === 'reAct') {
    store.getState().updateStateCount('chatTodoListUpdate')
  }
}

/** 单条grpc流数据对应一个独立的UI数据 */
const handleSkillDetail: AIMessageHandler = ({ res, rawData, store }) => {
  if (res.Type === 'structured' && res.NodeId === 'skill_detail') {
    const detail: AIAgentGrpcApi.SkillDetail = JSON.parse(Uint8ArrayToString(res.Content))
    rawData.skillDetails.set(detail.name, detail)
    store.getState().updateStateCount('skillDetailsUpdate')
  }
}

const mapSkillListItems = (
  skills: AIAgentGrpcApi.SkillListEntry[],
  loadState: string,
  skillDetails: Map<string, AIAgentGrpcApi.SkillDetail>,
): SessionSkillItem[] =>
  skills.map((skill) => {
    const detail = skillDetails.get(skill.name)
    if (detail && detail.loaded !== (loadState === AISkillLoadStateEnum.Loaded)) skillDetails.delete(skill.name)
    return {
      name: skill.name,
      description: skill.description,
      skill_load_state: loadState,
      token_count: skill.data?.token_count,
    }
  })

const handleLoadedSkills: AIMessageHandler = ({ res, store, rawData }) => {
  if (res.Type !== 'structured' || res.NodeId !== 'skill_loaded') return

  const response = JSON.parse(Uint8ArrayToString(res.Content)) as AIAgentGrpcApi.SkillLoadedResponse
  rawData.loadedSkills = {
    ...response,
    skills: mapSkillListItems(response.skills, AISkillLoadStateEnum.Loaded, rawData.skillDetails),
  }
  store.getState().updateStateCount('loadedSkillsUpdate')
}

const handleAvailableSkills: AIMessageHandler = ({ res, store, rawData }) => {
  if (res.Type !== 'structured' || res.NodeId !== 'skill_available') return

  const response = JSON.parse(Uint8ArrayToString(res.Content)) as
    | AIAgentGrpcApi.SkillAvailableResponse
    | AIAgentGrpcApi.SkillAvailableErrorResponse
  if ('error' in response) {
    // 错误响应也结束面板的数据等待，保留已有列表和分页信息供重试。
    rawData.availableSkills.error = response.error
    store.getState().updateStateCount('availableSkillsUpdate')
    yakitNotify('error', 'handleAvailableSkills:' + response.error)
    return
  }
  const { skills, page } = response
  // 首次同步/刷新从第一页重建，后续只接收相邻页，避免重复或乱序响应回退分页。
  if (page !== 1 && page !== rawData.availableSkills.page + 1) return
  const list = new Map((page === 1 ? [] : rawData.availableSkills.skills).map((skill) => [skill.name, skill]))
  for (const skill of mapSkillListItems(skills, AISkillLoadStateEnum.Metadata, rawData.skillDetails)) {
    list.set(skill.name, skill)
  }
  rawData.availableSkills = { ...response, skills: [...list.values()] }
  store.getState().updateStateCount('availableSkillsUpdate')
}

export const aiTaskDetailDataHandlers = {
  skill_loaded: handleLoadedSkills,
  skill_available: handleAvailableSkills,
  skill_detail: handleSkillDetail,
  capability_inventory: handleCapabilityInventory,
  perception: handlePerception,
  current_task_todo_list_update: handleCurrentTaskTodoListUpdate,
  session_snapshot: handleSessionSnapshot,
  task_snapshot: handleTaskSnapshot,
} as const
