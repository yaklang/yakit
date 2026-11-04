import { describe, expect, it } from 'vitest'
import { AIToDoListStatusEnum } from '@/pages/ai-agent/defaultConstant'
import type { AIAgentGrpcApi } from '@/pages/ai-re-act/hooks/grpcApi'
import {
  buildGanttTicks,
  buildSegments,
  collectGanttContentBounds,
  computeGanttTimeRange,
  GANTT_MAX_COLUMNS,
  GANTT_MIN_COLUMNS,
  GANTT_MIN_TICK_SEC,
  formatGanttTickTime,
  ganttColumnCount,
  hasNonZeroSeconds,
  isValidUnixSec,
  pickTickInterval,
} from '../ganttUtils'

const BASE_TS = 1750000000
const NOW = BASE_TS + 3600

const createItem = (item: Partial<AIAgentGrpcApi.TodoListUpdateItem>): AIAgentGrpcApi.TodoListUpdateItem => ({
  id: 'todo-1',
  content: '待办内容',
  status: AIToDoListStatusEnum.Pending,
  created_at: 1,
  updated_at: 1,
  created_ts: BASE_TS,
  ...item,
})

describe('isValidUnixSec', () => {
  it('仅接受大于 1e9 的有限秒级时间戳', () => {
    expect(isValidUnixSec(BASE_TS)).toBe(true)
    expect(isValidUnixSec(0)).toBe(false)
    expect(isValidUnixSec(1)).toBe(false)
    // created_at/updated_at 这类占位序号不应被当作时间戳
    expect(isValidUnixSec(123)).toBe(false)
    expect(isValidUnixSec(Number.NaN)).toBe(false)
    expect(isValidUnixSec(Number.POSITIVE_INFINITY)).toBe(false)
    expect(isValidUnixSec(undefined)).toBe(false)
  })
})

describe('真实时间分段', () => {
  it('等待及执行从真实时间延伸到当前时刻', () => {
    expect(buildSegments(createItem({}), NOW)).toEqual([{ kind: 'wait', startTs: BASE_TS, endTs: NOW }])
    expect(buildSegments(createItem({ status: 'DOING', focus_started_ts: BASE_TS + 10 }), NOW)).toEqual([
      { kind: 'wait', startTs: BASE_TS, endTs: BASE_TS + 10 },
      { kind: 'execute', startTs: BASE_TS + 10, endTs: NOW },
    ])
  })
  it.each([
    ['DONE', 'success'],
    ['SKIPPED', 'skipped'],
    ['DELETED', 'failed'],
  ] as const)('%s 仅在实际关闭时间显示状态标记', (status, kind) => {
    const segments = buildSegments(createItem({ status, focus_started_ts: BASE_TS + 10, closed_ts: BASE_TS + 60 }), NOW)
    expect(segments).toEqual([
      { kind: 'wait', startTs: BASE_TS, endTs: BASE_TS + 10 },
      { kind: 'execute', startTs: BASE_TS + 10, endTs: BASE_TS + 60 },
      { kind, startTs: BASE_TS + 60, endTs: BASE_TS + 60 },
    ])
  })
  it('秒和毫秒混用得到相同条带，终态不会随当前时间增长', () => {
    const item = createItem({ status: 'DONE', focus_started_ts: BASE_TS + 10, closed_ts: BASE_TS + 60 })
    expect(buildSegments({ ...item, created_ts: BASE_TS * 1000, closed_ts: (BASE_TS + 60) * 1000 }, NOW + 999)).toEqual(
      buildSegments(item, NOW),
    )
  })
  it('缺少关闭时间时优先采用 focus / survival / age 时长，支持零时长', () => {
    for (const [key, expected] of [
      ['focus_seconds', BASE_TS + 10],
      ['survival_seconds', BASE_TS],
      ['age_seconds', BASE_TS],
    ] as const) {
      const segments = buildSegments(
        createItem({ status: 'DONE', focus_started_ts: key === 'focus_seconds' ? BASE_TS + 10 : undefined, [key]: 0 }),
        NOW,
      )
      expect(segments[segments.length - 1].endTs).toBe(expected)
    }
    expect(buildSegments(createItem({ status: 'DONE', survival_seconds: 70 }), NOW).pop()?.endTs).toBe(BASE_TS + 70)
  })
  it('缺少创建时间或仅含序号时不伪造条带', () => {
    expect(buildSegments(createItem({ created_ts: undefined, created_at: 5 }), NOW)).toEqual([])
    expect(buildSegments(createItem({ created_ts: 123 }), NOW)).toEqual([])
  })
  it('无时间的终态收成点，反向关闭时间与负时长不产生负条带', () => {
    expect(buildSegments(createItem({ status: 'DONE' }), NOW).pop()?.endTs).toBe(BASE_TS)
    const segments = buildSegments(createItem({ status: 'DONE', closed_ts: BASE_TS - 10 }), NOW)
    expect(segments.every((x) => x.endTs >= x.startTs)).toBe(true)
    expect(buildSegments(createItem({ status: 'DONE', survival_seconds: -1 }), NOW).pop()?.endTs).toBe(BASE_TS)
  })
  it('超长跨度仍最多八格，毫秒创建时间参与边界归一化', () => {
    const range = computeGanttTimeRange({ minTs: BASE_TS, maxTs: BASE_TS + 400 * 86400 }, NOW)
    expect(ganttColumnCount(range)).toBeLessThanOrEqual(8)
    expect(buildGanttTicks(range).length).toBeLessThanOrEqual(9)
    expect(collectGanttContentBounds([{ segments: [], created_ts: BASE_TS * 1000 }])).toEqual({
      minTs: BASE_TS,
      maxTs: BASE_TS,
    })
  })
})

