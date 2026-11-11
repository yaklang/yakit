import React, { useMemo, useState } from 'react'
import { YakitButton } from '../yakitUI/YakitButton/YakitButton'
import { YakitCheckbox } from '../yakitUI/YakitCheckbox/YakitCheckbox'
import { YakitEmpty } from '../yakitUI/YakitEmpty/YakitEmpty'
import { YakitSegmented } from '../yakitUI/YakitSegmented/YakitSegmented'
import { YakitTag } from '../yakitUI/YakitTag/YakitTag'
import type { YakitTagColor } from '../yakitUI/YakitTag/YakitTagType'
import type { MITMDiagnosticsQuery, MITMTraceRow, MITMTraceView, MITMTrafficScope } from './MITMDiagnostics.types'
import {
  browserServiceLabel,
  describeWaitingStage,
  errorLabels,
  formatDuration,
  formatTraceClock,
  outcomeLabels,
  stageLabel,
} from './MITMDiagnostics.utils'
import { useMITMDiagnosticsQuery } from './useMITMDiagnosticsQuery'
import styles from './MITMDiagnosticsPanel.module.scss'

export type TraceRange = { from: number; to: number }

const pageSize = 24
const filters: { value: MITMTraceView; label: string }[] = [
  { value: 'active', label: '当前等待' },
  { value: 'slow', label: '近期慢请求' },
  { value: 'failed', label: '失败与取消' },
  { value: 'websocket', label: 'WS 在线' },
]

const rangeFilters = [{ value: 'range' as const, label: '该时段样本' }, ...filters]
const emptyImageStyle = { width: 88, height: 88, margin: '0 auto 8px' }

const traceStatus = (trace: MITMTraceRow) => {
  if (trace.Stage === 'websocket_online' || !Number(trace.FinishedAtUnixMs))
    return stageLabel(trace.Stage, trace.Protocol)
  return outcomeLabels[trace.Outcome] ?? stageLabel(trace.Stage, trace.Protocol)
}

const traceStatusColor = (trace: MITMTraceRow): YakitTagColor | undefined => {
  if (trace.Stage === 'websocket_online') return 'success'
  if (!Number(trace.FinishedAtUnixMs)) return 'warning'
  if (['failed', 'http_error', 'persist_failed'].includes(trace.Outcome)) return 'danger'
  return undefined
}

const filterReasons: Record<string, string> = {
  request_excluded: '命中 MITM 请求过滤规则',
  response_excluded: '命中 MITM 响应类型过滤规则',
  static_js_excluded: '命中打包静态 JS 过滤规则',
  websocket_excluded: '启用了 WebSocket 过滤',
}

const traceFilterLabel = (trace: MITMTraceRow) => {
  const decision = trace.FilterDecision ?? ''
  if (filterReasons[decision]) return '已过滤'
  if (decision === 'passed') return '抓包范围内'
  if (decision === 'pending') {
    if (Number(trace.FinishedAtUnixMs)) return '过滤判定未完成'
    return trace.Stage === 'request_processing' ? '待过滤判定' : '待响应判定'
  }
  return undefined
}

const rowDuration = (trace: MITMTraceRow, sampledAt: number) => {
  const finishedAt = Number(trace.FinishedAtUnixMs)
  return Math.max(0, finishedAt ? finishedAt - Number(trace.StartedAtUnixMs) : sampledAt - Number(trace.StageAtUnixMs))
}

interface TraceProps {
  sessionId: string
  initialFilter: MITMTraceView
  initialRange?: TraceRange
  initialScope?: MITMTrafficScope
  initialStage?: string
  onOpenFlow: (id: number) => void
}

