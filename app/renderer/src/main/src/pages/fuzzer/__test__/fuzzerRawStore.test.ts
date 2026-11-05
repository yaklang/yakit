import { afterEach, describe, expect, it, vi } from 'vitest'
import { act, renderHook, waitFor } from '@testing-library/react'
import {
  createKeywordSearchCache,
  fillFuzzerRawList,
  fuzzerRawStore,
  fuzzerPageScope,
  saveFuzzerRaw,
  removeSessionRecords,
  STALE_MS,
  sweepStaleRecords,
  useFuzzerResponseRaw,
} from '../fuzzerRawStore'
import type { FuzzerResponse } from '../HTTPFuzzerPage'

const bytes = (values: number[]) => new Uint8Array(values)
const asArray = (value?: Uint8Array) => Array.from(value || [])

// 最小的 IDBDatabase 替身：游标按索引键升序遍历，记录被删除的主键
type FakeRow = { key: string; session?: string; at?: number }
const fakeDb = (rows: FakeRow[]) => {
  const deleted: string[] = []
  const store = {
    index: (name: string) => ({
      openKeyCursor: (range?: { lower: unknown }) => {
        const field = name === 'byAt' ? 'at' : 'session'
        const sorted = [...rows].sort((a, b) => Number(a.at) - Number(b.at))
        const source = field === 'at' ? sorted : rows
        const list = range ? source.filter((row) => row[field] === range.lower) : source
        const req: any = {}
        let i = 0
        const step = () => {
          const row = list[i]
          req.result = row ? { key: row[field], primaryKey: row.key, continue: () => (i++, step()) } : null
          queueMicrotask(() => req.onsuccess?.())
        }
        queueMicrotask(step)
        return req
      },
    }),
    delete: (key: string) => deleted.push(key),
  }
  const db = {
    transaction: () => {
      const tx: any = { objectStore: () => store }
      setTimeout(() => tx.oncomplete?.(), 5)
      return tx
    },
  }
  return { db: db as unknown as IDBDatabase, deleted }
}

describe('sweepStaleRecords', () => {
  const now = 10 * STALE_MS

  it('deletes only records older than the cutoff and keeps every newer one', async () => {
    const { db, deleted } = fakeDb([
      { key: 'fresh-other-window', at: now - 1000 },
      { key: 'old-crash-1', at: now - STALE_MS - 5000 },
      { key: 'old-crash-2', at: now - STALE_MS - 1000 },
      { key: 'just-inside', at: now - STALE_MS + 1000 },
    ])
    await sweepStaleRecords(db, now - STALE_MS)
    expect(deleted).toEqual(['old-crash-1', 'old-crash-2'])
  })

  it('never touches another live window when everything is recent', async () => {
    const { db, deleted } = fakeDb([
      { key: 'a', at: now - 5 },
      { key: 'b', at: now - 60_000 },
    ])
    await sweepStaleRecords(db, now - STALE_MS)
    expect(deleted).toEqual([])
  })
})

describe('removeSessionRecords', () => {
  it('removes only the closing window session and leaves other windows alone', async () => {
    if (typeof IDBKeyRange === 'undefined') {
      const only = (value: IDBValidKey): IDBKeyRange =>
        ({
          lower: value,
          upper: value,
          lowerOpen: false,
          upperOpen: false,
          includes: () => true,
        }) as IDBKeyRange
      Object.defineProperty(globalThis, 'IDBKeyRange', {
        configurable: true,
        value: { only, lowerBound: only, upperBound: only, bound: () => only(0) },
      })
    }
    const { db, deleted } = fakeDb([
      { key: 'mine-1', session: 's-self' },
      { key: 'theirs', session: 's-other' },
      { key: 'mine-2', session: 's-self' },
    ])
    await removeSessionRecords(db, 's-self')
    expect(deleted).toEqual(['mine-1', 'mine-2'])
  })
})

