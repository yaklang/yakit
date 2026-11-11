import React, { Suspense, useMemo, useState } from 'react'
import { Progress } from 'antd'
import PluginTabs from '../businessUI/PluginTabs/PluginTabs'
import { YakitAlert } from '../yakitUI/YakitAlert/YakitAlert'
import { YakitButton } from '../yakitUI/YakitButton/YakitButton'
import { YakitCard } from '../yakitUI/YakitCard/YakitCard'
import { YakitDrawer } from '../yakitUI/YakitDrawer/YakitDrawer'
import { YakitTag } from '../yakitUI/YakitTag/YakitTag'
import { formatMITMPipelineRate } from './MITMPipelineStatus.utils'
import type { MITMDiagnosticsQuery, MITMStoragePoint, MITMTraceView } from './MITMDiagnostics.types'
import { formatDuration, resolvePipelineHealth, type MITMPipelineViewState } from './MITMDiagnostics.utils'
import { formatTraceClock, MITMDiagnosticsTrace, type TraceRange } from './MITMDiagnosticsTrace'
import { useMITMDiagnosticsQuery } from './useMITMDiagnosticsQuery'
import styles from './MITMDiagnosticsPanel.module.scss'

const FlowDetail = React.lazy(() =>
  import('../HTTPFlowDetail').then(({ HTTPFlowDetail }) => ({ default: HTTPFlowDetail })),
)

type Tab = 'live' | 'storage' | 'trace'
type TraceFocus = { filter: MITMTraceView; range?: TraceRange }
const count = (value: number) => value.toLocaleString('zh-CN')
const rate = formatMITMPipelineRate

interface PanelProps {
  view: MITMPipelineViewState
  onClose: () => void
}

export const MITMDiagnosticsPanel: React.FC<PanelProps> = ({ view, onClose }) => {
  const [tab, setTab] = useState<Tab>('live')
  const [traceFocus, setTraceFocus] = useState<TraceFocus>({ filter: 'active' })
  const [flowId, setFlowId] = useState<number>()
  const { stats } = view
  const supported = !!stats.Diagnostics

  const openTrace = (filter: MITMTraceView, range?: TraceRange) => {
    setTraceFocus({ filter, range })
    setTab('trace')
  }
  const selectTab = (key: string) => {
    if (key === 'trace') setTraceFocus({ filter: 'active' })
    setTab(key as Tab)
  }

  return (
    <YakitDrawer
      open
      onClose={onClose}
      width="min(816px, 100%)"
      title="MITM 流量诊断"
      styles={{ body: { padding: '12px 16px 0' } }}
      footer={
        <div className={styles.footer}>
          <span>诊断样本仅保留在本次会话，停止后清除</span>
          <span>采样 {formatTraceClock(stats.GeneratedAtUnixMs)}</span>
        </div>
      }
    >
      <div className={styles.panel}>
        <PluginTabs
          wrapperClassName={styles.tabs}
          activeKey={tab}
          onChange={selectTab}
          animated={false}
          items={[
            {
              key: 'live',
              label: '实时状态',
              children: tab === 'live' && (
                <LivePanel view={view} onStorage={() => setTab('storage')} onTrace={openTrace} />
              ),
            },
            {
              key: 'storage',
              label: '入库压力',
              disabled: !supported,
              children: tab === 'storage' && <StoragePanel view={view} onPeak={(range) => openTrace('range', range)} />,
            },
            {
              key: 'trace',
              label: '请求轨迹',
              disabled: !supported,
              children: tab === 'trace' && (
                <MITMDiagnosticsTrace
                  sessionId={stats.SessionId}
                  initialFilter={traceFocus.filter}
                  initialRange={traceFocus.range}
                  onOpenFlow={setFlowId}
                />
              ),
            },
          ]}
        />
      </div>
      {flowId !== undefined && (
        <YakitDrawer open title={`流量 #${flowId}`} width="80%" onClose={() => setFlowId(undefined)}>
          <Suspense fallback={<div className={styles.empty}>正在加载流量…</div>}>
            <FlowDetail id={flowId} onClose={() => setFlowId(undefined)} />
          </Suspense>
        </YakitDrawer>
      )}
    </YakitDrawer>
  )
}