export const MITMDiagnosticsTrace = React.memo(function MITMDiagnosticsTrace({
  sessionId,
  initialFilter,
  initialRange,
  initialScope,
  initialStage,
  onOpenFlow,
}: TraceProps) {
  const [filter, setFilter] = useState(initialFilter)
  const [range, setRange] = useState(initialRange)
  const [scope, setScope] = useState(initialScope)
  const [stage, setStage] = useState(initialStage)
  const [offset, setOffset] = useState(0)
  const [selected, setSelected] = useState<string>()
  const [connectionId, setConnectionId] = useState('')
  const [snapshotRevision, setSnapshotRevision] = useState(0)
  const filterAware = initialScope === 'capture'
  const includeFiltered = filterAware && scope === 'all'
  const traceScope = filter === 'websocket' && !filterAware ? undefined : scope
  const refreshList = !includeFiltered && filter !== 'range' && offset === 0

  const query = useMemo<MITMDiagnosticsQuery>(
    () => ({
      SessionId: sessionId,
      View: filter,
      Offset: offset,
      Limit: pageSize,
      FromUnixMs: filter === 'range' ? range?.from : undefined,
      ToUnixMs: filter === 'range' ? range?.to : undefined,
      ConnectionId: connectionId || undefined,
      TrafficScope: traceScope,
      Stage: stage,
    }),
    [sessionId, filter, offset, range, connectionId, traceScope, stage],
  )
  const list = useMITMDiagnosticsQuery(query, refreshList, String(snapshotRevision))
  const traces = list?.result?.Traces ?? []
  const total = list?.result?.Total ?? 0
  const listSampledAt = Number(list?.result?.GeneratedAtUnixMs) || 0
  const backgroundTotal = list?.result?.BrowserBackgroundTotal ?? 0
  const selectedRow = traces.find((row) => row.TraceId === selected) ?? traces[0]
  const traceId = selectedRow?.TraceId
  const detailQuery = useMemo<MITMDiagnosticsQuery | undefined>(
    () =>
      traceId
        ? {
            SessionId: sessionId,
            View: 'detail',
            TraceId: traceId,
            TrafficScope: filterAware ? traceScope : undefined,
          }
        : undefined,
    [sessionId, traceId, filterAware, traceScope],
  )
  const revision =
    selectedRow &&
    `${includeFiltered ? listSampledAt : ''}:${selectedRow.Stage}:${selectedRow.Outcome}:${selectedRow.FlowId}:${selectedRow.FilterDecision}`
  const detail = useMITMDiagnosticsQuery(
    detailQuery,
    !includeFiltered && !!selectedRow && !Number(selectedRow.FinishedAtUnixMs),
    revision,
  )
  const current = detail?.result?.Detail
  const sampledAt = Number(detail?.result?.GeneratedAtUnixMs) || listSampledAt

  const selectFilter = (next: MITMTraceView) => {
    setFilter(next)
    setStage(undefined)
    setOffset(0)
    setSelected(undefined)
  }
  const selectScope = (next: MITMTrafficScope) => {
    setScope(next)
    setOffset(0)
    setSelected(undefined)
  }
  const filterConnection = (id: string) => {
    setConnectionId(id)
    setOffset(0)
    setSelected(undefined)
  }
  const unavailable = list?.failed || list?.result?.Unsupported || list?.result?.Ended

  return (
    <section className={styles['trace-pane']} aria-label="本会话请求">
      <div className={styles.traceToolbar}>
        <YakitSegmented
          size="small"
          aria-label="按请求状态查看"
          value={filter}
          options={range ? rangeFilters : filters}
          onChange={(value) => selectFilter(value as MITMTraceView)}
        />
        <div className={styles.scopeControls}>
          {filterAware ? (
            <>
              {!includeFiltered && <span className={styles.note}>跟随 MITM 过滤器</span>}
              <YakitCheckbox
                checked={includeFiltered}
                onChange={(event) => selectScope(event.target.checked ? 'all' : 'capture')}
              >
                包含已过滤请求
              </YakitCheckbox>
              {includeFiltered && (
                <YakitButton type="text" size="small" onClick={() => setSnapshotRevision((revision) => revision + 1)}>
                  刷新样本
                </YakitButton>
              )}
            </>
          ) : (
            traceScope && (
              <YakitSegmented
                size="small"
                aria-label="按流量来源查看"
                value={traceScope}
                options={[
                  { value: 'focus', label: '其他流量' },
                  { value: 'browser', label: backgroundTotal ? `浏览器后台 · ${backgroundTotal}` : '浏览器后台' },
                  { value: 'all', label: '全部' },
                ]}
                onChange={(value) => selectScope(value as MITMTrafficScope)}
              />
            )
          )}
          {list?.result && !unavailable && <span className={styles.note}>共 {total} 条</span>}
        </div>
      </div>
      {stage && (
        <div className={styles.filterContext}>
          <span>在途阶段 · {stageLabel(stage)}</span>
          <YakitButton type="text" size="small" onClick={() => selectFilter('active')}>
            清除阶段
          </YakitButton>
        </div>
      )}
      {range && filter === 'range' && (
        <div className={styles.filterContext}>
          <span>
            待写峰值时段 · {formatTraceClock(range.from)} – {formatTraceClock(range.to)}
          </span>
          <YakitButton
            type="text"
            size="small"
            onClick={() => {
              setRange(undefined)
              selectFilter('active')
            }}
          >
            清除时段
          </YakitButton>
        </div>
      )}
      {connectionId && (
        <div className={styles.filterContext}>
          <span>客户端连接 {connectionId}</span>
          <YakitButton type="text" size="small" onClick={() => filterConnection('')}>
            清除连接筛选
          </YakitButton>
        </div>
      )}
      {unavailable && (
        <div className={styles.empty} role="status">
          暂时无法读取轨迹
        </div>
      )}
      {!unavailable && !list && (
        <div className={styles.empty} role="status">
          正在读取轨迹…
        </div>
      )}
      {!unavailable && list && traces.length === 0 && (
        <YakitEmpty
          className={styles.empty}
          imageStyle={emptyImageStyle}
          title={
            stage
              ? '当前范围没有处于该阶段的请求'
              : filter === 'active' && traceScope === 'browser'
                ? '当前没有等待超过 2 秒的浏览器后台请求'
                : filter === 'active'
                  ? '当前筛选下没有等待超过 2 秒的请求或写入任务'
                  : '当前筛选下没有轨迹样本'
          }
        >
          {offset > 0 && (
            <YakitButton type="text" onClick={() => setOffset(0)}>
              返回第一页
            </YakitButton>
          )}
        </YakitEmpty>
      )}
      {traces.length > 0 && (
        <div className={styles.traceGrid}>
          <div className={styles.records}>
            <div className={styles.recordsList} role="group" aria-label="选择请求">
              {traces.map((trace) => {
                const annotation = [
                  traceScope === 'all' && browserServiceLabel(trace.BrowserService),
                  traceFilterLabel(trace),
                ]
                  .filter(Boolean)
                  .join(' · ')
                return (
                  <button
                    type="button"
                    key={trace.TraceId}
                    className={styles.record}
                    aria-pressed={trace.TraceId === traceId}
                    onClick={() => setSelected(trace.TraceId)}
                  >
                    <span className={styles.row}>
                      <strong title={trace.Host}>{trace.Host || '未知目标'}</strong>
                      <span
                        className={styles.recordDuration}
                        title={Number(trace.FinishedAtUnixMs) ? '总耗时' : '当前阶段耗时'}
                      >
                        {formatDuration(rowDuration(trace, listSampledAt))}
                      </span>
                    </span>
                    <span className={styles.recordMeta}>
                      <YakitTag size="small" color="blue" border={false}>
                        {trace.Protocol || 'HTTP'}
                      </YakitTag>
                      <span className={styles.recordStatus}>{traceStatus(trace)}</span>
                    </span>
                    {annotation && <span className={styles.recordStatus}>{annotation}</span>}
                  </button>
                )
              })}
            </div>
            {total > pageSize && (
              <div className={styles.pagination}>
                <YakitButton
                  type="outline2"
                  size="small"
                  disabled={offset === 0}
                  onClick={() => setOffset(offset - pageSize)}
                >
                  上一页
                </YakitButton>
                <span>
                  {Math.floor(offset / pageSize) + 1} / {Math.ceil(total / pageSize)}
                </span>
                <YakitButton
                  type="outline2"
                  size="small"
                  disabled={offset + pageSize >= total}
                  onClick={() => setOffset(offset + pageSize)}
                >
                  下一页
                </YakitButton>
              </div>
            )}
          </div>
          <article className={styles.traceDetail} aria-label="请求阶段明细">
            {!current && (
              <div className={styles.empty} role="status">
                {detail?.result?.Missing
                  ? '该轨迹已结束或超出样本保留范围。'
                  : detail?.failed || detail?.result?.Ended || detail?.result?.Unsupported
                    ? '暂时无法读取阶段明细'
                    : '正在读取阶段明细…'}
              </div>
            )}
            {current && (
              <TraceDetail
                trace={current}
                sampledAt={sampledAt}
                filterConnection={filterConnection}
                onOpenFlow={onOpenFlow}
              />
            )}
          </article>
        </div>
      )}
    </section>
  )
})

