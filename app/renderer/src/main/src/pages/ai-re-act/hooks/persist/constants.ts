/** AI 会话持久化 IndexedDB 库名（与旧 aiChatMessageDB 隔离） */
export const DB_NAME = 'aiChatPersistDB'

/** 数据库版本号（升版本会触发 onupgradeneeded，用于加表/加索引） */
export const DB_VERSION = 1

/** 会话渲染树表：items / groups / tasks / 列表元素 */
export const SESSION_RENDER_STORE = 'sessionRender'

/** 会话正文表：整条 AIChatQSData（reference 仅为 token 列表） */
export const SESSION_CONTENT_STORE = 'sessionContent'

/** 会话参考资料表：单条 ReferenceMaterialPayload */
export const SESSION_REFERENCE_STORE = 'sessionReference'

/** 按 sessionId 批量列出/删除用的索引名（建在 sessionContent / sessionReference） */
export const INDEX_BY_SESSION_ID = 'bySessionId'

/** 按 source 查询/删除用的索引名（建在 sessionRender） */
export const INDEX_BY_SOURCE = 'bySource'
