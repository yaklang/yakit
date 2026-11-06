import { describe, expect, it, vi } from 'vitest'
import {
  clearSessionSnapshotExecutionClocks,
  elapsedSessionSnapshotExecutionSeconds,
  formatSessionSnapshotExecutionDuration,
  formatSnapshotExecutionClock,
  isUnsetSessionSnapshotExecution,
} from '../sessionSnapshotExecution'

const labels = { empty: '无数据', running: '执行中' }

describe('formatSessionSnapshotExecutionDuration', () => {
  it('优先展示 execution_seconds，不采用墙钟跨度', () => {
    // 4 小时有效执行，墙钟跨度约 13 天
    expect(
      formatSessionSnapshotExecutionDuration(
        { execution_seconds: 4 * 3600, execution_minutes: 240, started_at: 1, ended_at: 1 + 13 * 86400 },
        labels,
      ),
    ).toBe('4h')
  })

  it('秒数为 0 时展示 0s，即使任务尚未结束', () => {
    expect(
      formatSessionSnapshotExecutionDuration({ execution_seconds: 0, started_at: 1000, ended_at: 0 }, labels),
    ).toBe('0s')
  })

  it('没有秒数时用 execution_minutes 做分钟级展示', () => {
    expect(formatSessionSnapshotExecutionDuration({ execution_minutes: 90, started_at: 1, ended_at: 2 }, labels)).toBe(
      '1h30m',
    )
  })

  it('新旧字段都没有时退回墙钟差；未开始为空，未结束为执行中', () => {
    expect(formatSessionSnapshotExecutionDuration({ started_at: 1000, ended_at: 7000 }, labels)).toBe('1h40m')
    expect(formatSessionSnapshotExecutionDuration({ started_at: 1000, ended_at: 0 }, labels)).toBe('执行中')
    expect(formatSessionSnapshotExecutionDuration(undefined, labels)).toBe('无数据')
    expect(formatSessionSnapshotExecutionDuration({ execution_minutes: 0, started_at: 0 }, labels)).toBe('无数据')
  })

  it('默认空 execution 视为未就绪，有秒数或开始时间则视为有效', () => {
    expect(isUnsetSessionSnapshotExecution(undefined)).toBe(true)
    expect(isUnsetSessionSnapshotExecution({ started_at: 0, execution_minutes: 0 })).toBe(true)
    expect(isUnsetSessionSnapshotExecution({ execution_seconds: 0, started_at: 1000 })).toBe(false)
    expect(isUnsetSessionSnapshotExecution({ execution_rounds: 3 })).toBe(false)
  })
})

describe('formatSnapshotExecutionClock', () => {
  it('不足 1 小时显示分秒，有小时后不显示秒，超过一天不显示分', () => {
    expect(formatSnapshotExecutionClock(37)).toBe('37s')
    expect(formatSnapshotExecutionClock(2 * 60 + 37)).toBe('2m37s')
    expect(formatSnapshotExecutionClock(2 * 3600 + 37 * 60 + 15)).toBe('2h37m')
    expect(formatSnapshotExecutionClock(2 * 3600)).toBe('2h')
    expect(formatSnapshotExecutionClock(86400 + 2 * 3600 + 37 * 60)).toBe('1d2h')
    expect(formatSnapshotExecutionClock(86400)).toBe('1d')
  })
})

describe('elapsedSessionSnapshotExecutionSeconds', () => {
  it('同一 clockKey 按墙钟继续累加', () => {
    vi.useFakeTimers()
    clearSessionSnapshotExecutionClocks()
    expect(elapsedSessionSnapshotExecutionSeconds('k')).toBe(0)
    vi.advanceTimersByTime(3000)
    expect(elapsedSessionSnapshotExecutionSeconds('k')).toBe(3)
    vi.useRealTimers()
    clearSessionSnapshotExecutionClocks()
  })
})