const Metric: React.FC<{
  title: string
  value: React.ReactNode
  note: React.ReactNode
  warning?: boolean
}> = ({ title, value, note, warning }) => (
  <div className={styles.metric} data-warning={warning || undefined}>
    <dt>{title}</dt>
    <dd>
      <strong>{value}</strong>
      <span className={styles.note}>{note}</span>
    </dd>
  </div>
)

const Line: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div className={styles.line}>
    <dt>{label}</dt>
    <dd>{children}</dd>
  </div>
)

const PhaseTable: React.FC<{
  label: string
  rows: { label: string; count: number; oldest?: number; attention?: boolean }[]
}> = ({ label, rows }) => (
  <table className={styles.phaseTable} aria-label={label}>
    <thead>
      <tr>
        <th scope="col">阶段</th>
        <th scope="col">数量</th>
        <th scope="col">最长耗时</th>
      </tr>
    </thead>
    <tbody>
      {rows.map(({ label, count: total, oldest, attention }) => (
        <tr key={label} data-attention={attention || undefined}>
          <th scope="row">{label}</th>
          <td className={total ? undefined : styles.muted}>{count(total)}</td>
          <td className={oldest === undefined ? styles.muted : undefined}>
            {oldest === undefined ? '—' : formatDuration(oldest)}
          </td>
        </tr>
      ))}
    </tbody>
  </table>
)

const liveStages = [
  ['等待转发', ['request_processing']],
  ['手动处理', ['manual_request', 'manual_response']],
  ['等待上游连接', ['pool_wait']],
  ['上游建连', ['dial']],
  ['发送上游请求', ['upstream', 'send']],
  ['等待上游首包', ['first_byte']],
  ['响应传输', ['read']],
  ['SSE 传输', ['streaming']],
  ['处理响应', ['local_response', 'response_processing']],
] as const

const LivePanel: React.FC<{
  view: MITMPipelineViewState
  onStorage: () => void
  onTrace: (view: MITMTraceView) => void
}> = ({ view, onStorage, onTrace }) => {
  const { stats, rates, frontend } = view
  const d = stats.Diagnostics
  const health = resolvePipelineHealth(view)
  const delta = rates.pendingDelta
  const httpRows = liveStages.map(([label, names]) => {
    const matches = d?.stages.filter(({ stage }) => names.some((name) => name === stage)) ?? []
    return {
      label,
      count: matches.reduce((sum, { count }) => sum + count, 0),
      oldest: matches.length ? Math.max(...matches.map(({ oldest }) => oldest)) : undefined,
      attention: health.tone === 'warning' && health.label === label,
    }
  })
  const action = d && health.focus && (
    <YakitButton type="text" size="small" onClick={health.focus === 'storage' ? onStorage : () => onTrace('active')}>
      {health.focus === 'storage' ? '查看入库压力' : '查看请求轨迹'}
    </YakitButton>
  )
  return (
    <div className={styles.content}>
      {health.tone === 'healthy' ? (
        <div className={styles.statusLine}>
          <YakitTag color="success" size="small" border={false}>
            {health.label}
          </YakitTag>
          <span className={styles.note}>{health.detail}</span>
        </div>
      ) : (
        <YakitAlert
          className={styles.alert}
          type={health.tone === 'danger' ? 'error' : health.tone === 'warning' ? 'warning' : 'info'}
          showIcon
          closable={false}
          action={action}
          message={
            <div className={styles.alertMessage}>
              <h3>{health.label}</h3>
              <span>{health.detail}</span>
            </div>
          }
        />
      )}
      <dl className={styles.metrics}>
        <Metric
          title="收到请求"
          value={`${rate(rates.request)} 条/秒`}
          note={`发出 ${rate(rates.dispatch)} 条/秒 · 返回 ${rate(rates.upstreamCompleted)} 条/秒`}
        />
        <Metric
          title="本会话待写"
          value={`${count(stats.PersistActive)} 项`}
          note={delta ? `较上次 ${delta > 0 ? '+' : ''}${delta} 项` : `已写入 ${rate(rates.persisted)} 项/秒`}
        />
        <Metric
          title="保存到显示 P95"
          value={formatDuration(frontend.persistToReactCommitP95)}
          note={`估计待显示约 ${count(frontend.visibleBacklog)} 条`}
        />
      </dl>
      {d ? (
        <div className={styles.split}>
          <YakitCard title="HTTP 在途阶段" className={styles.card} bodyClassName={styles.tableBody}>
            <PhaseTable label="HTTP 在途阶段" rows={httpRows} />
          </YakitCard>
          <YakitCard
            title="WebSocket"
            className={styles.card}
            bodyClassName={styles.tableBody}
            extra={
              <YakitButton type="text" size="small" onClick={() => onTrace('websocket')}>
                查看连接
              </YakitButton>
            }
          >
            <PhaseTable
              label="WebSocket 状态"
              rows={[
                { label: '握手中', count: d.wsHandshaking, oldest: d.wsHandshaking ? d.oldestWSHandshake : undefined },
                { label: '在线连接', count: d.wsOnline },
                { label: '近一分钟握手失败', count: d.wsFailed, attention: d.wsFailed > 0 },
              ]}
            />
          </YakitCard>
        </div>
      ) : (
        <YakitAlert type="info" showIcon message="当前引擎仅提供实时汇总，分阶段统计和轨迹需要引擎支持。" />
      )}
    </div>
  )
}

