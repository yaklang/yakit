import React, { useEffect, useMemo, useState } from 'react'
import { Form } from 'antd'
import moment, { type Moment } from 'moment'
import { useDebounceFn, useMemoizedFn } from 'ahooks'
import { YakitButton } from '@/components/yakitUI/YakitButton/YakitButton'
import { YakitInput } from '@/components/yakitUI/YakitInput/YakitInput'
import { YakitInputNumber } from '@/components/yakitUI/YakitInputNumber/YakitInputNumber'
import { YakitSelect } from '@/components/yakitUI/YakitSelect/YakitSelect'
import { useI18nNamespaces } from '@/i18n/useI18nNamespaces'
import type { AIReActSchedule, AIStartParams } from '../../../ai-re-act/hooks/grpcApi'
import { grpcCreateAIReActSchedule, grpcPreviewAIReActScheduleTimes, grpcUpdateAIReActSchedule } from '../utils'
import styles from './ScheduledTasksForm.module.scss'
import { YakitAlert } from '@/components/yakitUI/YakitAlert/YakitAlert'
import type { FrequencyPreset, ScheduledTasksFormProps, ScheduleFormValues } from './type'
import { YakitDatePicker } from '@/components/yakitUI/YakitDatePicker/YakitDatePicker'
import { formatAIAgentSetting } from '../../utils'
import useAIAgentDispatcher from '../../useContext/useDispatcher'
import { yakitNotify } from '@/utils/notification'

const unixNumber = (value?: number | string) => Number(value || 0)

const formatTime = (value?: number | string) => {
  const timestamp = unixNumber(value)
  return timestamp > 0 ? moment.unix(timestamp).format('YYYY-MM-DD HH:mm') : '-'
}

const formatCompactTime = (value?: number | string) => {
  const timestamp = unixNumber(value)
  return timestamp > 0 ? moment.unix(timestamp).format('MM-DD HH:mm') : '-'
}

