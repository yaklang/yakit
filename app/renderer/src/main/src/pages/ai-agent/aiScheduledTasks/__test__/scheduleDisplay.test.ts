import { describe, expect, it, vi } from 'vitest'
import type { AIReActSchedule } from '../../../ai-re-act/hooks/grpcApi'
import { formatScheduleRule } from '../scheduleDisplay'

// 使用本地时间构造秒级时间戳，避免测试依赖运行机器的时区。
const startAt = new Date(2026, 9, 9, 9, 7).getTime() / 1000
const makeSchedule = (RRule: string, StartAt = startAt): AIReActSchedule => ({
  UUID: 'schedule-display',
  Name: 'schedule display',
  Status: 'active',
  TargetMode: 'new_session_per_run',
  Payload: { Prompt: 'test', StartParams: {} as AIReActSchedule['Payload']['StartParams'] },
  Schedule: { RRule, StartAt, Timezone: 'UTC' },
})

const weekdays: Record<string, string> = {
  'AIScheduledTasks.sunday': '周日',
  'AIScheduledTasks.monday': '周一',
  'AIScheduledTasks.tuesday': '周二',
  'AIScheduledTasks.wednesday': '周三',
  'AIScheduledTasks.thursday': '周四',
  'AIScheduledTasks.friday': '周五',
  'AIScheduledTasks.saturday': '周六',
}
const createTranslator = () =>
  vi.fn((key: string, _options?: Record<string, string | number>) => weekdays[key] ?? `translated:${key}`)

describe('formatScheduleRule', () => {
  it.each([
    ['RRULE:FREQ=DAILY;COUNT=1', 'frequencyOnce', undefined],
    ['FREQ=MINUTELY;INTERVAL=15', 'everyNMinutes', { n: 15 }],
    ['FREQ=MINUTELY', 'everyNMinutes', { n: 1 }],
    ['FREQ=MINUTELY;INTERVAL=0', 'everyNMinutes', { n: 1 }],
    ['rrule:freq=minutely;interval=5', 'everyNMinutes', { n: 5 }],
    ['FREQ=HOURLY;BYMINUTE=5', 'everyHourAtMinute', { minute: '05' }],
    ['FREQ=HOURLY;BYMINUTE=0', 'everyHourAtMinute', { minute: '00' }],
    ['FREQ=HOURLY;BYMINUTE=45', 'everyHourAtMinute', { minute: '45' }],
    ['FREQ=HOURLY', 'frequencyHourly', undefined],
    ['FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR', 'frequencyWeekdaysAtTime', { time: '09:07' }],
    ['FREQ=DAILY', 'frequencyDailyAtTime', { time: '09:07' }],
    ['RRULE:FREQ=DAILY;INTERVAL=1', 'frequencyDailyAtTime', { time: '09:07' }],
    ['', 'frequencyDailyAtTime', { time: '09:07' }],
  ] as const)('规则 %s 使用正确的翻译键和参数', (rule, suffix, options) => {
    const t = createTranslator()
    const key = `AIScheduledTasks.${suffix}`

    expect(formatScheduleRule(makeSchedule(rule), t)).toBe(`translated:${key}`)
    if (options === undefined) expect(t).toHaveBeenCalledExactlyOnceWith(key)
    else expect(t).toHaveBeenCalledExactlyOnceWith(key, options)
  })

  it.each([
    ['SU', '周日'],
    ['MO', '周一'],
    ['TU', '周二'],
    ['WE', '周三'],
    ['TH', '周四'],
    ['FR', '周五'],
    ['SA', '周六'],
    ['MO,WE,FR', '周一、周三、周五'],
    ['SA,SU', '周六、周日'],
    ['', '-'],
  ])('每周 BYDAY=%s 按顺序组合翻译后的星期', (days, day) => {
    const t = createTranslator()
    const rule = days ? `FREQ=WEEKLY;BYDAY=${days}` : 'FREQ=WEEKLY'

    expect(formatScheduleRule(makeSchedule(rule), t)).toBe('translated:AIScheduledTasks.everyWeekOnAtTime')
    expect(t).toHaveBeenLastCalledWith('AIScheduledTasks.everyWeekOnAtTime', { day, time: '09:07' })
  })

  it.each(['RRULE:FREQ=MONTHLY;INTERVAL=2', 'FREQ=YEARLY', 'RRULE:FREQ=DAILY;INTERVAL=2'])(
    '自定义规则 %s 返回 undefined，交由组件展示自定义标签',
    (rule) => {
      const t = createTranslator()

      expect(formatScheduleRule(makeSchedule(rule), t)).toBeUndefined()
      expect(t).not.toHaveBeenCalled()
    },
  )

  it.each([0, -1])('开始时间 %s 不显示为有效时刻', (timestamp) => {
    const t = createTranslator()

    expect(formatScheduleRule(makeSchedule('FREQ=DAILY', timestamp), t)).toBe(
      'translated:AIScheduledTasks.frequencyDailyAtTime',
    )
    expect(t).toHaveBeenCalledExactlyOnceWith('AIScheduledTasks.frequencyDailyAtTime', { time: '-' })
  })
})
