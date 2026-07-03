import { useSyncExternalStore } from 'react'
import { RemoteHistoryGV } from '@/enums/history'
import { getRemoteValue, setRemoteValue } from '@/utils/kv'
import { createExternalStore } from '@/utils/createExternalStore'

const DEFAULT_BINARY_DISPLAY_ENABLED = true

const store = createExternalStore(DEFAULT_BINARY_DISPLAY_ENABLED)

const parseRemoteBinaryDisplayEnabled = (value?: string | null) => {
  if (value === 'false') return false
  return DEFAULT_BINARY_DISPLAY_ENABLED
}

let hydrated = false
let hydrating: Promise<void> | null = null

const hydrateFromRemote = () => {
  if (hydrated) return Promise.resolve()
  if (hydrating) return hydrating
  hydrating = getRemoteValue(RemoteHistoryGV.BinaryDisplayEnabled)
    .then((value) => {
      store.setSnapshot(() => parseRemoteBinaryDisplayEnabled(value))
      hydrated = true
    })
    .catch(() => {
      hydrated = true
    })
    .finally(() => {
      hydrating = null
    })
  return hydrating
}

export const binaryDisplayEnabledStore = {
  subscribe(listener: () => void) {
    void hydrateFromRemote()
    return store.subscribe(listener)
  },
  getSnapshot: store.getSnapshot,
  setEnabled(enabled: boolean) {
    store.setSnapshot(() => enabled)
    hydrated = true
    void setRemoteValue(RemoteHistoryGV.BinaryDisplayEnabled, enabled ? 'true' : 'false')
  },
}

export function useBinaryDisplayEnabled() {
  return useSyncExternalStore(binaryDisplayEnabledStore.subscribe, binaryDisplayEnabledStore.getSnapshot)
}
