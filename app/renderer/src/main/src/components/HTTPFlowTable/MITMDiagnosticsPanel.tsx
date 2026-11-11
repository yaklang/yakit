import React, { Suspense, useMemo, useState } from 'react'
import { Progress } from 'antd'
import PluginTabs from '../businessUI/PluginTabs/PluginTabs'
import { YakitAlert } from '../yakitUI/YakitAlert/YakitAlert'
import { YakitButton } from '../yakitUI/YakitButton/YakitButton'
import { YakitCard } from '../yakitUI/YakitCard/YakitCard'
import { YakitDrawer } from '../yakitUI/YakitDrawer/YakitDrawer'
import { YakitTag } from '../yakitUI/YakitTag/YakitTag'
import { formatMITMPipelineRate } from './MITMPipelineStatus.utils'
import type { MITMDiagnosticsQuery, MITMStoragePoint, MITMTraceView, MITMTrafficScope } from './MITMDiagnostics.types'
import {
  formatDuration,
  formatTraceClock,
  resolvePipelineHealth,
  type MITMPipelineViewState,
} from './MITMDiagnostics.utils'
import { MITMDiagnosticsTrace, type TraceRange } from './MITMDiagnosticsTrace'
import { useMITMDiagnosticsQuery } from './useMITMDiagnosticsQuery'
import styles from './MITMDiagnosticsPanel.module.scss'

const FlowDetail = React.lazy(() =>
  import('../HTTPFlowDetail').then(({ HTTPFlowDetail }) => ({ default: HTTPFlowDetail })),
)
const Trend = React.lazy(() => import('./MITMDiagnosticsTrend'))

