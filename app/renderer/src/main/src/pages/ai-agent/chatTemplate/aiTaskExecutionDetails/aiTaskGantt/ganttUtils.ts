import { AIToDoListStatusEnum } from '@/pages/ai-agent/defaultConstant'
import type { AITaskGanttSegment, AITaskGanttSegmentKind, AITaskGanttTodoItem } from './type'

/** 有效 Unix 秒时间戳（排除 created_at/updated_at 这类占位序号） */
export const isValidUnixSec = (ts?: number) => typeof ts === 'number' && Number.isFinite(ts) && ts > 1e9

/** 时间轴刻度候选间隔（秒），含最小 2 分钟 */
export const GANTT_TICK_CANDIDATES_SEC = [
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

/** 时间轴格数：最少 MIN、最多 MAX */
export const GANTT_MIN_COLUMNS = 4
export const GANTT_MAX_COLUMNS = 8

export interface GanttTimeRange {
  start: number
  end: number
  interval: number
}

/** 取能覆盖跨度且不超过 MAX 格的最细候选间隔 */
export const pickTickInterval = (spanSec: number) => {
  for (const candidate of GANTT_TICK_CANDIDATES_SEC) {
    if (candidate * GANTT_MAX_COLUMNS >= spanSec) return candidate
  }
  return GANTT_TICK_CANDIDATES_SEC[GANTT_TICK_CANDIDATES_SEC.length - 1]
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
    if (isValidUnixSec(row.created_ts)) {
      minTs = Math.min(minTs, row.created_ts!)
      maxTs = Math.max(maxTs, row.created_ts!)
    }
  }
  if (!Number.isFinite(minTs) || !Number.isFinite(maxTs)) return null
  return { minTs, maxTs }
}

/**
 * 计算甘特时间轴起止与间隔：
 * - 无内容：now 回退 MIN×15min
 * - 格数夹在 [MIN, MAX]；超限升档间隔，不足则右侧补空
 */
export const computeGanttTimeRange = (
  bounds: { minTs: number; maxTs: number } | null,
  nowSec: number,
): GanttTimeRange => {
  if (!bounds) {
    const interval = 15 * 60
    const end = nowSec
    return { start: end - GANTT_MIN_COLUMNS * interval, end, interval }
  }

  let { minTs, maxTs } = bounds
  if (maxTs <= minTs) maxTs = minTs + GANTT_MIN_COLUMNS * (2 * 60)

  const span = Math.max(maxTs - minTs, 2 * 60)
  let interval = pickTickInterval(span)
  let start = Math.floor(minTs / interval) * interval
  let end = Math.ceil(maxTs / interval) * interval
  end = Math.max(end, start + interval)
  let columns = (end - start) / interval

  while (columns > GANTT_MAX_COLUMNS) {
    const next = GANTT_TICK_CANDIDATES_SEC.find((c) => c > interval)
    if (!next) break
    interval = next
    start = Math.floor(minTs / interval) * interval
    end = Math.ceil(maxTs / interval) * interval
    end = Math.max(end, start + interval)
    columns = (end - start) / interval
  }

  if (columns < GANTT_MIN_COLUMNS) {
    end = start + GANTT_MIN_COLUMNS * interval
  }

  return { start, end, interval }
}

/** 格数 = (end - start) / interval */
export const ganttColumnCount = (range: GanttTimeRange) => {
  if (!range.interval) return 0
  return (range.end - range.start) / range.interval
}

/** 由时间范围生成含起止的刻度列表 */
export const buildGanttTicks = (range: GanttTimeRange): number[] => {
  const list: number[] = []
  if (!range.interval || range.end < range.start) return list
  for (let t = range.start; t <= range.end; t += range.interval) {
    list.push(t)
  }
  return list
}

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
  const created = isValidUnixSec(item.created_ts) ? item.created_ts! : 0
  if (!created) return []

  const focus = isValidUnixSec(item.focus_started_ts) ? item.focus_started_ts! : 0
  const closed = isValidUnixSec(item.closed_ts) ? item.closed_ts! : 0
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

  switch (item.status) {
    case AIToDoListStatusEnum.Pending: {
      push('wait', created, end)
      break
    }
    case AIToDoListStatusEnum.Doing: {
      if (focus && focus > created) {
        push('wait', created, focus)
        push('execute', focus, end)
      } else if (focus) {
        push('execute', focus, end)
      } else {
        push('wait', created, end)
      }
      break
    }
    case AIToDoListStatusEnum.Done: {
      // 等待 + 执行过程 + 成功收尾（无独立成功时间戳时取执行尾部约 25%）
      const processEnd = end
      if (focus && focus > created) {
        push('wait', created, focus)
        const processDur = Math.max(processEnd - focus, 0)
        const tipStart =
          processDur > 0 ? Math.max(focus, processEnd - Math.max(1, Math.floor(processDur * 0.25))) : processEnd
        if (tipStart > focus) push('execute', focus, tipStart)
        push('success', tipStart, processEnd)
      } else if (focus) {
        push('success', focus, processEnd)
      } else {
        push('wait', created, processEnd)
        push('success', processEnd, processEnd)
      }
      break
    }
    case AIToDoListStatusEnum.Skipped: {
      if (focus && focus > created) {
        push('wait', created, focus)
        push('skipped', focus, end)
      } else {
        const mid = created + Math.max(1, Math.floor((end - created) * 0.35))
        push('wait', created, Math.min(mid, end))
        push('skipped', Math.min(mid, end), end)
      }
      break
    }
    case AIToDoListStatusEnum.Deleted: {
      if (focus && focus > created) {
        push('wait', created, focus)
        push('failed', focus, end)
      } else {
        const mid = created + Math.max(1, Math.floor((end - created) * 0.35))
        push('wait', created, Math.min(mid, end))
        push('failed', Math.min(mid, end), end)
      }
      break
    }
    default:
      push('wait', created, end)
  }

  return segments.filter((seg) => seg.endTs >= seg.startTs)
}
