import { useSyncExternalStore } from 'react'
import { RemoteHistoryGV } from '@/enums/history'
import { setRemoteValue } from '@/utils/kv'
import { createExternalStore } from '@/utils/createExternalStore'

const DEFAULT_BINARY_DISPLAY_ENABLED = true

const store = createExternalStore(DEFAULT_BINARY_DISPLAY_ENABLED)

void setRemoteValue(RemoteHistoryGV.BinaryDisplayEnabled, 'true')

export const binaryDisplayEnabledStore = {
  subscribe(listener: () => void) {
    return store.subscribe(listener)
  },
  getSnapshot: store.getSnapshot,
  setEnabled(_enabled: boolean) {
    store.setSnapshot(() => DEFAULT_BINARY_DISPLAY_ENABLED)
    void setRemoteValue(RemoteHistoryGV.BinaryDisplayEnabled, 'true')
  },
}

export function useBinaryDisplayEnabled() {
  return useSyncExternalStore(binaryDisplayEnabledStore.subscribe, binaryDisplayEnabledStore.getSnapshot)
}
