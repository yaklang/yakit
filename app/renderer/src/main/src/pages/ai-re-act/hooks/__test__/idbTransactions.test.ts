import { afterEach, describe, expect, it, vi } from 'vitest'
import { AIChatPersistStore } from '../persist/aiChatPersistStore'
import { SESSION_CONTENT_STORE, SESSION_REFERENCE_STORE, SESSION_RENDER_STORE } from '../persist/constants'

/** 手动提交/中止事务，用于区分单条请求成功与事务真正完成，不模拟浏览器的自动提交。 */
const transaction = () => {
  const tables = new Map<string, ReturnType<typeof table>>()
  const table = () => ({
    clear: vi.fn(),
    put: vi.fn().mockReturnValue({}),
    delete: vi.fn().mockReturnValue({}),
    get: vi.fn().mockReturnValue({ result: undefined, onsuccess: undefined as (() => void) | undefined }),
    getAllKeys: vi.fn().mockReturnValue({ result: [], onsuccess: undefined as (() => void) | undefined }),
    index: vi.fn().mockReturnValue({
      getAllKeys: vi.fn().mockReturnValue({ result: [], onsuccess: undefined as (() => void) | undefined }),
    }),
  })
  return {
    error: null as Error | null,
    oncomplete: undefined as (() => void) | undefined,
    onabort: undefined as (() => void) | undefined,
    abort: vi.fn(),
    objectStore: (name: string) => {
      if (!tables.has(name)) tables.set(name, table())
      return tables.get(name)!
    },
  }
}

/** openDatabase 只替换环境边界；被测的 open、清理及 CRUD 方法使用真实实现。 */
const database = () => {
  const transactions: ReturnType<typeof transaction>[] = []
  const db = {
    close: vi.fn(),
    transaction: vi.fn(() => {
      const tx = transaction()
      transactions.push(tx)
      return tx
    }),
  }
  const store = new AIChatPersistStore()
  vi.spyOn(store as any, 'openDatabase').mockResolvedValue(db)
  return { store, db, transactions }
}

/** 推进 open 的 Promise，不触发任何事务提交。 */
const tick = async () => {
  for (let i = 0; i < 6; i++) await Promise.resolve()
}

afterEach(() => vi.restoreAllMocks())

