import moment from 'moment'
import { toTaskUnixSeconds } from '../aiTaskBoard/boardUtils'
import { AIToDoListStatusEnum } from '@/pages/ai-agent/defaultConstant'
import type { AITaskGanttSegment, AITaskGanttSegmentKind, AITaskGanttTodoItem } from './type'

/** 有效 Unix 秒时间戳（排除 created_at/updated_at 这类占位序号） */
export const isValidUnixSec = (ts?: number) => typeof ts === 'number' && Number.isFinite(ts) && ts > 1e9 && ts < 1e11

/** 时间轴刻度候选间隔（秒），最小 1 分钟 */
export const GANTT_TICK_CANDIDATES_SEC = [
  1 * 60,
  2 * 60,
  5 * 60,
  10 * 60,
  15 * 60,
  20 * 60,
  30 * 60,
  60 * 60,
  2 * 3600,
  6 * 3600,
  12 * 3600,
  24 * 3600,
]

/** 最短刻度（1min）：不足时先铺默认 4 格；达到后右侧必须顶满 */
export const GANTT_MIN_TICK_SEC = GANTT_TICK_CANDIDATES_SEC[0]

/** 时间轴格数：最少 MIN、最多 MAX */
export const GANTT_MIN_COLUMNS = 4
export const GANTT_MAX_COLUMNS = 8

export interface GanttTimeRange {
  start: number
  /** 轴终点，对齐到 interval 整格，保证每格等宽 */
  end: number
  interval: number
  /** 内容真实终点（可为 now/带秒），用于 to now 文案 */
  contentEnd: number
}

/** 取能覆盖跨度且不超过 MAX 格的最细候选间隔 */
export const pickTickInterval = (spanSec: number) => {
  for (const candidate of GANTT_TICK_CANDIDATES_SEC) {
    if (candidate * GANTT_MAX_COLUMNS >= spanSec) return candidate
  }
  return Math.ceil(spanSec / GANTT_MAX_COLUMNS / 86400) * 86400
}

/** 从分段与 created_ts 收集内容时间范围；无有效时间返回 null */
export const collectGanttContentBounds = (
  rows: Array<{ segments: AITaskGanttSegment[]; created_ts?: number }>,
): { minTs: number; maxTs: number } | null => {
  let minTs = Infinity
  let maxTs = -Infinity
  for (const row of rows) {
    for (const seg of row.segments) {
      minTs = Math.min(minTs, seg.startTs)
      maxTs = Math.max(maxTs, seg.endTs)
    }
    const created = toTaskUnixSeconds(row.created_ts)
    if (created) {
      minTs = Math.min(minTs, created)
      maxTs = Math.max(maxTs, created)
    }
  }
  if (!Number.isFinite(minTs) || !Number.isFinite(maxTs)) return null
  return { minTs, maxTs }
}

/**
 * 计算甘特时间轴起止与间隔：
 * - 无内容：now 回退 MIN×15min（默认 4 格）
 * - 起点对齐内容起点，不预留左侧空白格
 * - 不足时右侧补到 MIN 格
 * - 轴终点 ceil 到整格，最后一格与其它格等宽
 * - contentEnd 保留真实内容终点，供 to now 文案
 * - 格数最多 MAX（超限升档间隔）
 */
export const computeGanttTimeRange = (
  bounds: { minTs: number; maxTs: number } | null,
  nowSec: number,
): GanttTimeRange => {
  if (!bounds) {
    const interval = 15 * 60
    const end = Math.ceil(nowSec / interval) * interval
    const start = end - GANTT_MIN_COLUMNS * interval
    return { start, end, interval, contentEnd: nowSec }
  }

  const { minTs } = bounds
  let { maxTs } = bounds
  if (maxTs < minTs) maxTs = minTs
  const contentSpan = Math.max(maxTs - minTs, 0)

  let interval = contentSpan < GANTT_MIN_TICK_SEC ? GANTT_MIN_TICK_SEC : pickTickInterval(Math.max(contentSpan, 1))
  let contentStart = Math.floor(minTs / interval) * interval
  let contentEnd = maxTs > contentStart ? maxTs : contentStart + 1
  let end = contentEnd
  let columns = (end - contentStart) / interval

  while (columns > GANTT_MAX_COLUMNS) {
    const currentInterval = interval
    const next = GANTT_TICK_CANDIDATES_SEC.find((c) => c > currentInterval) || currentInterval * 2
    interval = next
    contentStart = Math.floor(minTs / interval) * interval
    contentEnd = maxTs > contentStart ? maxTs : contentStart + 1
    end = contentEnd
    columns = (end - contentStart) / interval
  }

  // 不足 MIN 格时只向右补
  const minEnd = contentStart + GANTT_MIN_COLUMNS * interval
  if (end < minEnd) end = minEnd

  end = Math.ceil(end / interval) * interval
  let start = contentStart

  while ((end - start) / interval > GANTT_MAX_COLUMNS) {
    const currentInterval = interval
    const next = GANTT_TICK_CANDIDATES_SEC.find((c) => c > currentInterval) || currentInterval * 2
    interval = next
    contentStart = Math.floor(minTs / interval) * interval
    contentEnd = maxTs > contentStart ? maxTs : contentStart + 1
    end = Math.max(contentEnd, contentStart + GANTT_MIN_COLUMNS * interval)
    end = Math.ceil(end / interval) * interval
    start = contentStart
  }

  return { start, end, interval, contentEnd }
}