describe('pickTickInterval', () => {
  it('短跨度优先使用最小 1 分钟间隔', () => {
    expect(pickTickInterval(1 * 60)).toBe(GANTT_MIN_TICK_SEC)
    expect(pickTickInterval(5 * 60)).toBe(GANTT_MIN_TICK_SEC)
  })

  it('跨度增大时升档，保证不超过 MAX 格', () => {
    // 8×1min=8min 不够；8×2min=16min 仍不够 40min；8×5min=40min
    expect(pickTickInterval(40 * 60)).toBe(5 * 60)
    expect(pickTickInterval(41 * 60)).toBe(10 * 60)
  })

  it('超长跨度扩展为整日刻度以保持列数上限', () => {
    expect(pickTickInterval(9 * 24 * 3600)).toBe(2 * 24 * 3600)
  })
})

describe('computeGanttTimeRange / buildGanttTicks', () => {
  it('空内容：回退为默认 4 格，轴终点对齐整格', () => {
    const range = computeGanttTimeRange(null, NOW)
    expect(range.interval).toBe(15 * 60)
    expect(ganttColumnCount(range)).toBe(GANTT_MIN_COLUMNS)
    expect(range.contentEnd).toBe(NOW)
    expect(range.end % range.interval).toBe(0)
    expect(range.end).toBeGreaterThanOrEqual(NOW)
    expect(range.start).toBe(range.end - GANTT_MIN_COLUMNS * 15 * 60)
    expect(buildGanttTicks(range)).toHaveLength(GANTT_MIN_COLUMNS + 1)
  })

  it('短跨度：默认仍 4 格，起点对齐内容起点（不预留左侧空白）', () => {
    const maxTs = BASE_TS + 90
    const range = computeGanttTimeRange({ minTs: BASE_TS, maxTs }, NOW)
    expect(range.interval).toBe(GANTT_MIN_TICK_SEC)
    expect(ganttColumnCount(range)).toBe(GANTT_MIN_COLUMNS)
    const contentStart = Math.floor(BASE_TS / range.interval) * range.interval
    expect(range.start).toBe(contentStart)
  })

  it('内容已够 4 格：轴终点对齐整格，contentEnd 保留真实终点', () => {
    const maxTs = BASE_TS + GANTT_MIN_COLUMNS * GANTT_MIN_TICK_SEC + 20
    const range = computeGanttTimeRange({ minTs: BASE_TS, maxTs }, NOW)
    expect(range.contentEnd).toBe(maxTs)
    expect(range.end % range.interval).toBe(0)
    expect(range.end).toBeGreaterThanOrEqual(maxTs)
    expect(ganttColumnCount(range)).toBeGreaterThanOrEqual(GANTT_MIN_COLUMNS)
    expect(Number.isInteger(ganttColumnCount(range))).toBe(true)
    const ticks = buildGanttTicks(range)
    expect(ticks[ticks.length - 1]).toBe(range.end)
  })

  it('中等跨度：轴终点对齐整格，格数 ∈ [MIN, MAX]', () => {
    const maxTs = BASE_TS + 50 * 60 + 33
    const range = computeGanttTimeRange({ minTs: BASE_TS, maxTs }, NOW)
    expect(range.contentEnd).toBe(maxTs)
    expect(range.end % range.interval).toBe(0)
    expect(ganttColumnCount(range)).toBeGreaterThanOrEqual(GANTT_MIN_COLUMNS)
    expect(ganttColumnCount(range)).toBeLessThanOrEqual(GANTT_MAX_COLUMNS)
  })

  it('3 天宽跨度：格数 ≤ MAX，轴终点对齐整格', () => {
    const maxTs = BASE_TS + 3 * 24 * 3600 + 12
    const range = computeGanttTimeRange({ minTs: BASE_TS, maxTs }, NOW)
    expect(range.contentEnd).toBe(maxTs)
    expect(range.end % range.interval).toBe(0)
    expect(ganttColumnCount(range)).toBeGreaterThanOrEqual(GANTT_MIN_COLUMNS)
    expect(ganttColumnCount(range)).toBeLessThanOrEqual(GANTT_MAX_COLUMNS)
  })

  it('起止相等（短跨度）：默认仍 4 格', () => {
    const range = computeGanttTimeRange({ minTs: BASE_TS, maxTs: BASE_TS }, NOW)
    expect(ganttColumnCount(range)).toBe(GANTT_MIN_COLUMNS)
    expect(range.interval).toBe(GANTT_MIN_TICK_SEC)
  })
})

describe('collectGanttContentBounds', () => {
  it('综合分段与 created_ts 取极值；无有效时间返回 null', () => {
    expect(collectGanttContentBounds([])).toBeNull()
    expect(
      collectGanttContentBounds([
        {
          segments: [{ kind: 'wait', startTs: BASE_TS + 100, endTs: BASE_TS + 500 }],
          created_ts: BASE_TS,
        },
      ]),
    ).toEqual({ minTs: BASE_TS, maxTs: BASE_TS + 500 })
  })
})

describe('formatGanttTickTime', () => {
  it('整分用 HH:mm，有秒用 HH:mm:ss', () => {
    const onMinute = Math.floor(BASE_TS / 60) * 60
    expect(hasNonZeroSeconds(onMinute)).toBe(false)
    expect(formatGanttTickTime(onMinute)).toMatch(/^\d{2}:\d{2}$/)
    expect(hasNonZeroSeconds(onMinute + 45)).toBe(true)
    expect(formatGanttTickTime(onMinute + 45)).toMatch(/^\d{2}:\d{2}:\d{2}$/)
  })
})
