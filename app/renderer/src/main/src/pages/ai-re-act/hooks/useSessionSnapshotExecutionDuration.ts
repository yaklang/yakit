import { useEffect, useRef, useState } from 'react'
import { AITaskStatus } from './grpcApi'
import {
  elapsedSessionSnapshotExecutionSeconds,
  formatSessionSnapshotExecutionDuration,
  formatSnapshotExecutionClock,
  releaseSessionSnapshotExecutionClock,
  retainSessionSnapshotExecutionClock,
  type SnapshotExecutionDurationSource,
} from './sessionSnapshotExecution'

type ExecutionClock = SnapshotExecutionDurationSource & { status?: string }

/** 连接还在但问题已结束时不应继续加；关会话 / 等人回复前也不加 */
export const isSessionSnapshotClockActive = (session: {
  execute?: boolean
  pendingReply?: boolean
  chatStatus?: string
}) => !!session.execute && (session.chatStatus === AITaskStatus.inProgress || !!session.pendingReply)

/** processing 且会话仍在执行时，在后端 execution_seconds 上按墙钟自增；本实例换 key 或停止后只释放自己的引用 */
export const useSessionSnapshotExecutionDuration = (
  execution: ExecutionClock | undefined,
  labels: { empty: string; running: string },
  clockKey = '',
  sessionActive = true,
): string => {
  const [, setTick] = useState(0)
  const heldKeyRef = useRef('')
  const base = execution?.execution_seconds
  const running =
    sessionActive && execution?.status === 'processing' && typeof base === 'number' && Number.isFinite(base)
  useEffect(() => {
    return () => {
      const held = heldKeyRef.current
      if (!held) return
      releaseSessionSnapshotExecutionClock(held, { keepAnchor: true })
      heldKeyRef.current = ''
    }
  }, [])
  useEffect(() => {
    const nextHeld = running && clockKey ? clockKey : ''
    const previousHeld = heldKeyRef.current
    if (previousHeld === nextHeld) return
    if (previousHeld) releaseSessionSnapshotExecutionClock(previousHeld)
    if (nextHeld) retainSessionSnapshotExecutionClock(nextHeld)
    heldKeyRef.current = nextHeld
  }, [running, clockKey])
  useEffect(() => {
    if (!running) return
    const timer = window.setInterval(() => setTick((value) => value + 1), 1000)
    return () => window.clearInterval(timer)
  }, [running, clockKey])

  if (!running) return formatSessionSnapshotExecutionDuration(execution, labels)
  return formatSnapshotExecutionClock(Math.max(0, Math.floor(base)) + elapsedSessionSnapshotExecutionSeconds(clockKey))
}