/** 格数 = (end - start) / interval（轴终点已对齐，一般为整数） */
export const ganttColumnCount = (range: GanttTimeRange) => {
  if (!range.interval) return 0
  return (range.end - range.start) / range.interval
}

/** 等宽刻度列表（含对齐后的起止） */
export const buildGanttTicks = (range: GanttTimeRange): number[] => {
  const list: number[] = []
  if (!range.interval || range.end < range.start) return list
  for (let t = range.start; t <= range.end; t += range.interval) {
    list.push(t)
  }
  return list
}

/** 时间戳是否带非零秒（后端返回了秒级精度） */
export const hasNonZeroSeconds = (ts: number) => Number.isFinite(ts) && Math.floor(ts) % 60 !== 0

/** 刻度时间文案：有秒则 HH:mm:ss，否则 HH:mm */
export const formatGanttTickTime = (tick: number) =>
  moment.unix(tick).format(hasNonZeroSeconds(tick) ? 'HH:mm:ss' : 'HH:mm')

const isNonNegSec = (n?: number) => typeof n === 'number' && Number.isFinite(n) && n >= 0

/**
 * 条带终点：
 * - 进行中（PENDING/DOING）：closed 或 now
 * - 终态（DONE/SKIPPED/DELETED）：优先 closed；否则用时长字段推算；再否则收成点，避免拖到 now
 */
export const resolveSegmentEnd = (
  item: AITaskGanttTodoItem,
  created: number,
  focus: number,
  closed: number,
  nowSec: number,
  terminal: boolean,
): number => {
  if (closed) return closed
  if (!terminal) return nowSec
  if (focus && isNonNegSec(item.focus_seconds)) return focus + Math.floor(item.focus_seconds!)
  if (created && isNonNegSec(item.survival_seconds)) return created + Math.floor(item.survival_seconds!)
  if (created && isNonNegSec(item.age_seconds)) return created + Math.floor(item.age_seconds!)
  if (focus) return focus
  return created
}

/** 按状态拼甘特条：等待 → 执行/成功/跳过/失败 */
export const buildSegments = (item: AITaskGanttTodoItem, nowSec: number): AITaskGanttSegment[] => {
  const created = toTaskUnixSeconds(item.created_ts)
  if (!created) return []

  const focusTime = toTaskUnixSeconds(item.focus_started_ts)
  const closed = toTaskUnixSeconds(item.closed_ts)
  const focus = focusTime ? Math.max(created, focusTime) : 0
  const terminal =
    item.status === AIToDoListStatusEnum.Done ||
    item.status === AIToDoListStatusEnum.Skipped ||
    item.status === AIToDoListStatusEnum.Deleted
  const end = resolveSegmentEnd(item, created, focus, closed, nowSec, terminal)
  const segments: AITaskGanttSegment[] = []

  const push = (kind: AITaskGanttSegmentKind, startTs: number, endTs: number) => {
    if (endTs < startTs) return
    segments.push({ kind, startTs, endTs: Math.max(endTs, startTs) })
  }

  if (focus) {
    if (focus > created) push('wait', created, focus)
    push('execute', focus, end)
  } else {
    push('wait', created, end)
  }
  // 终态用点标记真实结束时刻；不把 25% / 35% 的任意比例画成实测耗时。
  if (terminal) {
    const kind =
      item.status === AIToDoListStatusEnum.Done
        ? 'success'
        : item.status === AIToDoListStatusEnum.Skipped
          ? 'skipped'
          : 'failed'
    push(kind, end, end)
  }

  return segments.filter((seg) => seg.endTs >= seg.startTs)
}
