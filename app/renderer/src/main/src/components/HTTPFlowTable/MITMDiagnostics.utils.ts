import type { MITMStageSummary } from './MITMDiagnostics.types'
import { formatMITMPipelineDuration, type MITMPipelineRates, type MITMPipelineStats } from './MITMPipelineStatus.utils'

export interface FrontendPipelineState {
  visibleBacklog: number
  pendingQueries: number
  persistWriteP95?: number
  persistToReactCommitP95?: number
}

export interface MITMPipelineViewState {
  stats: MITMPipelineStats
  rates: MITMPipelineRates
  frontend: FrontendPipelineState
}

export interface MITMPipelineHealth {
  tone: 'idle' | 'healthy' | 'info' | 'warning' | 'danger'
  label: string
  detail: string
  focus?: 'storage' | 'trace'
  trafficScope?: 'all'
}

export const stageLabels: Record<string, string> = {
  request_processing: '等待转发',
  manual_request: '等待手动处理请求',
  upstream: '准备上游请求',
  pool_wait: '等待连接池空位',
  dial: '建立上游连接',
  send: '发送上游请求',
  first_byte: '等待上游首包',
  read: '响应传输',
  streaming: 'SSE 传输',
  local_response: '本地响应',
  response_processing: '处理响应',
  manual_response: '等待手动处理响应',
  websocket_online: '连接在线',
  persist_submit: '提交写入',
  persist_blocked: '等待共享队列空位',
  persist_queued: '入库排队',
  persist_write: '写入数据库',
}

export const stageLabel = (stage: string, protocol?: string) =>
  protocol === 'WebSocket' && stage === 'first_byte' ? '等待握手响应' : stageLabels[stage] || '处理中'

const waitingDescriptions: Record<string, string> = {
  request_processing: '正在等待 MITM 转发',
  upstream: '正在准备转发到上游',
  pool_wait: '正在等待上游连接池释放空位',
  dial: '正在连接目标服务器或下游代理',
  send: '正在向上游发送请求',
  first_byte: '正在等待上游返回响应首字节',
}

export const describeWaitingStage = (stage: string, protocol?: string) =>
  protocol === 'WebSocket' && stage === 'first_byte' ? '正在等待 WebSocket 握手响应' : waitingDescriptions[stage]

export const browserServiceLabel = (service?: string) => (service === 'chrome_autofill' ? 'Chrome 自动填充' : undefined)

const clock = new Intl.DateTimeFormat('zh-CN', {
  hourCycle: 'h23',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
})

export const formatTraceClock = (time: number) => (time > 0 ? clock.format(time) : '–')

export const formatDuration = (milliseconds?: number): string => {
  if (milliseconds === undefined) return '暂无样本'
  if (milliseconds >= 60_000) {
    const seconds = Math.floor(milliseconds / 1000)
    const minutes = Math.floor(seconds / 60)
    if (minutes >= 60) return `${Math.floor(minutes / 60)} 小时 ${minutes % 60} 分`
    return `${minutes} 分 ${seconds % 60} 秒`
  }
  const formatted = formatMITMPipelineDuration(milliseconds)
  return formatted.endsWith('ms') ? `${formatted.slice(0, -2)} 毫秒` : `${formatted.slice(0, -1)} 秒`
}

const slow = 2000
export const resolvePipelineHealth = (view?: MITMPipelineViewState): MITMPipelineHealth => {
  if (!view) {
    return { tone: 'idle', label: '等待数据', detail: 'MITM 启动后，这里会显示实时处理状态。' }
  }
  const { stats, frontend } = view
  const d = stats.Diagnostics
  if (d?.persistBlocked) {
    return {
      tone: 'danger',
      label: '入库提交受阻',
      detail: `本会话待写 ${stats.PersistActive} 项，${d.persistBlocked} 项提交正在等共享队列空位。`,
      focus: 'storage',
    }
  }
  if (stats.PersistActive > 0 && stats.OldestPersistAgeMs >= slow) {
    return {
      tone: 'danger',
      label: '入库跟不上',
      detail: `本会话待写 ${stats.PersistActive} 项，最久 ${formatDuration(stats.OldestPersistAgeMs)}。`,
      focus: 'storage',
    }
  }
  if (stats.ManualActive > 0) {
    return {
      tone: 'info',
      label: '等待手动处理',
      detail: `${stats.ManualActive} 条请求或响应正在等待手动处理。`,
      focus: 'trace',
      trafficScope: 'all',
    }
  }
  const preDispatch = d?.stages.find((stage) => stage.stage === 'request_processing')
  const oldestPreDispatch = preDispatch?.browserCount ? preDispatch.otherOldest : stats.OldestPreDispatchAgeMs
  if (oldestPreDispatch >= slow) {
    return {
      tone: 'warning',
      label: '等待转发',
      detail: `${stats.PreDispatchActive - (preDispatch?.browserCount ?? 0)} 条请求尚未转发，最长已等待 ${formatDuration(oldestPreDispatch)}。`,
      focus: 'trace',
    }
  }
  let waiting: MITMStageSummary | undefined
  for (const stage of d?.stages ?? []) {
    if (!waitingDescriptions[stage.stage]) continue
    if (
      stage.stage !== 'request_processing' &&
      stage.count > stage.browserCount &&
      stage.otherOldest >= slow &&
      stage.otherOldest > (waiting?.otherOldest ?? 0)
    )
      waiting = stage
  }
  if (waiting) {
    return {
      tone: 'warning',
      label: stageLabel(waiting.stage),
      detail: `${waiting.count - waiting.browserCount} 条请求${describeWaitingStage(waiting.stage)}，最长 ${formatDuration(waiting.otherOldest)}。`,
      focus: 'trace',
    }
  }
  if (d && d.oldestWSHandshake >= slow) {
    return {
      tone: 'warning',
      label: '等待 WebSocket 握手',
      detail: `${d.wsHandshaking} 条连接正在握手，最长 ${formatDuration(d.oldestWSHandshake)}。`,
      focus: 'trace',
    }
  }
  if (!d && stats.OldestUpstreamAgeMs >= slow) {
    return {
      tone: 'warning',
      label: '上游处理中',
      detail: `${stats.UpstreamActive} 条请求处于上游阶段，最长 ${formatDuration(stats.OldestUpstreamAgeMs)}。`,
    }
  }
  if (frontend.visibleBacklog >= 25 && (frontend.persistToReactCommitP95 ?? 0) >= 1000) {
    return {
      tone: 'warning',
      label: '列表更新慢',
      detail: `保存到显示 P95 为 ${formatDuration(frontend.persistToReactCommitP95)}，估计待显示约 ${frontend.visibleBacklog} 条。`,
      focus: 'storage',
    }
  }
  return { tone: 'healthy', label: '处理正常', detail: '当前暂无需要关注的告警。' }
}

export const outcomeLabels: Record<string, string> = {
  completed: '已完成',
  failed: '连接或传输失败',
  canceled: '已取消',
  dropped: '已丢弃',
  closed: '连接已关闭',
  http_error: '目标返回错误状态',
  persist_failed: '入库失败',
}

export const errorLabels: Record<string, string> = {
  canceled: '请求上下文取消',
  timeout: '操作超时',
  dns: 'DNS 解析失败',
  connection_refused: '连接被拒绝',
  connection_reset: '连接被重置',
  eof: '响应提前结束',
  upstream_error: '上游操作失败',
  websocket_upgrade_failed: 'WebSocket 握手失败',
  save_failed: '数据库写入失败',
}
