import React, { useRef, useState } from 'react'
import classNames from 'classnames'
import moment from 'moment'
import { useCreation, useMemoizedFn } from 'ahooks'
import { YakitTag } from '@/components/yakitUI/YakitTag/YakitTag'
import { AIToDoListStatusEnum } from '@/pages/ai-agent/defaultConstant'
import { useI18nNamespaces } from '@/i18n/useI18nNamespaces'
import { buildGanttTicks, buildSegments, collectGanttContentBounds, computeGanttTimeRange } from './ganttUtils'
import type { AITaskGanttProps, AITaskGanttSegment, AITaskGanttSegmentKind, AITaskGanttStatusMap } from './type'
import styles from './AITaskGantt.module.scss'

/** 任务统计甘特图：左侧 Todo list + 右侧时间轴条 */
export const AITaskGantt: React.FC<AITaskGanttProps> = React.memo(({ items, className }) => {
  const { t, i18nRefresh } = useI18nNamespaces(['aiAgent'])
  const [selectedId, setSelectedId] = useState<string>('')
  const sidebarListRef = useRef<HTMLDivElement>(null)
  const timelineBodyRef = useRef<HTMLDivElement>(null)
  const syncingScroll = useRef(false)

  const statusMeta = useCreation<AITaskGanttStatusMap>(
    () => ({
      [AIToDoListStatusEnum.Pending]: { label: t('AITaskExecutionDetails.columnPending') },
      [AIToDoListStatusEnum.Doing]: { label: t('AITaskExecutionDetails.columnDoing'), tagColor: 'warning' },
      [AIToDoListStatusEnum.Done]: { label: t('AITaskExecutionDetails.columnDone'), tagColor: 'success' },
      [AIToDoListStatusEnum.Skipped]: { label: t('AITaskExecutionDetails.statusSkipped'), tagColor: 'purple' },
      [AIToDoListStatusEnum.Deleted]: { label: t('AITaskExecutionDetails.statusDeleted'), tagColor: 'danger' },
    }),
    [i18nRefresh],
  )

  const legendItems = useCreation<{ kind: AITaskGanttSegmentKind; label: string }[]>(
    () => [
      { kind: 'wait', label: t('AITaskExecutionDetails.ganttWait') },
      { kind: 'execute', label: t('AITaskExecutionDetails.ganttExecute') },
      { kind: 'success', label: t('AITaskExecutionDetails.ganttSuccess') },
      { kind: 'skipped', label: t('AITaskExecutionDetails.ganttSkipped') },
      { kind: 'failed', label: t('AITaskExecutionDetails.ganttFailed') },
    ],
    [i18nRefresh],
  )

  const nowSec = useCreation(() => Math.floor(Date.now() / 1000), [items])

  const rowModels = useCreation(() => {
    return items.map((item, index) => {
      const meta = statusMeta[item.status] || statusMeta[AIToDoListStatusEnum.Pending]
      return {
        key: item.id || `gantt-row-${index}`,
        item,
        meta,
        segments: buildSegments(item, nowSec),
      }
    })
  }, [items, nowSec, statusMeta])

  const timeRange = useCreation(() => {
    const bounds = collectGanttContentBounds(
      rowModels.map((row) => ({ segments: row.segments, created_ts: row.item.created_ts })),
    )
    return computeGanttTimeRange(bounds, nowSec)
  }, [rowModels, nowSec])

  const ticks = useCreation(() => buildGanttTicks(timeRange), [timeRange])

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
              {/* 网格挂在随行高增长的内容层上，避免滚动后下方无背景 */}
              <div className={styles['timeline-content']}>
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
                          title={`${legendItems.find((l) => l.kind === seg.kind)?.label || seg.kind}`}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className={styles['gantt-legend']}>
        {legendItems.map((item) => (
          <div key={item.kind} className={styles['legend-item']}>
            <span className={classNames(styles['legend-dot'], styles[`legend-dot-${item.kind}`])} />
            <span>{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  )
})