describe('AI session IDB startup and transaction boundaries', () => {
  it('clears all three stores once and blocks concurrent reads/writes until commit', async () => {
    const { store, db, transactions } = database()
    const first = store.open()
    const second = store.open()
    const write = store.setSessionRender('s', 'ai', {} as any, 0)
    await tick()
    expect(transactions).toHaveLength(1)
    for (const name of [SESSION_RENDER_STORE, SESSION_CONTENT_STORE, SESSION_REFERENCE_STORE]) {
      expect(transactions[0].objectStore(name).clear).toHaveBeenCalledOnce()
    }
    expect(db.transaction).toHaveBeenCalledWith(
      [SESSION_RENDER_STORE, SESSION_CONTENT_STORE, SESSION_REFERENCE_STORE],
      'readwrite',
    )
    transactions[0].oncomplete!()
    await Promise.all([first, second])
    await tick()
    expect(transactions).toHaveLength(2)
    transactions[1].oncomplete!()
    await write
    await store.close()
    await store.open()
    expect(transactions).toHaveLength(2)
    // 新主渲染端拥有新的模块实例，重新清理。
    const reloaded = database()
    const reload = reloaded.store.open()
    await tick()
    expect(reloaded.transactions).toHaveLength(1)
    reloaded.transactions[0].oncomplete!()
    await reload
  })

  it('rejects all concurrent startup users on abort and retries initialization', async () => {
    const { store, transactions } = database()
    const first = store.open()
    const write = store.setSessionRender('s', 'ai', {} as any, 0)
    const results = Promise.allSettled([first, write])
    await tick()
    transactions[0].error = new Error('startup failed')
    transactions[0].onabort!()
    expect((await results).every((result) => result.status === 'rejected')).toBe(true)
    const retry = store.open()
    await tick()
    expect(transactions).toHaveLength(2)
    transactions[1].oncomplete!()
    await retry
  })

  it('waits for abort before returning an updater error', async () => {
    const { store, transactions } = database()
    const opening = store.open()
    await tick()
    transactions[0].oncomplete!()
    await opening
    let rejected = false
    const update = store.setSessionContent('s', 't', () => {
      throw new Error('invalid update')
    })
    const checked = update.catch((error) => {
      rejected = true
      expect(error.message).toBe('invalid update')
    })
    await tick()
    const tx = transactions[1]
    tx.objectStore(SESSION_CONTENT_STORE).get.mock.results[0].value.onsuccess!()
    await tick()
    expect(tx.abort).toHaveBeenCalledOnce()
    expect(rejected).toBe(false)
    tx.onabort!()
    await checked
    expect(rejected).toBe(true)
  })

  it.each(['render', 'content', 'reference', 'delete-content', 'delete-session', 'delete-all'])(
    '%s waits for transaction commit and rejects a subsequent abort',
    async (kind) => {
      vi.stubGlobal('IDBKeyRange', { bound: vi.fn(), only: vi.fn() })
      const { store, transactions } = database()
      const open = store.open()
      await tick()
      transactions[0].oncomplete!()
      await open
      const write = () => {
        switch (kind) {
          case 'render':
            return store.setSessionRender('s', 'ai', {} as any, 0)
          case 'content':
            return store.setSessionContent('s', 't', () => ({ id: 't' }) as any)
          case 'reference':
            return store.setSessionReference('s', 'r', {} as any)
          case 'delete-content':
            return store.deleteSessionContent('s', 't')
          case 'delete-session':
            return store.deleteSessionPersist('s')
          default:
            return store.deleteAllPersist()
        }
      }
      let settled = false
      const pending = write().then(() => {
        settled = true
      })
      await tick()
      if (kind === 'content') transactions[1].objectStore(SESSION_CONTENT_STORE).get.mock.results[0].value.onsuccess!()
      await tick()
      expect(settled).toBe(false)
      transactions[1].oncomplete!()
      await pending
      expect(settled).toBe(true)
      const failed = write()
      const rejection = expect(failed).rejects.toThrow('aborted')
      await tick()
      transactions[2].onabort!()
      await rejection
      vi.unstubAllGlobals()
    },
  )

  it('checks render keys and both session indexes, deleting only returned keys in one transaction', async () => {
    vi.stubGlobal('IDBKeyRange', {
      bound: (lower: unknown, upper: unknown) => [lower, upper],
      only: (id: string) => id,
    })
    const { store, transactions } = database()
    const opening = store.open()
    await tick()
    transactions[0].oncomplete!()
    await opening
    const pending = store.deleteSessionPersist('target')
    await tick()
    const tx = transactions[1]
    const render = tx.objectStore(SESSION_RENDER_STORE)
    const renderRequest = render.getAllKeys.mock.results[0].value
    renderRequest.result = [
      ['target', 'ai'],
      ['target', 'im-Lark'],
    ]
    renderRequest.onsuccess!()
    expect(render.delete.mock.calls).toEqual([[['target', 'ai']], [['target', 'im-Lark']]])
    for (const name of [SESSION_CONTENT_STORE, SESSION_REFERENCE_STORE]) {
      const table = tx.objectStore(name)
      const index = table.index.mock.results[0].value
      expect(index.getAllKeys).toHaveBeenCalledWith('target')
      const request = index.getAllKeys.mock.results[0].value
      request.result = [['target', name]]
      request.onsuccess!()
      expect(table.delete).toHaveBeenCalledWith(['target', name])
    }
    tx.oncomplete!()
    await pending
    vi.unstubAllGlobals()
  })
})
