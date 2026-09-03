import React, { useEffect, useState } from 'react'
import { useCreation, useMemoizedFn, useUpdateEffect } from 'ahooks'
import moment from 'moment'
import type { AISession } from '../../type/aiChat'
import { grpcQueryAISession } from '../../grpc'
import { getSessionDisplayTitle } from '../../historyChat/source'
import { YakitButton } from '@/components/yakitUI/YakitButton/YakitButton'
import { YakitTag } from '@/components/yakitUI/YakitTag/YakitTag'
import type { YakitTagColor } from '@/components/yakitUI/YakitTag/YakitTagType'
import { useI18nNamespaces } from '@/i18n/useI18nNamespaces'
import { Tooltip } from 'antd'
import {
  OutlineChevronleftIcon,
  OutlineDocumenttextIcon,
  OutlineDocumentIcon,
  OutlineTagIcon,
  OutlineInformationcircleIcon,
  OutlinePencilaltIcon,
  OutlinePlayIcon,
  OutlinePauseIcon,
  OutlineTrashIcon,
  OutlineExternallinkIcon,
  OutlineMessageCirclePlusIcon,
} from '@/assets/icon/outline'
import type { AIReActSchedule } from '../../../ai-re-act/hooks/grpcApi'
import { grpcGetAIReActSchedule, grpcDeleteAIReActSchedule, grpcSetAIReActScheduleEnabled } from '../utils'
import { yakitNotify } from '@/utils/notification'
import { YakitModalConfirm } from '@/components/yakitUI/YakitModal/YakitModalConfirm'
import styles from './AIScheduledTasksDetail.module.scss'
import classNames from 'classnames'
import type { AIScheduledTasksDetailProps } from './type'
import useAIAgentDispatcher from '../../useContext/useDispatcher'

const scheduleStatusColor: Record<string, YakitTagColor> = {
  active: 'success',
  paused: 'warning',
  completed: 'info',
}

const scheduleOutcomeColor: Record<string, YakitTagColor> = {
  succeeded: 'success',
  failed: 'danger',
  skipped: 'warning',
  cancelled: 'warning',
  interrupted: 'warning',
  needs_attention: 'warning',
  running: 'warning',
}

const formatTime = (timestamp?: number) => {
  return timestamp && timestamp > 0 ? moment.unix(timestamp).format('YYYY-MM-DD HH:mm') : '-'
}

const hasTimestamp = (value?: number) => Boolean(value && value > 0)

interface DetailRowProps {
  label: React.ReactNode
  children: React.ReactNode
  multiline?: boolean
}

const getNodeText = (node: React.ReactNode): string => {
  if (node === null || node === undefined || typeof node === 'boolean') return ''
  if (typeof node === 'string' || typeof node === 'number') return String(node)
  return ''
}

const DetailRow = ({ label, children, multiline = false }: DetailRowProps) => {
  const labelText = getNodeText(label)
  const valueText = getNodeText(children)
  return (
    <div className={classNames(styles['detail-row'], { [styles['detail-row-multiline']]: multiline })}>
      <span className={styles['detail-row-label']} title={labelText}>
        {label}
      </span>
      <div className={styles['detail-row-value']} title={valueText}>
        {children}
      </div>
    </div>
  )
}

