import { useEffect, useState } from 'react'
import type { FuzzerResponse } from './HTTPFuzzerPage'

/**
 * 列表不留响应原文。响应进 IndexedDB，点详情再读。
 * 请求原文留在行上：体积小，而且同一批里经常重复。
 * 关闭对应 fuzzer（或重新发送）时按 scope 删掉。
 * 多个窗口会共用这个库，所以不判断"谁还活着"，也不整库清空：
 * 每条记录带 session 和写入时间 at；窗口关闭时尽力删掉自己 session 的记录，
 * 启动时删掉超过 STALE_MS、且所属窗口已经没有心跳的记录。
 * 还开着的窗口会定期刷新心跳，别的窗口启动时不会把它的旧响应清掉。
 * 窗口内每个 fuzzer 页签再按 scope（page:<id>）各自记录、各自删除。
 * 同一条历史在不同页签里 UUID 相同，所以主键是 session + scope + uuid。
 * 关掉或重发其中一个页签，不会删掉另一个页签的原文。
 */

const DB_NAME = 'yakit-fuzzer-raw'
const STORE = 'packets'
const DB_VERSION = 4
export const STALE_MS = 3 * 24 * 60 * 60 * 1000

export const RAW_SESSION_ID = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`

export const EMPTY_RAW = new Uint8Array()

const SEARCH_BATCH_SIZE = 200

interface FuzzerRawRecord {
  /** session、scope、uuid 拼成的主键 */
  id: string
  uuid: string
  scope: string
  session: string
  at: number
  response: ArrayBuffer
}

interface PendingRaw {
  uuid: string
  scope: string
  response: ArrayBuffer
  /** 入队时的 scope 代数。flush 时对不上就丢掉，避免重发后把旧包写回去。 */
  epoch: number
}
const pending = new Map<string, PendingRaw>()
const epochs = new Map<string, number>()
/** 等着和这一批写入放进同一个事务里删掉的记录 id */
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

const recordId = (scope: string, uuid: string) => `${RAW_SESSION_ID}\u0000${scope}\u0000${uuid}`

const copyBuffer = (bytes: Uint8Array) => bytes.slice().buffer as ArrayBuffer

const toResponse = (response: ArrayBuffer) => new Uint8Array(response)

const epochOf = (scope: string) => epochs.get(scope) || 0

/** 这个 scope 被清空过几次。关键字缓存用它识别「版本又从 1 开始」的新一轮。 */
export const fuzzerScopeEpoch = (scope?: string) => epochOf(scope || '')

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
      const store = db.createObjectStore(STORE, { keyPath: 'id' })
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

/** 删掉写入时间早于 cutoff 的崩溃残留。session 仍在心跳的窗口，哪怕单条响应已经放了几天也不删。 */
export const sweepStaleRecords = async (
  db: IDBDatabase,
  cutoff: number,
  liveSessions: ReadonlySet<string> = new Set(),
) => {
  const tx = db.transaction(STORE, 'readwrite')
  const store = tx.objectStore(STORE)
  const req = store.index('byAt').openCursor()
  req.onsuccess = () => {
    const cursor = req.result
    if (!cursor || (cursor.key as number) >= cutoff) return
    const session = cursor.value?.session as string | undefined
    if (session && liveSessions.has(session)) {
      cursor.continue()
      return
    }
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

const SESSION_SCOPE = '__session__'
const HEARTBEAT_MS = 12 * 60 * 60 * 1000

const touchSession = async (db: IDBDatabase, session: string) => {
  const tx = db.transaction(STORE, 'readwrite')
  tx.objectStore(STORE).put({
    id: `hb\u0000${session}`,
    uuid: 'hb',
    scope: SESSION_SCOPE,
    session,
    at: Date.now(),
    response: new ArrayBuffer(0),
  })
  await waitTransaction(tx)
}

const readLiveSessions = async (db: IDBDatabase, cutoff: number) => {
  const live = new Set<string>()
  const tx = db.transaction(STORE, 'readonly')
  const req = tx.objectStore(STORE).index('byScope').openCursor(IDBKeyRange.only(SESSION_SCOPE))
  req.onsuccess = () => {
    const cursor = req.result
    if (!cursor) return
    if ((cursor.value?.at as number) >= cutoff && cursor.value?.session) live.add(cursor.value.session as string)
    cursor.continue()
  }
  await waitTransaction(tx)
  return live
}

let unloadHooked = false
const hookUnload = (db: IDBDatabase) => {
  if (unloadHooked || typeof window === 'undefined') return
  unloadHooked = true
  const beat = () => {
    void touchSession(db, RAW_SESSION_ID).catch(() => undefined)
  }
  beat()
  window.addEventListener('pagehide', () => {
    void removeSessionRecords(db, RAW_SESSION_ID).catch(() => undefined)
  })
  if (process.env.VITEST) return
  const timer = window.setInterval(beat, HEARTBEAT_MS)
  window.addEventListener('pagehide', () => {
    window.clearInterval(timer)
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
      const cutoff = Date.now() - STALE_MS
      // 先写下自己的心跳，再清过期数据。别的窗口只要还在心跳，旧响应就留着。
      startupSweep = touchSession(db, RAW_SESSION_ID)
        .then(() => readLiveSessions(db, cutoff))
        .then((live) => sweepStaleRecords(db, cutoff, live))
        .catch(() => undefined)
    }
    await startupSweep
    hookUnload(db)
    backend = 'idb'
  } catch {
    backend = 'memory'
  }
}

const readRecords = async (ids: string[]) => {
  await ensureBackend()
  if (backend === 'memory') {
    return ids.map((id) => memory.get(id))
  }
  const db = await openDatabase()
  return new Promise<(FuzzerRawRecord | undefined)[]>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly')
    const store = tx.objectStore(STORE)
    const rows: (FuzzerRawRecord | undefined)[] = []
    let left = ids.length
    if (!left) {
      resolve(rows)
      return
    }
    ids.forEach((id, index) => {
      const req = store.get(id)
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
 * 一段时间内的写入和按记录删除合成一个事务。
 * 高压发包时不用每条响应各开一次 IndexedDB 事务。
 */
const FLUSH_DELAY_MS = 300
let flushTimer: ReturnType<typeof setTimeout> | undefined
let flushRetried = false

const armFlush = () => {
  if (!flushTimer) flushTimer = setTimeout(() => void flushPending(), FLUSH_DELAY_MS)
}

const writeBatch = async (
  writes: { id: string; uuid: string; scope: string; response: ArrayBuffer }[],
  deletes: string[],
) => {
  await ensureBackend()
  if (!writes.length && !deletes.length) return
  if (backend === 'memory') {
    deletes.forEach((id) => memory.delete(id))
    writes.forEach((item) => {
      memory.set(item.id, {
        id: item.id,
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
  deletes.forEach((id) => store.delete(id))
  writes.forEach((item) => {
    store.put({
      id: item.id,
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
  // 入队时冻住这一批。前面的事务还没结束时，重发会先排上 deleteScope，
  // 新响应再进 pending。等到本批真正写库才去读 pending，就会把新响应写进去，接着被 scope 删除清掉。
  const deleteSet = new Set(pendingDeletes)
  const writes = [...pending.entries()].filter(([id, item]) => !deleteSet.has(id) && epochOf(item.scope) === item.epoch)
  return runWrite(async () => {
    try {
      await writeBatch(
        writes.map(([id, item]) => ({ id, uuid: item.uuid, scope: item.scope, response: item.response })),
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
    // 写的过程中如果同一条记录换成了新对象，或 scope 已换代，保留它
    writes.forEach(([id, item]) => {
      if (pending.get(id) === item && epochOf(item.scope) === item.epoch) pending.delete(id)
    })
    deleteSet.forEach((id) => pendingDeletes.delete(id))
  })
}

const removeScopeRecords = async (scope: string) => {
  await ensureBackend()
  if (backend === 'memory') {
    for (const [id, record] of memory) {
      if (record.scope === scope && record.session === RAW_SESSION_ID) memory.delete(id)
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
    if (cursor.value?.session === RAW_SESSION_ID) cursor.delete()
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
  async get(scope: string, uuid?: string): Promise<Uint8Array | undefined> {
    if (!scope || !uuid) return undefined
    try {
      return (await this.getMany(scope, [uuid])).get(uuid)
    } catch {
      return undefined
    }
  },

  async getMany(scope: string, uuids: string[]) {
    const found = new Map<string, Uint8Array>()
    if (!scope) return found
    const missing: string[] = []
    uuids.forEach((uuid) => {
      if (!uuid || found.has(uuid)) return
      const id = recordId(scope, uuid)
      const staged = pending.get(id)
      if (staged) found.set(uuid, toResponse(staged.response))
      else if (!pendingDeletes.has(id)) missing.push(uuid)
    })
    if (!missing.length) return found
    const rows = await readRecords(missing.map((uuid) => recordId(scope, uuid)))
    rows.forEach((record) => {
      if (record && record.scope === scope && record.session === RAW_SESSION_ID) {
        found.set(record.uuid, toResponse(record.response))
      }
    })
    return found
  },

  save(scope: string, uuid: string, response?: Uint8Array) {
    if (!scope || !uuid || !response?.byteLength) return Promise.resolve()
    const id = recordId(scope, uuid)
    // 同一条又写回来时，取消还没落库的删除。读的时候先看 pending，不用等这 300ms。
    pendingDeletes.delete(id)
    pending.set(id, { uuid, scope, epoch: epochOf(scope), response: copyBuffer(response) })
    armFlush()
    return Promise.resolve()
  },

  deleteUuid(scope: string, uuid: string) {
    if (!scope || !uuid) return Promise.resolve()
    const id = recordId(scope, uuid)
    pending.delete(id)
    pendingDeletes.add(id)
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
  item.RawScope = scope
  const response = item.ResponseRaw
  if (response?.byteLength) item.RawVersion = (item.RawVersion || 0) + 1
  item.ResponseRaw = EMPTY_RAW
  if (!response?.byteLength) return
  void fuzzerRawStore.save(scope, item.UUID, response).catch(() => undefined)
}

/** 给这一行补上库里的响应原文。行上已经有原文的不动。 */
export async function fillFuzzerRaw<T extends FuzzerResponse>(row: T): Promise<T> {
  if (!row?.UUID || !row.RawScope || row.ResponseRaw?.byteLength) return row
  const response = await fuzzerRawStore.get(row.RawScope, row.UUID)
  if (!response?.byteLength) return row
  return { ...row, ResponseRaw: response }
}

/** 给多行补上库里的响应原文。行上已经有原文的不动。不同页签分开读，避免同 UUID 串数据。 */
export async function fillFuzzerRawList<T extends FuzzerResponse>(rows: T[]) {
  const groups = new Map<string, string[]>()
  rows.forEach((row) => {
    if (!row?.UUID || !row.RawScope || row.ResponseRaw?.byteLength) return
    const list = groups.get(row.RawScope)
    if (list) list.push(row.UUID)
    else groups.set(row.RawScope, [row.UUID])
  })
  if (!groups.size) return rows
  const bodies = new Map<string, Uint8Array>()
  try {
    await Promise.all(
      [...groups].map(async ([scope, uuids]) => {
        const found = await fuzzerRawStore.getMany(scope, uuids)
        found.forEach((bytes, uuid) => bodies.set(`${scope}\u0000${uuid}`, bytes))
      }),
    )
  } catch {
    return rows
  }
  return rows.map((row) => {
    if (!row?.UUID || !row.RawScope || row.ResponseRaw?.byteLength) return row
    const response = bodies.get(`${row.RawScope}\u0000${row.UUID}`)
    if (!response?.byteLength) return row
    return { ...row, ResponseRaw: response }
  })
}

/** 关键字缓存和读库结果的键。有 RawScope 时带上 scope，避免并发总表里相同 UUID 共用一条命中。 */
export const fuzzerRawSearchKey = (row: { UUID?: string; RawScope?: string }) => {
  if (!row.UUID) return ''
  return row.RawScope ? `${row.RawScope}\0${row.UUID}` : row.UUID
}

/** 表格行键。分隔符不用空字符，虚拟表格会把它当成 DOM id。 */
export const fuzzerTableRowKey = (row: { UUID?: string; RawScope?: string }) => {
  if (!row.UUID) return ''
  return row.RawScope ? `${row.RawScope}|${row.UUID}` : row.UUID
}

export function assignFuzzerTableRowKeys<T extends { UUID?: string; RawScope?: string; RowKey?: string }>(rows: T[]) {
  rows.forEach((row) => {
    const key = fuzzerTableRowKey(row)
    if (row.RowKey !== key) row.RowKey = key
  })
  return rows
}

/**
 * 关键字搜索只缓存「响应是否命中」，键是 scope + UUID + 版本 + scope 代数。
 * scope 被清空后代数加一，版本即使又从 1 开始也会重新读库。
 */
export function createKeywordSearchCache(toText: (bytes: Uint8Array) => string) {
  let keyWord = ''
  const hits = new Map<string, { version: number; epoch: number; hit: boolean }>()
  return {
    /** 返回还需要从库里读响应的键（有 scope 时是 scope + UUID）。 */
    prepare(nextKeyWord: string, rows: FuzzerResponse[]) {
      if (keyWord !== nextKeyWord) {
        keyWord = nextKeyWord
        hits.clear()
      }
      if (!nextKeyWord) return []
      const live = new Set<string>()
      rows.forEach((row) => {
        const key = fuzzerRawSearchKey(row)
        if (key) live.add(key)
      })
      for (const key of hits.keys()) {
        if (!live.has(key)) hits.delete(key)
      }
      const pending: string[] = []
      const queued = new Set<string>()
      rows.forEach((row) => {
        const key = fuzzerRawSearchKey(row)
        if (!key || queued.has(key) || row.ResponseRaw?.byteLength) return
        const cached = hits.get(key)
        const epoch = fuzzerScopeEpoch(row.RawScope)
        if (cached && cached.version === (row.RawVersion || 0) && cached.epoch === epoch) return
        queued.add(key)
        pending.push(key)
      })
      return pending
    },
    /** 分批读取还没算过的响应并只记下是否命中，同一时刻内存里最多留一批的原文。 */
    async fill(
      nextKeyWord: string,
      rows: FuzzerResponse[],
      readMany: (keys: string[]) => Promise<Map<string, Uint8Array>>,
      batchSize = SEARCH_BATCH_SIZE,
    ) {
      const uncached = this.prepare(nextKeyWord, rows)
      const byKey = new Map<string, FuzzerResponse>()
      rows.forEach((row) => {
        const key = fuzzerRawSearchKey(row)
        if (key) byKey.set(key, row)
      })
      for (let start = 0; start < uncached.length; start += batchSize) {
        let chunk = uncached.slice(start, start + batchSize)
        // 读库期间流式 upsert 会改同一行并抬高 RawVersion。版本变了就丢掉这批字节再读，
        // 否则旧正文会被记到新版本上，后面的搜索不再重读。
        for (let attempt = 0; chunk.length && attempt < 3; attempt++) {
          const seen = new Map(chunk.map((key) => [key, byKey.get(key)?.RawVersion || 0]))
          const bodies = await readMany(chunk).catch(() => undefined)
          // 这一批读失败不记结果，继续读后面的行；下次搜索会把没记下的再读一遍
          if (!bodies) continue
          // 读库期间关键字已经被后一次搜索换掉，这批结果属于旧关键字，直接丢弃
          if (keyWord !== nextKeyWord) return
          const again: string[] = []
          chunk.forEach((key) => {
            const row = byKey.get(key)
            if (!row) return
            const version = seen.get(key) || 0
            if ((row.RawVersion || 0) !== version) {
              again.push(key)
              return
            }
            // 库里没有响应的行（失败结果、空响应）也记成未命中，避免每次搜索都重复读库
            if (!bodies.get(key)?.byteLength)
              hits.set(key, { version, hit: false, epoch: fuzzerScopeEpoch(row.RawScope) })
            else this.matches(row, nextKeyWord, bodies.get(key))
          })
          chunk = again
        }
      }
    },
    matches(row: FuzzerResponse, word: string, stored?: Uint8Array) {
      if (row.ResponseRaw?.byteLength) return toText(row.ResponseRaw).includes(word)
      const version = row.RawVersion || 0
      const epoch = fuzzerScopeEpoch(row.RawScope)
      const key = fuzzerRawSearchKey(row)
      const cached = word === keyWord && key ? hits.get(key) : undefined
      if (cached && cached.version === version && cached.epoch === epoch) return cached.hit
      if (!stored?.byteLength) return false
      const hit = toText(stored).includes(word)
      if (key && word === keyWord) hits.set(key, { version, epoch, hit })
      return hit
    },
  }
}

/** 界面上读响应原文。页签隐藏时不读，已经读出来的也马上丢掉。 */
export function useFuzzerResponseRaw(uuid?: string, version?: number, enabled = true, scope?: string): Uint8Array {
  const active = !!enabled && !!uuid && !!scope
  const [packet, setPacket] = useState<Uint8Array>(EMPTY_RAW)
  const [seen, setSeen] = useState({ uuid, scope, active })
  // 换行、换页签或被藏起来时，在渲染阶段丢掉已读字节，避免在 effect 里同步 setState
  if (seen.uuid !== uuid || seen.scope !== scope || seen.active !== active) {
    setSeen({ uuid, scope, active })
    setPacket(EMPTY_RAW)
  }
  useEffect(() => {
    if (!active || !uuid || !scope) return
    let cancel = false
    fuzzerRawStore.get(scope, uuid).then((body) => {
      if (!cancel) setPacket(body || EMPTY_RAW)
    })
    return () => {
      cancel = true
    }
  }, [active, uuid, version, scope])
  return active ? packet : EMPTY_RAW
}
