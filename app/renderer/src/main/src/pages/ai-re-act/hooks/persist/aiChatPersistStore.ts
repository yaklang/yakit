import type { AIAgentGrpcApi } from '../grpcApi'
import type { AIChatQSData, SessionRenderContent } from '../aiRender'
import type { DeleteSessionsAISourceType } from '@/pages/ai-agent/historyChat/utils'
import {
  DB_NAME,
  DB_VERSION,
  INDEX_BY_SESSION_ID,
  INDEX_BY_SOURCE,
  SESSION_CONTENT_STORE,
  SESSION_REFERENCE_STORE,
  SESSION_RENDER_STORE,
} from './constants'
import type {
  SessionContentUpdater,
  SessionReferenceItem,
  SessionReferenceRecord,
  SessionRenderRecord,
  SessionContentRecord,
  SessionContentItem,
} from './type'

/**
 * AI 会话独立持久化 Store（IndexedDB）
 * - 三表：sessionRender / sessionContent / sessionReference
 * - 直接存结构化对象（structured clone），不做整包 JSON.stringify
 * - 单例 lazy-open：缓存 dbPromise，读写内 await open() 兜底
 */
export class AIChatPersistStore {
  private dbPromise: Promise<IDBDatabase> | null = null
  /** 本次主渲染端加载的清库屏障；成功后保留，close / 组件重挂不重复清库 */
  private startupClearPromise: Promise<void> | null = null

  /**
   * 打开（或复用）数据库连接；首次调用时建库建表。
   * 首次打开清空三张缓存表；所有读写等待清理事务提交，失败允许下次重试。
   */
  async open(): Promise<IDBDatabase> {
    if (!this.dbPromise) {
      this.dbPromise = this.openDatabase().catch((error) => {
        this.dbPromise = null
        throw error
      })
    }
    const db = await this.dbPromise
    await this.ensureStartupClear(db)
    return db
  }

  private openDatabase(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION)
      req.onerror = () => reject(req.error)
      req.onsuccess = () => resolve(req.result)
      req.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result

        // 表1：会话渲染树，主键 [sessionId, source]；bySource 便于按来源批量查/删
        if (!db.objectStoreNames.contains(SESSION_RENDER_STORE)) {
          const renderStore = db.createObjectStore(SESSION_RENDER_STORE, {
            keyPath: ['sessionId', 'source'],
          })
          renderStore.createIndex(INDEX_BY_SOURCE, 'source', { unique: false })
        }

        // 表2：会话正文，主键 [sessionId, token]；按 session 批量删用 bySessionId
        if (!db.objectStoreNames.contains(SESSION_CONTENT_STORE)) {
          const contentStore = db.createObjectStore(SESSION_CONTENT_STORE, {
            keyPath: ['sessionId', 'token'],
          })
          contentStore.createIndex(INDEX_BY_SESSION_ID, 'sessionId', { unique: false })
        }

