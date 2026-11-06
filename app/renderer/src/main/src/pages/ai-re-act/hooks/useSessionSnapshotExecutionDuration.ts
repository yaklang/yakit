import { useEffect, useState } from 'react'
import {
  elapsedSessionSnapshotExecutionSeconds,
  formatSessionSnapshotExecutionDuration,
  formatSnapshotExecutionClock,
  type SnapshotExecutionDurationSource,
} from './sessionSnapshotExecution'

type ExecutionClock = SnapshotExecutionDurationSource & { status?: string }

/** processing 时在后端 execution_seconds 上按墙钟自增；clockKey 变了从后端秒数重新计 */
export const useSessionSnapshotExecutionDuration = (
  execution: ExecutionClock | undefined,
  labels: { empty: string; running: string },
  clockKey = '',
): string => {
  const [, setTick] = useState(0)
  const base = execution?.execution_seconds
  const running = execution?.status === 'processing' && typeof base === 'number' && Number.isFinite(base)
  useEffect(() => {
    if (!running) return
    const timer = window.setInterval(() => setTick((value) => value + 1), 1000)
    return () => window.clearInterval(timer)
  }, [running, clockKey])

  if (!running) return formatSessionSnapshotExecutionDuration(execution, labels)
  return formatSnapshotExecutionClock(Math.max(0, Math.floor(base)) + elapsedSessionSnapshotExecutionSeconds(clockKey))
}
