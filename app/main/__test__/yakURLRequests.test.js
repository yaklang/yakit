// @vitest-environment node
import { describe, expect, it, vi } from 'vitest'
import { EventEmitter } from 'node:events'
import { createRequire } from 'node:module'
const { registerYakURLRequests } = createRequire(import.meta.url)('../yakURLRequests.js')
const setup = (synchronous = false) => {
  const handlers = new Map(),
    pending = []
  const request = vi.fn((params, callback) => {
    const cancel = vi.fn(() => callback(new Error('cancelled')))
    pending.push({ params, callback, cancel })
    if (synchronous) callback(null, { Resources: [] })
    return { cancel }
  })
  const legacy = vi.fn().mockResolvedValue({ legacy: true })
  registerYakURLRequests(
    { handle: (key, handler) => handlers.set(key, handler) },
    () => ({ RequestYakURL: request }),
    legacy,
  )
  const event = (id) => {
    const sender = new EventEmitter()
    sender.id = id
    return { sender }
  }
  return { handlers, pending, request, legacy, event }
}
describe('sender scoped YakURL cancellation', () => {
  it('keeps non-token requests on the original path', async () => {
    const s = setup()
    expect(await s.handlers.get('RequestYakURL')(s.event(1), { x: 1 })).toEqual({ legacy: true })
    expect(s.request).not.toHaveBeenCalled()
  })
  it('allows only the same sender to cancel and removes its listener on completion', async () => {
    const s = setup(),
      owner = s.event(1),
      other = s.event(2)
    const result = s.handlers.get('RequestYakURL')(owner, { x: 1 }, 'token')
    const rejected = expect(result).rejects.toThrow('cancelled')
    await s.handlers.get('cancel-RequestYakURL')(other, 'token')
    expect(s.pending[0].cancel).not.toHaveBeenCalled()
    await s.handlers.get('cancel-RequestYakURL')(owner, 'token')
    await rejected
    expect(owner.sender.listenerCount('destroyed')).toBe(0)
  })
  it('cancels outstanding work when its owning window is destroyed', async () => {
    const s = setup(),
      owner = s.event(1),
      result = s.handlers.get('RequestYakURL')(owner, {}, 'a')
    const rejected = expect(result).rejects.toThrow('cancelled')
    owner.sender.emit('destroyed')
    await rejected
    expect(s.pending[0].cancel).toHaveBeenCalledTimes(1)
  })
  it('handles synchronous completion without leaving a stale request or listener', async () => {
    const s = setup(true),
      owner = s.event(1)
    await s.handlers.get('RequestYakURL')(owner, {}, 'a')
    await s.handlers.get('RequestYakURL')(owner, {}, 'a')
    expect(owner.sender.listenerCount('destroyed')).toBe(0)
  })
  it('rejects invalid and duplicate tokens while independent senders may reuse a token', async () => {
    const s = setup(),
      owner = s.event(1)
    await expect(s.handlers.get('RequestYakURL')(owner, {}, 'x'.repeat(129))).rejects.toThrow('Invalid')
    const a = s.handlers.get('RequestYakURL')(owner, {}, 'a')
    await expect(s.handlers.get('RequestYakURL')(owner, {}, 'a')).rejects.toThrow('Duplicate')
    const b = s.handlers.get('RequestYakURL')(s.event(2), {}, 'a')
    s.pending.forEach((p) => p.callback(null, { Resources: [] }))
    await Promise.all([a, b])
  })
})
