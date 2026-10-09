import React, { useRef, useState } from 'react'
import classNames from 'classnames'
import moment from 'moment'
import { useCreation, useMemoizedFn } from 'ahooks'
import { YakitTag } from '@/components/yakitUI/YakitTag/YakitTag'
import { AIToDoListStatusEnum } from '@/pages/ai-agent/defaultConstant'
import type {
  AITaskGanttProps,
  AITaskGanttSegment,
  AITaskGanttSegmentKind,
  AITaskGanttStatusMap,
  AITaskGanttTodoItem,
} from './type'
import styles from './AITaskGantt.module.scss'

const isValidUnixSec = (ts?: number) => typeof ts === 'number' && Number.isFinite(ts) && ts > 1e9

const STATUS_META: AITaskGanttStatusMap = {
  [AIToDoListStatusEnum.Pending]: { label: '待处理' },
  [AIToDoListStatusEnum.Doing]: { label: '运行中', tagColor: 'warning' },
  [AIToDoListStatusEnum.Done]: { label: '已完成', tagColor: 'success' },
  [AIToDoListStatusEnum.Skipped]: { label: '已跳过', tagColor: 'purple' },
  [AIToDoListStatusEnum.Deleted]: { label: '已删除', tagColor: 'danger' },
}

const LEGEND_ITEMS: { kind: AITaskGanttSegmentKind; label: string }[] = [
  { kind: 'wait', label: '等待' },
  { kind: 'execute', label: '执行过程' },
  { kind: 'success', label: '成功' },
  { kind: 'skipped', label: '跳过' },
  { kind: 'failed', label: '失败' },
]

const TICK_CANDIDATES_SEC = [
  5 * 60,
  10 * 60,
  15 * 60,
  20 * 60,
  30 * 60,
  60 * 60,
  2 * 3600,
  6 * 3600,
  12 * 3600,
  24 * 3600,
]

/** 按状态拼甘特条：等待 → 执行/成功/跳过/失败 */
const buildSegments = (item: AITaskGanttTodoItem, nowSec: number): AITaskGanttSegment[] => {
  const created = isValidUnixSec(item.created_ts) ? item.created_ts! : 0
  if (!created) return []

  const focus = isValidUnixSec(item.focus_started_ts) ? item.focus_started_ts! : 0
  const closed = isValidUnixSec(item.closed_ts) ? item.closed_ts! : 0
  const end = closed || nowSec
  const segments: AITaskGanttSegment[] = []

  const push = (kind: AITaskGanttSegmentKind, startTs: number, endTs: number) => {
    if (endTs < startTs) return
    segments.push({ kind, startTs, endTs: Math.max(endTs, startTs) })
  }

  switch (item.status) {
    case AIToDoListStatusEnum.Pending: {
      push('wait', created, end)
      break
    }
    case AIToDoListStatusEnum.Doing: {
      if (focus && focus > created) {
        push('wait', created, focus)
        push('execute', focus, end)
      } else if (focus) {
        push('execute', focus, end)
      } else {
        push('wait', created, end)
      }
      break
    }
    case AIToDoListStatusEnum.Done: {
      // 等待 + 执行过程 + 成功收尾（无独立成功时间戳时取执行尾部约 15%）
      const processEnd = closed || end
      if (focus && focus > created) {
        push('wait', created, focus)
        const processDur = Math.max(processEnd - focus, 0)
        const tipStart =
          processDur > 0 ? Math.max(focus, processEnd - Math.max(1, Math.floor(processDur * 0.25))) : processEnd
        if (tipStart > focus) push('execute', focus, tipStart)
        push('success', tipStart, processEnd)
      } else if (focus) {
        push('success', focus, processEnd)
      } else {
        push('wait', created, processEnd)
        push('success', processEnd, processEnd)
      }
      break
    }
    case AIToDoListStatusEnum.Skipped: {
      if (focus && focus > created) {
        push('wait', created, focus)
        push('skipped', focus, end)
      } else {
        const mid = created + Math.max(1, Math.floor((end - created) * 0.35))
        push('wait', created, Math.min(mid, end))
        push('skipped', Math.min(mid, end), end)
      }
      break
    }
    case AIToDoListStatusEnum.Deleted: {
      if (focus && focus > created) {
        push('wait', created, focus)
        push('failed', focus, end)
      } else {
        const mid = created + Math.max(1, Math.floor((end - created) * 0.35))
        push('wait', created, Math.min(mid, end))
        push('failed', Math.min(mid, end), end)
      }
      break
    }
    default:
      push('wait', created, end)
  }

  return segments.filter((seg) => seg.endTs >= seg.startTs)
}

