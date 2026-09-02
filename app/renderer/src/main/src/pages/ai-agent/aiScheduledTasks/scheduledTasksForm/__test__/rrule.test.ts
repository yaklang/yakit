import { describe, expect, it, vi } from 'vitest'
import moment from 'moment'
// 先于组件模块注册 window.require('electron') stub（组件链路上 aiScheduledTasks/utils 顶层会解构 ipcRenderer）
import '../../../../ai-re-act/hooks/__test__/setupElectron'
import { frequencyToRRule, rruleToFrequency, rruleToIntervalMinutes } from '../ScheduledTasksForm'

// 组件链路会传递引入 aiGlobalLoading → lottie-web，其在模块加载期探测 canvas，jsdom 不支持
vi.mock('lottie-web', () => ({ default: vi.fn() }))

describe('frequencyToRRule', () => {
  it('maps once to a single-count daily rule', () => {
    expect(frequencyToRRule('once', moment('2026-08-27 10:00'))).toBe('RRULE:FREQ=DAILY;COUNT=1')
  })

  it('maps minutes to a minutely rule with the given interval', () => {
    expect(frequencyToRRule('minutes', moment('2026-08-27 10:00'), 15)).toBe('RRULE:FREQ=MINUTELY;INTERVAL=15')
  })

  it('floors fractional minute intervals and keeps a positive minimum', () => {
    expect(frequencyToRRule('minutes', moment('2026-08-27 10:00'), 12.7)).toBe('RRULE:FREQ=MINUTELY;INTERVAL=12')
    expect(frequencyToRRule('minutes', moment('2026-08-27 10:00'), 0)).toBe('RRULE:FREQ=MINUTELY;INTERVAL=5')
  })

  it('maps hourly and the default daily rule', () => {
    expect(frequencyToRRule('hourly', moment('2026-08-27 10:00'))).toBe('RRULE:FREQ=HOURLY;INTERVAL=1')
    expect(frequencyToRRule('daily' as never, moment('2026-08-27 10:00'))).toBe('RRULE:FREQ=DAILY;INTERVAL=1')
  })

  it('maps weekdays to a MO-FR weekly rule', () => {
    expect(frequencyToRRule('weekdays', moment('2026-08-27 10:00'))).toBe('RRULE:FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR')
  })

  it('maps weekly to the weekday of StartAt (0=SU … 3=WE … 6=SA)', () => {
    // 2026-08-27 是周四
    expect(frequencyToRRule('weekly', moment('2026-08-27 10:00'))).toBe('RRULE:FREQ=WEEKLY;BYDAY=TH')
    expect(frequencyToRRule('weekly', moment('2026-08-23 10:00'))).toBe('RRULE:FREQ=WEEKLY;BYDAY=SU')
    expect(frequencyToRRule('weekly', moment('2026-08-29 10:00'))).toBe('RRULE:FREQ=WEEKLY;BYDAY=SA')
  })
})

describe('rruleToFrequency', () => {
  it('recognizes each preset produced by frequencyToRRule', () => {
    const startAt = moment('2026-08-27 10:00')
    const presets = ['once', 'minutes', 'hourly', 'daily', 'weekdays', 'weekly'] as const
    presets.forEach((preset) => {
      expect(rruleToFrequency(frequencyToRRule(preset, startAt, 5))).toBe(preset)
    })
  })

  it('returns custom for unrecognized rules instead of silently mapping to daily', () => {
    expect(rruleToFrequency('')).toBe('custom')
    expect(rruleToFrequency('RRULE:FREQ=MONTHLY;INTERVAL=2')).toBe('custom')
    expect(rruleToFrequency('RRULE:FREQ=YEARLY')).toBe('custom')
  })

  it('maps preset supersets to custom so editing preserves the raw rule', () => {
    // 多天每周：按 weekly 预设重新生成只剩 StartAt 单天
    expect(rruleToFrequency('RRULE:FREQ=WEEKLY;BYDAY=MO,WE')).toBe('custom')
    // INTERVAL>1 的每天：按 daily 预设重新生成 INTERVAL 归 1
    expect(rruleToFrequency('RRULE:FREQ=DAILY;INTERVAL=2')).toBe('custom')
    // 带 BYMINUTE 的每小时：按 hourly 预设重新生成丢 BYMINUTE
    expect(rruleToFrequency('RRULE:FREQ=HOURLY;BYMINUTE=30')).toBe('custom')
    // 非 DAILY 的 COUNT=1、以及 once 之外附带额外字段的规则
    expect(rruleToFrequency('RRULE:FREQ=MONTHLY;COUNT=1')).toBe('custom')
    expect(rruleToFrequency('RRULE:FREQ=DAILY;COUNT=1;BYHOUR=9')).toBe('custom')
  })

  it('still maps bare daily/hourly (RRULE default INTERVAL=1) to their presets', () => {
    expect(rruleToFrequency('RRULE:FREQ=DAILY')).toBe('daily')
    expect(rruleToFrequency('RRULE:FREQ=HOURLY')).toBe('hourly')
    // 裸 MINUTELY 缺省 1 分钟，而表单按 minutes 预设回填 INTERVAL=5，须走 custom 保留原规则
    expect(rruleToFrequency('RRULE:FREQ=MINUTELY')).toBe('custom')
  })
})

describe('frequencyToRRule custom', () => {
  it('passes through the custom rule trimmed', () => {
    expect(frequencyToRRule('custom', moment('2026-08-27 10:00'), 5, 'RRULE:FREQ=MONTHLY;INTERVAL=2')).toBe(
      'RRULE:FREQ=MONTHLY;INTERVAL=2',
    )
    expect(frequencyToRRule('custom', moment('2026-08-27 10:00'), 5, '  RRULE:FREQ=DAILY  ')).toBe('RRULE:FREQ=DAILY')
  })

  it('returns empty string when the custom rule is blank', () => {
    expect(frequencyToRRule('custom', moment('2026-08-27 10:00'), 5, '')).toBe('')
    expect(frequencyToRRule('custom', moment('2026-08-27 10:00'), 5)).toBe('')
  })

  it('round-trips an engine-produced monthly rule through custom without rewriting it', () => {
    const original = 'RRULE:FREQ=MONTHLY;INTERVAL=2;BYMONTHDAY=15'
    const frequency = rruleToFrequency(original)
    expect(frequency).toBe('custom')
    expect(frequencyToRRule(frequency, moment('2026-08-27 10:00'), 5, original)).toBe(original)
  })
})

describe('rruleToIntervalMinutes', () => {
  it('reads INTERVAL from a minutely rule', () => {
    expect(rruleToIntervalMinutes('RRULE:FREQ=MINUTELY;INTERVAL=30')).toBe(30)
  })

  it('defaults to 5 when INTERVAL is missing or malformed', () => {
    expect(rruleToIntervalMinutes('RRULE:FREQ=MINUTELY')).toBe(5)
    expect(rruleToIntervalMinutes('RRULE:FREQ=MINUTELY;INTERVAL=abc')).toBe(5)
    expect(rruleToIntervalMinutes('')).toBe(5)
  })

  it('keeps a positive minimum for zero intervals', () => {
    expect(rruleToIntervalMinutes('RRULE:FREQ=MINUTELY;INTERVAL=0')).toBe(1)
  })

  it('round-trips interval minutes with frequencyToRRule', () => {
    const rrule = frequencyToRRule('minutes', moment('2026-08-27 10:00'), 20)
    expect(rruleToIntervalMinutes(rrule)).toBe(20)
  })
})
