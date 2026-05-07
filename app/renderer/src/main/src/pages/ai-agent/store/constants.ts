import type { DialogueRecord } from './type'

// 新增表时：在 REGISTERED_STORES 末尾追加表名，并将 dbVersion 加 1。
export const dbVersion = 1
// 整个 AI 聊天消息存储共用同一个 IndexedDB 数据库。
export const DB_NAME = 'aiChatMessageDB'
// 需要按版本升级自动创建的消息表列表。
export const REGISTERED_STORES = ['taskDB', 'freeDB'] as const
// session 级元数据使用独立表。
export const SESSION_METADATA_STORE = 'sessionMetadata'

// 消息表主键：同一 session 下用消息 id 唯一定位一条记录。
export const COMPOUND_KEY: [keyof DialogueRecord, keyof DialogueRecord] = ['sessionId', 'id']

// 消息表排序索引：支持按 session 内的 orderNum 做分页读取。
export const SESSION_ORDER: [keyof DialogueRecord, keyof DialogueRecord] = ['sessionId', 'orderNum']

export const INDEX_BY_SESSION_ORDER = 'bySessionIdAndOrderNum'
