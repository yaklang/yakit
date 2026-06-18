import type { DialogueContentRecord, DialogueRecord } from './type'

export const dbVersion = 3
// 所有业务共用同一个 IndexedDB 数据库。
export const DB_NAME = 'aiChatMessageDB'

// 业务域列表，每个域会自动生成对应的 TaskDB 和 CasualDB 表。
export const DOMAINS = ['ai', 'history', 'knowledgeBase', 'webFuzzer', 'flow', 'irify', 'yakRunner'] as const
export type Domain = (typeof DOMAINS)[number]

const BASE_STORE_SUFFIXES = ['TaskDB', 'CasualDB'] as const
type BaseStoreSuffix = (typeof BASE_STORE_SUFFIXES)[number]

export type StoreName = `${Domain}${BaseStoreSuffix}`

// 所有已注册的消息表，由 DOMAINS × BASE_STORE_SUFFIXES 自动生成。
export const REGISTERED_STORES: StoreName[] = DOMAINS.flatMap((d) =>
  BASE_STORE_SUFFIXES.map((s) => `${d}${s}` as StoreName),
)
// session 级元数据使用独立表。
export const SESSION_METADATA_STORE = 'sessionMetadata'
// 对话正文表（与 taskDB/casualDB 中的节点 id 对应）
export const DIALOGUE_CONTENT_STORE = 'dialogueContent'

// 消息表主键：同一 session 下用消息 id 唯一定位一条记录。
export const COMPOUND_KEY: [keyof DialogueRecord, keyof DialogueRecord] = ['sessionId', 'token']

// 消息表排序索引：支持按 session 内的 cacheOrder 做分页读取。
export const SESSION_ORDER: [keyof DialogueRecord, keyof DialogueRecord] = ['sessionId', 'cacheOrder']

export const INDEX_BY_SESSION_ORDER = 'bySessionIdAndCacheOrder'

// 对话正文表主键：sessionId + token 唯一定位一条正文。
export const CONTENT_COMPOUND_KEY: [keyof DialogueContentRecord, keyof DialogueContentRecord] = ['sessionId', 'token']
// 对话正文表 pToken 索引：用于按 group 节点 token 查询其所有子正文。
export const SESSION_PTOKEN: [keyof DialogueContentRecord, keyof DialogueContentRecord] = ['sessionId', 'pToken']
export const INDEX_BY_SESSION_PTOKEN = 'bySessionIdAndPToken'
// 对话正文表 sessionId 单字段索引：用于按 session 全量删除。
export const INDEX_BY_CONTENT_SESSION = 'byContentSessionId'
