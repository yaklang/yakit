import { bindExternalStoreHook, createExternalStore } from '@/utils/createExternalStore'

/**
 * 编辑器「快捷操作栏」显隐开关（全局共享）
 */
const store = createExternalStore<boolean>(true)

export const editorActionBarStore = {
  subscribe: store.subscribe,
  getShowActionBar: store.getSnapshot,
  setShowActionBar(updater: (prev: boolean) => boolean) {
    store.setSnapshot((prev) => updater(prev))
  },
}

export const useShowActionBar = bindExternalStoreHook(store)
