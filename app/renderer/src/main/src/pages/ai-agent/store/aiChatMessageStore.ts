import {
  COMPOUND_KEY,
  CONTENT_COMPOUND_KEY,
  DB_NAME,
  DOMAINS,
  dbVersion,
  DIALOGUE_CONTENT_STORE,
  INDEX_BY_CONTENT_SESSION,
  INDEX_BY_SESSION_ORDER,
  INDEX_BY_SESSION_PTOKEN,
  REGISTERED_STORES,
  SESSION_METADATA_STORE,
  SESSION_ORDER,
  SESSION_PTOKEN,
} from './constants'
import type {
  ClearStoreParams,
  DeleteSessionParams,
  DialogueContentRecord,
  DialogueRecord,
  GetDialogueContentsByPidParams,
  GetDialoguesData,
  GetDialoguesParams,
  SessionMetadataRecord,
  SetDialogueContentParams,
  SetDialoguesParams,
  StoreName,
} from './type'

// 在真正访问 IndexedDB 之前先做一次表名兜底校验，错误信息会比浏览器原生异常更直接。
function ensureRegisteredStore(storeName: string): asserts storeName is StoreName {
  if (!REGISTERED_STORES.includes(storeName as StoreName)) {
    throw new Error(` 未注册的 storeName: ${storeName}，请在 REGISTERED_STORES 中注册后重试。`)
  }
}

function ensureRegisteredDomain(domain: string): void {
  if (!DOMAINS.includes(domain as (typeof DOMAINS)[number])) {
    throw new Error(` 未注册的 domain: ${domain}，请在 DOMAINS 中注册后重试。`)
  }
}

function ensureClearableStore(
  storeName: string,
): asserts storeName is StoreName | typeof SESSION_METADATA_STORE | typeof DIALOGUE_CONTENT_STORE {
  if (storeName === SESSION_METADATA_STORE || storeName === DIALOGUE_CONTENT_STORE) return
  ensureRegisteredStore(storeName)
}

function fetchFromIndex(
  index: IDBIndex,
  range: IDBKeyRange,
  direction: IDBCursorDirection,
  limit: number,
  resolve: (data: GetDialoguesData) => void,
  reject: (err: unknown) => void,
): void {
  const result: DialogueRecord[] = []
  // 统一处理“按索引游标拉取一段数据”的逻辑，避免每个分支重复写 cursor 遍历。
  const req = index.openCursor(range, direction)
  req.onsuccess = () => {
    const cursor = req.result
    if (cursor && (limit === -1 || result.length < limit)) {
      result.push(cursor.value)
      cursor.continue()
    } else {
      resolve({
        // 倒序读取时需要翻转回升序，和 UI 展示顺序保持一致。
        items: direction === 'prev' ? result.reverse() : result,
        hasMore: limit !== -1 && !!cursor,
      })
    }
  }
  req.onerror = () => reject(req.error)
}

class AIChatMessageStore {
  private dbPromise: Promise<IDBDatabase> | null = null
  #dbVersion: number

  constructor(dbVersion: number) {
    this.#dbVersion = dbVersion
  }

