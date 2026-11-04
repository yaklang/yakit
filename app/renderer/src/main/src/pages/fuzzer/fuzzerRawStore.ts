import { useEffect, useState } from 'react'
import type { FuzzerResponse } from './HTTPFuzzerPage'

/**
 * 列表不留响应原文。响应进 IndexedDB，点详情再读。
 * 请求原文留在行上：体积小，而且同一批里经常重复。
 * 关闭对应 fuzzer（或重新发送）时按 scope 删掉。
 * 多个窗口会共用这个库，所以不判断"谁还活着"，也不整库清空：
 * 每条记录带 session 和写入时间 at；窗口关闭时尽力删掉自己 session 的记录，
 * 启动时只删超过 STALE_MS 的记录（崩溃残留），较新的数据一律不碰。
 * 窗口内每个 fuzzer 页签再按 scope（page:<id>）各自记录、各自删除。
 */

const DB_NAME = 'yakit-fuzzer-raw'
const STORE = 'packets'
const DB_VERSION = 3
export const STALE_MS = 3 * 24 * 60 * 60 * 1000

export const RAW_SESSION_ID = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`

export const EMPTY_RAW = new Uint8Array()

const SEARCH_BATCH_SIZE = 200

interface FuzzerRawRecord {
  uuid: string
  scope: string
  session: string
  at: number
  response: ArrayBuffer
}

interface PendingRaw {
  scope: string
  response: ArrayBuffer
  /** 入队时的 scope 代数。flush 时对不上就丢掉，避免重发后把旧包写回去。 */
  epoch: number
}
const pending = new Map<string, PendingRaw>()
const epochs = new Map<string, number>()
/** 等着和这一批写入放进同一个事务里删掉的 uuid */
const pendingDeletes = new Set<string>()
const memory = new Map<string, FuzzerRawRecord>()
/** 批量写库和按 scope 删除共用一条队列，避免「快照已删又 put 回去」。 */
let writeChain: Promise<void> = Promise.resolve()

let backend: 'idb' | 'memory' | null = null
let dbPromise: Promise<IDBDatabase> | null = null
let startupSweep: Promise<void> | null = null

export const fuzzerPageScope = (pageId: string) => `page:${pageId}`
export const fuzzerSequenceScope = (groupId: string, mode: string, fuzzerIndex: string) =>
  `seq:${groupId || 'group'}:${mode}:${fuzzerIndex}`

const copyBuffer = (bytes: Uint8Array) => bytes.slice().buffer as ArrayBuffer

const toResponse = (response: ArrayBuffer) => new Uint8Array(response)

const epochOf = (scope: string) => epochs.get(scope) || 0

const runWrite = (job: () => Promise<void>) => {
  const next = writeChain.then(job, job)
  writeChain = next.then(
    () => undefined,
    () => undefined,
  )
  return next
}

const openDatabase = () => {
  if (dbPromise) return dbPromise
  dbPromise = new Promise<IDBDatabase>((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onerror = () => reject(req.error)
    req.onsuccess = () => resolve(req.result)
    req.onupgradeneeded = () => {
      const db = req.result
      // 旧版本的数据没有写入时间，只是崩溃残留，升级时直接丢弃
      if (db.objectStoreNames.contains(STORE)) db.deleteObjectStore(STORE)
      const store = db.createObjectStore(STORE, { keyPath: 'uuid' })
      store.createIndex('byScope', 'scope', { unique: false })
      store.createIndex('bySession', 'session', { unique: false })
      store.createIndex('byAt', 'at', { unique: false })
    }
  }).catch((error) => {
    dbPromise = null
    throw error
  })
  return dbPromise
}

const waitTransaction = (tx: IDBTransaction) =>
  new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
    tx.onabort = () => reject(tx.error || new Error('indexedDB transaction aborted'))
  })

/** 删掉写入时间早于 cutoff 的记录（崩溃残留）。byAt 索引升序，遇到第一条较新的就停。 */
export const sweepStaleRecords = async (db: IDBDatabase, cutoff: number) => {
  const tx = db.transaction(STORE, 'readwrite')
  const store = tx.objectStore(STORE)
  const req = store.index('byAt').openKeyCursor()
  req.onsuccess = () => {
    const cursor = req.result
    if (!cursor || (cursor.key as number) >= cutoff) return
    store.delete(cursor.primaryKey)
    cursor.continue()
  }
  await waitTransaction(tx)
}

/** 窗口关闭时尽力删掉自己 session 的记录；来不及完成也没关系，3 天后会被启动清理删掉。 */
export const removeSessionRecords = (db: IDBDatabase, session: string) => {
  const tx = db.transaction(STORE, 'readwrite')
  const store = tx.objectStore(STORE)
  const req = store.index('bySession').openKeyCursor(IDBKeyRange.only(session))
  req.onsuccess = () => {
    const cursor = req.result
    if (!cursor) return
    store.delete(cursor.primaryKey)
    cursor.continue()
  }
  return waitTransaction(tx)
}

let unloadHooked = false
const hookUnload = (db: IDBDatabase) => {
  if (unloadHooked || typeof window === 'undefined') return
  unloadHooked = true
  window.addEventListener('pagehide', () => {
    void removeSessionRecords(db, RAW_SESSION_ID).catch(() => undefined)
  })
}

const ensureBackend = async () => {
  if (backend) return
  if (typeof indexedDB === 'undefined') {
    backend = 'memory'
    return
  }
  try {
    const db = await openDatabase()
    if (!startupSweep) {
      // 清理失败只是多留一些残留，不影响读写，不能因此降级到内存
      startupSweep = sweepStaleRecords(db, Date.now() - STALE_MS).catch(() => undefined)
    }
    await startupSweep
    hookUnload(db)
    backend = 'idb'
  } catch {
    backend = 'memory'
  }
}

const readRecords = async (uuids: string[]) => {
  await ensureBackend()
  if (backend === 'memory') {
    return uuids.map((uuid) => memory.get(uuid))
  }
  const db = await openDatabase()
  return new Promise<(FuzzerRawRecord | undefined)[]>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly')
    const store = tx.objectStore(STORE)
    const rows: (FuzzerRawRecord | undefined)[] = []
    let left = uuids.length
    if (!left) {
      resolve(rows)
      return
    }
    uuids.forEach((uuid, index) => {
      const req = store.get(uuid)
      req.onsuccess = () => {
        rows[index] = req.result as FuzzerRawRecord | undefined
        left -= 1
        if (!left) resolve(rows)
      }
      req.onerror = () => reject(req.error)
    })
  })
}

/**
 * 一段时间内的写入和按 uuid 删除合成一个事务。
 * 高压发包时不用每条响应各开一次 IndexedDB 事务。
 */
const FLUSH_DELAY_MS = 300
let flushTimer: ReturnType<typeof setTimeout> | undefined
let flushRetried = false

const armFlush = () => {
  if (!flushTimer) flushTimer = setTimeout(() => void flushPending(), FLUSH_DELAY_MS)
}

const writeBatch = async (writes: { uuid: string; scope: string; response: ArrayBuffer }[], deletes: string[]) => {
  await ensureBackend()
  if (!writes.length && !deletes.length) return
  if (backend === 'memory') {
    deletes.forEach((uuid) => memory.delete(uuid))
    writes.forEach((item) => {
      memory.set(item.uuid, {
        uuid: item.uuid,
        scope: item.scope,
        session: RAW_SESSION_ID,
        at: Date.now(),
        response: item.response,
      })
    })
    return
  }
  const db = await openDatabase()
  const tx = db.transaction(STORE, 'readwrite')
  const store = tx.objectStore(STORE)
  deletes.forEach((uuid) => store.delete(uuid))
  writes.forEach((item) => {
    store.put({
      uuid: item.uuid,
      scope: item.scope,
      session: RAW_SESSION_ID,
      at: Date.now(),
      response: item.response,
    })
  })
  await waitTransaction(tx)
}

const flushPending = () => {
  flushTimer = undefined
  return runWrite(async () => {
    const deleteSet = new Set(pendingDeletes)
    const writes = [...pending.entries()].filter(
      ([uuid, item]) => !deleteSet.has(uuid) && epochOf(item.scope) === item.epoch,
    )
    try {
      await writeBatch(
        writes.map(([uuid, item]) => ({ uuid, scope: item.scope, response: item.response })),
        [...deleteSet],
      )
    } catch {
      // 失败再排一次。这次仍失败就留在内存里，等下一次保存再写。
      if (!flushRetried) {
        flushRetried = true
        armFlush()
      } else {
        flushRetried = false
      }
      return
    }
    flushRetried = false
    // 写的过程中如果同一个 uuid 换成了新对象，或 scope 已换代，保留它
    writes.forEach(([uuid, item]) => {
      if (pending.get(uuid) === item && epochOf(item.scope) === item.epoch) pending.delete(uuid)
    })
    deleteSet.forEach((uuid) => pendingDeletes.delete(uuid))
  })
}

const removeScopeRecords = async (scope: string) => {
  await ensureBackend()
  if (backend === 'memory') {
    for (const [uuid, record] of memory) {
      if (record.scope === scope) memory.delete(uuid)
    }
    return
  }
  const db = await openDatabase()
  const tx = db.transaction(STORE, 'readwrite')
  const index = tx.objectStore(STORE).index('byScope')
  const req = index.openCursor(IDBKeyRange.only(scope))
  req.onsuccess = () => {
    const cursor = req.result
    if (!cursor) return
    cursor.delete()
    cursor.continue()
  }
  await waitTransaction(tx)
}

const dropPending = (scope: string) => {
  for (const [uuid, item] of pending) {
    if (item.scope === scope) pending.delete(uuid)
  }
}

export const fuzzerRawStore = {
  async get(uuid?: string): Promise<Uint8Array | undefined> {
    if (!uuid) return undefined
    try {
      return (await this.getMany([uuid])).get(uuid)
    } catch {
      return undefined
    }
  },

  async getMany(uuids: string[]) {
    const found = new Map<string, Uint8Array>()
    const missing: string[] = []
    uuids.forEach((uuid) => {
      if (!uuid || found.has(uuid)) return
      const staged = pending.get(uuid)
      if (staged) found.set(uuid, toResponse(staged.response))
      else if (!pendingDeletes.has(uuid)) missing.push(uuid)
    })
    if (!missing.length) return found
    const rows = await readRecords(missing)
    rows.forEach((record) => {
      if (record) found.set(record.uuid, toResponse(record.response))
    })
    return found
  },

  save(scope: string, uuid: string, response?: Uint8Array) {
    if (!scope || !uuid || !response?.byteLength) return Promise.resolve()
    // 同一条又写回来时，取消还没落库的删除。读的时候先看 pending，不用等这 300ms。
    pendingDeletes.delete(uuid)
    pending.set(uuid, { scope, epoch: epochOf(scope), response: copyBuffer(response) })
    armFlush()
    return Promise.resolve()
  },

  deleteUuid(uuid: string) {
    if (!uuid) return Promise.resolve()
    pending.delete(uuid)
    pendingDeletes.add(uuid)
    armFlush()
    return Promise.resolve()
  },

  deleteScope(scope: string) {
    if (!scope) return Promise.resolve()
    dropPending(scope)
    epochs.set(scope, epochOf(scope) + 1)
    const seen = epochOf(scope)
    // 和批量写入走同一条队列：先写完（或丢掉）旧快照，再按 scope 清库
    return runWrite(async () => {
      if (epochOf(scope) !== seen) return
      await removeScopeRecords(scope)
    }).catch(() => undefined)
  },
}

/** 把行上的响应原文存进库，行上改成空的。请求原文留在行上。后面的空响应不会盖掉已经存好的。 */
export function saveFuzzerRaw(scope: string, item: FuzzerResponse) {
  if (!scope || !item?.UUID) return
  const response = item.ResponseRaw
  if (response?.byteLength) item.RawVersion = (item.RawVersion || 0) + 1
  item.ResponseRaw = EMPTY_RAW
  if (!response?.byteLength) return
  void fuzzerRawStore.save(scope, item.UUID, response).catch(() => undefined)
}

/** 给这一行补上库里的响应原文。行上已经有原文的不动。 */
export async function fillFuzzerRaw<T extends FuzzerResponse>(row: T): Promise<T> {
  if (!row?.UUID || row.ResponseRaw?.byteLength) return row
  const response = await fuzzerRawStore.get(row.UUID)
  if (!response?.byteLength) return row
  return { ...row, ResponseRaw: response }
}

/** 给多行补上库里的响应原文。行上已经有原文的不动。 */
export async function fillFuzzerRawList<T extends FuzzerResponse>(rows: T[]) {
  let bodies: Map<string, Uint8Array>
  try {
    bodies = await fuzzerRawStore.getMany(rows.map((row) => row.UUID).filter((uuid): uuid is string => !!uuid))
  } catch {
    return rows
  }
  return rows.map((row) => {
    if (!row?.UUID || row.ResponseRaw?.byteLength) return row
    const response = bodies.get(row.UUID)
    if (!response?.byteLength) return row
    return { ...row, ResponseRaw: response }
  })
}

/**
 * 关键字搜索只缓存「响应是否命中」，键是 UUID + RawVersion，不在内存里留响应文本。
 * 关键字变化、行被挤出表格时对应缓存失效。
 */
export function createKeywordSearchCache(toText: (bytes: Uint8Array) => string) {
  let keyWord = ''
  const hits = new Map<string, { version: number; hit: boolean }>()
  return {
    /** 返回还需要从库里读响应的 UUID。 */
    prepare(nextKeyWord: string, rows: FuzzerResponse[]) {
      if (keyWord !== nextKeyWord) {
        keyWord = nextKeyWord
        hits.clear()
      }
      if (!nextKeyWord) return []
      const live = new Set(rows.map((row) => row.UUID))
      for (const uuid of hits.keys()) {
        if (!live.has(uuid)) hits.delete(uuid)
      }
      return rows
        .filter(
          (row) => row.UUID && !row.ResponseRaw?.byteLength && hits.get(row.UUID)?.version !== (row.RawVersion || 0),
        )
        .map((row) => row.UUID)
    },
    /** 分批读取还没算过的响应并只记下是否命中，同一时刻内存里最多留一批的原文。 */
    async fill(
      nextKeyWord: string,
      rows: FuzzerResponse[],
      readMany: (uuids: string[]) => Promise<Map<string, Uint8Array>>,
      batchSize = SEARCH_BATCH_SIZE,
    ) {
      const uncached = this.prepare(nextKeyWord, rows)
      const byUuid = new Map(rows.map((row) => [row.UUID, row]))
      for (let start = 0; start < uncached.length; start += batchSize) {
        const chunk = uncached.slice(start, start + batchSize)
        const bodies = await readMany(chunk).catch(() => undefined)
        // 读库失败不记成未命中，下次搜索还要再读
        if (!bodies) return
        // 读库期间关键字已经被后一次搜索换掉，这批结果属于旧关键字，直接丢弃
        if (keyWord !== nextKeyWord) return
        chunk.forEach((uuid) => {
          const row = byUuid.get(uuid)
          if (!row) return
          // 库里没有响应的行（失败结果、空响应）也记成未命中，避免每次搜索都重复读库
          if (!bodies.get(uuid)?.byteLength) hits.set(uuid, { version: row.RawVersion || 0, hit: false })
          else this.matches(row, nextKeyWord, bodies.get(uuid))
        })
      }
    },
    matches(row: FuzzerResponse, word: string, stored?: Uint8Array) {
      if (row.ResponseRaw?.byteLength) return toText(row.ResponseRaw).includes(word)
      const version = row.RawVersion || 0
      const cached = word === keyWord ? hits.get(row.UUID) : undefined
      if (cached && cached.version === version) return cached.hit
      if (!stored?.byteLength) return false
      const hit = toText(stored).includes(word)
      if (row.UUID && word === keyWord) hits.set(row.UUID, { version, hit })
      return hit
    },
  }
}

/** 界面上读响应原文。页签隐藏时不读，已经读出来的也马上丢掉。 */
export function useFuzzerResponseRaw(uuid?: string, version?: number, enabled = true): Uint8Array {
  const active = !!enabled && !!uuid
  const [packet, setPacket] = useState<Uint8Array>(EMPTY_RAW)
  const [seen, setSeen] = useState({ uuid, active })
  // 换行或页签被藏起来时，在渲染阶段丢掉已读字节，避免在 effect 里同步 setState
  if (seen.uuid !== uuid || seen.active !== active) {
    setSeen({ uuid, active })
    setPacket(EMPTY_RAW)
  }
  useEffect(() => {
    if (!active || !uuid) return
    let cancel = false
    fuzzerRawStore.get(uuid).then((body) => {
      if (!cancel) setPacket(body || EMPTY_RAW)
    })
    return () => {
      cancel = true
    }
  }, [active, uuid, version])
  return active ? packet : EMPTY_RAW
}
