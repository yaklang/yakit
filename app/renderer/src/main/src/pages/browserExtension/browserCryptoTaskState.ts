export const BROWSER_CRYPTO_TASK_STATE_VERSION = 1 as const

export const BROWSER_CRYPTO_TASK_STAGES = [
  { id: 'inspect', label: '检查现场' },
  { id: 'wait', label: '等待操作' },
  { id: 'analyze', label: '分析证据' },
  { id: 'capture', label: '捕获能力' },
  { id: 'validate', label: '验证' },
  { id: 'confirm', label: '载入确认' },
] as const

export type BrowserCryptoTaskStage = (typeof BROWSER_CRYPTO_TASK_STAGES)[number]['id']
export type BrowserCryptoTaskStatus = 'running' | 'waiting-user' | 'blocked' | 'failed' | 'cancelled' | 'completed'

export type BrowserCryptoTaskFailureKind =
  | 'user-rejected'
  | 'offline'
  | 'timeout'
  | 'stale'
  | 'authorization'
  | 'debugger'
  | 'validation'
  | 'unknown'

export interface BrowserCryptoTaskTarget {
  tabId: number
  frameId: number
  documentId?: string
}

export interface BrowserCryptoTaskContext {
  deviceId: string
  target: BrowserCryptoTaskTarget
  reviewPolicy: 'manual' | 'ai' | 'yolo'
  traceId?: string
  candidateId?: string
  callableId?: string
}

interface BrowserCryptoTaskTool {
  name: string
  stage: BrowserCryptoTaskStage
  capabilityMethod?: string
}

export interface BrowserCryptoTaskFailure {
  kind: BrowserCryptoTaskFailureKind
  message: string
  recoverable: boolean
  stage: BrowserCryptoTaskStage
}

export interface BrowserCryptoTaskState {
  contractVersion: typeof BROWSER_CRYPTO_TASK_STATE_VERSION
  id: string
  context: BrowserCryptoTaskContext
  status: BrowserCryptoTaskStatus
  stage: BrowserCryptoTaskStage
  completedStages: BrowserCryptoTaskStage[]
  message: string
  startedAt: number
  updatedAt: number
  revision: number
  taskId?: string
  activeToolName?: string
  activeTools: Record<string, BrowserCryptoTaskTool>
  pendingReviewId?: string
  validationDraftId?: string
  failure?: BrowserCryptoTaskFailure
}

export interface BrowserCryptoAIOutputEvent {
  Type: string
  NodeId?: string
  TaskId?: string
  IsSync?: boolean
}

export type BrowserCryptoTaskAction =
  | {
      type: 'ai-output'
      event: BrowserCryptoAIOutputEvent
      content: string
      now?: number
    }
  | { type: 'validation-available'; draftId: string; now?: number }
  | { type: 'profile-loaded'; now?: number }
  | { type: 'connection'; online: boolean; now?: number }
  | {
      type: 'failure'
      message: string
      stage?: BrowserCryptoTaskStage
      kind?: BrowserCryptoTaskFailureKind
      now?: number
    }
  | { type: 'retry'; now?: number }

const STAGE_ORDER = BROWSER_CRYPTO_TASK_STAGES.map((stage) => stage.id)
const MAX_TRACKED_TOOLS = 32

function parseObject(content: string): Record<string, any> {
  if (!content) return {}
  try {
    const value = JSON.parse(content)
    return value && typeof value === 'object' && !Array.isArray(value) ? value : {}
  } catch {
    return {}
  }
}

function uniqueStages(stages: BrowserCryptoTaskStage[]): BrowserCryptoTaskStage[] {
  const selected = new Set(stages)
  return STAGE_ORDER.filter((stage) => selected.has(stage))
}

function completeThrough(current: BrowserCryptoTaskStage[], stage: BrowserCryptoTaskStage): BrowserCryptoTaskStage[] {
  const index = STAGE_ORDER.indexOf(stage)
  return uniqueStages([...current, ...STAGE_ORDER.slice(0, index + 1)])
}

function normalizedToolName(value: unknown): string {
  return typeof value === 'string' ? value.trim().toLowerCase() : ''
}