describe('createKeywordSearchCache', () => {
  it('drops the batch of an older keyword when a newer search started meanwhile', async () => {
    const cache = createKeywordSearchCache((b) => String.fromCharCode(...b))
    const rows = [row('a'), row('b')]
    // 'x' = 120, 'y' = 121；两行响应都是 "x"
    let releaseOld: () => void = () => undefined
    const oldRead = () =>
      new Promise<Map<string, Uint8Array>>((resolve) => {
        releaseOld = () =>
          resolve(
            new Map([
              ['a', bytes([120])],
              ['b', bytes([120])],
            ]),
          )
      })
    const newRead = async (uuids: string[]) => new Map(uuids.map((u) => [u, bytes([120])]))

    const oldFill = cache.fill('x', rows, oldRead)
    const newFill = cache.fill('y', rows, newRead)
    await newFill
    releaseOld()
    await oldFill

    // 新关键字 'y' 下响应 "x" 不命中；旧关键字的命中不能残留在缓存里
    expect(rows.map((r) => cache.matches(r, 'y'))).toEqual([false, false])
    expect(cache.prepare('y', rows)).toEqual([])
    expect(cache.matches(rows[0], 'x', undefined)).toBe(false)
  })

  it('reads uncached rows in batches and keeps only the hit flags', async () => {
    const toText = (b: Uint8Array) => String.fromCharCode(...b)
    const cache = createKeywordSearchCache(toText)
    const rows = Array.from(
      { length: 5 },
      (_, i) => ({ UUID: `r${i}`, RawVersion: 1, ResponseRaw: bytes([]) }) as FuzzerResponse,
    )
    const sizes: number[] = []
    const readMany = async (uuids: string[]) => {
      sizes.push(uuids.length)
      return new Map(uuids.map((u) => [u, bytes([u === 'r3' ? 120 : 121])]))
    }
    await cache.fill('x', rows, readMany, 2)
    expect(sizes).toEqual([2, 2, 1])
    expect(rows.map((row) => cache.matches(row, 'x'))).toEqual([false, false, false, true, false])
    await cache.fill('x', rows, readMany, 2)
    expect(sizes).toEqual([2, 2, 1])
  })

  it('does not re-read rows that have no stored response until their version changes', async () => {
    const cache = createKeywordSearchCache((b) => String.fromCharCode(...b))
    const rows = [row('a'), row('b')]
    const readMany = vi.fn(
      async (uuids: string[]) => new Map(uuids.filter((u) => u === 'b').map((u) => [u, bytes([120])])),
    )
    await cache.fill('x', rows, readMany)
    expect(rows.map((r) => cache.matches(r, 'x'))).toEqual([false, true])
    await cache.fill('x', rows, readMany)
    expect(readMany).toHaveBeenCalledTimes(1)
    // 响应后来补上，RawVersion 变化后必须重新读取
    rows[0] = row('a', 2)
    expect(cache.prepare('x', rows)).toEqual(['a'])
  })

  it('does not remember a miss when reading the response fails', async () => {
    const cache = createKeywordSearchCache((b) => String.fromCharCode(...b))
    const rows = [row('a')]
    await cache.fill('x', rows, async () => {
      throw new Error('db')
    })
    expect(cache.prepare('x', rows)).toEqual(['a'])
  })

  it('keeps earlier hits when a later batch fails to read', async () => {
    const cache = createKeywordSearchCache((b) => String.fromCharCode(...b))
    const rows = [row('a'), row('b')]
    const readMany = vi.fn(async (uuids: string[]) => {
      if (uuids.includes('b')) throw new Error('db')
      return new Map(uuids.map((uuid) => [uuid, bytes([120])]))
    })
    await cache.fill('x', rows, readMany, 1)
    expect(cache.matches(rows[0], 'x')).toBe(true)
    expect(cache.prepare('x', rows)).toEqual(['b'])
  })

  const toText = vi.fn((b: Uint8Array) => String.fromCharCode(...b))
  const row = (uuid: string, version = 1) =>
    ({ UUID: uuid, RawVersion: version, ResponseRaw: bytes([]) }) as FuzzerResponse

  it('asks for rows it has not seen and reuses hits for the same version', () => {
    const cache = createKeywordSearchCache(toText)
    const rows = [row('a'), row('b')]
    expect(cache.prepare('x', rows)).toEqual(['a', 'b'])
    expect(cache.matches(rows[0], 'x', bytes([120]))).toBe(true)
    expect(cache.matches(rows[1], 'x', undefined)).toBe(false)
    expect(cache.prepare('x', rows)).toEqual(['b'])
    expect(cache.matches(rows[0], 'x', undefined)).toBe(true)
  })

  it('invalidates on RawVersion change and keyword change', () => {
    const cache = createKeywordSearchCache(toText)
    cache.prepare('x', [row('a')])
    cache.matches(row('a'), 'x', bytes([120]))
    expect(cache.prepare('x', [row('a', 2)])).toEqual(['a'])
    expect(cache.prepare('y', [row('a')])).toEqual(['a'])
  })

  it('drops cache entries for rows that left the table', () => {
    const cache = createKeywordSearchCache(toText)
    cache.prepare('x', [row('a'), row('b')])
    cache.matches(row('a'), 'x', bytes([120]))
    cache.prepare('x', [row('b')])
    expect(cache.prepare('x', [row('a'), row('b')])).toContain('a')
  })

  it('does not cache a miss when the stored response could not be read', () => {
    const cache = createKeywordSearchCache(toText)
    cache.prepare('x', [row('a')])
    expect(cache.matches(row('a'), 'x', undefined)).toBe(false)
    expect(cache.prepare('x', [row('a')])).toEqual(['a'])
  })

  it('searches rows that still carry a response in memory', () => {
    const cache = createKeywordSearchCache(toText)
    const live = { UUID: 'l', ResponseRaw: bytes([120]) } as FuzzerResponse
    expect(cache.prepare('x', [live])).toEqual([])
    expect(cache.matches(live, 'x')).toBe(true)
  })

  it('re-reads when RawVersion changes while the response is being read', async () => {
    const cache = createKeywordSearchCache((b) => String.fromCharCode(...b))
    const row = { UUID: 'a', RawVersion: 1, ResponseRaw: bytes([]) } as FuzzerResponse
    let calls = 0
    const readMany = vi.fn(async () => {
      calls += 1
      if (calls === 1) {
        row.RawVersion = 2
        return new Map([['a', bytes([120])]])
      }
      return new Map([['a', bytes([121])]])
    })
    await cache.fill('x', [row], readMany)
    expect(calls).toBe(2)
    expect(cache.matches(row, 'x')).toBe(false)
    expect(cache.prepare('x', [row])).toEqual([])
  })
})

