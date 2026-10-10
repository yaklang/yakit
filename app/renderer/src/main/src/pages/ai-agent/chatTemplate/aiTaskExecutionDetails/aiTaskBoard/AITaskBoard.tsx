import React from 'react'
import classNames from 'classnames'
import { useCreation } from 'ahooks'
import { YakitTag } from '@/components/yakitUI/YakitTag/YakitTag'
import { formatTime, timeDiffWithMoment } from '@/utils/timeUtil'
import type { AITaskBoardProps, AITaskBoardTodoCardProps } from './type'
import styles from './AITaskBoard.module.scss'

/** 有效 Unix 秒时间戳（排除 created_at/updated_at 这类占位序号） */
const isValidUnixSec = (ts?: number) => typeof ts === 'number' && Number.isFinite(ts) && ts > 1e9

/** 将秒数格式化为 46s / 1m6s / 2h30m15s */
const formatDurationSeconds = (seconds?: number) => {
  if (typeof seconds !== 'number' || !Number.isFinite(seconds) || seconds < 0) return '0s'
  const total = Math.floor(seconds)
  const hours = Math.floor(total / 3600)
  const minutes = Math.floor((total % 3600) / 60)
  const secs = total % 60
  const parts: string[] = []
  if (hours > 0) parts.push(`${hours}h`)
  if (minutes > 0) parts.push(`${minutes}m`)
  parts.push(`${secs}s`)
  return parts.join('')
}

/** 看板卡片时间段：开始—结束 / 创建—跳过 / 创建—删除 */
const BoardCardTimeRange: React.FC<{
  startLabel: string
  startTime: string
  endLabel: string
  endTime: string
}> = React.memo(({ startLabel, startTime, endLabel, endTime }) => (
  <span className={styles['board-card-range']}>
    {startLabel} {startTime} — {endLabel} {endTime}
  </span>
))

/** 看板卡片：内容 + 按状态展示耗时/存活与时间段 */
const AITaskBoardTodoCard: React.FC<AITaskBoardTodoCardProps> = React.memo(({ item }) => {
  const createdTs = useCreation(() => (isValidUnixSec(item.created_ts) ? item.created_ts! : 0), [item.created_ts])
  // 执行开始仅认 focus_started_ts，不用 created_ts 冒充（否则会把排队时间算进耗时）
  const startTs = useCreation(
    () => (isValidUnixSec(item.focus_started_ts) ? item.focus_started_ts! : 0),
    [item.focus_started_ts],
  )
  const endTs = useCreation(() => (isValidUnixSec(item.closed_ts) ? item.closed_ts! : 0), [item.closed_ts])

  const createdText = useCreation(() => (createdTs ? formatTime(createdTs) : '—'), [createdTs])
  const startText = useCreation(() => (startTs ? formatTime(startTs) : '—'), [startTs])
  const endText = useCreation(() => (endTs ? formatTime(endTs) : '—'), [endTs])

  // 耗时：优先后端 focus_seconds；无值时仅在有 focus_started_ts 时用墙钟兜底
  const focusDurationText = useCreation(() => {
    if (typeof item.focus_seconds === 'number' && item.focus_seconds >= 0) {
      return formatDurationSeconds(item.focus_seconds)
    }
    if (!startTs) return '0s'
    return timeDiffWithMoment(startTs, Math.floor(Date.now() / 1000))
  }, [item.focus_seconds, startTs])

  // 存活：优先 survival_seconds / age_seconds
  const survivalDurationText = useCreation(() => {
    if (typeof item.survival_seconds === 'number' && item.survival_seconds >= 0) {
      return formatDurationSeconds(item.survival_seconds)
    }
    if (typeof item.age_seconds === 'number' && item.age_seconds >= 0) {
      return formatDurationSeconds(item.age_seconds)
    }
    if (!createdTs) return '0s'
    return timeDiffWithMoment(createdTs, endTs || Math.floor(Date.now() / 1000))
  }, [item.survival_seconds, item.age_seconds, createdTs, endTs])

  const isMuted = item.status === 'SKIPPED' || item.status === 'DELETED'

  const renderFooter = () => {
    switch (item.status) {
      case 'PENDING':
        return <span className={styles['board-card-meta']}>创建时间 {createdText}</span>
      case 'DOING':
        return (
          <>
            <YakitTag border={false} fullRadius size="small">
              耗时 {focusDurationText}
            </YakitTag>
            <span className={styles['board-card-meta']}>开始 {startText} —</span>
          </>
        )
      case 'DONE':
        return (
          <>
            <YakitTag border={false} fullRadius size="small">
              耗时 {focusDurationText}
            </YakitTag>
            <BoardCardTimeRange startLabel="开始" startTime={startText} endLabel="结束" endTime={endText} />
          </>
        )
      case 'SKIPPED':
        return (
          <>
            <YakitTag border={false} fullRadius size="small">
              存活 {survivalDurationText}
            </YakitTag>
            <BoardCardTimeRange startLabel="创建" startTime={createdText} endLabel="跳过" endTime={endText} />
          </>
        )
      case 'DELETED':
        return (
          <>
            <YakitTag border={false} fullRadius size="small">
              存活 {survivalDurationText}
            </YakitTag>
            <BoardCardTimeRange startLabel="创建" startTime={createdText} endLabel="删除" endTime={endText} />
          </>
        )
      default:
        return null
    }
  }

  return (
    <div className={classNames(styles['board-todo-card'], { [styles['board-todo-card-muted']]: isMuted })}>
      {!!item.content && (
        <div className={styles['board-card-desc']} title={item.content}>
          {item.content}
        </div>
      )}
      <div className={styles['board-card-footer']}>{renderFooter()}</div>
    </div>
  )
})

/** 任务统计看板：待处理 / 运行中 / 已完成 / 已跳过·已删除 */
export const AITaskBoard: React.FC<AITaskBoardProps> = React.memo(({ columns, className }) => {
  return (
    <div className={classNames(styles['ai-task-board'], className)}>
      {columns.map((column) => (
        <div key={column.key} className={styles['todo-list-wrapper']}>
          <div className={styles['todo-list-header']}>
            <span className={styles['todo-column-icon']}>{column.icon}</span>
            <span className={styles['todo-title']}>{column.title}</span>
            <YakitTag border={false} fullRadius size="small">
              {column.items.length}
            </YakitTag>
          </div>
          <div className={styles['todo-list']}>
            {column.items.map((item, index) => (
              <AITaskBoardTodoCard key={item.id || index} item={item} />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
})
