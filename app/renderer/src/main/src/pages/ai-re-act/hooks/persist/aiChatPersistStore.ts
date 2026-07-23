import type { AISource, AIAgentGrpcApi } from '../grpcApi'
import type { AIChatQSData, SessionRenderContent } from '../aiRender'
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
class AIChatPersistStore {
  private dbPromise: Promise<IDBDatabase> | null = null

  /**
   * 打开（或复用）数据库连接；首次调用时建库建表。
   */
  open(): Promise<IDBDatabase> {
    if (!this.dbPromise) {
      this.dbPromise = new Promise((resolve, reject) => {
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
    return this.dbPromise
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
    source: AISource,
    content: SessionRenderContent,
    grpcOffset: number,
  ): Promise<void> {
    const db = await this.open()
    return new Promise((resolve, reject) => {
      const tx = db.transaction(SESSION_RENDER_STORE, 'readwrite')
      const store = tx.objectStore(SESSION_RENDER_STORE)
      const record: SessionRenderRecord = { sessionId, source, content, grpcOffset }
      const req = store.put(record)
      req.onsuccess = () => resolve()
      req.onerror = () => reject(req.error)
    })
  }

  /** 读取会话渲染整行（含 grpcOffset） */
  async getSessionRender(sessionId: string, source: AISource): Promise<SessionRenderRecord | undefined> {
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
      const req = store.put(record)
      req.onsuccess = () => resolve()
      req.onerror = () => reject(req.error)
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
      const req = store.delete([sessionId, token])
      req.onsuccess = () => resolve()
      req.onerror = () => reject(req.error)
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
      const getReq = store.get([sessionId, token])

      getReq.onsuccess = () => {
        const oldRow = getReq.result as SessionContentRecord | undefined
        try {
          const next = updater(oldRow?.content)
          const record: SessionContentRecord = { sessionId, token, content: next }
          const putReq = store.put(record)
          putReq.onsuccess = () => resolve(next)
          putReq.onerror = () => reject(putReq.error)
        } catch (err) {
          reject(err)
        }
      }
      getReq.onerror = () => reject(getReq.error)
    })
  }

  /**
   * 清除指定 session 在三表中的全部记录。
   * - sessionRender：复合主键前缀无法直接 range 删，用游标扫 sessionId
   * - sessionContent / sessionReference：走 bySessionId 索引
   */
  async deleteSessionPersist(sessionId: string): Promise<void> {
    const db = await this.open()
    return new Promise((resolve, reject) => {
      const tx = db.transaction([SESSION_RENDER_STORE, SESSION_CONTENT_STORE, SESSION_REFERENCE_STORE], 'readwrite')

      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)

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
  async deletePersistBySource(source: AISource): Promise<void> {
    const db = await this.open()
    return new Promise((resolve, reject) => {
      const tx = db.transaction([SESSION_RENDER_STORE, SESSION_CONTENT_STORE, SESSION_REFERENCE_STORE], 'readwrite')

      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)

      const renderStore = tx.objectStore(SESSION_RENDER_STORE)
      const sourceIndex = renderStore.index(INDEX_BY_SOURCE)

      // 等价 SQL: SELECT primaryKey FROM sessionRender WHERE source = ?
      const keysReq = sourceIndex.getAllKeys(IDBKeyRange.only(source))
      keysReq.onsuccess = () => {
        const keys = keysReq.result as Array<[string, AISource]>
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
      keysReq.onerror = () => reject(keysReq.error)
    })
  }
}

const aiChatPersistStore = new AIChatPersistStore()

export default aiChatPersistStore
