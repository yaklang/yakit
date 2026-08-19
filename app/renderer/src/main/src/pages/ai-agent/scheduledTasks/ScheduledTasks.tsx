import { type ReactNode, useEffect, useMemo, useState } from 'react'
import { DatePicker, Form, Tooltip } from 'antd'
import classNames from 'classnames'
import moment, { type Moment } from 'moment'
import { useMemoizedFn } from 'ahooks'
import {
  OutlineChevronleftIcon,
  OutlineExternallinkIcon,
  OutlinePencilaltIcon,
  OutlinePlayIcon,
  OutlinePlusIcon,
  OutlineRefreshIcon,
  OutlineSearchIcon,
  OutlineTrashIcon,
} from '@/assets/icon/outline'
import { YakitButton } from '@/components/yakitUI/YakitButton/YakitButton'
import { YakitEmpty } from '@/components/yakitUI/YakitEmpty/YakitEmpty'
import { YakitInput } from '@/components/yakitUI/YakitInput/YakitInput'
import { YakitInputNumber } from '@/components/yakitUI/YakitInputNumber/YakitInputNumber'
import { YakitModal } from '@/components/yakitUI/YakitModal/YakitModal'
import { YakitPopconfirm } from '@/components/yakitUI/YakitPopconfirm/YakitPopconfirm'
import { YakitRoundCornerTag } from '@/components/yakitUI/YakitRoundCornerTag/YakitRoundCornerTag'
import { YakitSelect } from '@/components/yakitUI/YakitSelect/YakitSelect'
import { YakitSpin } from '@/components/yakitUI/YakitSpin/YakitSpin'
import { YakitSwitch } from '@/components/yakitUI/YakitSwitch/YakitSwitch'
import { YakitCheckableTag } from '@/components/yakitUI/YakitTag/YakitCheckableTag'
import { YakitTag } from '@/components/yakitUI/YakitTag/YakitTag'
import { useI18nNamespaces } from '@/i18n/useI18nNamespaces'
import type { AIReActSchedule, AIReActScheduleTargetMode, AIStartParams } from '@/pages/ai-re-act/hooks/grpcApi'
import { yakitNotify } from '@/utils/notification'
import emiter from '@/utils/eventBus/eventBus'
import { SwitchAIAgentTabEventEnum } from '../defaultConstant'
import type { AISession } from '../type/aiChat'
import useAIAgentStore from '../useContext/useStore'
import useAIAgentDispatcher from '../useContext/useDispatcher'
import { formatAIAgentSetting } from '../utils'
import {
  grpcCreateAIReActSchedule,
  grpcDeleteAIReActSchedule,
  grpcPreviewAIReActScheduleTimes,
  grpcQueryAIReActSchedules,
  grpcQueryAISession,
  grpcRunAIReActScheduleNow,
  grpcSetAIReActScheduleEnabled,
  grpcUpdateAIReActSchedule,
} from '../grpc'
import styles from './ScheduledTasks.module.scss'

type FrequencyPreset = 'once' | 'minutes' | 'hourly' | 'daily' | 'weekdays' | 'weekly'
type ScheduleFilter = 'all' | 'active' | 'paused'

interface ScheduleFormValues {
  Name: string
  Prompt: string
  Frequency: FrequencyPreset
  IntervalMinutes: number
  StartAt: Moment
  TargetMode: AIReActScheduleTargetMode
}

interface DetailRowProps {
  label: ReactNode
  children: ReactNode
  multiline?: boolean
}

const FILTERS: ScheduleFilter[] = ['all', 'active', 'paused']

const unixNumber = (value?: number | string) => Number(value || 0)
const hasTimestamp = (value?: number | string) => unixNumber(value) > 0

const formatTime = (value?: number | string) => {
  const timestamp = unixNumber(value)
  return timestamp > 0 ? moment.unix(timestamp).format('YYYY-MM-DD HH:mm') : '-'
}

const formatCompactTime = (value?: number | string) => {
  const timestamp = unixNumber(value)
  return timestamp > 0 ? moment.unix(timestamp).format('MM-DD HH:mm') : '-'
}

