import { useEffect, useRef, useState } from 'react'
import { AITaskStatus } from './grpcApi'
import {
  elapsedSessionSnapshotExecutionSeconds,
  formatSessionSnapshotExecutionDuration,
  formatSnapshotExecutionClock,
  releaseSessionSnapshotExecutionClock,
  type SnapshotExecutionDurationSource,
} from './sessionSnapshotExecution'

type ExecutionClock = SnapshotExecutionDurationSource & { status?: string }

/** 连接还在但问题已结束时不应继续加；关会话 / 等人回复前也不加 */
export const isSessionSnapshotClockActive = (session: {
  execute?: boolean
  pendingReply?: boolean
  chatStatus?: string
}) => !!session.execute && (session.chatStatus === AITaskStatus.inProgress || !!session.pendingReply)

/** processing 且会话仍在执行时，在后端 execution_seconds 上按墙钟自增；clockKey 变了从后端秒数重新计 */
export const useSessionSnapshotExecutionDuration = (
  execution: ExecutionClock | undefined,
  labels: { empty: string; running: string },
  clockKey = '',
  sessionActive = true,
): string => {
  const [, setTick] = useState(0)
  const previousClockKeyRef = useRef(clockKey)
  const base = execution?.execution_seconds
  const running =
    sessionActive && execution?.status === 'processing' && typeof base === 'number' && Number.isFinite(base)
  useEffect(() => {
    const previousClockKey = previousClockKeyRef.current
    if (previousClockKey === clockKey) return
    releaseSessionSnapshotExecutionClock(previousClockKey)
    previousClockKeyRef.current = clockKey
  }, [clockKey])
  useEffect(() => {
    if (running) return
    releaseSessionSnapshotExecutionClock(clockKey)
  }, [running, clockKey])
  useEffect(() => {
    if (!running) return
    const timer = window.setInterval(() => setTick((value) => value + 1), 1000)
    return () => window.clearInterval(timer)
  }, [running, clockKey])

  if (!running) return formatSessionSnapshotExecutionDuration(execution, labels)
  return formatSnapshotExecutionClock(Math.max(0, Math.floor(base)) + elapsedSessionSnapshotExecutionSeconds(clockKey))
}
