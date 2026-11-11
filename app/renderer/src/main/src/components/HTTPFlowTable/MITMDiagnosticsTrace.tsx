import React, { useMemo, useState } from 'react'
import { YakitButton } from '../yakitUI/YakitButton/YakitButton'
import { YakitEmpty } from '../yakitUI/YakitEmpty/YakitEmpty'
import { YakitSegmented } from '../yakitUI/YakitSegmented/YakitSegmented'
import { YakitTag } from '../yakitUI/YakitTag/YakitTag'
import type { YakitTagColor } from '../yakitUI/YakitTag/YakitTagType'
import type { MITMDiagnosticsQuery, MITMTraceRow, MITMTraceView } from './MITMDiagnostics.types'
import { errorLabels, formatDuration, outcomeLabels, stageLabel } from './MITMDiagnostics.utils'
import { useMITMDiagnosticsQuery } from './useMITMDiagnosticsQuery'
import styles from './MITMDiagnosticsPanel.module.scss'

export type TraceRange = { from: number; to: number }

const pageSize = 20
const filters: { value: MITMTraceView; label: string }[] = [
  { value: 'active', label: '当前等待' },
  { value: 'slow', label: '近期慢请求' },
  { value: 'failed', label: '失败与取消' },
  { value: 'websocket', label: 'WS 在线' },
]

const rangeFilters = [{ value: 'range' as const, label: '该时段样本' }, ...filters]
const emptyImageStyle = { width: 88, height: 88, margin: '0 auto 8px' }

const clock = new Intl.DateTimeFormat('zh-CN', {
  hourCycle: 'h23',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
})
export const formatTraceClock = (time: number) => (time > 0 ? clock.format(time) : '–')

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

const rowDuration = (trace: MITMTraceRow, sampledAt: number) => {
  const finishedAt = Number(trace.FinishedAtUnixMs)
  return Math.max(0, finishedAt ? finishedAt - Number(trace.StartedAtUnixMs) : sampledAt - Number(trace.StageAtUnixMs))
}

interface TraceProps {
  sessionId: string
  initialFilter: MITMTraceView
  initialRange?: TraceRange
  onOpenFlow: (id: number) => void
}

export const MITMDiagnosticsTrace: React.FC<TraceProps> = ({ sessionId, initialFilter, initialRange, onOpenFlow }) => {
  const [filter, setFilter] = useState(initialFilter)
  const [range, setRange] = useState(initialRange)
  const [offset, setOffset] = useState(0)
  const [selected, setSelected] = useState<string>()
  const [connectionId, setConnectionId] = useState('')

  const query = useMemo<MITMDiagnosticsQuery>(
    () => ({
      SessionId: sessionId,
      View: filter,
      Offset: offset,
      Limit: pageSize,
      FromUnixMs: filter === 'range' ? range?.from : undefined,
      ToUnixMs: filter === 'range' ? range?.to : undefined,
      ConnectionId: connectionId || undefined,
    }),
    [sessionId, filter, offset, range, connectionId],
  )
  const list = useMITMDiagnosticsQuery(query, filter !== 'range' && offset === 0)
  const traces = list?.result?.Traces ?? []
  const total = list?.result?.Total ?? 0
  const selectedRow = traces.find((row) => row.TraceId === selected) ?? traces[0]
  const traceId = selectedRow?.TraceId
  const detailQuery = useMemo<MITMDiagnosticsQuery | undefined>(
    () =>
      traceId
        ? {
            SessionId: sessionId,
            View: 'detail',
            TraceId: traceId,
          }
        : undefined,
    [sessionId, traceId],
  )
  const revision = selectedRow && `${selectedRow.Stage}:${selectedRow.Outcome}:${selectedRow.FlowId}`
  const detail = useMITMDiagnosticsQuery(detailQuery, !!selectedRow && !Number(selectedRow.FinishedAtUnixMs), revision)
  const current = detail?.result?.Detail
  const listSampledAt = Number(list?.result?.GeneratedAtUnixMs) || 0
  const sampledAt = Number(detail?.result?.GeneratedAtUnixMs) || listSampledAt

  const selectFilter = (next: MITMTraceView) => {
    setFilter(next)
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
        {list?.result && !unavailable && <span className={styles.note}>共 {total} 条</span>}
      </div>
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
          title={filter === 'active' ? '当前没有等待超过 2 秒的请求或写入任务' : '当前筛选下没有轨迹样本'}
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
              {traces.map((trace) => (
                <button
                  type="button"
                  key={trace.TraceId}
                  className={styles.record}
                  aria-pressed={trace.TraceId === traceId}
                  onClick={() => setSelected(trace.TraceId)}
                >
                  <span className={styles.row}>
                    <strong title={trace.Host}>{trace.Host || '未知目标'}</strong>
                    <span className={styles.recordDuration}>{formatDuration(rowDuration(trace, listSampledAt))}</span>
                  </span>
                  <span className={styles.recordMeta}>
                    <YakitTag size="small" color="blue" border={false}>
                      {trace.Protocol || 'HTTP'}
                    </YakitTag>
                    <span className={styles.recordStatus}>{traceStatus(trace)}</span>
                  </span>
                </button>
              ))}
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
}

const TraceDetail: React.FC<{
  trace: MITMTraceRow
  sampledAt: number
  filterConnection: (id: string) => void
  onOpenFlow: (id: number) => void
}> = ({ trace, sampledAt, filterConnection, onOpenFlow }) => {
  const flowId = Number(trace.FlowId)
  const duration = Math.max(0, (Number(trace.FinishedAtUnixMs) || sampledAt) - Number(trace.StartedAtUnixMs))
  const spans = (trace.Spans ?? []).filter(
    (span) => span.Stage !== 'upstream' || Number(span.StartedAtUnixMs) !== Number(span.FinishedAtUnixMs),
  )
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
        <span className={styles.note}>总耗时 {formatDuration(duration)}</span>
      </div>
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
      <ol className={styles.timeline}>
        {spans.map((span, index) => {
          const start = Number(span.StartedAtUnixMs)
          const end = Number(span.FinishedAtUnixMs)
          const attempt = span.Attempt && trace.Attempts > 1 && spans[index - 1]?.Attempt !== span.Attempt
          return (
            <li key={`${span.Stage}-${start}-${index}`} data-active={!end || undefined}>
              {!!attempt && (
                <span className={styles.attempt}>
                  尝试 {span.Attempt} · {span.Protocol}
                </span>
              )}
              <span className={styles.row}>
                <span>{stageLabel(span.Stage, span.Protocol || trace.Protocol)}</span>
                <span className={styles.note}>
                  {formatDuration(Math.max(0, (end || sampledAt) - start))}
                  {end ? '' : ' · 进行中'}
                </span>
              </span>
            </li>
          )
        })}
      </ol>
      {trace.SpansTruncated && <p className={styles.note}>阶段较多，已保留起始和最近阶段。</p>}
    </>
  )
}
