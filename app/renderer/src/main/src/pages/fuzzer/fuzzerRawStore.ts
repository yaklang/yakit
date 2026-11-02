import { useEffect, useState } from 'react'
import type { FuzzerResponse } from './HTTPFuzzerPage'

/**
 * 列表不留请求/响应原文。原文进 IndexedDB，点详情再读。
 * 关闭对应 fuzzer（或重新发送）时按 scope 删掉。
 * 同一个渲染进程里第一次打开库会清空上次崩溃留下的数据。
 */

const DB_NAME = 'yakit-fuzzer-raw'
const STORE = 'packets'
const DB_VERSION = 1

export const EMPTY_RAW = new Uint8Array()

export interface FuzzerRawBody {
  request: Uint8Array
  response: Uint8Array
}

interface FuzzerRawRecord {
  uuid: string
  scope: string
  request: ArrayBuffer
  response: ArrayBuffer
}

interface PendingRaw {
  scope: string
  request?: ArrayBuffer
  response?: ArrayBuffer
  token: object
}

const EMPTY_PACKET: FuzzerRawBody = { request: EMPTY_RAW, response: EMPTY_RAW }
const pending = new Map<string, PendingRaw>()
const epochs = new Map<string, number>()
const tails = new Map<string, Promise<void>>()
const memory = new Map<string, FuzzerRawRecord>()

let backend: 'idb' | 'memory' | null = null
let dbPromise: Promise<IDBDatabase> | null = null
let startupClear: Promise<void> | null = null

export const fuzzerPageScope = (pageId: string) => `page:${pageId}`
export const fuzzerSequenceScope = (groupId: string, mode: string, fuzzerIndex: string) =>
  `seq:${groupId || 'group'}:${mode}:${fuzzerIndex}`

const copyBuffer = (bytes?: Uint8Array) => {
  if (!bytes?.byteLength) return new ArrayBuffer(0)
  const copy = new Uint8Array(bytes.byteLength)
  copy.set(bytes)
  return copy.buffer
}

const toBody = (request?: ArrayBuffer, response?: ArrayBuffer): FuzzerRawBody => ({
  request: request?.byteLength ? new Uint8Array(request) : EMPTY_RAW,
  response: response?.byteLength ? new Uint8Array(response) : EMPTY_RAW,
})

const epochOf = (scope: string) => epochs.get(scope) || 0