const StoragePanel: React.FC<{ view: MITMPipelineViewState; onPeak: (range: TraceRange) => void }> = ({
  view,
  onPeak,
}) => {
  const { stats, rates, frontend } = view
  const d = stats.Diagnostics
  const query = useMemo<MITMDiagnosticsQuery>(
    () => ({ SessionId: stats.SessionId, View: 'storage' }),
    [stats.SessionId],
  )
  const history = useMITMDiagnosticsQuery(query, true)
  if (!d) return null
  const utilization = stats.DatabaseWriteQueueCapacity
    ? Math.min(1, stats.DatabaseWriteQueueDepth / stats.DatabaseWriteQueueCapacity)
    : 0
  return (
    <div className={styles.content}>
      <dl className={styles.metrics}>
        <Metric
          title="本会话待写"
          value={`${count(stats.PersistActive)} 项`}
          note={`提交 ${rate(rates.persistEnqueued)}/秒 · 最久 ${formatDuration(stats.OldestPersistAgeMs)}`}
        />
        <Metric
          title="提交受阻"
          value={`${count(d.persistBlocked)} 项`}
          note={d.persistBlocked ? `等待队列空位 · 最久 ${formatDuration(d.oldestBlocked)}` : '本会话暂无提交等待'}
          warning={d.persistBlocked > 0}
        />
        <Metric
          title="实际写入 P95"
          value={formatDuration(d.writeP95)}
          note={`写成 ${rate(rates.persisted)}/秒 · 失败 ${rate(rates.persistFailed)}/秒`}
        />
      </dl>
      <div className={styles.split}>
        <YakitCard
          title="本会话待写趋势"
          extra={<span className={styles.note}>近 3 分钟 · 项</span>}
          className={styles.card}
        >
          {history?.result?.Storage?.length ? (
            <StorageTrend points={history.result.Storage} onPeak={onPeak} />
          ) : (
            <div className={styles.empty} role="status">
              {history?.failed || history?.result?.Ended || history?.result?.Unsupported
                ? '暂时无法读取待写趋势'
                : '正在收集会话样本…'}
            </div>
          )}
        </YakitCard>
        <YakitCard
          title="引擎共享写队列"
          className={styles.card}
          extra={
            utilization >= 1 && (
              <YakitTag size="small" color="warning" border={false}>
                已满
              </YakitTag>
            )
          }
        >
          <div className={styles.row}>
            <span className={styles.note}>占用</span>
            <span>
              {count(stats.DatabaseWriteQueueDepth)} / {count(stats.DatabaseWriteQueueCapacity)}
            </span>
          </div>
          <Progress
            aria-label="共享写队列占用"
            percent={utilization * 100}
            showInfo={false}
            size="small"
            status={utilization >= 1 ? 'exception' : 'normal'}
            strokeColor={utilization >= 1 ? 'var(--Colors-Use-Warning-Primary)' : 'var(--Colors-Use-Main-Primary)'}
          />
          <dl className={styles.lines}>
            <Line label="已取出未完成">{count(d.databaseTaken)} 项</Line>
            <Line label="提交到开写 P95">{formatDuration(d.submitToStartP95)}</Line>
            <Line label="入队到开写 P95">{formatDuration(d.queueWaitP95)}</Line>
            <Line label="保存到列表显示 P95">{formatDuration(frontend.persistToReactCommitP95)}</Line>
          </dl>
          <p className={styles.note}>队列含其他写入任务。提交到开写含提交等待，写入耗时为近一分钟估算。</p>
        </YakitCard>
      </div>
    </div>
  )
}

