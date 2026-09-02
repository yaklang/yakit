import { describe, expect, it, vi } from 'vitest'
import moment from 'moment'
// 先于组件模块注册 window.require('electron') stub（组件链路上 aiScheduledTasks/utils 顶层会解构 ipcRenderer）
import '../../../../ai-re-act/hooks/__test__/setupElectron'
import type { AIReActSchedule } from '../../../../ai-re-act/hooks/grpcApi'
import { timezoneOffsetMinutes, startAtToWallMoment, wallMomentToUnix } from '../timezone'
import { frequencyToRRule, isScheduleFormDirty } from '../ScheduledTasksForm'

// 组件链路会传递引入 aiGlobalLoading → lottie-web，其在模块加载期探测 canvas，jsdom 不支持
vi.mock('lottie-web', () => ({ default: vi.fn() }))

const unixOf = (y: number, M: number, d: number, h = 0, m = 0) => Date.UTC(y, M - 1, d, h, m, 0) / 1000

describe('timezoneOffsetMinutes', () => {
  it('Asia/Shanghai 全年 +480（无夏令时）', () => {
    expect(timezoneOffsetMinutes('Asia/Shanghai', unixOf(2026, 2, 2))).toBe(480)
    expect(timezoneOffsetMinutes('Asia/Shanghai', unixOf(2026, 7, 1))).toBe(480)
  })

  it('America/New_York 冬令 -300 / 夏令 -240', () => {
    expect(timezoneOffsetMinutes('America/New_York', unixOf(2026, 2, 2))).toBe(-300)
    expect(timezoneOffsetMinutes('America/New_York', unixOf(2026, 7, 1))).toBe(-240)
  })

  it('无效时区回退 UTC（0）', () => {
    expect(timezoneOffsetMinutes('Not/AZone', unixOf(2026, 2, 2))).toBe(0)
  })
})

describe('墙钟锚定：UTC ↔ Asia/Shanghai', () => {
  it('Unix → 原时区墙钟组件，展示不受编辑者系统时区影响', () => {
    // 2026-02-02 03:20 UTC = 上海 11:20
    const wall = startAtToWallMoment(unixOf(2026, 2, 2, 3, 20), 'Asia/Shanghai')
    expect(wall.format('YYYY-MM-DD HH:mm')).toBe('2026-02-02 11:20')
  })

  it('墙钟 → Unix 往返一致（UTC / Asia/Shanghai / America/New_York）', () => {
    for (const tz of ['UTC', 'Asia/Shanghai', 'America/New_York']) {
      const unix = unixOf(2026, 2, 2, 3, 20)
      expect(wallMomentToUnix(startAtToWallMoment(unix, tz), tz)).toBe(unix)
    }
  })
})

describe('DST 边界（America/New_York）', () => {
  it('春令间隙 2026-03-08 02:30（不存在的时间）按跳变后解释为 03:30 且幂等', () => {
    const gapWall = moment([2026, 2, 8, 2, 30])
    const unix = wallMomentToUnix(gapWall, 'America/New_York')
    // 03:30 EDT = 07:30Z；且墙钟为 03:30
    expect(unix).toBe(unixOf(2026, 3, 8, 7, 30))
    const back = startAtToWallMoment(unix, 'America/New_York')
    expect(back.format('YYYY-MM-DD HH:mm')).toBe('2026-03-08 03:30')
    expect(wallMomentToUnix(back, 'America/New_York')).toBe(unix)
  })

  it('跳变后一小时内（03:30 EDT）自洽回环', () => {
    const wall = moment([2026, 2, 8, 3, 30])
    const unix = wallMomentToUnix(wall, 'America/New_York')
    expect(unix).toBe(unixOf(2026, 3, 8, 7, 30))
    expect(startAtToWallMoment(unix, 'America/New_York').format('YYYY-MM-DD HH:mm')).toBe('2026-03-08 03:30')
  })

  it('秋令重叠 2026-11-01 01:30 出现两次，取先出现的（05:30Z EDT）', () => {
    const wall = moment([2026, 10, 1, 1, 30])
    const unix = wallMomentToUnix(wall, 'America/New_York')
    expect(unix).toBe(unixOf(2026, 11, 1, 5, 30))
    expect(startAtToWallMoment(unix, 'America/New_York').format('YYYY-MM-DD HH:mm')).toBe('2026-11-01 01:30')
  })
})

describe('weekly BYDAY 锚定任务时区的星期', () => {
  it('UTC 周日 04:30 = New_York 周六 23:30，weekly 按 New_York 生成 BYDAY=SA', () => {
    // 2026-02-08 为周日；若按 UTC/东八区解释会是 SU，锚定 New_York 后应为 SA
    const unix = unixOf(2026, 2, 8, 4, 30)
    const wall = startAtToWallMoment(unix, 'America/New_York')
    expect(wall.day()).toBe(6)
    expect(frequencyToRRule('weekly', wall)).toBe('RRULE:FREQ=WEEKLY;BYDAY=SA')
  })
})

describe('只改名称：调度字段未变时原样保留原 Schedule', () => {
  const editing = {
    UUID: 'u1',
    Name: 'n',
    Status: 'active',
    TargetMode: 'new_session_per_run',
    Payload: { Prompt: 'p', StartParams: {} },
    Schedule: {
      RRule: 'RRULE:FREQ=WEEKLY;BYDAY=MO,WE',
      Timezone: 'Asia/Shanghai',
      StartAt: unixOf(2026, 2, 2, 3, 20),
    },
  } as unknown as AIReActSchedule

  it('回填值未改动（仅改 Name/Prompt）：dirty=false，保存不做任何换算', () => {
    expect(
      isScheduleFormDirty(
        editing,
        {
          Frequency: 'custom', // BYDAY=MO,WE 非单日预设，结构化解析回填为 custom
          IntervalMinutes: 5,
          CustomRRule: editing.Schedule.RRule,
          StartAt: startAtToWallMoment(editing.Schedule.StartAt, editing.Schedule.Timezone),
        },
        'Asia/Shanghai',
      ),
    ).toBe(false)
  })

  it('修改了首次运行时间：dirty=true（按原时区重新生成）', () => {
    expect(
      isScheduleFormDirty(
        editing,
        {
          Frequency: 'custom',
          IntervalMinutes: 5,
          CustomRRule: editing.Schedule.RRule,
          StartAt: startAtToWallMoment(editing.Schedule.StartAt + 3600, editing.Schedule.Timezone),
        },
        'Asia/Shanghai',
      ),
    ).toBe(true)
  })

  it('新建（无 editing）：dirty=true', () => {
    expect(isScheduleFormDirty(undefined, {} as never, 'UTC')).toBe(true)
  })
})
