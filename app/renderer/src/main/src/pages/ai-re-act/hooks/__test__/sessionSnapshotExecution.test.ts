import { describe, expect, it } from 'vitest'
import { formatSessionSnapshotExecutionDuration } from '../sessionSnapshotExecution'

const labels = { empty: '无数据', running: '执行中' }

describe('formatSessionSnapshotExecutionDuration', () => {
  it('优先展示 execution_seconds，不采用墙钟跨度', () => {
    // 4 小时有效执行，墙钟跨度约 13 天
    expect(
      formatSessionSnapshotExecutionDuration(
        { execution_seconds: 4 * 3600, execution_minutes: 240, started_at: 1, ended_at: 1 + 13 * 86400 },
        labels,
      ),
    ).toBe('4h0s')
  })

  it('秒数为 0 时展示 0s，即使任务尚未结束', () => {
    expect(
      formatSessionSnapshotExecutionDuration({ execution_seconds: 0, started_at: 1000, ended_at: 0 }, labels),
    ).toBe('0s')
  })

  it('没有秒数时用 execution_minutes 做分钟级展示', () => {
    expect(formatSessionSnapshotExecutionDuration({ execution_minutes: 90, started_at: 1, ended_at: 2 }, labels)).toBe(
      '1h30m0s',
    )
  })

  it('新旧字段都没有时退回墙钟差；未开始为空，未结束为执行中', () => {
    expect(formatSessionSnapshotExecutionDuration({ started_at: 1000, ended_at: 7000 }, labels)).toBe('1h40m0s')
    expect(formatSessionSnapshotExecutionDuration({ started_at: 1000, ended_at: 0 }, labels)).toBe('执行中')
    expect(formatSessionSnapshotExecutionDuration(undefined, labels)).toBe('无数据')
    expect(formatSessionSnapshotExecutionDuration({ execution_minutes: 0, started_at: 0 }, labels)).toBe('无数据')
  })
})
