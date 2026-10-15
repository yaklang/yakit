import React, { useEffect, useState } from 'react'
import classNames from 'classnames'
import { Tooltip } from 'antd'
import { useCreation, useInterval, useMemoizedFn } from 'ahooks'
import { YakitTag } from '@/components/yakitUI/YakitTag/YakitTag'
import { AIToDoListStatusEnum } from '@/pages/ai-agent/defaultConstant'
import { useI18nNamespaces } from '@/i18n/useI18nNamespaces'
import {
  buildGanttTicks,
  buildSegments,
  collectGanttContentBounds,
  computeGanttTimeRange,
  formatGanttTickTime,
} from './ganttUtils'
import type { AITaskGanttProps, AITaskGanttSegment, AITaskGanttSegmentKind, AITaskGanttStatusMap } from './type'
import styles from './AITaskGantt.module.scss'

/** 条带上方任务名展示最大字符数，超出省略 */
const GANTT_LABEL_MAX_CHARS = 20

const formatGanttLabelName = (content?: string) => {
  const text = content || '—'
  if (text.length <= GANTT_LABEL_MAX_CHARS) return text
  return `${text.slice(0, GANTT_LABEL_MAX_CHARS)}...`
}

/** 任务统计甘特图：时间轴条带上直接展示任务名与状态 */
export const AITaskGantt: React.FC<AITaskGanttProps> = React.memo(
  ({ items, className, hiddenLegendKinds = [], onLegendToggle }) => {
    const { t, i18nRefresh } = useI18nNamespaces(['aiAgent'])
    const [selectedId, setSelectedId] = useState<string>('')
    const [nowSec, setNowSec] = useState(() => Math.floor(Date.now() / 1000))

    const hasLiveTasks = useCreation(
      () =>
        items.some(
          (item) => item.status === AIToDoListStatusEnum.Pending || item.status === AIToDoListStatusEnum.Doing,
        ),
      [items],
    )

    // items 变更时同步一次 now；有进行中任务时每 5 秒刷新，驱动条带伸长
    useEffect(() => {
      setNowSec(Math.floor(Date.now() / 1000))
    }, [items])
    useInterval(() => setNowSec(Math.floor(Date.now() / 1000)), hasLiveTasks ? 5_000 : undefined)

    const statusMeta = useCreation<AITaskGanttStatusMap>(
      () => ({
        [AIToDoListStatusEnum.Pending]: { label: t('AITaskExecutionDetails.statusPending') },
        [AIToDoListStatusEnum.Doing]: { label: t('AITaskExecutionDetails.statusDoing'), tagColor: 'warning' },
        [AIToDoListStatusEnum.Done]: { label: t('AITaskExecutionDetails.statusDone'), tagColor: 'success' },
        [AIToDoListStatusEnum.Skipped]: { label: t('AITaskExecutionDetails.statusSkipped'), tagColor: 'purple' },
        [AIToDoListStatusEnum.Deleted]: { label: t('AITaskExecutionDetails.statusDeleted'), tagColor: 'danger' },
      }),
      [i18nRefresh],
    )

    // 图例文案与顶部任务统计一致（status*）
    const legendItems = useCreation<{ kind: AITaskGanttSegmentKind; label: string }[]>(
      () => [
        { kind: 'wait', label: t('AITaskExecutionDetails.statusPending') },
        { kind: 'execute', label: t('AITaskExecutionDetails.statusDoing') },
        { kind: 'success', label: t('AITaskExecutionDetails.statusDone') },
        { kind: 'skipped', label: t('AITaskExecutionDetails.statusSkipped') },
        { kind: 'failed', label: t('AITaskExecutionDetails.statusDeleted') },
      ],
      [i18nRefresh],
    )

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
    // 进行中 + contentEnd 贴近 now，且 contentEnd 不小于前一刻度（仍是轴上最大）时才展示 to now
    const showLiveToNow = useCreation(() => {
      if (!hasLiveTasks || Math.abs(timeRange.contentEnd - nowSec) > 1) return false
      if (ticks.length < 2) return true
      return timeRange.contentEnd >= ticks[ticks.length - 2]
    }, [hasLiveTasks, timeRange.contentEnd, nowSec, ticks])

    const rangeSpan = timeRange.end - timeRange.start || 1
    const timelineWidthPx = Math.max(ticks.length * 80, 480)

    const toPercent = useMemoizedFn((ts: number) => {
      return `${((Math.min(Math.max(ts, timeRange.start), timeRange.end) - timeRange.start) / rangeSpan) * 100}%`
    })

    const segmentStyle = useMemoizedFn((seg: AITaskGanttSegment, endTs = seg.endTs): React.CSSProperties => {
      const left = ((seg.startTs - timeRange.start) / rangeSpan) * 100
      const width = ((Math.max(endTs, seg.startTs + 1) - seg.startTs) / rangeSpan) * 100
      return {
        left: `${Math.max(left, 0)}%`,
        width: `${Math.max(width, 0.4)}%`,
      }
    })

    const onSelect = useMemoizedFn((key: string) => {
      setSelectedId((prev) => (prev === key ? '' : key))
    })

    return (
      <div className={classNames(styles['ai-task-gantt'], className)}>
        <div className={styles['gantt-timeline']}>
          <div className={styles['timeline-scroll']} style={{ width: timelineWidthPx }}>
            <div className={styles['timeline-header']}>
              {ticks.map((tick, index) => {
                const isLast = index === ticks.length - 1
                const showToNow = isLast && showLiveToNow
                const labelTs = showToNow ? timeRange.contentEnd : tick
                return (
                  <div key={`${tick}-${index}`} className={styles['timeline-tick']} style={{ left: toPercent(tick) }}>
                    <span className={styles['timeline-tick-time']}>{formatGanttTickTime(labelTs)}</span>
                    {showToNow ? (
                      <span className={styles['timeline-tick-tonow']}>{t('AITaskExecutionDetails.ganttToNow')}</span>
                    ) : null}
                  </div>
                )
              })}
            </div>
            <div className={styles['timeline-body']}>
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
                {rowModels.map((row) => {
                  const labelLeft = row.segments.length > 0 ? toPercent(row.segments[0].startTs) : '0%'
                  const fullName = row.item.content || '—'
                  const showNameTip = fullName.length > GANTT_LABEL_MAX_CHARS
                  return (
                    <div
                      key={row.key}
                      className={classNames(styles['timeline-row'], {
                        [styles['timeline-row-selected']]: selectedId === row.key,
                      })}
                      onClick={() => onSelect(row.key)}
                    >
                      <div className={styles['bar-label']} style={{ left: labelLeft }}>
                        <YakitTag border={false} fullRadius size="small" color={row.meta.tagColor}>
                          {row.meta.label}
                        </YakitTag>
                        <Tooltip title={showNameTip ? fullName : undefined} placement="topLeft">
                          <span className={styles['bar-label-name']}>{formatGanttLabelName(row.item.content)}</span>
                        </Tooltip>
                      </div>
                      <div className={styles['bar-track']}>
                        {row.segments.map((seg, idx) => {
                          const isLiveRow =
                            row.item.status === AIToDoListStatusEnum.Pending ||
                            row.item.status === AIToDoListStatusEnum.Doing
                          // to now 展示时进行中末段拉满到轴终点，避免最后一格空一截
                          const stretchToAxisEnd = showLiveToNow && isLiveRow && idx === row.segments.length - 1
                          const endTs = stretchToAxisEnd ? Math.max(seg.endTs, timeRange.end) : seg.endTs
                          return (
                            <div
                              key={`${row.key}-${seg.kind}-${idx}`}
                              className={classNames(styles['bar-segment'], styles[`bar-segment-${seg.kind}`])}
                              style={segmentStyle(seg, endTs)}
                              title={`${legendItems.find((l) => l.kind === seg.kind)?.label || seg.kind}`}
                            />
                          )
                        })}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </div>

        <div className={styles['gantt-legend']}>
          {legendItems.map((item) => {
            const hidden = hiddenLegendKinds.includes(item.kind)
            return (
              <div
                key={item.kind}
                className={classNames(styles['legend-item'], {
                  [styles['legend-item-clickable']]: !!onLegendToggle,
                  [styles['legend-item-hidden']]: hidden,
                })}
                onClick={onLegendToggle ? () => onLegendToggle(item.kind) : undefined}
                role={onLegendToggle ? 'button' : undefined}
                tabIndex={onLegendToggle ? 0 : undefined}
                onKeyDown={
                  onLegendToggle
                    ? (e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault()
                          onLegendToggle(item.kind)
                        }
                      }
                    : undefined
                }
              >
                <span className={classNames(styles['legend-dot'], styles[`legend-dot-${item.kind}`])} />
                <span>{item.label}</span>
              </div>
            )
          })}
        </div>
      </div>
    )
  },
)
