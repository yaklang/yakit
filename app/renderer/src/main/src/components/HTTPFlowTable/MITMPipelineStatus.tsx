import React, { useEffect, useMemo, useRef, useState } from 'react'
import classNames from 'classnames'
import { ArrowSmDownOutlined, ArrowSmUpOutlined } from '@yakit-libs/yakit-ui-icons/outline'
import { YakitButton } from '../yakitUI/YakitButton/YakitButton'
import { YakitPopover } from '../yakitUI/YakitPopover/YakitPopover'
import { mitmFlowObservability } from './HTTPFlowTable.observability'
import {
  deriveMITMPipelineRates,
  formatMITMPipelineDuration,
  formatMITMPipelineRate,
  normalizeMITMPipelineStats,
  type MITMPipelineRates,
  type MITMPipelineStats,
  type RawMITMPipelineStats,
} from './MITMPipelineStatus.utils'
import styles from './MITMPipelineStatus.module.scss'

const { ipcRenderer } = window.require('electron')

const PIPELINE_STATS_EVENT = 'client-mitmV2-pipeline-stats'
const SLOW_ACTIVE_AGE_MS = 2000

interface FrontendPipelineState {
  visibleBacklog: number
  streamVisibleBacklog: number
  pendingQueries: number
  persistQueueWaitP95?: number
  persistWriteP95?: number
  persistToReactCommitP95?: number
  responseToReactCommitP95?: number
}

interface MITMPipelineViewState {
  stats: MITMPipelineStats
  rates: MITMPipelineRates
  frontend: FrontendPipelineState
}

type PipelineTone = 'idle' | 'healthy' | 'info' | 'warning' | 'danger'

interface PipelineHealth {
  tone: PipelineTone
  label: string
  detail: string
}

const numberOrZero = (value: unknown): number => {
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0
}

const collectFrontendPipelineState = (): FrontendPipelineState => {
  const snapshot = mitmFlowObservability.pipelineStatusSnapshot()
  return {
    visibleBacklog: numberOrZero(snapshot.state.approximateIdBacklog),
    streamVisibleBacklog: numberOrZero(snapshot.state.streamVisibleIdBacklog),
    pendingQueries: numberOrZero(snapshot.state.pendingQueries),
    persistQueueWaitP95: snapshot.flow.persistQueueWaitP95,
    persistWriteP95: snapshot.flow.persistWriteP95,
    persistToReactCommitP95: snapshot.flow.persistToReactCommitP95,
    responseToReactCommitP95: snapshot.flow.responseToReactCommitP95,
  }
}

const resolveHealth = (view?: MITMPipelineViewState): PipelineHealth => {
  if (!view) {
    return { tone: 'idle', label: '等待数据', detail: 'MITM 启动后，这里会显示实时处理状态。' }
  }
  const { stats, frontend } = view
  if (stats.ManualActive > 0) {
    return {
      tone: 'info',
      label: '等待手动处理',
      detail: `${stats.ManualActive} 条请求正在等待手动处理。`,
    }
  }
  if (stats.OldestPreDispatchAgeMs >= SLOW_ACTIVE_AGE_MS) {
    return {
      tone: 'warning',
      label: '等待转发',
      detail: `${stats.PreDispatchActive} 条请求尚未转发，最长已等待 ${formatDuration(stats.OldestPreDispatchAgeMs)}。`,
    }
  }
  if (stats.OldestUpstreamAgeMs >= SLOW_ACTIVE_AGE_MS) {
    return {
      tone: 'warning',
      label: '等待目标响应',
      detail: `${stats.UpstreamActive} 条请求正在等待目标服务器返回，最长已等待 ${formatDuration(
        stats.OldestUpstreamAgeMs,
      )}。`,
    }
  }
  if (
    stats.OldestPersistAgeMs >= SLOW_ACTIVE_AGE_MS ||
    stats.DatabaseWriteQueueDepth >= 256 ||
    (stats.PersistActive > 0 && numberOrZero(frontend.persistQueueWaitP95) >= 1000)
  ) {
    return {
      tone: 'danger',
      label: '数据库保存较慢',
      detail: `${stats.PersistActive} 条流量正在等待保存，数据库队列中还有 ${stats.DatabaseWriteQueueDepth} 条。`,
    }
  }
  if (
    Math.max(frontend.streamVisibleBacklog, frontend.visibleBacklog) >= 100 &&
    numberOrZero(frontend.persistToReactCommitP95) >= 1000
  ) {
    return {
      tone: 'warning',
      label: '列表显示较慢',
      detail: `数据已经保存，但仍有约 ${Math.max(
        frontend.streamVisibleBacklog,
        frontend.visibleBacklog,
      )} 条尚未显示到列表。`,
    }
  }
  return { tone: 'healthy', label: '处理正常', detail: '当前请求转发、数据库保存和列表显示均无明显积压。' }
}