const AIScheduledTasksDetail: React.FC<AIScheduledTasksDetailProps> = React.memo((props) => {
  const { initialSchedule, onClose, onDataChange, onEdit, onRunNow, onDeleteAfter } = props
  const { t } = useI18nNamespaces(['aiAgent', 'yakitUi'])
  const { setSetting, setActiveChat } = useAIAgentDispatcher()
  const [schedule, setSchedule] = useState<AIReActSchedule>(initialSchedule)
  const [relatedSession, setRelatedSession] = useState<AISession>()
  const [toggling, setToggling] = useState(false)
  const [deleting, setDeleting] = useState(false)

  // 编辑保存 / 列表行启停后，父组件会传入刷新后的 initialSchedule；
  // useState 只在挂载时取初值，这里同步 prop 变化，避免详情继续展示旧数据
  useUpdateEffect(() => {
    setSchedule(initialSchedule)
  }, [initialSchedule])

  const linkedSessionID = useCreation(() => {
    return schedule.TargetMode === 'continue_session' ? schedule.TargetSessionID || '' : ''
  }, [schedule.TargetMode, schedule.TargetSessionID])

  useEffect(() => {
    if (!linkedSessionID) return
    let cancelled = false
    getItem().then((session) => {
      if (!cancelled) setRelatedSession(session)
    })
    return () => {
      cancelled = true
      setRelatedSession(undefined)
    }
  }, [linkedSessionID])

  const getItem = useMemoizedFn(() => {
    return grpcQueryAISession(
      {
        Pagination: { Page: 1, Limit: 1, OrderBy: 'last_used_at', Order: 'desc' },
        Filter: { SessionID: [linkedSessionID] },
      },
      true,
    )
      .then((response) => response.Data?.[0])
      .catch(() => undefined)
  })

  const handleClose = useMemoizedFn(() => {
    onClose()
  })

  const handleToggleEnabled = useMemoizedFn(async () => {
    if (toggling) return
    setToggling(true)
    try {
      // 1. 调用启停接口
      await grpcSetAIReActScheduleEnabled({ UUID: schedule.UUID, Enabled: schedule.Status !== 'active' })
      yakitNotify(
        'success',
        t(schedule.Status === 'active' ? 'AIScheduledTasks.pausedSuccess' : 'AIScheduledTasks.resumedSuccess'),
      )
      // 2. 启停成功后拉取最新任务数据，经 onDataChange 由父组件同步列表与选中项，prop 回流刷新详情
      const latest = await grpcGetAIReActSchedule({ UUID: schedule.UUID }, true)
      if (latest?.UUID) {
        onDataChange?.(latest)
      }
    } catch {
    } finally {
      setToggling(false)
    }
  })

  const handleEdit = useMemoizedFn(() => {
    onEdit?.(schedule)
  })

  const handleRunNow = useMemoizedFn(() => {
    onRunNow?.(schedule)
  })

  const handleDelete = useMemoizedFn(() => {
    if (deleting) return
    // 删除不可恢复，先弹二次确认
    const m = YakitModalConfirm({
      type: 'white',
      width: 420,
      bodyStyle: { padding: '0 24px' },
      title: (modalT) => modalT('AIScheduledTasks.deleteScheduleConfirmTitle'),
      content: (modalT) => modalT('AIScheduledTasks.deleteScheduleConfirmContent', { name: schedule.Name }),
      onOkText: (modalT) => modalT('AIScheduledTasks.deleteScheduleConfirmOK'),
      onCancelText: (modalT) => modalT('AIScheduledTasks.cancel'),
      okButtonProps: { colors: 'danger', size: 'large' },
      cancelButtonProps: { size: 'large' },
      onOk: () => {
        m.destroy()
        void doDelete()
      },
    })
  })

  const doDelete = useMemoizedFn(async () => {
    if (deleting) return
    setDeleting(true)
    try {
      await grpcDeleteAIReActSchedule({ UUID: schedule.UUID })
      yakitNotify('success', t('YakitNotification.deleted'))
      // 删除成功后通知父组件刷新列表并关闭详情
      await onDeleteAfter?.(schedule)
      onClose()
    } catch {
    } finally {
      setTimeout(() => {
        setDeleting(false)
      }, 200)
    }
  })

  const openRelatedChat = useMemoizedFn(() => {
    if (!relatedSession) return
    setSetting?.((old) => ({
      ...old,
      SyncPerceptionTrigger: relatedSession.StartParams?.SyncPerceptionTrigger ?? false,
      EnablePlan: relatedSession.StartParams?.EnablePlan ?? false,
      DisableMemoryTriage: relatedSession.StartParams?.DisableMemoryTriage ?? false,
      Strategy: {
        EnableMultiAgent: relatedSession.StartParams?.Strategy?.EnableMultiAgent ?? false,
        EnableGoalMode: relatedSession.StartParams?.Strategy?.EnableGoalMode ?? false,
        GoalMinIterations: relatedSession.StartParams?.Strategy?.GoalMinIterations ?? 0,
        MaxSubAgents: relatedSession.StartParams?.Strategy?.MaxSubAgents ?? 0,
      },
    }))
    setActiveChat?.(relatedSession)
  })

  const isCompleted = schedule.Status === 'completed'

  const hasOriginalRequest = useCreation(() => {
    return (
      Boolean(schedule.OriginalRequest?.trim()) && schedule.OriginalRequest?.trim() !== schedule.Payload.Prompt.trim()
    )
  }, [schedule.OriginalRequest, schedule.Payload.Prompt])

  const relatedSessionTitle = useCreation(() => {
    return (relatedSession && (getSessionDisplayTitle(relatedSession) || relatedSession.question)) || '-'
  }, [relatedSession])

  const showRelatedChatLink = Boolean(linkedSessionID && relatedSession)

  // 最近执行相关派生状态
  const isExecutionRunning = useCreation(
    () => hasTimestamp(schedule.LastStartedAt) && !hasTimestamp(schedule.LastFinishedAt),
    [schedule.LastStartedAt, schedule.LastFinishedAt],
  )
  const executionOutcome = useCreation(
    () => (isExecutionRunning ? 'running' : schedule.LastOutcome),
    [isExecutionRunning, schedule.LastOutcome],
  )
  const hasLastExecution = useCreation(
    () =>
      Boolean(executionOutcome) ||
      hasTimestamp(schedule.LastRunAt) ||
      hasTimestamp(schedule.LastStartedAt) ||
      hasTimestamp(schedule.LastFinishedAt) ||
      Boolean(schedule.LastSkipReason) ||
      Boolean(schedule.LastError),
    [
      executionOutcome,
      schedule.LastRunAt,
      schedule.LastStartedAt,
      schedule.LastFinishedAt,
      schedule.LastSkipReason,
      schedule.LastError,
    ],
  )

  return (
    <div className={styles['detail-overlay']}>
      <div className={styles['detail-header']}>
        <YakitButton type="text2" size="small" icon={<OutlineChevronleftIcon />} onClick={handleClose}>
          <span className={styles['detail-header-back']}>{t('AIScheduledTasks.taskIntro')}</span>
        </YakitButton>
        <div className={styles['detail-header-actions']}>
          <Tooltip
            title={
              isCompleted
                ? t('AIScheduledTasks.completedNoToggle')
                : schedule.Status === 'active'
                  ? t('AIScheduledTasks.pause')
                  : t('AIScheduledTasks.resume')
            }
          >
            <YakitButton
              type="text2"
              size="small"
              icon={schedule.Status === 'active' ? <OutlinePauseIcon /> : <OutlinePlayIcon />}
              loading={toggling}
              disabled={isCompleted || toggling}
              onClick={handleToggleEnabled}
            />
          </Tooltip>
          <Tooltip title={t('YakitButton.edit')}>
            <YakitButton type="text2" size="small" icon={<OutlinePencilaltIcon />} onClick={handleEdit} />
          </Tooltip>
          <Tooltip title={t('AIScheduledTasks.runNow')}>
            <YakitButton type="text2" size="small" icon={<OutlineMessageCirclePlusIcon />} onClick={handleRunNow} />
          </Tooltip>
          {showRelatedChatLink && (
            <Tooltip title={t('AIScheduledTasks.openChat')}>
              <YakitButton type="text2" size="small" icon={<OutlineExternallinkIcon />} onClick={openRelatedChat} />
            </Tooltip>
          )}
          <Tooltip title={t('YakitButton.delete')}>
            <YakitButton
              type="text2"
              size="small"
              icon={<OutlineTrashIcon />}
              loading={deleting}
              disabled={deleting}
              onClick={handleDelete}
            />
          </Tooltip>
        </div>
      </div>
      <div className={styles['detail-content']}>
        <section className={classNames(styles['detail-section'], styles['detail-name-section'])}>
          <div className={styles['detail-section-title']}>
            <OutlineTagIcon className={styles['detail-section-icon']} />
            <span>{t('AIScheduledTasks.taskName')}</span>
          </div>
          <div className={styles['detail-name-card']}>
            <div className={styles['detail-name']} title={schedule.Name}>
              {schedule.Name}
            </div>
            <YakitTag size="small" color={scheduleStatusColor[schedule.Status]} fullRadius>
              {t(`AIScheduledTasks.${schedule.Status}`)}
            </YakitTag>
          </div>
        </section>

        <section className={styles['detail-section']}>
          <div className={styles['detail-section-title']}>
            <OutlineDocumenttextIcon className={styles['detail-section-icon']} />
            <span>{t('AIScheduledTasks.prompt')}</span>
          </div>
          <div className={styles['detail-panel']}>{schedule.Payload.Prompt}</div>
        </section>

        {hasOriginalRequest && (
          <section className={styles['detail-section']}>
            <div className={styles['detail-section-title']}>
              <OutlineDocumentIcon className={styles['detail-section-icon']} />
              <span>{t('AIScheduledTasks.originalRequest')}</span>
            </div>
            <div className={styles['detail-panel']}>{schedule.OriginalRequest}</div>
          </section>
        )}

        <section className={styles['detail-section']}>
          <div className={styles['detail-section-title']}>
            <OutlineInformationcircleIcon className={styles['detail-section-icon']} />
            <span>{t('AIScheduledTasks.detail')}</span>
          </div>
          <div className={styles['detail-card']}>
            <DetailRow label={t('AIScheduledTasks.targetMode')}>
              {schedule.TargetMode === 'continue_session'
                ? t('AIScheduledTasks.continueSession')
                : t('AIScheduledTasks.newSessionPerRun')}
            </DetailRow>
            {schedule.TargetMode === 'continue_session' && (
              <DetailRow label={t('AIScheduledTasks.relatedChat')}>
                <div className={styles['detail-related-chat']}>
                  <span title={relatedSessionTitle}>{relatedSessionTitle}</span>
                  {showRelatedChatLink && (
                    <Tooltip title={t('AIScheduledTasks.openChat')}>
                      <YakitButton
                        type="text2"
                        size="small"
                        icon={<OutlineExternallinkIcon />}
                        onClick={openRelatedChat}
                      />
                    </Tooltip>
                  )}
                </div>
              </DetailRow>
            )}
            <DetailRow label={t('AIScheduledTasks.timezone')}>{schedule.Schedule.Timezone || '-'}</DetailRow>
            <DetailRow label={t('AIScheduledTasks.nextRun')}>{formatTime(schedule.NextRunAt)}</DetailRow>
          </div>
        </section>

        {hasLastExecution && (
          <section className={styles['detail-section']}>
            <div className={styles['detail-section-title']}>
              <OutlineInformationcircleIcon className={styles['detail-section-icon']} />
              <span>{t('AIScheduledTasks.lastExecution')}</span>
            </div>
            <div className={styles['detail-card']}>
              {hasTimestamp(schedule.LastRunAt) && (
                <DetailRow label={t('AIScheduledTasks.triggeredAt')}>{formatTime(schedule.LastRunAt)}</DetailRow>
              )}
              {hasTimestamp(schedule.LastStartedAt) && (
                <DetailRow label={t('AIScheduledTasks.startedAt')}>{formatTime(schedule.LastStartedAt)}</DetailRow>
              )}
              {executionOutcome && (
                <DetailRow label={t('AIScheduledTasks.executionResult')}>
                  <YakitTag size="small" color={scheduleOutcomeColor[executionOutcome] || undefined}>
                    {t(`AIScheduledTasks.outcome.${executionOutcome}`, {
                      defaultValue: executionOutcome,
                    })}
                  </YakitTag>
                </DetailRow>
              )}
              {hasTimestamp(schedule.LastFinishedAt) && (
                <DetailRow
                  label={t(
                    schedule.LastOutcome === 'skipped'
                      ? 'AIScheduledTasks.skippedAt'
                      : schedule.LastOutcome === 'succeeded'
                        ? 'AIScheduledTasks.finishedAt'
                        : 'AIScheduledTasks.endedAt',
                  )}
                >
                  {formatTime(schedule.LastFinishedAt)}
                </DetailRow>
              )}
              {schedule.LastOutcome === 'skipped' && schedule.LastSkipReason && (
                <DetailRow label={t('AIScheduledTasks.skipReasonTitle')} multiline>
                  {t(`AIScheduledTasks.skipReason.${schedule.LastSkipReason}`, {
                    defaultValue: schedule.LastSkipReason,
                  })}
                </DetailRow>
              )}
              {/* 运行失败/运行被强制中断/需要人工介入 */}
              {['failed', 'interrupted', 'needs_attention'].includes(schedule.LastOutcome || '') &&
                schedule.LastError && (
                  <DetailRow label={t('AIScheduledTasks.lastError')} multiline>
                    {schedule.LastError}
                  </DetailRow>
                )}
              {schedule.Status === 'paused' && schedule.PauseReason && (
                <DetailRow label={t('AIScheduledTasks.pauseReasonTitle')} multiline>
                  {schedule.PauseReason}
                </DetailRow>
              )}
            </div>
          </section>
        )}
      </div>
    </div>
  )
})

export default AIScheduledTasksDetail
