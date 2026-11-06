const executionClocks = new Map<string, number>()

/** processing 自增的起点。组件卸载后仍按墙钟计算，切回来不会从后端秒数重头加 */
export const elapsedSessionSnapshotExecutionSeconds = (clockKey: string) => {
  if (!clockKey) return 0
  const startedAt = executionClocks.get(clockKey)
  if (startedAt === undefined) {
    executionClocks.set(clockKey, Date.now())
    return 0
  }
  return Math.max(0, Math.floor((Date.now() - startedAt) / 1000))
}

export const clearSessionSnapshotExecutionClocks = () => {
  executionClocks.clear()
}

/** session / task 快照 execution 里和时长有关的字段 */
export interface SnapshotExecutionDurationSource {
  execution_seconds?: number
  execution_minutes?: number
  execution_rounds?: number
  started_at?: number
  ended_at?: number
}

/** 再次提问时会先写入默认空 execution，卡片不能拿它覆盖上一份有效快照 */
export const isUnsetSessionSnapshotExecution = (execution?: SnapshotExecutionDurationSource) => {
  if (!execution) return true
  if (typeof execution.execution_seconds === 'number' && Number.isFinite(execution.execution_seconds)) return false
  if ((execution.started_at || 0) > 0) return false
  if ((execution.execution_rounds || 0) > 0) return false
  return true
}

/** 不足 1 小时显示分秒；有小时后不显示秒；超过一天不显示分 */
export const formatSnapshotExecutionClock = (totalSeconds: number) => {
  if (!Number.isFinite(totalSeconds) || totalSeconds <= 0) return '0s'
  const seconds = Math.floor(totalSeconds)
  const days = Math.floor(seconds / 86400)
  const hours = Math.floor((seconds % 86400) / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const rest = seconds % 60
  if (days > 0) return hours > 0 ? `${days}d${hours}h` : `${days}d`
  if (hours > 0) return minutes > 0 ? `${hours}h${minutes}m` : `${hours}h`
  if (minutes > 0) return rest > 0 ? `${minutes}m${rest}s` : `${minutes}m`
  return `${rest}s`
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
    return formatSnapshotExecutionClock(seconds)
  }
  const minutes = execution?.execution_minutes
  if (typeof minutes === 'number' && Number.isFinite(minutes) && minutes > 0) {
    return formatSnapshotExecutionClock(minutes * 60)
  }
  const startedAt = execution?.started_at || 0
  const endedAt = execution?.ended_at || 0
  if (!startedAt) return labels.empty
  if (!endedAt) return labels.running
  return formatSnapshotExecutionClock(endedAt - startedAt)
}