const frequencyToRRule = (frequency: FrequencyPreset, startAt: Moment, intervalMinutes = 5) => {
  switch (frequency) {
    case 'once':
      return 'RRULE:FREQ=DAILY;COUNT=1'
    case 'minutes':
      return `RRULE:FREQ=MINUTELY;INTERVAL=${Math.max(1, Math.floor(intervalMinutes || 5))}`
    case 'hourly':
      return 'RRULE:FREQ=HOURLY;INTERVAL=1'
    case 'weekdays':
      return 'RRULE:FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR'
    case 'weekly': {
      const weekdays = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA']
      return `RRULE:FREQ=WEEKLY;BYDAY=${weekdays[startAt.day()]}`
    }
    default:
      return 'RRULE:FREQ=DAILY;INTERVAL=1'
  }
}

const rruleToFrequency = (rrule: string): FrequencyPreset => {
  const normalized = rrule.toUpperCase()
  if (normalized.includes('COUNT=1')) return 'once'
  if (normalized.includes('FREQ=MINUTELY')) return 'minutes'
  if (normalized.includes('FREQ=HOURLY')) return 'hourly'
  if (normalized.includes('BYDAY=MO,TU,WE,TH,FR')) return 'weekdays'
  if (normalized.includes('FREQ=WEEKLY')) return 'weekly'
  return 'daily'
}

const rruleToIntervalMinutes = (rrule: string) => {
  const matched = rrule.toUpperCase().match(/(?:^|;)INTERVAL=(\d+)/)
  return Math.max(1, Number(matched?.[1] || 5))
}

const getStatusTagColor = (status: AIReActSchedule['Status']): 'success' | 'warning' | undefined => {
  if (status === 'active') return 'success'
  if (status === 'paused') return 'warning'
  return undefined
}

const getOutcomeTagColor = (outcome?: string): 'success' | 'danger' | 'warning' | undefined => {
  if (outcome === 'succeeded') return 'success'
  if (outcome === 'skipped' || outcome === 'running') return 'warning'
  if (['failed', 'interrupted', 'needs_attention'].includes(outcome || '')) return 'danger'
  return undefined
}

const DetailRow = ({ label, children, multiline = false }: DetailRowProps) => (
  <div className={classNames(styles['detail-row'], { [styles['detail-row-multiline']]: multiline })}>
    <span className={styles['detail-row-label']}>{label}</span>
    <div className={styles['detail-row-value']}>{children}</div>
  </div>
)

