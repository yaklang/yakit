import { bindExternalStoreHook, createExternalStore } from '@/utils/createExternalStore'

interface ToolMutationResult {
  toolNames: Set<string>
  enable: boolean
}

interface ToolMutationState {
  updatingTool: string
  batchProgress: { completed: number; total: number } | null
  result: ToolMutationResult | null
}

const store = createExternalStore<ToolMutationState>({ updatingTool: '', batchProgress: null, result: null })
let pending: Promise<void> | null = null
let resolvePending: (() => void) | undefined

// Settings panels unmount on navigation, but their IPC writes must retain one shared owner.
export const yakMcpToolMutation = {
  start(updatingTool: string, total?: number) {
    if (pending) return false
    pending = new Promise<void>((resolve) => {
      resolvePending = resolve
    })
    store.setSnapshot((prev) => ({
      ...prev,
      updatingTool,
      batchProgress: total === undefined ? null : { completed: 0, total },
    }))
    return true
  },
  progress(completed: number, total: number) {
    store.setSnapshot((prev) => ({ ...prev, batchProgress: { completed, total } }))
  },
  finish(result: ToolMutationResult | null) {
    store.setSnapshot(() => ({ updatingTool: '', batchProgress: null, result }))
    pending = null
    resolvePending?.()
    resolvePending = undefined
  },
  async waitUntilIdle() {
    while (pending) await pending
  },
}

export const useYakMcpToolMutation = bindExternalStoreHook(store)