const afterScope = (scope: string, job: () => Promise<void>) => {
  const prev = tails.get(scope) || Promise.resolve()
  const next = prev.then(job, job)
  tails.set(
    scope,
    next.then(
      () => undefined,
      () => undefined,
    ),
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
      if (!db.objectStoreNames.contains(STORE)) {
        const store = db.createObjectStore(STORE, { keyPath: 'uuid' })
        store.createIndex('byScope', 'scope', { unique: false })
      }
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

const clearDatabase = (db: IDBDatabase) => {
  const tx = db.transaction(STORE, 'readwrite')
  tx.objectStore(STORE).clear()
  return waitTransaction(tx)
}

const ensureBackend = async () => {
  if (backend) return
  if (typeof indexedDB === 'undefined') {
    backend = 'memory'
    return
  }
  try {
    const db = await openDatabase()
    if (!startupClear) {
      startupClear = clearDatabase(db).catch((error) => {
        startupClear = null
        throw error
      })
    }
    await startupClear
    backend = 'idb'
  } catch {
    backend = 'memory'
  }
}

const readRecord = async (uuid: string): Promise<FuzzerRawRecord | undefined> => {
  await ensureBackend()
  if (backend === 'memory') return memory.get(uuid)
  const db = await openDatabase()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly')
    const req = tx.objectStore(STORE).get(uuid)
    req.onsuccess = () => resolve(req.result as FuzzerRawRecord | undefined)
    req.onerror = () => reject(req.error)
  })
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

const writeRecord = async (record: FuzzerRawRecord) => {
  await ensureBackend()
  if (backend === 'memory') {
    memory.set(record.uuid, record)
    return
  }
  const db = await openDatabase()
  const tx = db.transaction(STORE, 'readwrite')
  tx.objectStore(STORE).put(record)
  await waitTransaction(tx)
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

const removeUuidRecord = async (uuid: string) => {
  await ensureBackend()
  if (backend === 'memory') {
    memory.delete(uuid)
    return
  }
  const db = await openDatabase()
  const tx = db.transaction(STORE, 'readwrite')
  tx.objectStore(STORE).delete(uuid)
  await waitTransaction(tx)
}

const dropPending = (scope: string) => {
  for (const [uuid, item] of pending) {
    if (item.scope === scope) pending.delete(uuid)
  }
}

export const fuzzerRawStore = {
  async get(uuid?: string): Promise<FuzzerRawBody | undefined> {
    if (!uuid) return undefined
    const staged = pending.get(uuid)
    if (staged) return toBody(staged.request, staged.response)
    const record = await readRecord(uuid)
    if (!record) return undefined
    return toBody(record.request, record.response)
  },

  async getMany(uuids: string[]) {
    const found = new Map<string, FuzzerRawBody>()
    const missing: string[] = []
    uuids.forEach((uuid) => {
      if (!uuid || found.has(uuid)) return
      const staged = pending.get(uuid)
      if (staged) found.set(uuid, toBody(staged.request, staged.response))
      else missing.push(uuid)
    })
    if (!missing.length) return found
    const rows = await readRecords(missing)
    rows.forEach((record) => {
      if (record) found.set(record.uuid, toBody(record.request, record.response))
    })
    return found
  },

  merge(scope: string, uuid: string, request?: Uint8Array, response?: Uint8Array) {
    if (!scope || !uuid) return Promise.resolve()
    const seen = epochOf(scope)
    const requestCopy = request?.byteLength ? copyBuffer(request) : undefined
    const responseCopy = response?.byteLength ? copyBuffer(response) : undefined
    const token = {}
    const prev = pending.get(uuid)
    pending.set(uuid, {
      scope,
      token,
      request: requestCopy || prev?.request,
      response: responseCopy || prev?.response,
    })
    return afterScope(scope, async () => {
      if (epochOf(scope) !== seen) {
        if (pending.get(uuid)?.token === token) pending.delete(uuid)
        return
      }
      try {
        const current = await readRecord(uuid)
        await writeRecord({
          uuid,
          scope,
          request: requestCopy || current?.request || new ArrayBuffer(0),
          response: responseCopy || current?.response || new ArrayBuffer(0),
        })
        if (pending.get(uuid)?.token === token) pending.delete(uuid)
      } catch {
        // 写入失败时留在 pending，详情还能读到这包原文。
      }
    })
  },

  deleteUuid(uuid: string) {
    if (!uuid) return Promise.resolve()
    const staged = pending.get(uuid)
    pending.delete(uuid)
    return (async () => {
      const scope = staged?.scope || (await readRecord(uuid))?.scope
      if (!scope) return
      await afterScope(scope, () => removeUuidRecord(uuid))
    })()
  },

  deleteScope(scope: string) {
    if (!scope) return Promise.resolve()
    dropPending(scope)
    epochs.set(scope, epochOf(scope) + 1)
    const seen = epochOf(scope)
    return afterScope(scope, async () => {
      if (epochOf(scope) !== seen) return
      await removeScopeRecords(scope)
    })
  },
}

/** 把这一行的原文交出去，行上只留空数组。后续空包不会盖掉已经存下的原文。 */
export function parkFuzzerRaw(scope: string, item: FuzzerResponse) {
  // 没有 UUID 就留在行上，避免原文被清掉后又无处可读。
  if (!scope || !item?.UUID) return
  const request = item.RequestRaw
  const response = item.ResponseRaw
  item.RawVersion = (item.RawVersion || 0) + 1
  item.RequestRaw = EMPTY_RAW
  item.ResponseRaw = EMPTY_RAW
  if (!request?.byteLength && !response?.byteLength) return
  void fuzzerRawStore
    .merge(scope, item.UUID, request?.byteLength ? request : undefined, response?.byteLength ? response : undefined)
    .catch(() => undefined)
}

export async function hydrateFuzzerRaw<T extends FuzzerResponse>(row: T): Promise<T> {
  if (!row?.UUID || row.RequestRaw?.byteLength || row.ResponseRaw?.byteLength) return row
  const body = await fuzzerRawStore.get(row.UUID)
  if (!body) return row
  return { ...row, RequestRaw: body.request, ResponseRaw: body.response }
}

export async function hydrateFuzzerRawList<T extends FuzzerResponse>(rows: T[]) {
  const bodies = await fuzzerRawStore.getMany(rows.map((row) => row.UUID).filter((uuid): uuid is string => !!uuid))
  return rows.map((row) => {
    if (!row?.UUID || row.RequestRaw?.byteLength || row.ResponseRaw?.byteLength) return row
    const body = bodies.get(row.UUID)
    if (!body) return row
    return { ...row, RequestRaw: body.request, ResponseRaw: body.response }
  })
}

/** 详情区读取原文。隐藏页签时 enabled=false，马上丢掉已读出的字节。 */
export function useFuzzerRaw(uuid?: string, version?: number, enabled = true): FuzzerRawBody {
  const [packet, setPacket] = useState<FuzzerRawBody>(EMPTY_PACKET)
  const [seenUuid, setSeenUuid] = useState(uuid)
  if (seenUuid !== uuid) {
    setSeenUuid(uuid)
    setPacket(EMPTY_PACKET)
  }
  useEffect(() => {
    if (!enabled || !uuid) {
      setPacket(EMPTY_PACKET)
      return
    }
    let cancel = false
    fuzzerRawStore.get(uuid).then((body) => {
      if (!cancel) setPacket(body || EMPTY_PACKET)
    })
    return () => {
      cancel = true
    }
  }, [uuid, version, enabled])
  return enabled && uuid ? packet : EMPTY_PACKET
}