describe('fuzzerRawStore', () => {
  it('keeps an earlier response when a later packet does not include one', async () => {
    const scope = fuzzerPageScope('keep')
    await fuzzerRawStore.save(scope, 'u1', bytes([9]))
    await fuzzerRawStore.save(scope, 'u1', bytes([]))
    expect(asArray(await fuzzerRawStore.get(scope, 'u1'))).toEqual([9])
    await fuzzerRawStore.deleteScope(scope)
    expect(await fuzzerRawStore.get(scope, 'u1')).toBeUndefined()
  })

  it('drops packets queued before a scope is cleared and keeps packets queued after', async () => {
    const scope = fuzzerPageScope('reset')
    const stale = fuzzerRawStore.save(scope, 'old', bytes([1]))
    const cleared = fuzzerRawStore.deleteScope(scope)
    const fresh = fuzzerRawStore.save(scope, 'new', bytes([4]))
    await Promise.all([stale, cleared, fresh])
    expect(await fuzzerRawStore.get(scope, 'old')).toBeUndefined()
    expect(asArray(await fuzzerRawStore.get(scope, 'new'))).toEqual([4])
    await fuzzerRawStore.deleteScope(scope)
  })

  it('removes a single evicted response without touching its neighbours', async () => {
    const scope = fuzzerPageScope('evict')
    await fuzzerRawStore.save(scope, 'e1', bytes([1]))
    await fuzzerRawStore.save(scope, 'e2', bytes([2]))
    await fuzzerRawStore.deleteUuid(scope, 'e1')
    expect(await fuzzerRawStore.get(scope, 'e1')).toBeUndefined()
    expect(asArray(await fuzzerRawStore.get(scope, 'e2'))).toEqual([2])
    await fuzzerRawStore.deleteScope(scope)
  })

  it('evicts a response whose write is still queued', async () => {
    const scope = fuzzerPageScope('evict-queued')
    const queued = fuzzerRawStore.save(scope, 'q1', bytes([5]))
    const removed = fuzzerRawStore.deleteUuid(scope, 'q1')
    await Promise.all([queued, removed])
    expect(await fuzzerRawStore.get(scope, 'q1')).toBeUndefined()
    await fuzzerRawStore.deleteScope(scope)
  })

  it('keeps pages isolated: clearing one scope leaves other pages alone', async () => {
    const a = fuzzerPageScope('a')
    const b = fuzzerPageScope('b')
    await fuzzerRawStore.save(a, 'pa', bytes([1]))
    await fuzzerRawStore.save(b, 'pb', bytes([2]))
    await fuzzerRawStore.deleteScope(a)
    expect(await fuzzerRawStore.get(a, 'pa')).toBeUndefined()
    expect(asArray(await fuzzerRawStore.get(b, 'pb'))).toEqual([2])
    await fuzzerRawStore.deleteScope(b)
  })

  it('bumps RawVersion only when a response is actually stored', () => {
    const scope = fuzzerPageScope('version')
    const row = { UUID: 'v1', RequestRaw: bytes([1]), ResponseRaw: bytes([2]) } as FuzzerResponse
    saveFuzzerRaw(scope, row)
    expect(row.RawVersion).toBe(1)
    saveFuzzerRaw(scope, row)
    expect(row.RawVersion).toBe(1)
    void fuzzerRawStore.deleteScope(scope)
  })

  it('reads many responses at once and skips unknown uuids', async () => {
    const scope = fuzzerPageScope('many')
    await fuzzerRawStore.save(scope, 'm1', bytes([1]))
    await fuzzerRawStore.save(scope, 'm2', bytes([2]))
    const found = await fuzzerRawStore.getMany(scope, ['m1', 'm2', 'missing'])
    expect(found.size).toBe(2)
    expect(asArray(found.get('m2'))).toEqual([2])
    await fuzzerRawStore.deleteScope(scope)
  })

  it('moves only the response off the row', async () => {
    const row = {
      UUID: 'row-1',
      RequestRaw: bytes([7]),
      ResponseRaw: bytes([8]),
    } as FuzzerResponse
    saveFuzzerRaw(fuzzerPageScope('row'), row)
    expect(asArray(row.RequestRaw)).toEqual([7])
    expect(row.ResponseRaw).toHaveLength(0)
    expect(asArray(await fuzzerRawStore.get(fuzzerPageScope('row'), 'row-1'))).toEqual([8])
    await fuzzerRawStore.deleteScope(fuzzerPageScope('row'))
  })

  it('keeps one copy per scope when two tabs share a history uuid', async () => {
    const a = fuzzerPageScope('share-a')
    const b = fuzzerPageScope('share-b')
    await fuzzerRawStore.save(a, 'same', bytes([1]))
    await fuzzerRawStore.save(b, 'same', bytes([2]))
    expect(asArray(await fuzzerRawStore.get(a, 'same'))).toEqual([1])
    expect(asArray(await fuzzerRawStore.get(b, 'same'))).toEqual([2])
    await fuzzerRawStore.deleteScope(a)
    expect(await fuzzerRawStore.get(a, 'same')).toBeUndefined()
    expect(asArray(await fuzzerRawStore.get(b, 'same'))).toEqual([2])
    await fuzzerRawStore.deleteScope(b)
  })

  it('gives batch extract the full response after the row was offloaded', async () => {
    const scope = fuzzerPageScope('extract')
    const row = {
      UUID: 'ex-1',
      RequestRaw: bytes([1]),
      ResponseRaw: bytes([72, 105]),
    } as FuzzerResponse
    saveFuzzerRaw(scope, row)
    expect(row.RawScope).toBe(scope)
    expect(row.ResponseRaw).toHaveLength(0)
    const [full] = await fillFuzzerRawList([row])
    expect(asArray(full.ResponseRaw)).toEqual([72, 105])
    expect(asArray(row.RequestRaw)).toEqual([1])
    expect(row.ResponseRaw).toHaveLength(0)
    await fuzzerRawStore.deleteScope(scope)
  })
})