function capabilityMethod(params: unknown): string {
  if (!params || typeof params !== 'object' || Array.isArray(params)) return ''
  const value = (params as Record<string, unknown>).method
  return typeof value === 'string' ? value.trim().toLowerCase() : ''
}

function stageForCapability(method: string): BrowserCryptoTaskStage {
  if (!method) return 'analyze'
  if (method.includes('.recording.start')) return 'wait'
  if (method.includes('.recording.') || method.includes('.tabs') || method.includes('.page.')) return 'inspect'
  if (method.includes('.deep_capture.') || method.includes('.callable.')) return 'capture'
  if (method.includes('.recovery.start') || method.includes('.recovery.capture')) return 'capture'
  if (method.includes('.recovery.validate') || method.includes('.profile.')) return 'validate'
  if (method.includes('.recovery.confirm')) return 'confirm'
  return 'analyze'
}

function stageForTool(name: string, params?: unknown): BrowserCryptoTaskStage {
  const normalized = normalizedToolName(name)
  if (normalized === 'browser.capability.call') return stageForCapability(capabilityMethod(params))
  if (normalized.includes('recording.trace.list') || normalized.includes('capability.catalog')) return 'inspect'
  if (normalized.includes('recording.evidence.inspect') || normalized.includes('packet.compare')) return 'analyze'
  if (normalized.includes('callable.')) return 'capture'
  if (normalized.includes('profile.')) return 'validate'
  return 'analyze'
}

function waitingCapability(method: string): boolean {
  return (
    method.includes('.recording.start') || method.includes('.deep_capture.start') || method.includes('.recovery.start')
  )
}

function toolMessage(name: string, stage: BrowserCryptoTaskStage, method?: string): string {
  const operation = method || name
  if (waitingCapability(operation)) {
    return stage === 'wait'
      ? '录制已经准备好，请在目标页面完成一次最短业务操作'
      : '深度捕获已经武装，请在目标页面重复一次真实业务操作'
  }
  if (stage === 'inspect') return '正在检查当前文档、业务 Trace 与可用能力'
  if (stage === 'analyze') return '正在关联请求边界、密码调用与字段证据'
  if (stage === 'capture') return '正在检查或恢复可执行的页面业务函数'
  if (stage === 'validate') return '正在编译并真实回放候选明文网关'
  return '正在准备由你确认并载入验证结果'
}

function trimTools(tools: Record<string, BrowserCryptoTaskTool>): Record<string, BrowserCryptoTaskTool> {
  const entries = Object.entries(tools)
  return entries.length <= MAX_TRACKED_TOOLS
    ? tools
    : Object.fromEntries(entries.slice(entries.length - MAX_TRACKED_TOOLS))
}

function failureKind(message: string): BrowserCryptoTaskFailureKind {
  const normalized = message.toLowerCase()
  if (
    normalized.includes('user_cancel') ||
    normalized.includes('user cancel') ||
    normalized.includes('rejected') ||
    normalized.includes('用户取消') ||
    normalized.includes('用户拒绝')
  )
    return 'user-rejected'
  if (
    normalized.includes('not connected') ||
    normalized.includes('disconnected') ||
    normalized.includes('offline') ||
    normalized.includes('设备离线') ||
    normalized.includes('连接断开')
  )
    return 'offline'
  if (
    normalized.includes('timeout') ||
    normalized.includes('deadline') ||
    normalized.includes('超时') ||
    normalized.includes('调用栈已经恢复') ||
    normalized.includes('call stack')
  )
    return 'timeout'
  if (
    normalized.includes('stale_document') ||
    normalized.includes('stale document') ||
    normalized.includes('document changed') ||
    normalized.includes('页面已经刷新') ||
    normalized.includes('页面已经跳转') ||
    normalized.includes('文档已经变化')
  )
    return 'stale'
  if (
    normalized.includes('target_denied') ||
    normalized.includes('origin_changed') ||
    normalized.includes('grant') ||
    normalized.includes('scope') ||
    normalized.includes('授权')
  )
    return 'authorization'
  if (
    normalized.includes('debugger') ||
    normalized.includes('devtools') ||
    normalized.includes('attach') ||
    normalized.includes('调试')
  )
    return 'debugger'
  if (
    normalized.includes('validation') ||
    normalized.includes('compare') ||
    normalized.includes('equivalent') ||
    normalized.includes('验证') ||
    normalized.includes('数据包')
  )
    return 'validation'
  return 'unknown'
}

