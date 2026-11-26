import type { AIMessageHandler } from '../type'
import type { AIAgentGrpcApi } from '../grpcApi'
import { Uint8ArrayToString } from '@/utils/str'

export type SubForgeRun = AIAgentGrpcApi.SubForgeTaskTree & { historical: boolean }

const isTerminalStatus = (status: SubForgeRun['status']) => status !== 'running'

export function applySubForgeSnapshot(
  runs: Record<string, SubForgeRun>,
  snapshot: AIAgentGrpcApi.SubForgeTaskTree,
  historical: boolean,
): Record<string, SubForgeRun> {
  const previous = runs[snapshot.child_coordinator_id]
  if (previous && previous.revision > snapshot.revision) return runs
  if (previous && previous.revision === snapshot.revision) {
    const upgraded = !isTerminalStatus(previous.status) && isTerminalStatus(snapshot.status)
    if (!upgraded) {
      if (!previous.historical || historical) return runs
      if (snapshot.status === 'running') return runs
    }
  }
  return { ...runs, [snapshot.child_coordinator_id]: { ...snapshot, historical } }
}

export function dropSubForgeRunsByParent(
  runs: Record<string, SubForgeRun>,
  parentCoordinatorId: string,
): Record<string, SubForgeRun> {
  return Object.fromEntries(Object.entries(runs).filter(([, run]) => run.parent_coordinator_id !== parentCoordinatorId))
}

export function freezeRunningSubForgeRuns(
  runs: Record<string, SubForgeRun>,
  parentCoordinatorId?: string,
): Record<string, SubForgeRun> {
  return Object.fromEntries(
    Object.entries(runs).map(([id, run]) => [
      id,
      run.status === 'running' && (!parentCoordinatorId || run.parent_coordinator_id === parentCoordinatorId)
        ? { ...run, historical: true }
        : run,
    ]),
  )
}

export const handleSubForgeTaskTree: AIMessageHandler = ({ res, store, pushLog }) => {
  let snapshot: AIAgentGrpcApi.SubForgeTaskTree
  try {
    snapshot = JSON.parse(Uint8ArrayToString(res.Content) || '') as AIAgentGrpcApi.SubForgeTaskTree
  } catch {
    pushLog({ level: 'error', message: 'Invalid sub-Forge task tree snapshot' })
    return
  }
  if (!snapshot?.child_coordinator_id) {
    pushLog({ level: 'error', message: 'Invalid sub-Forge task tree snapshot' })
    return
  }
  if (
    res.CoordinatorId &&
    res.CoordinatorId !== snapshot.parent_coordinator_id &&
    res.CoordinatorId !== snapshot.child_coordinator_id
  ) {
    pushLog({ level: 'error', message: 'Invalid sub-Forge task tree snapshot' })
    return
  }
  store.getState().updateState({
    subForgeRuns: applySubForgeSnapshot(store.getState().subForgeRuns, snapshot, !!res.IsSync),
  })
}