const ScheduledTasks = () => {
  const { t } = useI18nNamespaces(['aiAgent'])
  const { activeChat } = useAIAgentStore()
  const { getSetting, setActiveChat, setSetting } = useAIAgentDispatcher()
  const [form] = Form.useForm<ScheduleFormValues>()
  const [schedules, setSchedules] = useState<AIReActSchedule[]>([])
  const [loading, setLoading] = useState(false)
  const [modalVisible, setModalVisible] = useState(false)
  const [editing, setEditing] = useState<AIReActSchedule>()
  const [saving, setSaving] = useState(false)
  const [previewTimes, setPreviewTimes] = useState<Array<number | string>>([])
  const [filter, setFilter] = useState<ScheduleFilter>('all')
  const [search, setSearch] = useState('')
  const [selectedUUID, setSelectedUUID] = useState('')
  const [operationUUID, setOperationUUID] = useState('')
  const [relatedSession, setRelatedSession] = useState<AISession>()
  const [relatedSessionLoading, setRelatedSessionLoading] = useState(false)
  const frequency = Form.useWatch('Frequency', form)
  const intervalMinutes = Form.useWatch('IntervalMinutes', form)
  const startAt = Form.useWatch('StartAt', form)

  const timezone = useMemo(() => Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC', [])
  const canContinueCurrentSession = Boolean(activeChat?.SessionID && !activeChat.isCreate)
  const selectedSchedule = useMemo(
    () => schedules.find((schedule) => schedule.UUID === selectedUUID),
    [schedules, selectedUUID],
  )
  const linkedSessionID = useMemo(() => {
    if (!selectedSchedule) return ''
    // CreatedFromSessionID 仅用于记录任务从哪里创建，不代表独立模式的固定关联会话。
    return selectedSchedule.TargetMode === 'continue_session' ? selectedSchedule.TargetSessionID || '' : ''
  }, [selectedSchedule])
  const filteredSchedules = useMemo(() => {
    const normalizedSearch = search.trim().toLocaleLowerCase()
    return schedules.filter((schedule) => {
      if (filter !== 'all' && schedule.Status !== filter) return false
      if (!normalizedSearch) return true
      return [schedule.Name, schedule.Payload.Prompt, schedule.OriginalRequest]
        .filter(Boolean)
        .some((value) => value?.toLocaleLowerCase().includes(normalizedSearch))
    })
  }, [filter, schedules, search])

  const getFrequencyLabel = useMemoizedFn((schedule: AIReActSchedule) => {
    const preset = rruleToFrequency(schedule.Schedule.RRule)
    const scheduleStartAt = moment.unix(unixNumber(schedule.Schedule.StartAt))
    const time = scheduleStartAt.format('HH:mm')
    switch (preset) {
      case 'once':
        return t('ScheduledTasks.frequencySummary.once', { time: formatTime(schedule.Schedule.StartAt) })
      case 'minutes':
        return t('ScheduledTasks.frequencySummary.minutes', {
          count: rruleToIntervalMinutes(schedule.Schedule.RRule),
        })
      case 'hourly':
        return t('ScheduledTasks.frequencySummary.hourly')
      case 'weekdays':
        return t('ScheduledTasks.frequencySummary.weekdays', { time })
      case 'weekly':
        return t('ScheduledTasks.frequencySummary.weekly', { weekday: scheduleStartAt.format('ddd'), time })
      default:
        return t('ScheduledTasks.frequencySummary.daily', { time })
    }
  })

  const loadData = useMemoizedFn(async (showLoading = true) => {
    if (showLoading) setLoading(true)
    try {
      const scheduleResponse = await grpcQueryAIReActSchedules(
        { Pagination: { Page: 1, Limit: 100, OrderBy: 'created_at', Order: 'desc' } },
        true,
      )
      setSchedules(scheduleResponse.Data || [])
    } catch (error) {
      yakitNotify('error', t('ScheduledTasks.loadFailed', { error: String(error) }))
    } finally {
      if (showLoading) setLoading(false)
    }
  })

  useEffect(() => {
    loadData()
    const timer = window.setInterval(() => loadData(false), 5000)
    return () => window.clearInterval(timer)
  }, [])

  useEffect(() => {
    if (selectedUUID && !schedules.some((schedule) => schedule.UUID === selectedUUID)) {
      setSelectedUUID('')
    }
  }, [schedules, selectedUUID])

  useEffect(() => {
    let cancelled = false
    setRelatedSession(undefined)
    if (!linkedSessionID) {
      setRelatedSessionLoading(false)
      return
    }
    setRelatedSessionLoading(true)
    grpcQueryAISession(
      {
        Pagination: { Page: 1, Limit: 1, OrderBy: 'last_used_at', Order: 'desc' },
        Filter: { SessionID: [linkedSessionID] },
      },
      true,
    )
      .then((response) => {
        if (!cancelled) setRelatedSession(response.Data?.[0])
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setRelatedSessionLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [linkedSessionID])

  useEffect(() => {
    if (!modalVisible || !frequency || !startAt) {
      setPreviewTimes([])
      return
    }
    const timer = window.setTimeout(() => {
      grpcPreviewAIReActScheduleTimes(
        {
          Schedule: {
            RRule: frequencyToRRule(frequency, startAt, intervalMinutes),
            Timezone: timezone,
            StartAt: startAt.unix(),
          },
          Count: 3,
        },
        true,
      )
        .then((response) => setPreviewTimes(response.Timestamps || []))
        .catch(() => setPreviewTimes([]))
    }, 250)
    return () => window.clearTimeout(timer)
  }, [frequency, intervalMinutes, modalVisible, startAt, timezone])

  const openCreate = useMemoizedFn(() => {
    setEditing(undefined)
    form.setFieldsValue({
      Name: '',
      Prompt: '',
      Frequency: 'daily',
      IntervalMinutes: 5,
      StartAt: moment().add(5, 'minutes').startOf('minute'),
      TargetMode: canContinueCurrentSession ? 'continue_session' : 'new_session_per_run',
    })
    setModalVisible(true)
  })

  const openEdit = useMemoizedFn((schedule: AIReActSchedule) => {
    setEditing(schedule)
    form.setFieldsValue({
      Name: schedule.Name,
      Prompt: schedule.Payload.Prompt,
      Frequency: rruleToFrequency(schedule.Schedule.RRule),
      IntervalMinutes: rruleToIntervalMinutes(schedule.Schedule.RRule),
      StartAt: moment.unix(unixNumber(schedule.Schedule.StartAt)),
      TargetMode: schedule.TargetMode,
    })
    setModalVisible(true)
  })

  const saveSchedule = useMemoizedFn(async (values: ScheduleFormValues) => {
    setSaving(true)
    try {
      const baseParams: AIStartParams = editing?.Payload.StartParams || formatAIAgentSetting(getSetting())
      const targetSessionID =
        values.TargetMode === 'continue_session' ? editing?.TargetSessionID || activeChat?.SessionID || '' : ''
      const schedule: AIReActSchedule = {
        UUID: editing?.UUID || '',
        Name: values.Name.trim(),
        Status: editing?.Status === 'paused' ? 'paused' : 'active',
        TargetMode: values.TargetMode,
        TargetSessionID: targetSessionID,
        CreatedFromSessionID: editing?.CreatedFromSessionID || activeChat?.SessionID || '',
        OriginalRequest: editing?.OriginalRequest || values.Prompt.trim(),
        Payload: {
          Prompt: values.Prompt.trim(),
          StartParams: {
            ...baseParams,
            ReviewPolicy: 'yolo',
            DisallowRequireForUserPrompt: true,
            AllowPlanUserInteract: false,
            UserQuery: '',
          },
          AttachedResourceInfos: editing?.Payload.AttachedResourceInfos || [],
          FocusModeLoop: editing?.Payload.FocusModeLoop || '',
        },
        Schedule: {
          RRule: frequencyToRRule(values.Frequency, values.StartAt, values.IntervalMinutes),
          Timezone: timezone,
          StartAt: values.StartAt.unix(),
        },
        MisfireGraceSeconds: editing?.MisfireGraceSeconds || 300,
        MaxRuntimeSeconds: editing?.MaxRuntimeSeconds || 7200,
      }
      if (editing) {
        await grpcUpdateAIReActSchedule({ Schedule: schedule }, true)
      } else {
        await grpcCreateAIReActSchedule({ Schedule: schedule }, true)
      }
      setModalVisible(false)
      yakitNotify('success', t(editing ? 'ScheduledTasks.updated' : 'ScheduledTasks.created'))
      await loadData(false)
    } catch (error) {
      yakitNotify('error', t('ScheduledTasks.saveFailed', { error: String(error) }))
      throw error
    } finally {
      setSaving(false)
    }
  })

  const submitForm = useMemoizedFn(async () => {
    const values = await form.validateFields()
    await saveSchedule(values)
  })

  const toggleSchedule = useMemoizedFn(async (schedule: AIReActSchedule, enabled: boolean) => {
    setOperationUUID(schedule.UUID)
    try {
      await grpcSetAIReActScheduleEnabled({ UUID: schedule.UUID, Enabled: enabled }, true)
      await loadData(false)
    } catch (error) {
      yakitNotify('error', t('ScheduledTasks.operationFailed', { error: String(error) }))
    } finally {
      setOperationUUID('')
    }
  })

  const runNow = useMemoizedFn(async (schedule: AIReActSchedule) => {
    setOperationUUID(schedule.UUID)
    try {
      await grpcRunAIReActScheduleNow({ UUID: schedule.UUID }, true)
      yakitNotify('success', t('ScheduledTasks.runQueued'))
      await loadData(false)
    } catch (error) {
      yakitNotify('error', t('ScheduledTasks.operationFailed', { error: String(error) }))
    } finally {
      setOperationUUID('')
    }
  })

  const deleteSchedule = useMemoizedFn(async (schedule: AIReActSchedule) => {
    setOperationUUID(schedule.UUID)
    try {
      await grpcDeleteAIReActSchedule({ UUID: schedule.UUID }, true)
      if (selectedUUID === schedule.UUID) setSelectedUUID('')
      await loadData(false)
    } catch (error) {
      yakitNotify('error', t('ScheduledTasks.operationFailed', { error: String(error) }))
    } finally {
      setOperationUUID('')
    }
  })

  const openRelatedChat = useMemoizedFn(() => {
    if (!relatedSession) return
    setSetting?.((old) => ({
      ...old,
      SyncPerceptionTrigger: relatedSession.StartParams?.SyncPerceptionTrigger ?? false,
      EnablePlan: relatedSession.StartParams?.EnablePlan ?? false,
      Strategy: {
        EnableMultiAgent: relatedSession.StartParams?.Strategy?.EnableMultiAgent ?? false,
        EnableGoalMode: relatedSession.StartParams?.Strategy?.EnableGoalMode ?? false,
        GoalMinIterations: relatedSession.StartParams?.Strategy?.GoalMinIterations ?? 0,
        MaxSubAgents: relatedSession.StartParams?.Strategy?.MaxSubAgents ?? 0,
      },
    }))
    setActiveChat?.(relatedSession)
    emiter.emit(
      'switchAIAgentTab',
      JSON.stringify({
        type: SwitchAIAgentTabEventEnum.SET_TAB_SHOW,
        params: { show: false },
      }),
    )
  })

  const resetFilter = useMemoizedFn(() => {
    setFilter('all')
    setSearch('')
  })

  const renderList = () => {
    if (!loading && schedules.length === 0) {
      return (
        <div className={styles['empty-wrapper']}>
          <YakitEmpty
            imageStyle={{ width: 120, height: 120, margin: '20px auto' }}
            title={t('ScheduledTasks.emptyTitle')}
            description={t('ScheduledTasks.emptyDescription')}
          >
            <YakitButton icon={<OutlinePlusIcon />} onClick={openCreate}>
              {t('ScheduledTasks.create')}
            </YakitButton>
          </YakitEmpty>
        </div>
      )
    }

    if (!loading && filteredSchedules.length === 0) {
      return (
        <div className={styles['empty-wrapper']}>
          <YakitEmpty
            imageStyle={{ width: 96, height: 96, margin: '12px auto' }}
            title={t('ScheduledTasks.emptyFilteredTitle')}
            description={t('ScheduledTasks.emptyFilteredDescription')}
          >
            <YakitButton type="outline1" onClick={resetFilter}>
              {t('ScheduledTasks.clearFilter')}
            </YakitButton>
          </YakitEmpty>
        </div>
      )
    }

    return (
      <div className={styles['list']}>
        {filteredSchedules.map((schedule) => (
          <div className={styles['list-item']} key={schedule.UUID} onClick={() => setSelectedUUID(schedule.UUID)}>
            <div className={styles['list-item-main']}>
              <div className={styles['list-item-title-row']}>
                <span
                  className={classNames(styles['status-dot'], styles[`status-dot-${schedule.Status}`])}
                  aria-hidden
                />
                <span className={styles['list-item-title']} title={schedule.Name}>
                  {schedule.Name}
                </span>
                <div className={styles['list-item-switch']} onClick={(event) => event.stopPropagation()}>
                  <YakitSwitch
                    size="small"
                    checked={schedule.Status === 'active'}
                    loading={operationUUID === schedule.UUID}
                    disabled={schedule.Status === 'completed' || operationUUID === schedule.UUID}
                    onChange={(checked) => toggleSchedule(schedule, checked)}
                  />
                </div>
              </div>
              <div className={styles['list-item-frequency']}>{getFrequencyLabel(schedule)}</div>
              <div className={styles['list-item-next-run']}>
                {t('ScheduledTasks.nextRunCompact', { time: formatCompactTime(schedule.NextRunAt) })}
              </div>
            </div>
          </div>
        ))}
      </div>
    )
  }

  const renderDetail = (schedule: AIReActSchedule) => {
    const hasOriginalRequest =
      Boolean(schedule.OriginalRequest?.trim()) && schedule.OriginalRequest?.trim() !== schedule.Payload.Prompt.trim()
    const isExecutionRunning =
      hasTimestamp(schedule.LastStartedAt) &&
      (!hasTimestamp(schedule.LastFinishedAt) ||
        unixNumber(schedule.LastStartedAt) > unixNumber(schedule.LastFinishedAt))
    const executionOutcome = isExecutionRunning ? 'running' : schedule.LastOutcome
    const hasLastExecution = Boolean(
      executionOutcome ||
      hasTimestamp(schedule.LastRunAt) ||
      hasTimestamp(schedule.LastStartedAt) ||
      hasTimestamp(schedule.LastFinishedAt) ||
      schedule.LastSkipReason ||
      schedule.LastError,
    )
    const relatedSessionTitle = relatedSession?.Title || relatedSession?.question || t('ScheduledTasks.chatUnavailable')

    return (
      <div className={styles['detail-view']}>
        <div className={styles['detail-toolbar']}>
          <div className={styles['detail-toolbar-title']}>
            <YakitButton type="text2" icon={<OutlineChevronleftIcon />} onClick={() => setSelectedUUID('')} />
            <span>{t('ScheduledTasks.detailTitle')}</span>
          </div>
          <div className={styles['detail-actions']}>
            <Tooltip
              title={
                schedule.Status === 'active' ? t('ScheduledTasks.pauseSchedule') : t('ScheduledTasks.enableSchedule')
              }
            >
              <div>
                <YakitSwitch
                  size="small"
                  checked={schedule.Status === 'active'}
                  loading={operationUUID === schedule.UUID}
                  disabled={schedule.Status === 'completed' || operationUUID === schedule.UUID}
                  onChange={(checked) => toggleSchedule(schedule, checked)}
                />
              </div>
            </Tooltip>
            <Tooltip title={t('ScheduledTasks.runNow')}>
              <YakitButton
                type="text2"
                icon={<OutlinePlayIcon />}
                loading={operationUUID === schedule.UUID}
                disabled={operationUUID === schedule.UUID}
                onClick={() => runNow(schedule)}
              />
            </Tooltip>
            <Tooltip title={t('ScheduledTasks.edit')}>
              <YakitButton
                type="text2"
                icon={<OutlinePencilaltIcon />}
                disabled={Boolean(operationUUID)}
                onClick={() => openEdit(schedule)}
              />
            </Tooltip>
            <YakitPopconfirm title={t('ScheduledTasks.deleteConfirm')} onConfirm={() => deleteSchedule(schedule)}>
              <YakitButton type="text2" danger icon={<OutlineTrashIcon />} disabled={Boolean(operationUUID)} />
            </YakitPopconfirm>
          </div>
        </div>

        <div className={styles['detail-content']}>
          <div className={styles['detail-summary']}>
            <YakitTag size="small" color={getStatusTagColor(schedule.Status)}>
              {t(`ScheduledTasks.status.${schedule.Status}`)}
            </YakitTag>
            <div className={styles['detail-name']} title={schedule.Name}>
              {schedule.Name}
            </div>
            <div className={styles['detail-frequency']}>{getFrequencyLabel(schedule)}</div>
          </div>

          <section className={styles['detail-section']}>
            <div className={styles['section-title']}>{t('ScheduledTasks.prompt')}</div>
            <div className={styles['instruction-panel']}>{schedule.Payload.Prompt}</div>
          </section>

          {hasOriginalRequest && (
            <section className={styles['detail-section']}>
              <div className={styles['section-title']}>{t('ScheduledTasks.originalRequest')}</div>
              <div className={styles['original-request-panel']}>{schedule.OriginalRequest}</div>
            </section>
          )}

          <section className={styles['detail-section']}>
            <div className={styles['section-title']}>{t('ScheduledTasks.details')}</div>
            <div className={styles['detail-card']}>
              <DetailRow label={t('ScheduledTasks.targetMode')}>
                {schedule.TargetMode === 'continue_session'
                  ? t('ScheduledTasks.continueSessionShort')
                  : t('ScheduledTasks.newSessionPerRunShort')}
              </DetailRow>
              {schedule.TargetMode === 'continue_session' && (
                <DetailRow label={t('ScheduledTasks.relatedChat')}>
                  <span title={relatedSessionTitle}>
                    {relatedSessionLoading ? t('ScheduledTasks.loading') : relatedSessionTitle}
                  </span>
                </DetailRow>
              )}
              <DetailRow label={t('ScheduledTasks.timezone')}>{schedule.Schedule.Timezone || timezone}</DetailRow>
              <DetailRow label={t('ScheduledTasks.nextExecution')}>{formatTime(schedule.NextRunAt)}</DetailRow>
            </div>
          </section>

          {hasLastExecution && (
            <section className={styles['detail-section']}>
              <div className={styles['section-title']}>{t('ScheduledTasks.lastExecution')}</div>
              <div className={styles['detail-card']}>
                {hasTimestamp(schedule.LastRunAt) && (
                  <DetailRow label={t('ScheduledTasks.triggeredAt')}>{formatTime(schedule.LastRunAt)}</DetailRow>
                )}
                {hasTimestamp(schedule.LastStartedAt) && (
                  <DetailRow label={t('ScheduledTasks.startedAt')}>{formatTime(schedule.LastStartedAt)}</DetailRow>
                )}
                {executionOutcome && (
                  <DetailRow label={t('ScheduledTasks.executionResult')}>
                    <YakitTag size="small" color={getOutcomeTagColor(executionOutcome)}>
                      {t(`ScheduledTasks.outcome.${executionOutcome}`, { defaultValue: executionOutcome })}
                    </YakitTag>
                  </DetailRow>
                )}
                {hasTimestamp(schedule.LastFinishedAt) && (
                  <DetailRow
                    label={t(
                      schedule.LastOutcome === 'skipped'
                        ? 'ScheduledTasks.skippedAt'
                        : schedule.LastOutcome === 'succeeded'
                          ? 'ScheduledTasks.finishedAt'
                          : 'ScheduledTasks.endedAt',
                    )}
                  >
                    {formatTime(schedule.LastFinishedAt)}
                  </DetailRow>
                )}
                {schedule.LastSkipReason && (
                  <DetailRow label={t('ScheduledTasks.skipReasonTitle')} multiline>
                    {t(`ScheduledTasks.skipReason.${schedule.LastSkipReason}`, {
                      defaultValue: schedule.LastSkipReason,
                    })}
                  </DetailRow>
                )}
                {(schedule.PauseReason || schedule.LastError) && (
                  <div className={styles['detail-warning']}>{schedule.PauseReason || schedule.LastError}</div>
                )}
              </div>
            </section>
          )}
        </div>

        {linkedSessionID && relatedSession && (
          <div className={styles['detail-footer']}>
            <YakitButton
              type="outline1"
              icon={<OutlineExternallinkIcon />}
              loading={relatedSessionLoading}
              disabled={!relatedSession || relatedSessionLoading}
              onClick={openRelatedChat}
            >
              {t('ScheduledTasks.openChat')}
            </YakitButton>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className={styles['scheduled-tasks']}>
      {selectedSchedule ? (
        renderDetail(selectedSchedule)
      ) : (
        <>
          <div className={styles['toolbar']}>
            <div className={styles['title-wrapper']}>
              <span className={styles['title']}>{t('ScheduledTasks.title')}</span>
              <YakitRoundCornerTag wrapperClassName={styles['count-tag']}>{schedules.length}</YakitRoundCornerTag>
            </div>
            <div className={styles['toolbar-actions']}>
              <Tooltip title={t('ScheduledTasks.refresh')}>
                <YakitButton type="text2" icon={<OutlineRefreshIcon />} onClick={() => loadData()} />
              </Tooltip>
              <YakitButton size="small" icon={<OutlinePlusIcon />} onClick={openCreate}>
                {t('ScheduledTasks.create')}
              </YakitButton>
            </div>
          </div>

          <div className={styles['filters']}>
            {FILTERS.map((item) => (
              <YakitCheckableTag
                key={item}
                checked={filter === item}
                onChange={(checked) => checked && setFilter(item)}
              >
                {t(`ScheduledTasks.filter.${item}`)}
              </YakitCheckableTag>
            ))}
          </div>

          <div className={styles['search-wrapper']}>
            <YakitInput
              allowClear
              value={search}
              prefix={<OutlineSearchIcon className={styles['search-icon']} />}
              placeholder={t('ScheduledTasks.searchPlaceholder')}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>

          <div className={styles['content']}>{renderList()}</div>
        </>
      )}

      {loading && (
        <div className={styles['loading']}>
          <YakitSpin spinning />
        </div>
      )}

      <YakitModal
        visible={modalVisible}
        type="white"
        width={560}
        title={t(editing ? 'ScheduledTasks.editTitle' : 'ScheduledTasks.createTitle')}
        okText={t('ScheduledTasks.save')}
        cancelText={t('ScheduledTasks.cancel')}
        confirmLoading={saving}
        onOk={submitForm}
        onCancel={() => setModalVisible(false)}
        destroyOnClose
      >
        <Form form={form} layout="vertical" preserve={false}>
          <Form.Item name="Name" label={t('ScheduledTasks.name')} rules={[{ required: true }]}>
            <YakitInput maxLength={80} placeholder={t('ScheduledTasks.namePlaceholder')} />
          </Form.Item>
          <Form.Item name="Prompt" label={t('ScheduledTasks.prompt')} rules={[{ required: true }]}>
            <YakitInput.TextArea rows={5} maxLength={10000} placeholder={t('ScheduledTasks.promptPlaceholder')} />
          </Form.Item>
          <div className={styles['form-row']}>
            <Form.Item name="Frequency" label={t('ScheduledTasks.frequency')} rules={[{ required: true }]}>
              <YakitSelect
                options={(['once', 'minutes', 'hourly', 'daily', 'weekdays', 'weekly'] as FrequencyPreset[]).map(
                  (value) => ({
                    value,
                    label: t(`ScheduledTasks.frequencyOptions.${value}`),
                  }),
                )}
              />
            </Form.Item>
            <Form.Item name="StartAt" label={t('ScheduledTasks.startAt')} rules={[{ required: true }]}>
              <DatePicker showTime format="YYYY-MM-DD HH:mm" allowClear={false} />
            </Form.Item>
          </div>
          {frequency === 'minutes' && (
            <Form.Item
              name="IntervalMinutes"
              label={t('ScheduledTasks.intervalMinutes')}
              rules={[{ required: true, type: 'number', min: 1, max: 10080 }]}
            >
              <YakitInputNumber min={1} max={10080} precision={0} style={{ width: '100%' }} />
            </Form.Item>
          )}
          <Form.Item name="TargetMode" label={t('ScheduledTasks.targetMode')} rules={[{ required: true }]}>
            <YakitSelect
              options={[
                {
                  value: 'continue_session',
                  label: t('ScheduledTasks.continueSession'),
                  disabled: !editing?.TargetSessionID && !canContinueCurrentSession,
                },
                { value: 'new_session_per_run', label: t('ScheduledTasks.newSessionPerRun') },
              ]}
            />
          </Form.Item>
          <div className={styles['preview']}>
            <div>{t('ScheduledTasks.preview')}</div>
            {previewTimes.length > 0
              ? previewTimes.map((item) => <span key={String(item)}>{formatTime(item)}</span>)
              : t('ScheduledTasks.noPreview')}
          </div>
          <div className={styles['notice']}>{t('ScheduledTasks.runtimeNotice')}</div>
        </Form>
      </YakitModal>
    </div>
  )
}

export default ScheduledTasks