function recoverableFailure(kind: BrowserCryptoTaskFailureKind): boolean {
  return kind !== 'stale' && kind !== 'authorization'
}

function failedState(
  state: BrowserCryptoTaskState,
  message: string,
  stage: BrowserCryptoTaskStage,
  now: number,
  forcedKind?: BrowserCryptoTaskFailureKind,
): BrowserCryptoTaskState {
  const kind = forcedKind || failureKind(message)
  return {
    ...state,
    status: kind === 'offline' ? 'blocked' : 'failed',
    stage,
    message,
    failure: {
      kind,
      message,
      recoverable: recoverableFailure(kind),
      stage,
    },
    pendingReviewId: undefined,
    updatedAt: now,
    revision: state.revision + 1,
  }
}

function toolFromState(state: BrowserCryptoTaskState, callToolId: unknown): BrowserCryptoTaskTool | undefined {
  return typeof callToolId === 'string' ? state.activeTools[callToolId] : undefined
}

function taskCompletedMessage(stage: BrowserCryptoTaskStage): string {
  if (stage === 'inspect' || stage === 'wait') return '本轮检查尚缺业务证据，请完成页面操作后继续分析'
  if (stage === 'analyze' || stage === 'capture') return '本轮分析尚未生成可验证网关，可以按上方阶段继续'
  if (stage === 'validate') return '验证任务已经结束，正在等待确定性验证结果'
  return '验证结果已经就绪，请载入并确认'
}

function reviewMessage(policy: BrowserCryptoTaskContext['reviewPolicy'], tool: string): string {
  if (policy === 'manual') return `等待你手动审批“${tool}”；批准前不会执行浏览器能力`
  if (policy === 'ai') return `“${tool}”正在等待 AI 风险判断；高风险能力仍可能要求你确认`
  return `当前为 YOLO，但“${tool}”仍触发了强制审批边界，请在 Review 卡片中确认`
}

export function createBrowserCryptoTask(context: BrowserCryptoTaskContext, now = Date.now()): BrowserCryptoTaskState {
  return {
    contractVersion: BROWSER_CRYPTO_TASK_STATE_VERSION,
    id: `${context.deviceId}:${context.target.tabId}:${context.target.frameId}:${context.target.documentId || 'document'}:${now}`,
    context,
    status: 'running',
    stage: 'inspect',
    completedStages: [],
    message: '正在检查当前共享页面与已有录制证据',
    startedAt: now,
    updatedAt: now,
    revision: 1,
    activeTools: {},
  }
}

