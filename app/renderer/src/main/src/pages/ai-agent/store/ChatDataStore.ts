import type { SetStateAction } from 'react'

/**
 * 旧嵌入式页面仍会把这个对象作为标识传给 Provider；AI 主会话已经迁移到
 * ChatMultiSessionController。这里仅保留子窗口静态渲染需要的轻量兼容容器。
 */
export class ChatDataStore {
  private map = new Map<string, any>()

  create(session: string) {
    const data = {
      casualChat: { elements: [], contents: new Map(), planDetails: {} },
      taskChat: { elements: [], contents: new Map() },
    }
    this.map.set(session, data)
    return data
  }

  has(session: string) {
    return this.map.has(session)
  }

  get(session: string) {
    return this.map.get(session)
  }

  set(session: string, value: SetStateAction<any>) {
    const previous = this.map.get(session)
    this.map.set(session, typeof value === 'function' ? value(previous) : value)
  }

  updater(session: string, value: Record<string, any>) {
    this.map.set(session, { ...this.map.get(session), ...value })
  }

  remove(session: string) {
    this.map.delete(session)
  }

  clear() {
    this.map.clear()
  }
}

export const aiChatDataStore = new ChatDataStore()
export const knowledgeBaseDataStore = new ChatDataStore()
export const histroyAiStore = new ChatDataStore()
export const FlowAiStore = new ChatDataStore()
export const irifyAiCodeAuditPageAiStore = new ChatDataStore()
export const yakRunnerPageAiStore = new ChatDataStore()

export class WebFuzzerAiStore extends ChatDataStore {
  constructor(public readonly fuzzerPageId: string) {
    super()
  }
}

export type ChatDataStoreKey =
  | 'aiChatDataStore'
  | 'knowledgeBaseDataStore'
  | 'histroyAiStore'
  | 'FlowAiStore'
  | 'irifyAiCodeAuditPageAiStore'
  | 'yakRunnerPageAiStore'
  | 'WebFuzzerAiStore'
  | 'unknown'