type Tab = 'live' | 'storage' | 'trace'
type TraceFocus = { filter: MITMTraceView; range?: TraceRange; scope?: MITMTrafficScope }
type History = ReturnType<typeof useMITMDiagnosticsQuery>
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
  const extended = supported && stats.Version >= 3
  const showHistory = supported && (tab === 'storage' || (tab === 'live' && extended))
  const historyQuery = useMemo<MITMDiagnosticsQuery | undefined>(
    () => (showHistory ? { SessionId: stats.SessionId, View: 'storage' } : undefined),
    [showHistory, stats.SessionId],
  )
  const history = useMITMDiagnosticsQuery(historyQuery, true)

  const openTrace = (focus: TraceFocus) => {
    setTraceFocus(focus)
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
          type="line"
          wrapperClassName={styles.tabs}
          activeKey={tab}
          onChange={selectTab}
          animated={false}
          items={[
            {
              key: 'live',
              label: '实时状态',
              children: tab === 'live' && (
                <LivePanel
                  view={view}
                  history={history}
                  extended={extended}
                  onStorage={() => setTab('storage')}
                  onTrace={openTrace}
                />
              ),
            },
            {
              key: 'storage',
              label: '入库压力',
              disabled: !supported,
              children: tab === 'storage' && (
                <StoragePanel
                  view={view}
                  history={history}
                  extended={extended}
                  onPeak={(range) => openTrace({ filter: 'range', range, scope: 'all' })}
                />
              ),
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
                  initialScope={extended ? (traceFocus.scope ?? 'focus') : undefined}
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

const liveStages: Array<[string, string[]]> = [
  ['等待转发', ['request_processing']],
  ['等待手动处理', ['manual_request', 'manual_response']],
  ['等待连接池空位', ['pool_wait']],
  ['建立上游连接', ['dial']],
  ['发送上游请求', ['upstream', 'send']],
  ['等待上游首包', ['first_byte']],
  ['响应传输', ['read']],
  ['SSE 传输', ['streaming']],
  ['处理响应', ['local_response', 'response_processing']],
]

const HTTPPhases: React.FC<{ view: MITMPipelineViewState; extended: boolean; warning?: string }> = ({
  view,
  extended,
  warning,
}) => {
  const stages = view.stats.Diagnostics?.stages ?? []
  const rows = liveStages.map(([label, names]) => {
    const matches = stages.filter(({ stage }) => names.includes(stage))
    return {
      label,
      total: matches.reduce((sum, stage) => sum + stage.count, 0),
      browser: matches.reduce((sum, stage) => sum + stage.browserCount, 0),
      oldest: Math.max(0, ...matches.map((stage) => stage.oldest)),
      otherOldest: Math.max(0, ...matches.map((stage) => stage.otherOldest)),
      browserOldest: Math.max(0, ...matches.map((stage) => stage.browserOldest)),
    }
  })
  const max = Math.max(1, ...rows.map((row) => row.total))
  return (
    <>
      <table className={styles.phaseTable} aria-label="HTTP 在途阶段">
        <thead>
          <tr>
            <th scope="col">阶段</th>
            <th scope="col">请求数</th>
            <th scope="col">最长耗时</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const other = row.total - row.browser
            const groups = row.browser
              ? `Chrome 自动填充 ${row.browser} 条，最久 ${formatDuration(row.browserOldest)}${other ? ` · 其他流量 ${other} 条，最久 ${formatDuration(row.otherOldest)}` : ''}`
              : undefined
            return (
              <tr key={row.label} data-attention={warning === row.label || undefined}>
                <th scope="row">{row.label}</th>
                <td title={groups}>
                  <div className={styles.phaseValue}>
                    <div className={styles.phaseTrack} aria-hidden="true">
                      <span className={styles.phaseOther} style={{ width: `${(other / max) * 100}%` }} />
                      <span className={styles.phaseBrowser} style={{ width: `${(row.browser / max) * 100}%` }} />
                    </div>
                    <span>{count(row.total)}</span>
                    {groups && <span className={styles.visuallyHidden}>{groups}</span>}
                  </div>
                </td>
                <td>{row.total ? formatDuration(row.oldest) : '–'}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
      {extended && (
        <div className={styles.phaseLegend}>
          <span>
            <i className={styles.phaseOther} />
            其他流量
          </span>
          <span title="按目标域名识别">
            <i className={styles.phaseBrowser} />
            Chrome 自动填充
          </span>
        </div>
      )}
    </>
  )
}

const LivePanel: React.FC<{
  view: MITMPipelineViewState
  history: History
  extended: boolean
  onStorage: () => void
  onTrace: (focus: TraceFocus) => void
}> = ({ view, history, extended, onStorage, onTrace }) => {
  const { stats, rates, frontend } = view
  const d = stats.Diagnostics
  const health = resolvePipelineHealth(view)
  const delta = rates.pendingDelta
  const action = d && health.focus && (
    <YakitButton
      type="text"
      size="small"
      onClick={health.focus === 'storage' ? onStorage : () => onTrace({ filter: 'active', scope: health.trafficScope })}
    >
      {health.focus === 'storage'
        ? '查看入库压力'
        : health.trafficScope === 'browser'
          ? '查看后台请求'
          : '查看请求轨迹'}
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
      {extended && <TrendCard kind="traffic" title="请求收发速率" unit="条/秒" history={history} extended />}
      {d ? (
        <>
          <YakitCard title="HTTP 在途阶段" className={styles.card} bodyClassName={styles.tableBody}>
            <HTTPPhases
              view={view}
              extended={extended}
              warning={health.tone === 'warning' ? health.label : undefined}
            />
          </YakitCard>
          <YakitCard
            title="WebSocket"
            className={styles.card}
            extra={
              <YakitButton type="text" size="small" onClick={() => onTrace({ filter: 'websocket' })}>
                查看连接
              </YakitButton>
            }
          >
            <dl className={styles.wsStats}>
              <Line label="在线连接">{count(d.wsOnline)} 条</Line>
              <Line label="握手中">
                {count(d.wsHandshaking)} 条{d.wsHandshaking > 0 && ` · 最久 ${formatDuration(d.oldestWSHandshake)}`}
              </Line>
              <Line label="近一分钟握手失败">{count(d.wsFailed)} 条</Line>
            </dl>
          </YakitCard>
        </>
      ) : (
        <YakitAlert type="info" showIcon message="当前引擎仅提供实时汇总，分阶段统计和轨迹需要引擎支持。" />
      )}
    </div>
  )
}

const StoragePanel: React.FC<{
  view: MITMPipelineViewState
  history: History
  extended: boolean
  onPeak: (range: TraceRange) => void
}> = ({ view, history, extended, onPeak }) => {
  const { stats, rates, frontend } = view
  const d = stats.Diagnostics
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
      <TrendCard
        kind="pending"
        title={extended ? '本会话待写与提交受阻' : '本会话待写趋势'}
        unit="项"
        history={history}
        extended={extended}
        onPeak={onPeak}
      />
      {extended && <TrendCard kind="writes" title="提交与写入速率" unit="项/秒" history={history} extended />}
      <div className={styles.split}>
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
            <span className={styles.note}>队列占用</span>
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
          </dl>
          <p className={styles.note}>包含本会话及其他写入任务</p>
        </YakitCard>
        <YakitCard
          title="各环节耗时 P95"
          extra={<span className={styles.note}>近 1 分钟</span>}
          className={styles.card}
        >
          <dl className={styles.lines}>
            <Line label="提交到开写">{formatDuration(d.submitToStartP95)}</Line>
            <Line label="入队到开写">{formatDuration(d.queueWaitP95)}</Line>
            <Line label="保存到列表显示">{formatDuration(frontend.persistToReactCommitP95)}</Line>
          </dl>
        </YakitCard>
      </div>
    </div>
  )
}

const TrendCard: React.FC<{
  kind: 'traffic' | 'pending' | 'writes'
  title: string
  unit: string
  history: History
  extended: boolean
  onPeak?: (range: TraceRange) => void
}> = ({ kind, title, unit, history, extended, onPeak }) => {
  const points = history?.result?.Storage
  const peak = useMemo(
    () =>
      onPeak &&
      points?.reduce<MITMStoragePoint | undefined>(
        (max, point) => (!max || Number(point.PersistPending) >= Number(max.PersistPending) ? point : max),
        undefined,
      ),
    [onPeak, points],
  )
  const at = Number(peak?.AtUnixMs) || 0
  const pending = Number(peak?.PersistPending) || 0
  const unavailable = history?.failed || history?.result?.Ended || history?.result?.Unsupported
  const ready = !!points && points.length >= (kind === 'pending' ? 1 : 2)
  return (
    <YakitCard
      title={title}
      extra={<span className={styles.note}>近 3 分钟 · {unit}</span>}
      className={`${styles.card} ${styles.trendCard}`}
      bodyClassName={styles.trendBody}
    >
      {ready ? (
        <Suspense fallback={<div className={styles.chartEmpty}>正在加载图表…</div>}>
          <Trend kind={kind} points={points} extended={extended} />
        </Suspense>
      ) : (
        <div className={styles.chartEmpty} role="status">
          {unavailable ? '暂时无法读取会话样本' : '正在收集会话样本…'}
        </div>
      )}
      {onPeak && pending > 0 && (
        <div className={styles.peakSummary}>
          <span className={styles.note}>
            待写峰值 {count(pending)} 项 · {formatTraceClock(at)}
          </span>
          <YakitButton type="text" size="small" onClick={() => onPeak({ from: at - 5000, to: at + 5000 })}>
            查看该时段请求
          </YakitButton>
        </div>
      )}
    </YakitCard>
  )
}