export function reduceBrowserCryptoTask(
  state: BrowserCryptoTaskState,
  action: BrowserCryptoTaskAction,
): BrowserCryptoTaskState {
  const now = action.now ?? Date.now()

  if (action.type === 'validation-available') {
    return {
      ...state,
      status: 'waiting-user',
      stage: 'confirm',
      completedStages: completeThrough(state.completedStages, 'validate'),
      message: '真实页面回放已经通过，请载入草稿并确认保存',
      validationDraftId: action.draftId,
      failure: undefined,
      pendingReviewId: undefined,
      updatedAt: now,
      revision: state.revision + 1,
    }
  }

  if (action.type === 'profile-loaded') {
    return {
      ...state,
      status: 'completed',
      stage: 'confirm',
      completedStages: [...STAGE_ORDER],
      message: '验证草稿已载入明文网关工作区，等待你的最终保存',
      failure: undefined,
      pendingReviewId: undefined,
      updatedAt: now,
      revision: state.revision + 1,
    }
  }

  if (action.type === 'connection') {
    if (!action.online) {
      if (state.failure?.kind === 'offline' && state.status === 'blocked') return state
      return failedState(state, '浏览器连接已断开；当前任务保留在原阶段，重连后可以继续', state.stage, now, 'offline')
    }
    if (state.failure?.kind !== 'offline') return state
    if (state.status === 'failed') return state
    return {
      ...state,
      status: 'failed',
      message: '浏览器已经重连，点击继续可从原阶段重新检查',
      failure: {
        ...state.failure,
        message: '浏览器已经重连，点击继续可从原阶段重新检查',
        recoverable: true,
      },
      updatedAt: now,
      revision: state.revision + 1,
    }
  }

  if (action.type === 'failure') {
    const stage = action.stage || state.stage
    const kind = action.kind || failureKind(action.message)
    if (state.failure?.message === action.message && state.failure.kind === kind && state.failure.stage === stage)
      return state
    return failedState(state, action.message, stage, now, kind)
  }

  if (action.type === 'retry') {
    return {
      ...state,
      status: 'running',
      message: toolMessage(state.activeToolName || '', state.stage),
      failure: undefined,
      pendingReviewId: undefined,
      updatedAt: now,
      revision: state.revision + 1,
    }
  }

  if (action.event.IsSync) return state
  const payload = parseObject(action.content)
  const taskId = action.event.TaskId || state.taskId

  if (action.event.Type === 'tool_call_start') {
    const callToolId = typeof payload.call_tool_id === 'string' ? payload.call_tool_id : ''
    const name = normalizedToolName(payload.tool?.name)
    if (!callToolId || !name) return state
    const stage = stageForTool(name)
    return {
      ...state,
      taskId,
      status: 'running',
      stage,
      message: toolMessage(name, stage),
      activeToolName: name,
      activeTools: trimTools({
        ...state.activeTools,
        [callToolId]: { name, stage },
      }),
      failure: undefined,
      pendingReviewId: undefined,
      updatedAt: now,
      revision: state.revision + 1,
    }
  }

  if (action.event.Type === 'tool_call_param') {
    const callToolId = typeof payload.call_tool_id === 'string' ? payload.call_tool_id : ''
    const currentTool = toolFromState(state, callToolId)
    if (!currentTool) return state
    const method =
      currentTool.name === 'browser.capability.call'
        ? capabilityMethod(payload.params)
        : currentTool.capabilityMethod || ''
    const stage = stageForTool(currentTool.name, payload.params)
    const waiting = waitingCapability(method)
    return {
      ...state,
      taskId,
      status: waiting ? 'waiting-user' : 'running',
      stage,
      completedStages:
        waiting && stage === 'wait' ? completeThrough(state.completedStages, 'wait') : state.completedStages,
      message: toolMessage(currentTool.name, stage, method),
      activeTools: {
        ...state.activeTools,
        [callToolId]: { ...currentTool, stage, capabilityMethod: method || undefined },
      },
      updatedAt: now,
      revision: state.revision + 1,
    }
  }

  if (action.event.Type === 'tool_use_review_require') {
    const name = normalizedToolName(payload.tool)
    const stage = stageForTool(name, payload.params)
    return {
      ...state,
      taskId,
      status: 'waiting-user',
      stage,
      message: reviewMessage(state.context.reviewPolicy, name || '浏览器能力'),
      activeToolName: name || state.activeToolName,
      pendingReviewId: typeof payload.id === 'string' ? payload.id : undefined,
      updatedAt: now,
      revision: state.revision + 1,
    }
  }

  if (action.event.Type === 'review_release' && state.pendingReviewId) {
    return {
      ...state,
      taskId,
      status: 'running',
      message: toolMessage(state.activeToolName || '', state.stage),
      pendingReviewId: undefined,
      updatedAt: now,
      revision: state.revision + 1,
    }
  }

  if (action.event.Type === 'tool_call_done') {
    const callToolId = payload.call_tool_id
    const tool = toolFromState(state, callToolId)
    if (!tool) return state
    const activeTools = { ...state.activeTools }
    delete activeTools[String(callToolId)]
    const method = tool.capabilityMethod || ''
    const profileValidated = tool.name.includes('profile.validate') || method.includes('.recovery.validate')
    let stage = tool.stage
    let completedStages = state.completedStages
    let status: BrowserCryptoTaskStatus = 'running'
    let message = toolMessage(tool.name, tool.stage, method)

    if (tool.stage === 'inspect') {
      completedStages = completeThrough(completedStages, 'inspect')
      stage = 'analyze'
      message = '现场检查完成，正在分析请求边界与密码调用证据'
    } else if (tool.stage === 'analyze') {
      completedStages = uniqueStages([...completedStages, 'inspect', 'analyze'])
      stage = 'capture'
      message = '证据关联完成，正在确认可执行的页面业务函数'
    } else if (tool.stage === 'capture') {
      if (waitingCapability(method)) {
        status = 'waiting-user'
        message = toolMessage(tool.name, tool.stage, method)
      } else {
        completedStages = uniqueStages([...completedStages, 'inspect', 'analyze', 'capture'])
        stage = 'validate'
        message = '页面能力已经就绪，正在编译并验证明文网关'
      }
    } else if (profileValidated) {
      completedStages = completeThrough(completedStages, 'validate')
      stage = 'confirm'
      message = '确定性验证已完成，正在读取待确认草稿'
    }

    return {
      ...state,
      taskId,
      status,
      stage,
      completedStages,
      message,
      activeTools,
      pendingReviewId: undefined,
      failure: undefined,
      updatedAt: now,
      revision: state.revision + 1,
    }
  }

  if (action.event.Type === 'tool_call_error' || action.event.Type === 'tool_call_user_cancel') {
    const callToolId = typeof payload.call_tool_id === 'string' ? payload.call_tool_id : ''
    const tool = toolFromState(state, callToolId)
    const stage = tool?.stage || state.stage
    const message =
      action.event.Type === 'tool_call_user_cancel'
        ? '本次浏览器能力调用已被用户取消；任务没有扩大权限，可以从当前阶段重试'
        : String(payload.error || payload.summary || '浏览器能力调用失败')
    const activeTools = { ...state.activeTools }
    if (callToolId) delete activeTools[callToolId]
    return failedState(
      { ...state, activeTools },
      message,
      stage,
      now,
      action.event.Type === 'tool_call_user_cancel' ? 'user-rejected' : undefined,
    )
  }

  if (action.event.Type === 'structured' && action.event.NodeId === 'react_task_status_changed') {
    const taskStatus = String(payload.react_task_now_status || '').toLowerCase()
    if (taskStatus === 'aborted') {
      return {
        ...state,
        taskId,
        status: 'cancelled',
        message: 'AI 分析任务已经停止，现场和已验证草稿不会被自动删除',
        pendingReviewId: undefined,
        updatedAt: now,
        revision: state.revision + 1,
      }
    }
    if (taskStatus === 'completed' && state.status !== 'completed' && !state.failure) {
      return {
        ...state,
        taskId,
        status: 'waiting-user',
        message: taskCompletedMessage(state.stage),
        updatedAt: now,
        revision: state.revision + 1,
      }
    }
  }

  return state
}

export function retryPromptForBrowserCryptoTask(state: BrowserCryptoTaskState): string {
  const kind = state.failure?.kind
  if (kind === 'user-rejected') {
    return '从刚才被取消的步骤继续；先解释需要的浏览器能力与范围，再等待当前 Review 策略审批，不要扩大目标。'
  }
  if (kind === 'timeout' || kind === 'debugger') {
    return '从当前阶段重新检查调试会话；若旧 Deep Capture 已恢复或超时，先安全清理，再用现有证据重新武装一次。'
  }
  if (kind === 'validation') {
    return '检查上一次确定性验证失败的字段、Envelope 与请求边界，只修正证据选择或输入语义，然后重新验证。'
  }
  if (kind === 'offline') {
    return '浏览器已经重连；重新检查同一目标 document 与现有证据，再从中断阶段继续。'
  }
  return '继续当前浏览器加密分析任务；重新检查现场状态，从最后一个已完成阶段继续，不要猜测序列化结构。'
}