const TraceDetail: React.FC<{
  trace: MITMTraceRow
  sampledAt: number
  filterConnection: (id: string) => void
  onOpenFlow: (id: number) => void
}> = ({ trace, sampledAt, filterConnection, onOpenFlow }) => {
  const flowId = Number(trace.FlowId)
  const finishedAt = Number(trace.FinishedAtUnixMs) || 0
  const startedAt = Number(trace.StartedAtUnixMs)
  const duration = Math.max(0, (finishedAt || sampledAt) - startedAt)
  const spans = (trace.Spans ?? [])
    .filter((span) => span.Stage !== 'upstream' || Number(span.StartedAtUnixMs) !== Number(span.FinishedAtUnixMs))
    .map((span) => {
      const at = Number(span.StartedAtUnixMs)
      const end = Number(span.FinishedAtUnixMs) || 0
      return {
        ...span,
        offset: Math.max(0, at - startedAt),
        elapsed: Math.max(0, (end || sampledAt) - at),
        active: !end,
      }
    })
  const timelineDuration = Math.max(duration, ...spans.map((span) => span.offset + span.elapsed))
  const position = (time: number) => `${(time / Math.max(1, timelineDuration)) * 100}%`
  const browser = browserServiceLabel(trace.BrowserService)
  const capture = traceFilterLabel(trace)
  const filterReason = filterReasons[trace.FilterDecision ?? '']
  const waiting = !finishedAt && describeWaitingStage(trace.Stage, trace.Protocol)
  return (
    <>
      <div className={styles.row}>
        <h3 className={styles.traceHost} title={trace.Host}>
          {trace.Method} {trace.Host || '未知目标'}
        </h3>
        <span className={styles.note}>#{trace.TraceId}</span>
      </div>
      <div className={styles.traceMeta}>
        <YakitTag size="small" color={traceStatusColor(trace)} border={false}>
          {traceStatus(trace)}
        </YakitTag>
        {trace.StatusCode > 0 && (
          <YakitTag size="small" color="blue" border={false}>
            HTTP {trace.StatusCode}
          </YakitTag>
        )}
        {capture && (
          <YakitTag size="small" color={filterReason ? 'info' : 'blue'} border={false}>
            {capture}
          </YakitTag>
        )}
        {browser && (
          <span title="按目标域名识别为浏览器后台请求">
            <YakitTag size="small" color="blue" border={false}>
              {browser}
            </YakitTag>
          </span>
        )}
        <span className={styles.note}>总耗时 {formatDuration(duration)}</span>
      </div>
      {filterReason && <p className={styles.note}>{filterReason}。</p>}
      {waiting && (
        <p className={styles.note}>
          {waiting}，已耗时 {formatDuration(rowDuration(trace, sampledAt))}。
        </p>
      )}
      {trace.ErrorCode && <p className={styles.traceError}>{errorLabels[trace.ErrorCode] || '处理失败'}</p>}
      <div className={styles.detailActions}>
        {trace.ConnectionId && (
          <YakitButton type="text" size="small" onClick={() => filterConnection(trace.ConnectionId)}>
            查看同一客户端连接
          </YakitButton>
        )}
        {Number.isSafeInteger(flowId) && flowId > 0 && (
          <YakitButton type="text" size="small" onClick={() => onOpenFlow(flowId)}>
            查看流量 #{trace.FlowId}
          </YakitButton>
        )}
      </div>
      {spans.length > 0 && (
        <section className={styles.waterfall} aria-label="阶段耗时瀑布图">
          <div className={styles.row}>
            <h3>阶段耗时</h3>
            <span className={styles.note}>从收到请求起计</span>
          </div>
          <div className={styles.timelineScale} aria-hidden="true">
            <span>0</span>
            <span>{formatDuration(timelineDuration / 2)}</span>
            <span>{formatDuration(timelineDuration)}</span>
          </div>
          <ol className={styles.timeline}>
            {spans.map((span, index) => {
              const attempt = span.Attempt && trace.Attempts > 1 && spans[index - 1]?.Attempt !== span.Attempt
              return (
                <li key={`${span.Stage}-${span.StartedAtUnixMs}-${index}`} data-active={span.active || undefined}>
                  {!!attempt && (
                    <span className={styles.attempt}>
                      尝试 {span.Attempt} · {span.Protocol}
                    </span>
                  )}
                  <span className={styles.row}>
                    <span>{stageLabel(span.Stage, span.Protocol || trace.Protocol)}</span>
                    <span className={styles.note}>
                      {formatDuration(span.elapsed)}
                      {span.active ? ' · 进行中' : ''}
                    </span>
                  </span>
                  <div className={styles.timelineTrack} aria-hidden="true">
                    <span
                      style={{
                        insetInlineStart: `min(${position(span.offset)}, calc(100% - 2px))`,
                        width: position(span.elapsed),
                      }}
                    />
                  </div>
                </li>
              )
            })}
          </ol>
        </section>
      )}
      {trace.SpansTruncated && <p className={styles.note}>阶段较多，已保留起始和最近阶段。</p>}
    </>
  )
}
