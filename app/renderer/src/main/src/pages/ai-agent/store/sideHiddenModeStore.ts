import { bindExternalStoreHook, createExternalStore } from '@/utils/createExternalStore'
import { RemoteAIAgentGV } from '@/enums/aiAgent'
import { getRemoteValue, setRemoteValue } from '@/utils/kv'

const store = createExternalStore(false)

let hydrated = false
/** 本地已写入时丢弃进行中的 hydrate，避免旧 KV 覆盖用户操作 */
let localDirty = false

const hydrate = () => {
  if (hydrated) return
  hydrated = true
  void Promise.resolve(getRemoteValue(RemoteAIAgentGV.AIAgentSideShowMode))
    .then((raw) => {
      if (localDirty) return
      store.setSnapshot(() => raw === 'true')
    })
    .catch(() => {})
}

export const useSideHiddenMode = bindExternalStoreHook({
  subscribe: (listener) => {
    hydrate()
    return store.subscribe(listener)
  },
  getSnapshot: store.getSnapshot,
  setSnapshot: store.setSnapshot,
})

export const isSideAutoHidden = () => {
  hydrate()
  return store.getSnapshot()
}

export const setSideHiddenMode = (autoHidden: boolean) => {
  localDirty = true
  store.setSnapshot(() => autoHidden)
  setRemoteValue(RemoteAIAgentGV.AIAgentSideShowMode, `${autoHidden}`)
}
