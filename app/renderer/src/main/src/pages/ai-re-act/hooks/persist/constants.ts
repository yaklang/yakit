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

/**
 * 清空 IDB 的固定版本号（YYYYMMDD）。
 * 远程 KV 里存一份，打开库时比较。
 * 缺标识或旧于当前值 → 清空三表（旧 casualElements 快照不再兼容）。
 */
export const AIAgentIDBCacheClearValue = '20260814'

/** 远程 KV 中无标识，或标识早于当前版本时，需要清空 IDB */
export const shouldClearIDBCache = (flag?: string | null): boolean => {
  if (!flag) return true
  return flag < AIAgentIDBCacheClearValue
}