describe('useFuzzerResponseRaw', () => {
  const scope = fuzzerPageScope('hook')

  it('returns the stored response and rereads it when the version changes', async () => {
    // 初始无版本：库里还没有数据，读到的是空
    const { result, rerender } = renderHook(
      ({ version }: { version?: number }) => useFuzzerResponseRaw('hv', version, true, scope),
      {
        initialProps: { version: undefined } as { version?: number },
      },
    )
    expect(result.current).toHaveLength(0)

    // 第一次入库后（RawVersion 1），靠版本变化触发重读
    await fuzzerRawStore.save(scope, 'hv', bytes([1]))
    rerender({ version: 1 })
    await waitFor(() => expect(asArray(result.current)).toEqual([1]))

    // 响应被重写（RawVersion 2）：版本再变时拿到的是新字节
    await fuzzerRawStore.save(scope, 'hv', bytes([2, 2]))
    rerender({ version: 2 })
    await waitFor(() => expect(asArray(result.current)).toEqual([2, 2]))
    await fuzzerRawStore.deleteScope(scope)
  })

  it('drops the packet when the row changes or the tab hides', async () => {
    await fuzzerRawStore.save(scope, 'h1', bytes([1]))
    const { result, rerender } = renderHook(
      ({ uuid, enabled }: { uuid?: string; enabled: boolean }) => useFuzzerResponseRaw(uuid, undefined, enabled, scope),
      { initialProps: { uuid: 'h1', enabled: true } },
    )
    await waitFor(() => expect(asArray(result.current)).toEqual([1]))

    // 换行：旧 uuid 的字节立刻丢掉，新 uuid 未入库时保持空
    rerender({ uuid: 'h2', enabled: true })
    expect(result.current).toHaveLength(0)
    await waitFor(() => expect(result.current).toHaveLength(0))

    // 页签隐藏：已读出的字节也马上丢掉
    await fuzzerRawStore.save(scope, 'h1', bytes([1]))
    rerender({ uuid: 'h1', enabled: true })
    await waitFor(() => expect(asArray(result.current)).toEqual([1]))
    rerender({ uuid: 'h1', enabled: false })
    expect(result.current).toHaveLength(0)
    await fuzzerRawStore.deleteScope(scope)
  })

  it('does not read while disabled and catches up after re-enabling', async () => {
    await fuzzerRawStore.save(scope, 'h3', bytes([3]))
    const { result, rerender } = renderHook(
      ({ enabled }: { enabled: boolean }) => useFuzzerResponseRaw('h3', undefined, enabled, scope),
      {
        initialProps: { enabled: false },
      },
    )
    expect(result.current).toHaveLength(0)
    rerender({ enabled: true })
    await waitFor(() => expect(asArray(result.current)).toEqual([3]))
    await fuzzerRawStore.deleteScope(scope)
  })
})

