import type { StoreName } from './constants'

export type { StoreName }

// 一条聊天消息记录，对应消息表中的单行数据。
export interface DialogueRecord {
  token: string
  cacheOrder: number
  type: string
  isGroup: boolean
  children?: string
  sessionId: string
  isCached?: boolean
}

export interface DialogueContentRecord {
  sessionId: string
  token: string
  content: string
  pToken: string
}

export interface GetDialoguesData {
  items: DialogueRecord[]
  hasMore: boolean
}

// 读取消息时的分页参数。
export interface GetDialoguesParams {
  storeName: StoreName
  sessionId: string
  token?: string
  limit?: number
  desc?: boolean
}

export interface SetDialoguesParams {
  storeName: StoreName
  data: DialogueRecord | DialogueRecord[]
}

export interface SetDialogueContentParams {
  data: DialogueContentRecord | DialogueContentRecord[]
}

export interface GetDialogueContentsByPidParams {
  sessionId: string
  pTokens: string[]
}

export interface ClearStoreParams {
  storeName: StoreName | typeof import('./constants').SESSION_METADATA_STORE
}

export interface DeleteSessionParams {
  storeNames: StoreName[]
  sessionId: string
}

// session 级元数据，目前只维护 offset。
export interface SessionMetadataRecord {
  sessionId: string
  offset: number
}
