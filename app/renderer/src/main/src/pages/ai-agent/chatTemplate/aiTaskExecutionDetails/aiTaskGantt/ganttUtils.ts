import { AIToDoListStatusEnum } from '@/pages/ai-agent/defaultConstant'
import type { AITaskGanttSegment, AITaskGanttSegmentKind, AITaskGanttTodoItem } from './type'

/** 有效 Unix 秒时间戳（排除 created_at/updated_at 这类占位序号） */
export const isValidUnixSec = (ts?: number) => typeof ts === 'number' && Number.isFinite(ts) && ts > 1e9

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
