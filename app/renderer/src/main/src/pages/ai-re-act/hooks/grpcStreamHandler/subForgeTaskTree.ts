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
    const filledTree = !previous.task_tree && !!snapshot.task_tree
    if (!upgraded && !filledTree) {
      if (!previous.historical || historical) return runs
      if (snapshot.status === 'running') return runs
    }
  }
  return {
    ...runs,
    [snapshot.child_coordinator_id]: { ...snapshot, historical: previous ? previous.historical : historical },
  }
}

const descendantRunIds = (runs: Record<string, SubForgeRun>, parentCoordinatorId: string) => {
  const ids = new Set<string>()
  const parents = new Set([parentCoordinatorId])
  let growing = true
  while (growing) {
    growing = false
    for (const [id, run] of Object.entries(runs)) {
      if (ids.has(id) || !parents.has(run.parent_coordinator_id)) continue
      ids.add(id)
      parents.add(run.child_coordinator_id)
      growing = true
    }
  }
  return ids
}

export function dropSubForgeRunsByParent(
  runs: Record<string, SubForgeRun>,
  parentCoordinatorId: string,
): Record<string, SubForgeRun> {
  const dropIds = descendantRunIds(runs, parentCoordinatorId)
  return Object.fromEntries(Object.entries(runs).filter(([id]) => !dropIds.has(id)))
}

export function freezeRunningSubForgeRuns(
  runs: Record<string, SubForgeRun>,
  parentCoordinatorId?: string,
): Record<string, SubForgeRun> {
  const freezeIds = parentCoordinatorId ? descendantRunIds(runs, parentCoordinatorId) : undefined
  return Object.fromEntries(
    Object.entries(runs).map(([id, run]) => [
      id,
      run.status === 'running' && (!freezeIds || freezeIds.has(id)) ? { ...run, historical: true } : run,
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
  const planCoordinatorId = store.getState().currentChatStatus.coordinatorId
  if (
    res.CoordinatorId &&
    res.CoordinatorId !== snapshot.parent_coordinator_id &&
    res.CoordinatorId !== snapshot.child_coordinator_id &&
    res.CoordinatorId !== planCoordinatorId
  ) {
    pushLog({ level: 'error', message: 'Invalid sub-Forge task tree snapshot' })
    return
  }
  store.getState().updateState({
    subForgeRuns: applySubForgeSnapshot(store.getState().subForgeRuns, snapshot, !!res.IsSync),
  })
}