        // 表3：参考资料，主键 [sessionId, token]；按 session 批量删用 bySessionId
        if (!db.objectStoreNames.contains(SESSION_REFERENCE_STORE)) {
          const refStore = db.createObjectStore(SESSION_REFERENCE_STORE, {
            keyPath: ['sessionId', 'token'],
          })
          refStore.createIndex(INDEX_BY_SESSION_ID, 'sessionId', { unique: false })
        }
      }
    })
  }

  /** 每个主渲染端运行周期只清理一次；失败不允许读写绕过初始化。 */
  private ensureStartupClear(db: IDBDatabase): Promise<void> {
    if (!this.startupClearPromise) {
      this.startupClearPromise = this.clearAllStores(db).catch((error) => {
        this.startupClearPromise = null
        throw error
      })
    }
    return this.startupClearPromise
  }

  private clearAllStores(db: IDBDatabase): Promise<void> {
    return new Promise((resolve, reject) => {
      const tx = db.transaction([SESSION_RENDER_STORE, SESSION_CONTENT_STORE, SESSION_REFERENCE_STORE], 'readwrite')
      tx.oncomplete = () => resolve()
      tx.onabort = () => reject(tx.error || new Error('IDB transaction aborted'))
      tx.objectStore(SESSION_RENDER_STORE).clear()
      tx.objectStore(SESSION_CONTENT_STORE).clear()
      tx.objectStore(SESSION_REFERENCE_STORE).clear()
    })
  }

  /** 关闭数据库连接并清空缓存的 Promise */
  async close(): Promise<void> {
    if (!this.dbPromise) return
    const db = await this.dbPromise
    db.close()
    this.dbPromise = null
  }

  /** 写入/覆盖会话渲染快照（content + grpcOffset 同写） */
  async setSessionRender(
    sessionId: string,
    source: DeleteSessionsAISourceType,
    content: SessionRenderContent,
    grpcOffset: number,
  ): Promise<void> {
    const db = await this.open()
    return new Promise((resolve, reject) => {
      const tx = db.transaction(SESSION_RENDER_STORE, 'readwrite')
      const store = tx.objectStore(SESSION_RENDER_STORE)
      const record: SessionRenderRecord = { sessionId, source, content, grpcOffset }
      store.put(record)
      tx.oncomplete = () => resolve()
      tx.onabort = () => reject(tx.error || new Error('IDB transaction aborted'))
    })
  }

  /** 读取会话渲染整行（含 grpcOffset） */
  async getSessionRender(
    sessionId: string,
    source: DeleteSessionsAISourceType,
  ): Promise<SessionRenderRecord | undefined> {
    const db = await this.open()
    return new Promise((resolve, reject) => {
      const tx = db.transaction(SESSION_RENDER_STORE, 'readonly')
      const store = tx.objectStore(SESSION_RENDER_STORE)
      const req = store.get([sessionId, source])
      req.onsuccess = () => {
        resolve(req.result as SessionRenderRecord | undefined)
      }
      req.onerror = () => reject(req.error)
    })
  }

  /** 写入/覆盖单条参考资料（token 由调用方在收数时 uuidv4 生成；写入时记录 createdAt） */
  async setSessionReference(
    sessionId: string,
    token: string,
    content: AIAgentGrpcApi.ReferenceMaterialPayload,
  ): Promise<void> {
    const db = await this.open()
    return new Promise((resolve, reject) => {
      const tx = db.transaction(SESSION_REFERENCE_STORE, 'readwrite')
      const store = tx.objectStore(SESSION_REFERENCE_STORE)
      const record: SessionReferenceRecord = {
        sessionId,
        token,
        createdAt: Date.now(),
        content,
      }
      store.put(record)
      tx.oncomplete = () => resolve()
      tx.onabort = () => reject(tx.error || new Error('IDB transaction aborted'))
    })
  }

  /**
   * 按 token 列表批量取参考资料；缺的跳过，返回按存入时间 createdAt 正序。
   * 主键并行 get（适合一次最多约几十个 token，避免 getAll 整 session 过读）。
   */
  async getSessionReferences(sessionId: string, tokens: string[]): Promise<SessionReferenceItem[]> {
    if (!tokens.length) return []
    const db = await this.open()
    return new Promise((resolve, reject) => {
      const tx = db.transaction(SESSION_REFERENCE_STORE, 'readonly')
      const store = tx.objectStore(SESSION_REFERENCE_STORE)
      const result: SessionReferenceItem[] = []
      let pending = tokens.length
      let failed = false

      tokens.forEach((token) => {
        const req = store.get([sessionId, token])
        req.onsuccess = () => {
          if (failed) return
          const row = req.result as SessionReferenceRecord | undefined
          if (row) {
            result.push({
              token: row.token,
              createdAt: row.createdAt ?? 0,
              content: row.content,
            })
          }
          pending -= 1
          if (pending === 0) {
            result.sort((a, b) => a.createdAt - b.createdAt)
            resolve(result)
          }
        }
        req.onerror = () => {
          if (failed) return
          failed = true
          reject(req.error)
        }
      })
    })
  }

  /** 读取单条会话正文 */
  async getSessionContent(sessionId: string, token: string): Promise<AIChatQSData | undefined> {
    const db = await this.open()
    return new Promise((resolve, reject) => {
      const tx = db.transaction(SESSION_CONTENT_STORE, 'readonly')
      const store = tx.objectStore(SESSION_CONTENT_STORE)
      const req = store.get([sessionId, token])
      req.onsuccess = () => {
        const row = req.result as SessionContentRecord | undefined
        resolve(row?.content)
      }
      req.onerror = () => reject(req.error)
    })
  }

  /** 删除单条会话正文（如 QUESTION 前端 uuid 被后端 id 替换后清孤儿行） */
  async deleteSessionContent(sessionId: string, token: string): Promise<void> {
    const db = await this.open()
    return new Promise((resolve, reject) => {
      const tx = db.transaction(SESSION_CONTENT_STORE, 'readwrite')
      const store = tx.objectStore(SESSION_CONTENT_STORE)
      store.delete([sessionId, token])
      tx.oncomplete = () => resolve()
      tx.onabort = () => reject(tx.error || new Error('IDB transaction aborted'))
    })
  }

  /**
   * 按 token 列表批量取会话正文；缺的跳过，返回顺序尽量跟入参 tokens 一致。
   * 主键并行 get（适合一次最多约几十个 token）。
   */
  async getSessionContents(sessionId: string, tokens: string[]): Promise<SessionContentItem[]> {
    if (!tokens.length) return []
    const db = await this.open()
    return new Promise((resolve, reject) => {
      const tx = db.transaction(SESSION_CONTENT_STORE, 'readonly')
      const store = tx.objectStore(SESSION_CONTENT_STORE)
      const result: Array<SessionContentItem | undefined> = new Array(tokens.length)
      let pending = tokens.length
      let failed = false

      tokens.forEach((token, index) => {
        const req = store.get([sessionId, token])
        req.onsuccess = () => {
          if (failed) return
          const row = req.result as SessionContentRecord | undefined
          if (row) {
            result[index] = { token: row.token, content: row.content }
          }
          pending -= 1
          if (pending === 0) {
            resolve(result.filter((item): item is SessionContentItem => !!item))
          }
        }
        req.onerror = () => {
          if (failed) return
          failed = true
          reject(req.error)
        }
      })
    })
  }

  /**
   * 同事务 get → updater → put，写入/更新会话正文。
   * updater 收到旧值（可能 undefined），必须返回完整 AIChatQSData。
   */
  async setSessionContent(sessionId: string, token: string, updater: SessionContentUpdater): Promise<AIChatQSData> {
    const db = await this.open()
    return new Promise((resolve, reject) => {
      const tx = db.transaction(SESSION_CONTENT_STORE, 'readwrite')
      const store = tx.objectStore(SESSION_CONTENT_STORE)
      let result: AIChatQSData
      /** 保留 updater / put 的同步异常，但必须等事务真正中止后才拒绝写入 Promise。 */
      let updateError: unknown
      tx.oncomplete = () => resolve(result)
      tx.onabort = () => reject(updateError ?? tx.error ?? new Error('IDB transaction aborted'))
      const getReq = store.get([sessionId, token])

      getReq.onsuccess = () => {
        const oldRow = getReq.result as SessionContentRecord | undefined
        try {
          const next = updater(oldRow?.content)
          const record: SessionContentRecord = { sessionId, token, content: next }
          result = next
          store.put(record)
        } catch (err) {
          updateError = err
          tx.abort()
        }
      }
    })
  }

  /**
   * 在同一事务中检查指定 session 的三表记录，有记录才删除；事务提交后完成。
   * - sessionRender：复合主键前缀无法直接 range 删，用游标扫 sessionId
   * - sessionContent / sessionReference：走 bySessionId 索引
   */
  async deleteSessionPersist(sessionId: string): Promise<void> {
    const db = await this.open()
    return new Promise((resolve, reject) => {
      const tx = db.transaction([SESSION_RENDER_STORE, SESSION_CONTENT_STORE, SESSION_REFERENCE_STORE], 'readwrite')

      tx.oncomplete = () => resolve()
      tx.onabort = () => reject(tx.error || new Error('IDB transaction aborted'))

      // 表1：复合主键 [sessionId, source]，用前缀范围删除该 session 全部 source
      const renderStore = tx.objectStore(SESSION_RENDER_STORE)
      const renderRange = IDBKeyRange.bound([sessionId, ''], [sessionId, '\uffff'])
      const renderKeysReq = renderStore.getAllKeys(renderRange)
      renderKeysReq.onsuccess = () => {
        for (const key of renderKeysReq.result) {
          renderStore.delete(key)
        }
      }

      // 表2 / 表3：索引批量删
      const deleteBySessionIndex = (storeName: string) => {
        const store = tx.objectStore(storeName)
        const index = store.index(INDEX_BY_SESSION_ID)
        const keysReq = index.getAllKeys(IDBKeyRange.only(sessionId))
        keysReq.onsuccess = () => {
          for (const key of keysReq.result) {
            store.delete(key)
          }
        }
      }
      deleteBySessionIndex(SESSION_CONTENT_STORE)
      deleteBySessionIndex(SESSION_REFERENCE_STORE)
    })
  }

  /**
   * 按 source 删除该来源下所有 session 在三表中的全部数据。
   * - 用 sessionRender.bySource 索引直接取该 source 的主键列表（不必全表扫）
   * - 删渲染行后，再按 sessionId 清 sessionContent / sessionReference
   */
  async deletePersistBySource(source: DeleteSessionsAISourceType): Promise<void> {
    const db = await this.open()
    return new Promise((resolve, reject) => {
      const tx = db.transaction([SESSION_RENDER_STORE, SESSION_CONTENT_STORE, SESSION_REFERENCE_STORE], 'readwrite')

      tx.oncomplete = () => resolve()
      tx.onabort = () => reject(tx.error || new Error('IDB transaction aborted'))

      const renderStore = tx.objectStore(SESSION_RENDER_STORE)
      const sourceIndex = renderStore.index(INDEX_BY_SOURCE)

      // 等价 SQL: SELECT primaryKey FROM sessionRender WHERE source = ?
      const keysReq = sourceIndex.getAllKeys(IDBKeyRange.only(source))
      keysReq.onsuccess = () => {
        const keys = keysReq.result as Array<[string, DeleteSessionsAISourceType]>
        const sessionIds = new Set<string>()

        for (const key of keys) {
          sessionIds.add(key[0])
          renderStore.delete(key)
        }

        const deleteBySessionIndex = (storeName: string, sessionId: string) => {
          const store = tx.objectStore(storeName)
          const index = store.index(INDEX_BY_SESSION_ID)
          const sessionKeysReq = index.getAllKeys(IDBKeyRange.only(sessionId))
          sessionKeysReq.onsuccess = () => {
            for (const key of sessionKeysReq.result) {
              store.delete(key)
            }
          }
        }

        for (const sessionId of sessionIds) {
          deleteBySessionIndex(SESSION_CONTENT_STORE, sessionId)
          deleteBySessionIndex(SESSION_REFERENCE_STORE, sessionId)
        }
      }
    })
  }

  /** 清空三表全部持久化数据（全库清删） */
  async deleteAllPersist(): Promise<void> {
    const db = await this.open()
    return this.clearAllStores(db)
  }
}

const aiChatPersistStore = new AIChatPersistStore()

export default aiChatPersistStore