// 可控的 IndexedDB：readwrite 事务可以卡住，用来把 flush 和 deleteScope 排进同一条队列。
const createHoldableIndexedDB = () => {
  const records = new Map<string, { id: string; uuid: string; scope: string; session: string; response: ArrayBuffer }>()
  let created = false
  let holdWrites = false
  const held: Array<() => void> = []

  const scheduleComplete = (tx: { oncomplete?: () => void }) => {
    queueMicrotask(() => {
      queueMicrotask(() => tx.oncomplete?.())
    })
  }

  const openCursor = (field: 'scope' | 'session' | 'at', range?: { lower?: unknown }, withValue = true) => {
    let list = [...records.values()]
    if (field === 'at') list.sort((a, b) => Number((a as { at?: number }).at) - Number((b as { at?: number }).at))
    if (range && 'lower' in range) {
      list = list.filter((row) => (row as unknown as Record<string, unknown>)[field] === range.lower)
    }
    const req: { result: unknown; onsuccess?: () => void } = { result: null }
    let index = 0
    const step = () => {
      const row = list[index]
      if (!row) {
        req.result = null
        req.onsuccess?.()
        return
      }
      req.result = {
        key: (row as unknown as Record<string, unknown>)[field],
        primaryKey: row.id,
        value: withValue ? row : undefined,
        continue: () => {
          index += 1
          step()
        },
        delete: () => records.delete(row.id),
      }
      req.onsuccess?.()
    }
    queueMicrotask(step)
    return req
  }

  const db = {
    objectStoreNames: { contains: () => created },
    deleteObjectStore: () => {
      records.clear()
      created = false
    },
    createObjectStore: () => {
      created = true
      return { createIndex: () => undefined }
    },
    transaction: (_name: string, mode: string) => {
      const tx: { oncomplete?: () => void; objectStore: () => unknown } = {
        objectStore: () => store,
      }
      if (mode === 'readwrite' && holdWrites) held.push(() => scheduleComplete(tx))
      else scheduleComplete(tx)
      return tx
    },
  }

  const store = {
    get: (key: string) => {
      const req: { result?: unknown; onsuccess?: () => void; onerror?: () => void } = {}
      queueMicrotask(() => {
        req.result = records.get(key)
        req.onsuccess?.()
      })
      return req
    },
    put: (value: { id: string; uuid: string; scope: string; session: string; response: ArrayBuffer }) => {
      records.set(value.id, value)
    },
    delete: (key: string) => records.delete(key),
    index: (name: string) => {
      const field = name === 'byAt' ? 'at' : name === 'bySession' ? 'session' : 'scope'
      return {
        openCursor: (range?: { lower?: unknown }) => openCursor(field, range, true),
        openKeyCursor: (range?: { lower?: unknown }) => openCursor(field, range, false),
      }
    },
  }

  return {
    records,
    heldCount: () => held.length,
    setHoldWrites: (value: boolean) => {
      holdWrites = value
    },
    releaseOne: () => held.shift()?.(),
    indexedDB: {
      open: () => {
        const req: { result?: unknown; onsuccess?: () => void; onupgradeneeded?: () => void; onerror?: () => void } = {}
        queueMicrotask(() => {
          req.result = db
          if (!created) req.onupgradeneeded?.()
          queueMicrotask(() => req.onsuccess?.())
        })
        return req
      },
    },
  }
}

