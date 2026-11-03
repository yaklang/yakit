import React from 'react'
import classNames from 'classnames'
import { useCreation } from 'ahooks'
import { YakitTag } from '@/components/yakitUI/YakitTag/YakitTag'
import { formatTime } from '@/utils/timeUtil'
import { formatTaskDuration, taskFocusDuration, toTaskUnixSeconds } from './boardUtils'
import { useI18nNamespaces } from '@/i18n/useI18nNamespaces'
import type { AITaskBoardProps, AITaskBoardTodoCardProps } from './type'
import styles from './AITaskBoard.module.scss'

/** 将秒数格式化为 46s / 1m6s / 2h30m15s */
const formatDurationSeconds = (seconds?: number) => {
  return formatTaskDuration(seconds)
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
const AITaskBoardTodoCard: React.FC<AITaskBoardTodoCardProps> = ({ item }) => {
  const { t } = useI18nNamespaces(['aiAgent'])
  const createdTs = useCreation(() => toTaskUnixSeconds(item.created_ts), [item.created_ts])
  // 执行开始仅认 focus_started_ts，不用 created_ts 冒充（否则会把排队时间算进耗时）
  const startTs = useCreation(() => toTaskUnixSeconds(item.focus_started_ts), [item.focus_started_ts])
  const endTs = useCreation(() => toTaskUnixSeconds(item.closed_ts), [item.closed_ts])

  const createdText = useCreation(() => (createdTs ? formatTime(createdTs) : '—'), [createdTs])
  const startText = useCreation(() => (startTs ? formatTime(startTs) : '—'), [startTs])
  const endText = useCreation(() => (endTs ? formatTime(endTs) : '—'), [endTs])

  // 耗时：优先后端 focus_seconds；无值时仅在有 focus_started_ts 时用墙钟兜底
  const focusDurationText = formatDurationSeconds(taskFocusDuration(item, Date.now() / 1000))

  // 存活：优先 survival_seconds / age_seconds
  const survivalDurationText = useCreation(() => {
    if (
      typeof item.survival_seconds === 'number' &&
      Number.isFinite(item.survival_seconds) &&
      item.survival_seconds >= 0
    ) {
      return formatDurationSeconds(item.survival_seconds)
    }
    if (typeof item.age_seconds === 'number' && Number.isFinite(item.age_seconds) && item.age_seconds >= 0) {
      return formatDurationSeconds(item.age_seconds)
    }
    if (!createdTs || !endTs) return '—'
    return formatDurationSeconds(Math.max(0, endTs - createdTs))
  }, [item.survival_seconds, item.age_seconds, createdTs, endTs])

  const isMuted = item.status === 'SKIPPED' || item.status === 'DELETED'

  const renderFooter = () => {
    switch (item.status) {
      case 'PENDING':
        return (
          <span className={styles['board-card-meta']}>
            {t('AITaskExecutionDetails.createdTime', { time: createdText })}
          </span>
        )
      case 'DOING':
        return (
          <>
            <YakitTag border={false} fullRadius size="small">
              {t('AITaskExecutionDetails.duration', { time: focusDurationText })}
            </YakitTag>
            <span className={styles['board-card-meta']}>
              {t('AITaskExecutionDetails.startOngoing', { time: startText })}
            </span>
          </>
        )
      case 'DONE':
        return (
          <>
            <YakitTag border={false} fullRadius size="small">
              {t('AITaskExecutionDetails.duration', { time: focusDurationText })}
            </YakitTag>
            <BoardCardTimeRange
              startLabel={t('AITaskExecutionDetails.labelStart')}
              startTime={startText}
              endLabel={t('AITaskExecutionDetails.labelEnd')}
              endTime={endText}
            />
          </>
        )
      case 'SKIPPED':
        return (
          <>
            <YakitTag border={false} fullRadius size="small">
              {t('AITaskExecutionDetails.survival', { time: survivalDurationText })}
            </YakitTag>
            <BoardCardTimeRange
              startLabel={t('AITaskExecutionDetails.labelCreated')}
              startTime={createdText}
              endLabel={t('AITaskExecutionDetails.labelSkipped')}
              endTime={endText}
            />
          </>
        )
      case 'DELETED':
        return (
          <>
            <YakitTag border={false} fullRadius size="small">
              {t('AITaskExecutionDetails.survival', { time: survivalDurationText })}
            </YakitTag>
            <BoardCardTimeRange
              startLabel={t('AITaskExecutionDetails.labelCreated')}
              startTime={createdText}
              endLabel={t('AITaskExecutionDetails.labelDeleted')}
              endTime={endText}
            />
          </>
        )
      default:
        return null
    }
  }

  return (
    <div
      role="listitem"
      className={classNames(styles['board-todo-card'], { [styles['board-todo-card-muted']]: isMuted })}
    >
      {!!item.content && (
        <div className={styles['board-card-desc']} title={item.content}>
          {item.content}
        </div>
      )}
      <div className={styles['board-card-footer']}>{renderFooter()}</div>
    </div>
  )
}

/** 任务统计看板：待处理 / 运行中 / 已完成 / 已跳过·已删除 */
export const AITaskBoard: React.FC<AITaskBoardProps> = React.memo(({ columns, className }) => {
  const { t } = useI18nNamespaces(['aiAgent'])
  return (
    <div role="region" aria-label={t('AITaskBoard.title')} className={classNames(styles['ai-task-board'], className)}>
      {columns.map((column) => (
        <div key={column.key} className={styles['todo-list-wrapper']}>
          <div className={styles['todo-list-header']}>
            <span
              className={classNames(styles['todo-column-icon'], {
                [styles['todo-column-icon-spin']]: column.key === 'doing' && column.items.length > 0,
              })}
            >
              {column.icon}
            </span>
            <span className={styles['todo-title']}>{column.title}</span>
            <YakitTag border={false} fullRadius size="small">
              {column.items.length}
            </YakitTag>
          </div>
          <div
            role="list"
            aria-label={typeof column.title === 'string' ? column.title : column.key}
            className={styles['todo-list']}
          >
            {!column.items.length && <span className={styles['board-card-meta']}>{t('AITaskBoard.emptyColumn')}</span>}
            {column.items.map((item, index) => (
              <AITaskBoardTodoCard key={item.id || index} item={item} />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
})
