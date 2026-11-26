import type { AIMessageHandler } from '../type'
import type { AIAgentGrpcApi } from '../grpcApi'
import { AISkillLoadStateEnum, AsyncExecutionState } from '../grpcApi'
import type { AISkillListItem } from '../../aiRightPanel/AISkillLoadingPane/aiSkillList/type'
import type { AISkillLoadState } from '../../aiRightPanel/AISkillLoadingPane/type'
import { Uint8ArrayToString } from '@/utils/str'
import { yakitNotify } from '@/utils/notification'
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
    if (skill.skill_load_state === AISkillLoadStateEnum.Loaded) {
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
            ? (item.data.skill_load_state as AISkillLoadState | '')
            : item.stage === AISkillLoadStateEnum.Loaded
              ? AISkillLoadStateEnum.Loaded
              : AISkillLoadStateEnum.Metadata
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

const handleSkillDetail: AIMessageHandler = ({ res, rawData }) => {
  if (res.Type === 'structured' && res.NodeId === 'skill_detail') {
    const detail: AIAgentGrpcApi.SkillDetail = JSON.parse(Uint8ArrayToString(res.Content))
    rawData.skillDetails.set(detail.name, detail)
  }
}

const mapSkillListItems = (
  skills: AIAgentGrpcApi.SkillListEntry[],
  loadState: AISkillLoadState,
  skillDetails: Map<string, AIAgentGrpcApi.SkillDetail>,
): AISkillListItem[] =>
  skills.map((skill) => {
    const detail = skillDetails.get(skill.name)
    if (detail && detail.loaded !== (loadState === AISkillLoadStateEnum.Loaded)) skillDetails.delete(skill.name)
    return {
      name: skill.name,
      description: skill.description,
      skill_load_state: loadState,
      token_count: skill.data.token_count,
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

const terminalAsyncExecutionStates = new Set<AsyncExecutionState>([
  AsyncExecutionState.completed,
  AsyncExecutionState.failed,
  AsyncExecutionState.cancelled,
  AsyncExecutionState.timedOut,
])

/** 非终态才占用 running_count；后端缺字段时按明细兜底 */
const countRunningAsyncExecutions = (executions: AIAgentGrpcApi.AsyncExecutionSummary[]): number =>
  executions.filter((execution) => !execution.state || !terminalAsyncExecutionStates.has(execution.state)).length

/**
 * 推送、查询、停止共用同一份快照。revision 更小或相同的晚到响应直接丢掉；
 * revision 为 0 只在本地还没有更高版本时接收。
 * Manager 属于 ReAct 会话而非单次任务，同一会话内 revision 不会因任务轮次归零。
 * 接受条件要求 executions 为数组：后端空列表也发 []，停止响应同样带完整 executions。
 * execution 只是停止成功时多带的那一条，不参与接受判断，也不合并进列表。
 * 带 error 的响应一律提示并保留本地列表，不覆盖 executions。
 */
const acceptAsyncExecutionSnapshot = (
  current: AIAgentGrpcApi.AsyncExecutionSnapshot | undefined,
  incoming: AIAgentGrpcApi.AsyncExecutionSnapshot,
  sessionId: string,
): boolean => {
  if (incoming.session_id && incoming.session_id !== sessionId) return false
  if (!Array.isArray(incoming.executions)) return false
  const revision = typeof incoming.revision === 'number' ? incoming.revision : 0
  const cachedRevision = current?.revision ?? 0
  if (revision < cachedRevision) return false
  if (revision === cachedRevision && revision !== 0) return false
  return true
}

const handleAsyncExecution: AIMessageHandler = ({ res, store, rawData, sessionId }) => {
  if (res.Type !== 'structured' || res.NodeId !== 'async_execution') return

  let snapshot: AIAgentGrpcApi.AsyncExecutionSnapshot
  try {
    snapshot = JSON.parse(Uint8ArrayToString(res.Content) || '') as AIAgentGrpcApi.AsyncExecutionSnapshot
  } catch {
    return
  }
  if (snapshot.error) {
    if (snapshot.session_id && snapshot.session_id !== sessionId) return
    yakitNotify('error', 'handleAsyncExecution:' + snapshot.error)
    if (rawData.asyncExecution) {
      rawData.asyncExecution = { ...rawData.asyncExecution, error: snapshot.error }
      store.getState().updateStateCount('asyncExecutionUpdate')
    }
    return
  }
  if (!acceptAsyncExecutionSnapshot(rawData.asyncExecution, snapshot, sessionId)) return

  const executions = snapshot.executions
  rawData.asyncExecution = {
    ...snapshot,
    revision: typeof snapshot.revision === 'number' ? snapshot.revision : 0,
    running_count:
      typeof snapshot.running_count === 'number' ? snapshot.running_count : countRunningAsyncExecutions(executions),
    updated_at: snapshot.updated_at ?? 0,
    executions,
  }
  store.getState().updateStateCount('asyncExecutionUpdate')
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

  // 会话级快照也可能没有 TaskId。
  const snapshotRevision = typeof snapshot.revision === 'number' ? snapshot.revision : 0
  const cachedRevision = store.getState().sessionSnapshotRevision
  if (snapshot.execution && !(snapshotRevision > 0 && snapshotRevision <= cachedRevision)) {
    store.getState().updateState({
      sessionSnapshot: snapshot,
      sessionSnapshotReceivedAtMs: Date.now(),
      ...(snapshotRevision > 0 ? { sessionSnapshotRevision: snapshotRevision } : {}),
    })
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

const handleAgentPolicySnapshot: AIMessageHandler = ({ res, rawData, store }) => {
  if (res.Type !== 'agent_policy_snapshot' || res.NodeId !== 'agent_policy_snapshot') return

  const snapshot = JSON.parse(Uint8ArrayToString(res.Content) || '{}') as AIAgentGrpcApi.AgentPolicySnapshot
  if (isEmpty(snapshot)) return

  const cached = rawData.agentPolicySnapshot
  if (cached && snapshot.revision <= cached.revision) return

  if (snapshot.goal?.time_limit == null) throw new Error('agent_policy_snapshot 缺少 goal.time_limit')
  rawData.agentPolicySnapshot = snapshot
  if (rawData.pendingGoalDurationSeconds === snapshot.goal.time_limit.configured_duration_seconds) {
    rawData.pendingGoalDurationSeconds = undefined
  }
  rawData.agentPolicySnapshotReceivedAtMs = performance.now()
  store.getState().updateStateCount('agentPolicySnapshotUpdate')
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
  skill_detail: handleSkillDetail,
  skill_loaded: handleLoadedSkills,
  skill_available: handleAvailableSkills,
  async_execution: handleAsyncExecution,
  capability_inventory: handleCapabilityInventory,
  perception: handlePerception,
  current_task_todo_list_update: handleCurrentTaskTodoListUpdate,
  session_snapshot: handleSessionSnapshot,
  agent_policy_snapshot: handleAgentPolicySnapshot,
  task_snapshot: handleTaskSnapshot,
} as const