const StorageTrend: React.FC<{ points: MITMStoragePoint[]; onPeak: (range: TraceRange) => void }> = React.memo(
  ({ points, onPeak }) => {
    const series = points.map((p) => ({ at: Number(p.AtUnixMs), pending: Number(p.PersistPending) }))
    const end = series[series.length - 1].at
    const start = end - 180_000
    const peak = series.reduce((max, point) => (point.pending >= max.pending ? point : max))
    const scale = Math.max(2, Math.ceil(peak.pending / 2) * 2)
    const x = (at: number) => Math.max(0, ((at - start) / (end - start)) * 600)
    const y = (pending: number) => 108 - (pending / scale) * 96
    const path = series.map((point) => `${x(point.at)},${y(point.pending)}`).join(' ')
    const showPeak = () => onPeak({ from: peak.at - 5000, to: peak.at + 5000 })
    return (
      <figure className={styles.chart}>
        <div className={styles.chartBody}>
          <span className={styles.chartScale} aria-hidden="true">
            <span>{scale}</span>
            <span>{scale / 2}</span>
            <span>0</span>
          </span>
          <div className={styles.plot}>
            <svg viewBox="0 0 600 120" preserveAspectRatio="none" role="img" aria-label="本会话待写数量趋势">
              {[12, 60, 108].map((pos) => (
                <line key={pos} x1="0" y1={pos} x2="600" y2={pos} />
              ))}
              {series.length > 1 && <polygon points={`${x(series[0].at)},108 ${path} 600,108`} />}
              <polyline points={path} />
            </svg>
            {peak.pending > 0 && (
              <button
                className={styles.peak}
                type="button"
                aria-label={`查看 ${formatTraceClock(peak.at)} 的待写峰值`}
                style={{ left: `${x(peak.at) / 6}%`, top: `${y(peak.pending) / 1.2}%` }}
                onClick={showPeak}
              />
            )}
          </div>
        </div>
        <div className={styles.chartTimes}>
          <span>{formatTraceClock(start)}</span>
          <span>{formatTraceClock(end)}</span>
        </div>
        <figcaption className={styles.row}>
          <span className={styles.note}>
            {peak.pending > 0 ? `峰值 ${count(peak.pending)} 项 · ${formatTraceClock(peak.at)}` : '采样期间无待写积压'}
          </span>
          {peak.pending > 0 && (
            <YakitButton type="text" size="small" onClick={showPeak}>
              查看该时段请求
            </YakitButton>
          )}
        </figcaption>
      </figure>
    )
  },
)
