import { bindExternalStoreHook, createExternalStore } from '@/utils/createExternalStore'
import { getRemoteValue, setRemoteValue } from '@/utils/kv'
import { HTTP_PACKET_EDITOR_Action_Bar } from '@/utils/editors'
import { JSONParseLog } from '@/utils/tool'

/**
 * 编辑器「快捷操作栏」显隐开关（全局共享）
 */
const store = createExternalStore<boolean>(true)

export const editorActionBarStore = {
  subscribe: store.subscribe,
  getShowActionBar: store.getSnapshot,
  initShowActionBar: async () => {
    try {
      const data = await getRemoteValue(HTTP_PACKET_EDITOR_Action_Bar)
      if (!data) return
      const obj = JSONParseLog(data, { page: 'editorActionBar', fun: 'initShowActionBar' })
      if (typeof obj?.showActionBar === 'boolean') {
        store.setSnapshot(() => obj.showActionBar)
      }
    } catch (e) {}
  },
  setShowActionBar(updater: (prev: boolean) => boolean) {
    store.setSnapshot((prev) => {
      const next = updater(prev)
      setRemoteValue(HTTP_PACKET_EDITOR_Action_Bar, JSON.stringify({ showActionBar: next }))
      return next
    })
  },
}

export const useShowActionBar = bindExternalStoreHook(store)
