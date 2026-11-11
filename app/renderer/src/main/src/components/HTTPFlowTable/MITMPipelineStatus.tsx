import React, { useEffect, useRef, useState } from 'react'
import classNames from 'classnames'
import { ArrowSmDownOutlined, ArrowSmUpOutlined } from '@yakit-libs/yakit-ui-icons/outline'
import { YakitButton } from '../yakitUI/YakitButton/YakitButton'
import { YakitPopover } from '../yakitUI/YakitPopover/YakitPopover'
import { mitmFlowObservability } from './HTTPFlowTable.observability'
import {
  deriveMITMPipelineRates,
  formatMITMPipelineRate,
  normalizeMITMPipelineStats,
  type MITMPipelineStats,
  type RawMITMPipelineStats,
} from './MITMPipelineStatus.utils'
import { formatDuration, resolvePipelineHealth, type MITMPipelineViewState } from './MITMDiagnostics.utils'
import { MITMDiagnosticsPanel } from './MITMDiagnosticsPanel'
import styles from './MITMPipelineStatus.module.scss'

const PIPELINE_STATS_EVENT = 'client-mitmV2-pipeline-stats'

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

export const MITMPipelineStatus: React.FC = React.memo(() => {
  const previous = useRef<MITMPipelineStats>()
  const firstReceivedAt = useRef(0)
  const [view, setView] = useState<MITMPipelineViewState>()
  const [popoverOpen, setPopoverOpen] = useState(false)
  const [diagnosticsOpen, setDiagnosticsOpen] = useState(false)

  useEffect(() => {
    const { ipcRenderer } = window.require('electron')
    const handler = (_: unknown, raw?: RawMITMPipelineStats | null) => {
      if (!raw) {
        previous.current = undefined
        setView(undefined)
        setDiagnosticsOpen(false)
        setPopoverOpen(false)
        return
      }
      const stats = normalizeMITMPipelineStats(raw)
      const now = Date.now()
      if (previous.current?.SessionId !== stats.SessionId) {
        firstReceivedAt.current = now
        setDiagnosticsOpen(false)
      }
      const rates = deriveMITMPipelineRates(previous.current, stats)
      previous.current = stats
      const { state, flow } = mitmFlowObservability.pipelineStatusSnapshot(
        Math.max(now - 60_000, firstReceivedAt.current),
        !stats.Diagnostics,
      )
      setView({
        stats,
        rates,
        frontend: {
          visibleBacklog: Math.max(state.approximateIdBacklog, state.streamVisibleIdBacklog),
          pendingQueries: state.pendingQueries,
          persistWriteP95: flow.persistWriteP95,
          persistToReactCommitP95: flow.persistToReactCommitP95,
        },
      })
    }
    ipcRenderer.on(PIPELINE_STATS_EVENT, handler)
    return () => ipcRenderer.removeListener(PIPELINE_STATS_EVENT, handler)
  }, [])

  const health = resolvePipelineHealth(view)
  const backlog = view ? view.stats.ActiveTotal + view.stats.PersistActive : 0
  const content = !view ? (
    <div className={styles['empty-content']}>
      <div className={styles['popover-title']}>MITM 实时处理状态</div>
      <div className={styles['empty-description']}>MITM 启动后，这里会显示请求、入库和列表状态。</div>
    </div>
  ) : (
    <div className={styles['popover-content']}>
      <div className={styles['popover-header']}>
        <div>
          <div className={styles['popover-title']}>MITM 实时处理状态</div>
          <div className={styles['popover-subtitle']}>当前代理会话 · 每秒刷新</div>
        </div>
        <div className={classNames(styles['health-label'], styles[`health-${health.tone}`])}>
          <span className={styles['status-dot']} />
          {health.label}
        </div>
      </div>
      <div className={styles['health-detail']}>{health.detail}</div>
      <div className={styles['metric-list']}>
        <MetricRow
          label="请求转发"
          value={`发出 ${rate(view.rates.dispatch)} · 返回 ${rate(view.rates.upstreamCompleted)}`}
          description={`待转发 ${view.stats.PreDispatchActive} 条 · 上游处理中 ${view.stats.UpstreamActive} 条 · 响应处理中 ${view.stats.ResponseProcessingActive} 条`}
        />
        <MetricRow
          label="流量入库"
          value={rate(view.rates.persisted)}
          description={`本会话待写 ${view.stats.PersistActive} 项 · 共享队列 ${view.stats.DatabaseWriteQueueDepth} 项 · 写入 P95 ${formatDuration(view.stats.Diagnostics?.writeP95 ?? view.frontend.persistWriteP95)}`}
        />
        <MetricRow
          label="列表显示"
          value={`估计待显示约 ${view.frontend.visibleBacklog} 条`}
          description={`等待查询 ${view.frontend.pendingQueries} 批 · 保存到显示 P95 ${formatDuration(view.frontend.persistToReactCommitP95)}`}
        />
      </div>
      <div className={styles['popover-footer']}>
        <YakitButton
          type="outline2"
          size="small"
          onClick={() => {
            setPopoverOpen(false)
            setDiagnosticsOpen(true)
          }}
        >
          打开流量诊断
        </YakitButton>
      </div>
    </div>
  )

  return (
    <>
      <YakitPopover
        classNames={{ root: styles['pipeline-popover-overlay'] }}
        content={content}
        trigger={['hover', 'click']}
        placement="bottomLeft"
        open={popoverOpen && !diagnosticsOpen}
        onOpenChange={setPopoverOpen}
      >
        <YakitButton
          type="outline2"
          size="small"
          className={classNames(styles['pipeline-trigger'], styles[`pipeline-trigger-${health.tone}`])}
          aria-label={
            view
              ? `MITM 实时处理状态，每秒发出 ${formatMITMPipelineRate(view.rates.dispatch)} 条请求，每秒收到 ${formatMITMPipelineRate(view.rates.upstreamCompleted)} 条响应，处理中 ${backlog} 项`
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
              <span>{view ? backlog : '–'}</span>
            </span>
          </span>
        </YakitButton>
      </YakitPopover>
      {diagnosticsOpen && view && (
        <MITMDiagnosticsPanel key={view.stats.SessionId} view={view} onClose={() => setDiagnosticsOpen(false)} />
      )}
    </>
  )
})
