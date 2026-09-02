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
import { startAtToWallMoment, wallMomentToUnix } from './timezone'

const unixNumber = (value?: number | string) => Number(value || 0)

/** 粗校验 RRULE 前缀与 FREQ 字段；完整语法由引擎解析，预览区会即时反馈解析失败 */
const RRULE_PATTERN = /^RRULE:FREQ=(SECONDLY|MINUTELY|HOURLY|DAILY|WEEKLY|MONTHLY|YEARLY)(;.*)?$/i

const formatTime = (value?: number | string) => {
  const timestamp = unixNumber(value)
  return timestamp > 0 ? moment.unix(timestamp).format('YYYY-MM-DD HH:mm:ss') : '-'
}
/**
 * 兜底也是按每天一次的频率来处理，避免出现无法解析的情况
 */
export const frequencyToRRule = (
  frequency: FrequencyPreset,
  startAt: Moment,
  intervalMinutes = 5,
  customRRule = '',
) => {
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
    case 'daily':
      return 'RRULE:FREQ=DAILY;INTERVAL=1'
    case 'custom':
      return customRRule.trim() || ''
    default:
      return ''
  }
}

/**
 * 将 rrule 转换为频率类型；仅当规则与 frequencyToRRule 按预设生成的形式完全等价时才返回该预设
 * （多天每周、INTERVAL>1 的每天、带 BYMINUTE 的每小时等预设超集一律返回 custom），
 * 由表单回填原始规则，避免编辑保存时把规则静默改写成预设
 */
export const rruleToFrequency = (rrule: string): FrequencyPreset => {
  const normalized = (rrule || '')
    .trim()
    .toUpperCase()
    .replace(/^RRULE:/, '')
  const parts = new Map<string, string>()
  normalized
    .split(';')
    .filter(Boolean)
    .forEach((seg) => {
      const [key, value = ''] = seg.split('=')
      parts.set(key.trim(), value.trim())
    })
  const freq = parts.get('FREQ')
  const interval = parts.get('INTERVAL')
  const byday = parts.get('BYDAY')
  const count = parts.get('COUNT')
  const extraKeys = [...parts.keys()].filter((key) => key !== 'FREQ')
  const onlyHas = (...keys: string[]) =>
    extraKeys.length === keys.length && keys.every((key) => extraKeys.includes(key))
  const WEEKDAYS = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA']

  if (freq === 'DAILY' && onlyHas('COUNT') && count === '1') return 'once'
  if (freq === 'MINUTELY' && onlyHas('INTERVAL') && Number(interval) >= 1) return 'minutes'
  // RRULE 缺省 INTERVAL=1，裸 HOURLY/DAILY 按预设重新生成语义不变；裸 MINUTELY 缺省 1 分钟而表单回填 5，须走 custom
  if (freq === 'HOURLY' && extraKeys.length === 0) return 'hourly'
  if (freq === 'HOURLY' && onlyHas('INTERVAL') && interval === '1') return 'hourly'
  if (freq === 'WEEKLY' && onlyHas('BYDAY') && byday === 'MO,TU,WE,TH,FR') return 'weekdays'
  if (freq === 'WEEKLY' && onlyHas('BYDAY') && WEEKDAYS.includes(byday || '')) return 'weekly'
  if (freq === 'DAILY' && extraKeys.length === 0) return 'daily'
  if (freq === 'DAILY' && onlyHas('INTERVAL') && interval === '1') return 'daily'
  return 'custom'
}

export const rruleToIntervalMinutes = (rrule: string) => {
  const matched = rrule.toUpperCase().match(/(?:^|;)INTERVAL=(\d+)/)
  return Math.max(1, Number(matched?.[1] || 5))
}

/**
 * 编辑时调度相关字段（频率/间隔/自定义规则/首次运行时间）是否被改动。
 * 未改动时保存原样保留 editing.Schedule，杜绝墙钟 ↔ Unix 换算引入的跨时区 / DST 漂移
 * （即使编辑者系统时区与任务时区不同，只改名称/指令也不会改变执行时刻与星期）。
 */