const storedBodies = (records: Map<string, { uuid: string; scope: string; response: ArrayBuffer }>) =>
  [...records.values()].map((row) => ({
    uuid: row.uuid,
    scope: row.scope,
    bytes: Array.from(new Uint8Array(row.response)),
  }))

describe('fuzzer raw IndexedDB transactions', () => {
  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
    vi.resetModules()
  })

  const load = async () => {
    vi.resetModules()
    const fake = createHoldableIndexedDB()
    vi.stubGlobal('indexedDB', fake.indexedDB)
    // jsdom 没有 IDBKeyRange，按 scope 删除会直接抛掉。补一个 only() 就够。
    vi.stubGlobal('IDBKeyRange', {
      only: (value: unknown) => ({ lower: value, upper: value }),
    })
    const mod = await import('../fuzzerRawStore')
    return { fake, mod }
  }

  it('commits the same uuid under two scopes and deletes only one of them', async () => {
    vi.useFakeTimers()
    const { fake, mod } = await load()
    const a = mod.fuzzerPageScope('db-a')
    const b = mod.fuzzerPageScope('db-b')
    await mod.fuzzerRawStore.save(a, 'same', bytes([1]))
    await mod.fuzzerRawStore.save(b, 'same', bytes([2]))
    await vi.advanceTimersByTimeAsync(300)

    expect(storedBodies(fake.records)).toEqual([
      { uuid: 'same', scope: a, bytes: [1] },
      { uuid: 'same', scope: b, bytes: [2] },
    ])
    expect(asArray(await mod.fuzzerRawStore.get(a, 'same'))).toEqual([1])
    expect(asArray(await mod.fuzzerRawStore.get(b, 'same'))).toEqual([2])

    const cleared = mod.fuzzerRawStore.deleteScope(a)
    await vi.advanceTimersByTimeAsync(0)
    await cleared
    expect(storedBodies(fake.records)).toEqual([{ uuid: 'same', scope: b, bytes: [2] }])
    expect(await mod.fuzzerRawStore.get(a, 'same')).toBeUndefined()
    expect(asArray(await mod.fuzzerRawStore.get(b, 'same'))).toEqual([2])
  })

  it('does not let a queued flush write responses that arrived after resend', async () => {
    vi.useFakeTimers()
    const { fake, mod } = await load()
    const scope = mod.fuzzerPageScope('db-race')

    await mod.fuzzerRawStore.save(scope, 'warm', bytes([9]))
    await vi.advanceTimersByTimeAsync(300)
    expect(storedBodies(fake.records)).toEqual([{ uuid: 'warm', scope, bytes: [9] }])

    fake.setHoldWrites(true)
    await mod.fuzzerRawStore.save(scope, 'blocked', bytes([1]))
    await vi.advanceTimersByTimeAsync(300)
    expect(fake.heldCount()).toBe(1)

    // 这一批在重发之前入队，必须冻住旧包，不能等事务轮到自己时再读 pending。
    await mod.fuzzerRawStore.save(scope, 'old', bytes([2]))
    await vi.advanceTimersByTimeAsync(300)
    const cleared = mod.fuzzerRawStore.deleteScope(scope)
    await mod.fuzzerRawStore.save(scope, 'fresh', bytes([3]))

    fake.releaseOne()
    await vi.advanceTimersByTimeAsync(0)
    expect(fake.heldCount()).toBe(1)
    fake.releaseOne()
    await vi.advanceTimersByTimeAsync(0)
    expect(fake.heldCount()).toBe(1)
    fake.releaseOne()
    await vi.advanceTimersByTimeAsync(0)
    await cleared

    await vi.advanceTimersByTimeAsync(300)
    // 重发之后的新包还在等写库，不能被前面那次清空一起删掉。
    expect(fake.heldCount()).toBe(1)
    fake.releaseOne()
    await vi.advanceTimersByTimeAsync(0)

    expect(await mod.fuzzerRawStore.get(scope, 'old')).toBeUndefined()
    expect(await mod.fuzzerRawStore.get(scope, 'blocked')).toBeUndefined()
    expect(await mod.fuzzerRawStore.get(scope, 'warm')).toBeUndefined()
    expect(asArray(await mod.fuzzerRawStore.get(scope, 'fresh'))).toEqual([3])
    expect(storedBodies(fake.records)).toEqual([{ uuid: 'fresh', scope, bytes: [3] }])
  })
})