const pickTickInterval = (spanSec: number) => {
  const targetTicks = 8
  for (const candidate of TICK_CANDIDATES_SEC) {
    if (spanSec / candidate <= targetTicks) return candidate
  }
  return TICK_CANDIDATES_SEC[TICK_CANDIDATES_SEC.length - 1]
}

/** 任务统计甘特图：左侧 Todo list + 右侧时间轴条 */
export const AITaskGantt: React.FC<AITaskGanttProps> = React.memo(({ items, className }) => {
  const [selectedId, setSelectedId] = useState<string>('')
  const sidebarListRef = useRef<HTMLDivElement>(null)
  const timelineBodyRef = useRef<HTMLDivElement>(null)
  const syncingScroll = useRef(false)

  const nowSec = useCreation(() => Math.floor(Date.now() / 1000), [items])

  const rowModels = useCreation(() => {
    return items.map((item, index) => {
      const meta = STATUS_META[item.status] || STATUS_META[AIToDoListStatusEnum.Pending]
      return {
        key: item.id || `gantt-row-${index}`,
        item,
        meta,
        segments: buildSegments(item, nowSec),
      }
    })
  }, [items, nowSec])

  const timeRange = useCreation(() => {
    let minTs = Infinity
    let maxTs = -Infinity
    for (const row of rowModels) {
      for (const seg of row.segments) {
        minTs = Math.min(minTs, seg.startTs)
        maxTs = Math.max(maxTs, seg.endTs)
      }
      const created = isValidUnixSec(row.item.created_ts) ? row.item.created_ts! : 0
      if (created) {
        minTs = Math.min(minTs, created)
        maxTs = Math.max(maxTs, created)
      }
    }
    if (!Number.isFinite(minTs) || !Number.isFinite(maxTs)) {
      const fallbackEnd = nowSec
      const fallbackStart = fallbackEnd - 2 * 3600
      return { start: fallbackStart, end: fallbackEnd, interval: 20 * 60 }
    }
    if (maxTs <= minTs) maxTs = minTs + 20 * 60
    // 两端略留白
    const paddedStart = minTs - 5 * 60
    const paddedEnd = maxTs + 5 * 60
    const span = Math.max(paddedEnd - paddedStart, 20 * 60)
    const interval = pickTickInterval(span)
    const start = Math.floor(paddedStart / interval) * interval
    const end = Math.ceil(paddedEnd / interval) * interval
    return { start, end: Math.max(end, start + interval), interval }
  }, [rowModels, nowSec])

  const ticks = useCreation(() => {
    const list: number[] = []
    for (let t = timeRange.start; t <= timeRange.end; t += timeRange.interval) {
      list.push(t)
    }
    return list
  }, [timeRange])

  const rangeSpan = timeRange.end - timeRange.start || 1
  const timelineWidthPx = Math.max(ticks.length * 80, 480)

  const toPercent = useMemoizedFn((ts: number) => {
    return `${((Math.min(Math.max(ts, timeRange.start), timeRange.end) - timeRange.start) / rangeSpan) * 100}%`
  })

  const segmentStyle = useMemoizedFn((seg: AITaskGanttSegment): React.CSSProperties => {
    const left = ((seg.startTs - timeRange.start) / rangeSpan) * 100
    const width = ((Math.max(seg.endTs, seg.startTs + 1) - seg.startTs) / rangeSpan) * 100
    return {
      left: `${Math.max(left, 0)}%`,
      width: `${Math.max(width, 0.4)}%`,
    }
  })

  const onSelect = useMemoizedFn((key: string) => {
    setSelectedId((prev) => (prev === key ? '' : key))
  })

  const syncVerticalScroll = useMemoizedFn((source: 'sidebar' | 'timeline') => {
    if (syncingScroll.current) return
    const sidebar = sidebarListRef.current
    const timeline = timelineBodyRef.current
    if (!sidebar || !timeline) return
    syncingScroll.current = true
    if (source === 'sidebar') {
      timeline.scrollTop = sidebar.scrollTop
    } else {
      sidebar.scrollTop = timeline.scrollTop
    }
    requestAnimationFrame(() => {
      syncingScroll.current = false
    })
  })

  return (
    <div className={classNames(styles['ai-task-gantt'], className)}>
      <div className={styles['gantt-main']}>
        <div className={styles['gantt-sidebar']}>
          <div className={styles['sidebar-header']}>Todo list</div>
          <div ref={sidebarListRef} className={styles['sidebar-list']} onScroll={() => syncVerticalScroll('sidebar')}>
            {rowModels.map((row) => (
              <div
                key={row.key}
                className={classNames(styles['sidebar-item'], {
                  [styles['sidebar-item-selected']]: selectedId === row.key,
                })}
                onClick={() => onSelect(row.key)}
              >
                <div className={styles['sidebar-item-name']} title={row.item.content}>
                  {row.item.content || '—'}
                </div>
                <YakitTag border={false} fullRadius size="small" color={row.meta.tagColor}>
                  {row.meta.label}
                </YakitTag>
              </div>
            ))}
          </div>
        </div>

        <div className={styles['gantt-timeline']}>
          <div className={styles['timeline-scroll']} style={{ width: timelineWidthPx }}>
            <div className={styles['timeline-header']}>
              {ticks.map((tick) => (
                <div key={tick} className={styles['timeline-tick']} style={{ left: toPercent(tick) }}>
                  {moment.unix(tick).format('HH:mm')}
                </div>
              ))}
            </div>
            <div
              ref={timelineBodyRef}
              className={styles['timeline-body']}
              onScroll={() => syncVerticalScroll('timeline')}
            >
              <div className={styles['timeline-grid']}>
                {ticks.slice(0, -1).map((tick, index) => {
                  const nextTick = ticks[index + 1]
                  const left = ((tick - timeRange.start) / rangeSpan) * 100
                  const width = ((nextTick - tick) / rangeSpan) * 100
                  // 1-based 偶数列：第 2、4、6…
                  const isEvenColumn = (index + 1) % 2 === 0
                  return (
                    <div
                      key={`col-${tick}`}
                      className={classNames(styles['timeline-grid-col'], {
                        [styles['timeline-grid-col-even']]: isEvenColumn,
                      })}
                      style={{ left: `${left}%`, width: `${width}%` }}
                    />
                  )
                })}
                {ticks.map((tick) => (
                  <div
                    key={`grid-${tick}`}
                    className={styles['timeline-grid-line']}
                    style={{ left: toPercent(tick) }}
                  />
                ))}
              </div>
              {rowModels.map((row) => (
                <div
                  key={row.key}
                  className={classNames(styles['timeline-row'], {
                    [styles['timeline-row-selected']]: selectedId === row.key,
                  })}
                  onClick={() => onSelect(row.key)}
                >
                  <div className={styles['bar-track']}>
                    {row.segments.map((seg, idx) => (
                      <div
                        key={`${row.key}-${seg.kind}-${idx}`}
                        className={classNames(styles['bar-segment'], styles[`bar-segment-${seg.kind}`])}
                        style={segmentStyle(seg)}
                        title={`${LEGEND_ITEMS.find((l) => l.kind === seg.kind)?.label || seg.kind}`}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className={styles['gantt-legend']}>
        {LEGEND_ITEMS.map((item) => (
          <div key={item.kind} className={styles['legend-item']}>
            <span className={classNames(styles['legend-dot'], styles[`legend-dot-${item.kind}`])} />
            <span>{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  )
})
