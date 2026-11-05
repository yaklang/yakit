import { timeDiffWithMoment } from '@/utils/timeUtil'

/** session / task 快照 execution 里和时长有关的字段 */
export interface SnapshotExecutionDurationSource {
  execution_seconds?: number
  execution_minutes?: number
  started_at?: number
  ended_at?: number
}

/**
 * 快照执行时长展示。
 * 优先用区间合并后的 execution_seconds；旧数据只有分钟时按分钟换算；
 * 两者都没有时，退回 started_at → ended_at 的墙钟差（未结束显示 running）。
 */
export const formatSessionSnapshotExecutionDuration = (
  execution: SnapshotExecutionDurationSource | undefined,
  labels: { empty: string; running: string },
): string => {
  const seconds = execution?.execution_seconds
  if (typeof seconds === 'number' && Number.isFinite(seconds)) {
    return timeDiffWithMoment(0, Math.floor(seconds))
  }
  const minutes = execution?.execution_minutes
  if (typeof minutes === 'number' && Number.isFinite(minutes) && minutes > 0) {
    return timeDiffWithMoment(0, Math.floor(minutes * 60))
  }
  const startedAt = execution?.started_at || 0
  const endedAt = execution?.ended_at || 0
  if (!startedAt) return labels.empty
  if (!endedAt) return labels.running
  return timeDiffWithMoment(startedAt, endedAt)
}
