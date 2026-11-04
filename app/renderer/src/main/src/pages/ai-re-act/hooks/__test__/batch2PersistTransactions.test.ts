import './setupElectron'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AIChatPersistStore } from '../persist/aiChatPersistStore'
import { AIAgentIDBCacheClearValue } from '../persist/constants'
import { getRemoteValue } from '@/utils/kv'
vi.mock('@/utils/kv', () => ({ getRemoteValue: vi.fn(), setRemoteValue: vi.fn().mockResolvedValue(undefined) }))
beforeEach(() => {
  vi.mocked(getRemoteValue).mockResolvedValue(AIAgentIDBCacheClearValue)
})
const fakeDB = () => ({ close: vi.fn(), transaction: vi.fn(), onversionchange: null, onclose: null })
describe('real persistence transaction boundaries with a controlled IDB transport', () => {
  it('keeps current-version caches and waits for transaction commit rather than put success', async () => {
    const instance = new AIChatPersistStore(),
      db = fakeDB()
    const tx: any = { objectStore: () => ({ put: vi.fn() }) }
    db.transaction.mockReturnValue(tx)
    vi.spyOn(instance as any, 'openDatabase').mockResolvedValue(db)
    let complete = false
    const saving = instance.setSessionRender('s', 'ai', {} as any, 5).then(() => {
      complete = true
    })
    for (let i = 0; i < 20; i++) await Promise.resolve()
    expect(db.transaction).toHaveBeenCalledTimes(1)
    expect(complete).toBe(false)
    tx.oncomplete()
    await saving
    expect(complete).toBe(true)
  })
  it('propagates transaction abort and permits the next attempt', async () => {
    const instance = new AIChatPersistStore(),
      db = fakeDB(),
      tx: any = { objectStore: () => ({ put: vi.fn() }), error: new Error('aborted') }
    db.transaction.mockReturnValue(tx)
    vi.spyOn(instance as any, 'openDatabase').mockResolvedValue(db)
    const saving = instance.setSessionRender('s', 'ai', {} as any, 0)
    for (let i = 0; i < 20; i++) await Promise.resolve()
    tx.onabort()
    await expect(saving).rejects.toThrow('aborted')
  })
  it('reopens once when IDB reports a closing connection', async () => {
    const instance = new AIChatPersistStore(),
      first = fakeDB(),
      next = fakeDB(),
      tx: any = { objectStore: () => ({ put: vi.fn() }) }
    first.transaction.mockImplementation(() => {
      throw new DOMException('connection is closing', 'InvalidStateError')
    })
    next.transaction.mockReturnValue(tx)
    const opening = vi
      .spyOn(instance as any, 'openDatabase')
      .mockResolvedValueOnce(first)
      .mockResolvedValueOnce(next)
    const saving = instance.setSessionRender('s', 'ai', {} as any, 0)
    for (let i = 0; i < 30; i++) await Promise.resolve()
    expect(opening).toHaveBeenCalledTimes(2)
    expect(first.close).toHaveBeenCalledTimes(1)
    tx.oncomplete()
    await saving
  })
  it('does not let callers bypass a failed version check', async () => {
    const instance = new AIChatPersistStore(),
      db = fakeDB()
    vi.spyOn(instance as any, 'openDatabase').mockResolvedValue(db)
    vi.mocked(getRemoteValue).mockRejectedValueOnce(new Error('version unavailable'))
    await expect(instance.open()).rejects.toThrow('version unavailable')
    expect(db.transaction).not.toHaveBeenCalled()
    await expect(instance.open()).resolves.toBe(db)
  })
})