  open(): Promise<IDBDatabase> {
    if (!this.dbPromise) {
      this.dbPromise = new Promise((resolve, reject) => {
        const req = indexedDB.open(DB_NAME, this.#dbVersion)
        req.onerror = () => reject(req.error)
        req.onsuccess = () => resolve(req.result)
        req.onupgradeneeded = (event) => {
          const db = (event.target as IDBOpenDBRequest).result

          // 按注册列表补齐消息表，避免每次升级时删表重建。
          for (const name of REGISTERED_STORES) {
            if (!db.objectStoreNames.contains(name)) {
              const store = db.createObjectStore(name, { keyPath: COMPOUND_KEY })
              store.createIndex(INDEX_BY_SESSION_ORDER, SESSION_ORDER, { unique: false })
            }
          }

          // session 元数据单独存放，只需要按 sessionId 主键读取。
          if (!db.objectStoreNames.contains(SESSION_METADATA_STORE)) {
            db.createObjectStore(SESSION_METADATA_STORE, { keyPath: 'sessionId' })
          }

          // 对话正文表：存储 group 节点下子消息的具体内容。
          if (!db.objectStoreNames.contains(DIALOGUE_CONTENT_STORE)) {
            const contentStore = db.createObjectStore(DIALOGUE_CONTENT_STORE, { keyPath: CONTENT_COMPOUND_KEY })
            contentStore.createIndex(INDEX_BY_SESSION_PTOKEN, SESSION_PTOKEN, { unique: false })
            contentStore.createIndex(INDEX_BY_CONTENT_SESSION, 'sessionId', { unique: false })
          }
        }
      })
    }
    return this.dbPromise
  }

  /**
   * 获取指定 session 的消息列表。
   * @param token 锚点 token，特殊值 `""`/`undefined`/`"-1"` 表示不使用锚点；其他值表示以该 token 为锚点。
   * @param desc 仅在传入业务 `token` 作锚点时有效：`false` 取 **更早**（`cacheOrder < 锚点`），`true` 取 **更晚**（`cacheOrder > 锚点`）。
   * @param limit `-1` 表示该模式下不限制条数（无锚点为全 session 升序；有锚点为该方向上全量）。
   * @returns 符合条件的消息列表和是否有更多的标记。
   */
  async getDialogues({
    storeName,
    sessionId,
    token,
    desc = false,
    limit = 10,
  }: GetDialoguesParams): Promise<GetDialoguesData> {
    ensureRegisteredStore(storeName)

    if (!sessionId) return { items: [], hasMore: false }

    const db = await this.open()

    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readonly')
      const store = tx.objectStore(storeName)
      const orderIndex = store.index(INDEX_BY_SESSION_ORDER)
      const fullSessionRange = IDBKeyRange.bound(
        [sessionId, Number.NEGATIVE_INFINITY],
        [sessionId, Number.POSITIVE_INFINITY],
      )

      const noAnchor = token === '' || token === undefined || token === '-1'

      if (noAnchor) {
        // 无锚点时取当前 session 末尾一批；limit=-1 则全量顺序读取。
        const direction = limit === -1 ? 'next' : 'prev'
        fetchFromIndex(orderIndex, fullSessionRange, direction, limit, resolve, reject)
        return
      }

      const anchorReq = store.get([sessionId, token])
      anchorReq.onsuccess = () => {
        const anchor = anchorReq.result as DialogueRecord | undefined

        if (!anchor) {
          resolve({ items: [], hasMore: false })
          return
        }

        if (desc) {
          // desc=true: 取锚点之后更“新”的消息。
          const range = IDBKeyRange.bound(
            [sessionId, anchor.cacheOrder],
            [sessionId, Number.POSITIVE_INFINITY],
            true,
            false,
          )
          fetchFromIndex(orderIndex, range, 'next', limit, resolve, reject)
        } else {
          // desc=false: 取锚点之前更“旧”的消息。
          const range = IDBKeyRange.bound(
            [sessionId, Number.NEGATIVE_INFINITY],
            [sessionId, anchor.cacheOrder],
            false,
            true,
          )
          const direction = limit === -1 ? 'next' : 'prev'
          fetchFromIndex(orderIndex, range, direction, limit, resolve, reject)
        }
      }
      anchorReq.onerror = () => reject(anchorReq.error)
    })
  }

  async setDialogues({ storeName, data }: SetDialoguesParams): Promise<void> {
    ensureRegisteredStore(storeName)

    const db = await this.open()

    const list = Array.isArray(data) ? data : [data]

    if (!list.length) return

    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readwrite')
      const store = tx.objectStore(storeName)
      const orderIndex = store.index(INDEX_BY_SESSION_ORDER)

      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
      tx.onabort = () => reject(tx.error)

      // 找第一个 isHistory:true 的记录作锚点，用它的 cacheOrder 推导新消息的相对位置。
      const anchorIdx = list.findIndex((item) => item.isCached)

      if (anchorIdx !== -1) {
        const anchorOrderNum = list[anchorIdx].cacheOrder
        for (let i = 0; i < list.length; i++) {
          if (!list[i].isCached) {
            store.put({ ...list[i], cacheOrder: anchorOrderNum + (i - anchorIdx) })
          }
        }
        return
      }

      // 没有锚点：全部是新记录，直接追加到该 session 当前尾部。
      const sessionId = list[0].sessionId
      const range = IDBKeyRange.bound([sessionId, Number.NEGATIVE_INFINITY], [sessionId, Number.POSITIVE_INFINITY])
      const cursorReq = orderIndex.openCursor(range, 'prev')
      cursorReq.onerror = () => reject(cursorReq.error)
      cursorReq.onsuccess = () => {
        const cursor = cursorReq.result
        let base = cursor ? (cursor.value as DialogueRecord).cacheOrder + 1 : 0
        for (const item of list) {
          store.put({ ...item, cacheOrder: base++ })
        }
      }
    })
  }

  async setDialogueContent({ data }: SetDialogueContentParams): Promise<void> {
    const db = await this.open()
    const list = Array.isArray(data) ? data : [data]
    if (!list.length) return

    return new Promise((resolve, reject) => {
      const tx = db.transaction(DIALOGUE_CONTENT_STORE, 'readwrite')
      const store = tx.objectStore(DIALOGUE_CONTENT_STORE)

      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
      tx.onabort = () => reject(tx.error)

      for (const item of list) {
        store.put(item)
      }
    })
  }

  async getDialogueContentsByPid({
    sessionId,
    pTokens,
  }: GetDialogueContentsByPidParams): Promise<DialogueContentRecord[]> {
    if (!pTokens.length) return []
    const db = await this.open()

    return new Promise((resolve, reject) => {
      const tx = db.transaction(DIALOGUE_CONTENT_STORE, 'readonly')
      const pidIndex = tx.objectStore(DIALOGUE_CONTENT_STORE).index(INDEX_BY_SESSION_PTOKEN)

      const requests = pTokens.map((pToken) => pidIndex.getAll(IDBKeyRange.only([sessionId, pToken])))

      tx.oncomplete = () => resolve(requests.flatMap((req) => req.result as DialogueContentRecord[]))
      tx.onerror = () => reject(tx.error)
      tx.onabort = () => reject(tx.error)
    })
  }

  async setSessionMetadata(data: SessionMetadataRecord): Promise<void> {
    const db = await this.open()

    return new Promise((resolve, reject) => {
      const tx = db.transaction(SESSION_METADATA_STORE, 'readwrite')
      const store = tx.objectStore(SESSION_METADATA_STORE)

      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
      tx.onabort = () => reject(tx.error)

      store.put(data)
    })
  }

  async clearStore({ storeName }: ClearStoreParams): Promise<void> {
    ensureClearableStore(storeName)

    const db = await this.open()

    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readwrite')
      const store = tx.objectStore(storeName)

      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
      tx.onabort = () => reject(tx.error)

      store.clear()
    })
  }

  async deleteSession({ domain, sessions }: DeleteSessionParams): Promise<void> {
    ensureRegisteredDomain(domain)

    if (!sessions.length) return

    const targetSessions = sessions.filter(Boolean)
    if (!targetSessions.length) return

    const storeNames: StoreName[] = [`${domain}TaskDB`, `${domain}CasualDB`]
    for (const storeName of storeNames) {
      ensureRegisteredStore(storeName)
    }

    const db = await this.open()

    return new Promise((resolve, reject) => {
      const tx = db.transaction([...storeNames, SESSION_METADATA_STORE, DIALOGUE_CONTENT_STORE], 'readwrite')
      const metadataStore = tx.objectStore(SESSION_METADATA_STORE)
      const contentStore = tx.objectStore(DIALOGUE_CONTENT_STORE)
      const contentSessionIndex = contentStore.index(INDEX_BY_CONTENT_SESSION)

      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
      tx.onabort = () => reject(tx.error)

      for (const sessionId of targetSessions) {
        metadataStore.delete(sessionId)

        for (const storeName of storeNames) {
          const dialogueStore = tx.objectStore(storeName)
          const orderIndex = dialogueStore.index(INDEX_BY_SESSION_ORDER)
          const range = IDBKeyRange.bound([sessionId, Number.NEGATIVE_INFINITY], [sessionId, Number.POSITIVE_INFINITY])

          const keysReq = orderIndex.getAllKeys(range)
          keysReq.onsuccess = () => {
            for (const key of keysReq.result) {
              dialogueStore.delete(key)
            }
          }
          keysReq.onerror = () => reject(keysReq.error)
        }

        // 同步删除该 session 下所有对话正文记录。
        const contentKeysReq = contentSessionIndex.getAllKeys(IDBKeyRange.only(sessionId))
        contentKeysReq.onsuccess = () => {
          for (const key of contentKeysReq.result) {
            contentStore.delete(key)
          }
        }
        contentKeysReq.onerror = () => reject(contentKeysReq.error)
      }
    })
  }

  // session 元数据按 sessionId 主键单条读取。
  async getSessionMetadata(sessionId: string): Promise<SessionMetadataRecord | undefined> {
    const db = await this.open()

    return new Promise((resolve, reject) => {
      const tx = db.transaction(SESSION_METADATA_STORE, 'readonly')
      const store = tx.objectStore(SESSION_METADATA_STORE)
      const req = store.get(sessionId)

      req.onsuccess = () => resolve(req.result as SessionMetadataRecord | undefined)
      req.onerror = () => reject(req.error)
    })
  }
}

const aiChatMessageStore = new AIChatMessageStore(dbVersion)

export default aiChatMessageStore
