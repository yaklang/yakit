import { EventEmitter } from 'node:events'
import { describe, expect, it, vi } from 'vitest'
import { Router } from '../ipc/router'

function fixture() {
  const stream = Object.assign(new EventEmitter(), { cancel: vi.fn(), pause: vi.fn(), resume: vi.fn() })
  const create = vi.fn(() => stream)
  const events = []
  const router = new Router(
    { unary: vi.fn(), stream: () => ({ requestStream: false, responseStream: true, pauseable: true, create }) },
    () => true,
    (owner, event) => events.push({ owner, event }),
    vi.fn(),
  )
  const request = {
    namespace: 'grpc',
    api: 'SubscribeHTTPFlows',
    action: 'open',
    requestId: 'open-1',
    token: 'liveToken',
    instanceId: 'live-instance',
    params: { SessionId: 'liveToken' },
  }
  return { router, stream, create, events, request }
}

describe('SubscribeHTTPFlows through the unified router', () => {
  it('delivers data with its owner, token and instance', async () => {
    const { router, stream, create, events, request } = fixture()
    expect(await router.handle('window-17', request)).toMatchObject({ ok: true })
    stream.emit('data', { Sequence: '9007199254740993' })
    await new Promise((resolve) => setTimeout(resolve, 5))
    expect(create).toHaveBeenCalledWith(request.params, expect.any(Function))
    expect(events).toContainEqual({
      owner: 'window-17',
      event: expect.objectContaining({
        type: 'data',
        token: 'liveToken',
        instanceId: 'live-instance',
        items: [{ Sequence: '9007199254740993' }],
      }),
    })
    router.closeOwner('window-17')
  })

  it('keeps cancellation scoped to the owning page and stream instance', async () => {
    const { router, stream, request } = fixture()
    await router.handle('window-17', request)
    await router.handle('window-99', { ...request, action: 'cancel', requestId: 'cancel-other' })
    await router.handle('window-17', { ...request, action: 'cancel', requestId: 'cancel-stale', instanceId: 'old' })
    expect(stream.cancel).not.toHaveBeenCalled()
    await router.handle('window-17', { ...request, action: 'cancel', requestId: 'cancel-owner' })
    expect(stream.cancel).toHaveBeenCalledOnce()
  })

  it('rejects a backend SessionId that differs from the stream token', async () => {
    const { router, create, request } = fixture()
    const result = await router.handle('window-17', { ...request, params: { SessionId: 'other' } })
    expect(result).toMatchObject({ ok: false, error: { message: expect.stringContaining('does not match') } })
    expect(create).not.toHaveBeenCalled()
  })
})