export const frequencyToRRule = (frequency: FrequencyPreset, startAt: Moment, intervalMinutes = 5) => {
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

const ScheduledTasksForm: React.FC<ScheduledTasksFormProps> = React.memo((props) => {
  const { editing, onClose, onSuccess } = props
  const { t, i18nRefresh } = useI18nNamespaces(['aiAgent', 'yakitUi'])

  const { getSetting } = useAIAgentDispatcher()

  const [form] = Form.useForm<ScheduleFormValues>()
  const [saving, setSaving] = useState(false)
  const [previewTimes, setPreviewTimes] = useState<Array<number | string>>([])

  const frequency = Form.useWatch('Frequency', form)
  const intervalMinutes = Form.useWatch('IntervalMinutes', form)
  const startAt = Form.useWatch('StartAt', form)

  const getTimezone = useMemoizedFn(() => Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC')

  useEffect(() => {
    if (editing) {
      form.setFieldsValue({
        Name: editing.Name,
        Prompt: editing.Payload.Prompt,
        Frequency: rruleToFrequency(editing.Schedule.RRule),
        IntervalMinutes: rruleToIntervalMinutes(editing.Schedule.RRule),
        StartAt: moment.unix(unixNumber(editing.Schedule.StartAt)),
        TargetMode: (editing.TargetMode as ScheduleFormValues['TargetMode']) || 'new_session_per_run',
      })
    } else {
      form.setFieldsValue({
        Name: '',
        Prompt: '',
        Frequency: 'daily',
        IntervalMinutes: 5,
        StartAt: moment().add(5, 'minutes').startOf('minute'),
        TargetMode: 'new_session_per_run',
      })
    }
  }, [])

  // 手动新建只有「每次新建会话」；编辑从会话创建的 continue_session 任务时，
  // 额外展示其原模式，避免保存时把任务静默改成 new_session_per_run。
  const targetModeOptions = useMemo(() => {
    const options: Array<{ value: ScheduleFormValues['TargetMode']; label: string }> = [
      { value: 'new_session_per_run', label: t('AIScheduledTasks.newSessionPerRun') },
    ]
    if (editing?.TargetMode === 'continue_session') {
      options.unshift({ value: 'continue_session', label: t('AIScheduledTasks.continueSession') })
    }
    return options
  }, [editing?.TargetMode, i18nRefresh])

  // 预览请求防抖：表单值变化后 250ms 内不再重复请求
  const fetchPreviewTimes = useDebounceFn(
    useMemoizedFn(() => {
      if (!frequency || !startAt) {
        setPreviewTimes([])
        return
      }
      grpcPreviewAIReActScheduleTimes(
        {
          Schedule: {
            RRule: frequencyToRRule(frequency, startAt, intervalMinutes),
            Timezone: getTimezone(),
            StartAt: startAt.unix(),
          },
          Count: 3,
          AfterTimestamp: 0,
        },
        true,
      )
        .then((response) => setPreviewTimes(response.Timestamps || []))
        .catch(() => setPreviewTimes([]))
    }),
    { wait: 500 },
  ).run

  useEffect(() => {
    fetchPreviewTimes()
  }, [frequency, intervalMinutes, startAt])

  const saveSchedule = useMemoizedFn(async (values: ScheduleFormValues) => {
    setSaving(true)
    try {
      const baseParams: AIStartParams =
        editing?.Payload.StartParams || formatAIAgentSetting(getSetting()) || ({} as AIStartParams)

      const schedule: AIReActSchedule = {
        UUID: editing?.UUID || '',
        Name: values.Name.trim(),
        Status: editing?.Status === 'paused' ? 'paused' : 'active',
        TargetMode: values.TargetMode,
        // 编辑 continue_session 任务时原样保留关联会话；切换为独立模式则清空
        TargetSessionID: values.TargetMode === 'continue_session' ? editing?.TargetSessionID || '' : '',
        // 记录任务创建来源的会话，仅信息性字段，编辑时保留
        CreatedFromSessionID: editing?.CreatedFromSessionID || '',
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
          Timezone: getTimezone(),
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
      yakitNotify('success', t(editing ? 'AIScheduledTasks.updated' : 'AIScheduledTasks.created'))
      onSuccess()
    } finally {
      setSaving(false)
    }
  })

  const submitForm = useMemoizedFn(async () => {
    if (saving) return
    form.validateFields().then((values) => {
      saveSchedule(values)
    })
  })

  return (
    <>
      <YakitAlert className={styles['alter-notice']} description={t('AIScheduledTasks.runtimeNotice')} />
      <div className={styles['scheduled-tasks-form']}>
        <Form form={form} layout="vertical" preserve={false}>
          <Form.Item name="Name" label={t('AIScheduledTasks.name')} rules={[{ required: true }]}>
            <YakitInput maxLength={80} placeholder={t('AIScheduledTasks.namePlaceholder')} />
          </Form.Item>
          <Form.Item name="Prompt" label={t('AIScheduledTasks.prompt')} rules={[{ required: true }]}>
            <YakitInput.TextArea
              rows={5}
              showCount
              maxLength={2000}
              placeholder={t('AIScheduledTasks.promptPlaceholder')}
            />
          </Form.Item>
          <div className={styles['form-row']}>
            <Form.Item name="Frequency" label={t('AIScheduledTasks.frequency')} rules={[{ required: true }]}>
              <YakitSelect
                options={(['once', 'minutes', 'hourly', 'daily', 'weekdays', 'weekly'] as FrequencyPreset[]).map(
                  (value) => ({
                    value,
                    label: t(`AIScheduledTasks.frequencyOptions.${value}`),
                  }),
                )}
              />
            </Form.Item>
            <Form.Item name="StartAt" label={t('AIScheduledTasks.startAt')} rules={[{ required: true }]}>
              <YakitDatePicker showTime showExtraFooter={true} format="YYYY-MM-DD HH:mm" allowClear={false} />
            </Form.Item>
          </div>
          {frequency === 'minutes' && (
            <Form.Item
              name="IntervalMinutes"
              label={t('AIScheduledTasks.intervalMinutes')}
              rules={[{ required: true, type: 'number', min: 1, max: 10080 }]}
            >
              <YakitInputNumber min={1} max={10080} precision={0} style={{ width: '100%' }} />
            </Form.Item>
          )}
          <Form.Item name="TargetMode" label={t('AIScheduledTasks.targetMode')} rules={[{ required: true }]}>
            <YakitSelect options={targetModeOptions} />
          </Form.Item>
          <div className={styles['preview']}>
            <div>{t('AIScheduledTasks.preview')}</div>
            {previewTimes.length > 0
              ? previewTimes.map((item) => <span key={String(item)}>{formatTime(item)}</span>)
              : t('AIScheduledTasks.noPreview')}
          </div>
        </Form>
      </div>
      <div className={styles['button-group']}>
        <YakitButton type="outline2" size="large" onClick={onClose}>
          {t('AIScheduledTasks.cancel')}
        </YakitButton>
        <YakitButton type="primary" size="large" loading={saving} onClick={submitForm}>
          {t('AIScheduledTasks.save')}
        </YakitButton>
      </div>
    </>
  )
})

export default ScheduledTasksForm
