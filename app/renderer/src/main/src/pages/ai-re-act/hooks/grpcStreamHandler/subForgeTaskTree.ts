import type { AIMessageHandler } from '../type'
import { Uint8ArrayToString } from '@/utils/str'
import { mergeSubForgeRun, parseSubForgeTaskTree } from '../subForgeTaskTree'

export const handleSubForgeTaskTree: AIMessageHandler = ({ res, store, pushLog }) => {
  const snapshot = parseSubForgeTaskTree(Uint8ArrayToString(res.Content) || '')
  if (!snapshot || (res.CoordinatorId && res.CoordinatorId !== snapshot.parent_coordinator_id)) {
    pushLog({ level: 'error', message: 'Invalid sub-Forge task tree snapshot' })
    return
  }
  const runs = store.getState().subForgeRuns
  const previous = runs[snapshot.child_coordinator_id]
  const next = mergeSubForgeRun(previous, snapshot, !!res.IsSync)
  if (next !== previous)
    store.getState().updateState({ subForgeRuns: { ...runs, [snapshot.child_coordinator_id]: next } })
}