export const isScheduleFormDirty = (
  editing: AIReActSchedule | undefined,
  current: Pick<ScheduleFormValues, 'Frequency' | 'IntervalMinutes' | 'CustomRRule' | 'StartAt'>,
  timezone: string,
): boolean => {
  if (!editing?.Schedule) return true
  if (current.Frequency !== rruleToFrequency(editing.Schedule.RRule)) return true
  if (String(current.IntervalMinutes ?? '') !== String(rruleToIntervalMinutes(editing.Schedule.RRule))) return true
  if ((current.CustomRRule || '') !== (editing.Schedule.RRule || '')) return true
  return wallMomentToUnix(current.StartAt, timezone) !== unixNumber(editing.Schedule.StartAt)
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
  const customRRule = Form.useWatch('CustomRRule', form)
  const startAt = Form.useWatch('StartAt', form)

  // 表单墙钟时间锚定：编辑用任务自身 Schedule.Timezone 解释，新建用编辑者系统时区
  const anchorTimezone = useMemoizedFn(
    () => editing?.Schedule?.Timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
  )

  useEffect(() => {
    if (editing) {
      form.setFieldsValue({
        Name: editing.Name,
        Prompt: editing.Payload.Prompt,
        Frequency: rruleToFrequency(editing.Schedule.RRule),
        IntervalMinutes: rruleToIntervalMinutes(editing.Schedule.RRule),
        // 按任务原时区还原墙钟组件，避免在另一系统时区编辑时静默改变执行时刻/星期
        StartAt: startAtToWallMoment(editing.Schedule.StartAt, anchorTimezone()),
        TargetMode: (editing.TargetMode as ScheduleFormValues['TargetMode']) || 'new_session_per_run',
        // 规则解析不到预设（如 FREQ=MONTHLY）时回填原始规则，避免保存时被静默改写
        CustomRRule: editing.Schedule.RRule,
      })
    } else {
      form.setFieldsValue({
        Name: '',
        Prompt: '',
        Frequency: 'daily',
        IntervalMinutes: 5,
        StartAt: moment().add(5, 'minutes').startOf('minute'),
        TargetMode: 'new_session_per_run',
        CustomRRule: '',
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

  // 预览请求防抖：表单值变化后 500ms 内不再重复请求
  const fetchPreviewTimes = useDebounceFn(
    useMemoizedFn(() => {
      if (!frequency || !startAt) {
        setPreviewTimes([])
        return
      }
      const rrule = frequencyToRRule(frequency, startAt, intervalMinutes, customRRule)
      if (!rrule) {
        setPreviewTimes([])
        return
      }
      grpcPreviewAIReActScheduleTimes(
        {
          Schedule: {
            RRule: rrule,
            Timezone: anchorTimezone(),
            StartAt: wallMomentToUnix(startAt, anchorTimezone()),
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
  }, [frequency, intervalMinutes, customRRule, startAt])

  const saveSchedule = useMemoizedFn(async (values: ScheduleFormValues) => {
    setSaving(true)
    try {
      const baseParams: AIStartParams =
        editing?.Payload.StartParams || formatAIAgentSetting(getSetting()) || ({} as AIStartParams)

      const schedule: AIReActSchedule = {
        UUID: editing?.UUID || '',
        Name: values.Name.trim(),
        Status: editing?.Status ?? '',
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
        // 未改动调度字段时原样保留原 Schedule（含原时区/原 StartAt/原 RRule），
        // 改动了才按任务原时区重新生成，避免跨时区/DST 编辑静默漂移
        Schedule:
          editing && !isScheduleFormDirty(editing, values, anchorTimezone())
            ? { ...editing.Schedule }
            : {
                RRule: frequencyToRRule(values.Frequency, values.StartAt, values.IntervalMinutes, values.CustomRRule),
                Timezone: anchorTimezone(),
                StartAt: wallMomentToUnix(values.StartAt, anchorTimezone()),
              },
        MisfireGraceSeconds: editing?.MisfireGraceSeconds || 300,
        MaxRuntimeSeconds: editing?.MaxRuntimeSeconds || 7200,
      }
      // hiddenError：失败提示统一走下方 catch 的 saveFailed 文案，避免与 grpc 封装层的通用报错重复弹出
      if (editing) {
        await grpcUpdateAIReActSchedule({ Schedule: schedule }, true)
      } else {
        await grpcCreateAIReActSchedule({ Schedule: schedule }, true)
      }
      yakitNotify('success', t(editing ? 'AIScheduledTasks.updated' : 'AIScheduledTasks.created'))
      onSuccess()
    } catch (error) {
      yakitNotify('error', t('AIScheduledTasks.saveFailed', { error: String(error) }))
    } finally {
      setSaving(false)
    }
  })

  const submitForm = useMemoizedFn(async () => {
    if (saving) return
    form
      .validateFields()
      .then((values) => {
        saveSchedule(values)
      })
      // 校验失败已由表单行内错误展示，接住 rejection 避免 unhandled rejection
      .catch(() => {})
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
                options={(
                  ['once', 'minutes', 'hourly', 'daily', 'weekdays', 'weekly', 'custom'] as FrequencyPreset[]
                ).map((value) => ({
                  value,
                  label: t(`AIScheduledTasks.frequencyOptions.${value}`),
                }))}
              />
            </Form.Item>
            <Form.Item
              name="StartAt"
              label={t('AIScheduledTasks.startAt')}
              rules={[
                { required: true },
                // 仅一次的任务错过首次运行时间后不会再触发，因此要求晚于当前时间；
                // 墙钟组件按任务锚定时区换算成真实时刻再比较
                {
                  validator: (_, value) => {
                    if (
                      form.getFieldValue('Frequency') === 'once' &&
                      value &&
                      wallMomentToUnix(value, anchorTimezone()) * 1000 <= Date.now()
                    ) {
                      return Promise.reject(t('AIScheduledTasks.startAtMustBeFuture'))
                    }
                    return Promise.resolve()
                  },
                },
              ]}
            >
              <YakitDatePicker showTime format="YYYY-MM-DD HH:mm:ss" allowClear={false} />
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
          {frequency === 'custom' && (
            <Form.Item
              name="CustomRRule"
              label={t('AIScheduledTasks.customRRule')}
              rules={[
                { required: true },
                {
                  validator: (_, value) => {
                    const rule = (value || '').trim()
                    if (!rule || RRULE_PATTERN.test(rule)) return Promise.resolve()
                    return Promise.reject(t('AIScheduledTasks.customRRuleInvalid'))
                  },
                },
              ]}
              extra={t('AIScheduledTasks.customRRuleExample')}
            >
              <YakitInput maxLength={200} placeholder="RRULE:FREQ=MONTHLY;INTERVAL=2" />
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
