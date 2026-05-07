import type { REGISTERED_STORES } from './constants'

export type StoreName = (typeof REGISTERED_STORES)[number]

// 一条聊天消息记录，对应消息表中的单行数据。
export interface DialogueRecord {
  id: string
  orderNum: number
  type: string
  content: string
  isGroup: boolean
  sessionId: string
  isHistory?: boolean
}

export interface GetDialoguesData {
  items: DialogueRecord[]
  hasMore: boolean
}

// 读取消息时的分页参数。
export interface GetDialoguesParams {
  storeName: StoreName
  sessionId: string
  id?: string
  limit?: number
  desc?: boolean
}

export interface SetDialoguesParams {
  storeName: StoreName
  data: DialogueRecord | DialogueRecord[]
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
