import { bindExternalStoreHook, createExternalStore } from '@/utils/createExternalStore'

const THROTTLE_MS = 150

const store = createExternalStore('')

let pendingText = ''
/** 记录已出现过的 system stream EventUUID，只展示最新一条 */
let systemEventUUID: string[] = []
let throttleTimer: ReturnType<typeof setTimeout> | null = null

function flushPending() {
  throttleTimer = null
  store.setSnapshot(() => pendingText)
}

function scheduleFlush() {
  if (throttleTimer != null) return
  throttleTimer = setTimeout(flushPending, THROTTLE_MS)
}

/**
 * 系统流文案（IsSystem + stream），全局单例。
 * 目前仅任务规划 Footer 的 TaskLoading 订阅展示；若后续多会话并存需按 session 分桶。
 */
export const aiSystemStreamStore = {
  subscribe: store.subscribe,
  getSnapshot: store.getSnapshot,

  appendChunk(uuid: string, content: string) {
    const lastUUID = systemEventUUID[systemEventUUID.length - 1]
    if (lastUUID) {
      if (lastUUID === uuid) {
        pendingText = pendingText + content
      } else {
        if (systemEventUUID.includes(uuid)) return
        systemEventUUID.push(uuid)
        pendingText = content
      }
    } else {
      systemEventUUID.push(uuid)
      pendingText = content
    }
    scheduleFlush()
  },

  reset() {
    pendingText = ''
    systemEventUUID = []
    if (throttleTimer != null) {
      clearTimeout(throttleTimer)
      throttleTimer = null
    }
    store.setSnapshot(() => '')
  },
}

export const useAISystemStreamText = bindExternalStoreHook(store)