const MetricRow: React.FC<{
  label: string
  value: React.ReactNode
  description: React.ReactNode
}> = React.memo(({ label, value, description }) => (
  <div className={styles['metric-row']}>
    <div className={styles['metric-main']}>
      <span className={styles['metric-label']}>{label}</span>
      <span className={styles['metric-value']}>{value}</span>
    </div>
    <div className={styles['metric-description']}>{description}</div>
  </div>
))

const rate = (value: number) => `${formatMITMPipelineRate(value)} 条/秒`

const formatDuration = (milliseconds?: number): string => {
  const formatted = formatMITMPipelineDuration(milliseconds)
  if (formatted.endsWith('ms')) return `${formatted.slice(0, -2)} 毫秒`
  if (formatted.endsWith('s')) return `${formatted.slice(0, -1)} 秒`
  return formatted
}

const formatTypicalDuration = (milliseconds: number | undefined, action: string): string => {
  if (!milliseconds || milliseconds <= 0) return '暂无耗时数据'
  return `通常 ${formatDuration(milliseconds)}内${action}`
}

export const MITMPipelineStatus: React.FC = React.memo(() => {
  const previousRef = useRef<MITMPipelineStats>()
  const [view, setView] = useState<MITMPipelineViewState>()

  useEffect(() => {
    const handler = (_: unknown, raw?: RawMITMPipelineStats | null) => {
      if (!raw) {
        previousRef.current = undefined
        setView(undefined)
        return
      }
      const stats = normalizeMITMPipelineStats(raw)
      const rates = deriveMITMPipelineRates(previousRef.current, stats)
      previousRef.current = stats
      setView({ stats, rates, frontend: collectFrontendPipelineState() })
    }
    ipcRenderer.on(PIPELINE_STATS_EVENT, handler)
    return () => ipcRenderer.removeListener(PIPELINE_STATS_EVENT, handler)
  }, [])

  const health = useMemo(() => resolveHealth(view), [view])
  const visibleBacklog = view ? Math.max(view.frontend.visibleBacklog, view.frontend.streamVisibleBacklog) : 0
  const pipelineBacklog = view
    ? view.stats.PreDispatchActive +
      view.stats.ManualActive +
      view.stats.UpstreamActive +
      view.stats.ResponseProcessingActive +
      view.stats.PersistActive
    : 0

  const content = !view ? (
    <div className={styles['empty-content']}>
      <div className={styles['popover-title']}>MITM 实时处理状态</div>
      <div className={styles['empty-description']}>MITM 启动后，这里会显示请求、响应、数据库保存和列表显示状态。</div>
    </div>
  ) : (
    <div className={styles['popover-content']}>
      <div className={styles['popover-header']}>
        <div>
          <div className={styles['popover-title']}>MITM 实时处理状态</div>
          <div className={styles['popover-subtitle']}>仅统计当前代理会话，每秒刷新</div>
        </div>
        <div className={classNames(styles['health-label'], styles[`health-${health.tone}`])}>
          <span className={styles['status-dot']} />
          {health.label}
        </div>
      </div>

      <div className={styles['health-detail']}>{health.detail}</div>

      <div className={styles['metric-list']}>
        <MetricRow
          label="收到客户端请求"
          value={rate(view.rates.request)}
          description={
            <>
              等待转发 {view.stats.PreDispatchActive} 条 · 最长 {formatDuration(view.stats.OldestPreDispatchAgeMs)}
            </>
          }
        />
        <MetricRow
          label="发送请求并等待响应"
          value={
            <>
              发出 {rate(view.rates.dispatch)} · 返回 {rate(view.rates.upstreamCompleted)}
            </>
          }
          description={
            <>
              正在等待 {view.stats.UpstreamActive} 条 · 最长 {formatDuration(view.stats.OldestUpstreamAgeMs)}
            </>
          }
        />
        <MetricRow
          label="生成流量记录"
          value={rate(view.rates.flowBuilt)}
          description={
            <>
              正在生成 {view.stats.ResponseProcessingActive} 条 · 最长{' '}
              {formatDuration(view.stats.OldestResponseProcessingAgeMs)}
            </>
          }
        />
        <MetricRow
          label="保存到数据库"
          value={rate(view.rates.persisted)}
          description={
            <>
              等待保存 {view.stats.PersistActive} 条 ·{' '}
              {view.stats.DatabaseWriteQueueDepth > 0
                ? `写入队列还有 ${view.stats.DatabaseWriteQueueDepth} 条`
                : '当前无排队'}{' '}
              · {formatTypicalDuration(view.frontend.persistWriteP95, '写完')}
            </>
          }
        />
        <MetricRow
          label="显示到流量列表"
          value={`待显示约 ${visibleBacklog} 条`}
          description={
            <>
              等待查询 {view.frontend.pendingQueries} 条 · 保存后
              {formatTypicalDuration(view.frontend.persistToReactCommitP95, '显示')} · 收到响应后
              {formatTypicalDuration(view.frontend.responseToReactCommitP95, '显示')}
            </>
          }
        />
      </div>

      <div className={styles['popover-footer']}>
        本次 MITM 启动后累计：请求 {view.stats.RequestTotal} 条 · 响应 {view.stats.UpstreamCompletedTotal} 条 · 已保存{' '}
        {view.stats.PersistedTotal} 条
        {view.stats.PersistFailedTotal > 0 ? ` · 保存失败 ${view.stats.PersistFailedTotal} 条` : ''}
      </div>
    </div>
  )

  return (
    <YakitPopover
      classNames={{ root: styles['pipeline-popover-overlay'] }}
      content={content}
      trigger={['hover', 'click']}
      placement="bottomLeft"
    >
      <YakitButton
        type="outline2"
        size="small"
        className={classNames(styles['pipeline-trigger'], styles[`pipeline-trigger-${health.tone}`])}
        aria-label={
          view
            ? `每秒发出 ${formatMITMPipelineRate(view.rates.dispatch)} 条请求，每秒收到 ${formatMITMPipelineRate(
                view.rates.upstreamCompleted,
              )} 条响应，处理中 ${pipelineBacklog} 条`
            : 'MITM 实时处理状态，等待统计数据'
        }
      >
        <span className={styles['trigger-summary']}>
          <span className={styles['trigger-metric']}>
            <ArrowSmUpOutlined
              className={classNames(styles['trigger-arrow'], styles['trigger-arrow-up'])}
              color="currentColor"
            />
            <span>{view ? formatMITMPipelineRate(view.rates.dispatch) : '–'}/s</span>
          </span>
          <span className={styles['trigger-metric']}>
            <ArrowSmDownOutlined
              className={classNames(styles['trigger-arrow'], styles['trigger-arrow-down'])}
              color="currentColor"
            />
            <span>{view ? formatMITMPipelineRate(view.rates.upstreamCompleted) : '–'}/s</span>
          </span>
          <span className={styles['trigger-metric']}>
            <span className={styles['trigger-processing-dot']} />
            <span>{view ? pipelineBacklog : '–'}</span>
          </span>
        </span>
      </YakitButton>
    </YakitPopover>
  )
})
