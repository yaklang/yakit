import type { ChatDataStore } from '@/pages/ai-agent/store/ChatDataStore'
import {
  aiChatDataStore,
  FlowAiStore,
  histroyAiStore,
  irifyAiCodeAuditPageAiStore,
  knowledgeBaseDataStore,
} from '@/pages/ai-agent/store/ChatDataStore'
import { collectConcurrentStreamContentEntries } from './collectConcurrentStreamContentEntries'
import type { ConcurrentStreamFramePayload } from '../concurrentStreamFrame'

const { ipcRenderer } = window.require('electron')

const FETCH_REQUEST = 'fetch-concurrent-stream-contents-request'

const defaultStoreProviders: Array<() => ChatDataStore | undefined> = [
  () => aiChatDataStore,
  () => knowledgeBaseDataStore,
  () => histroyAiStore,
  () => FlowAiStore,
  () => irifyAiCodeAuditPageAiStore,
]

const storeProviders = new Set<() => ChatDataStore | undefined>(defaultStoreProviders)

let bridgeReady = false

function resolveStoreForSession(session: string): ChatDataStore | undefined {
  for (const provider of storeProviders) {
    const store = provider()
    if (store?.get(session)) return store
  }
  for (const provider of storeProviders) {
    const store = provider()
    if (store) return store
  }
  return undefined
}

export function registerConcurrentStreamStoreProvider(provider: () => ChatDataStore | undefined) {
  storeProviders.add(provider)
  return () => {
    storeProviders.delete(provider)
  }
}

/** 主窗口：响应 aux 子窗的内容拉取 */
export function setupConcurrentStreamMainBridge() {
  if (bridgeReady) return
  bridgeReady = true

  ipcRenderer.on(FETCH_REQUEST, (_event, payload: ConcurrentStreamFramePayload & { requestId: string }) => {
    const { requestId, ...frame } = payload
    if (!requestId || !frame.session || !frame.token) return

    const store = resolveStoreForSession(frame.session)
    const contentEntries = collectConcurrentStreamContentEntries(store, frame)

    ipcRenderer.send(`fetch-concurrent-stream-contents-response-${requestId}`, { contentEntries })
  })
}
