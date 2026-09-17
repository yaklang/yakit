import { EventEmitter } from 'node:events'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createClient } from '../../shared/communication/client'
import { BridgeError } from '../../shared/communication/errors'
import type { BridgeEvent, Request, Transport } from '../../shared/communication/protocol'
import { Router } from '../ipc/router'
import { StreamManager, defaultStreamLimits, type StreamFactory } from '../ipc/streams'

class FakeStream extends EventEmitter {
  cancel = vi.fn()
  pause = vi.fn()
  resume = vi.fn()
  end = vi.fn()
  callbacks: ((error?: Error | null) => void)[] = []
  write = vi.fn((_params: unknown, callback: (error?: Error | null) => void) => {
    this.callbacks.push(callback)
    return true
  })
}
const tick = () => new Promise((resolve) => setTimeout(resolve, 5))
const request = (action: Request['action'], fields: Partial<Request> = {}): Request => ({
  requestId: crypto.randomUUID(),
  namespace: 'grpc',
  api: 'StartAIReAct',
  action,
  token: 'same',
  instanceId: 'instance-a',
  ...fields,
})
function streamFixture(pauseable = true, limits = defaultStreamLimits) {
  const stream = new FakeStream()
  const events: BridgeEvent[] = []
  const manager = new StreamManager((_owner, event) => events.push(event), limits)
  const factory: StreamFactory = { requestStream: true, responseStream: true, pauseable, create: () => stream }
  return { stream, events, manager, factory }
}

afterEach(() => vi.useRealTimers())

describe('unified stream sessions', () => {
  it('cancels asynchronous preparation before a backend stream can be created', async () => {
    const { manager, stream, factory } = streamFixture()
    let prepared!: () => void
    let signal: AbortSignal | undefined
    const create = vi.fn(() => stream)
    const opening = manager.open('page', request('open'), {
      ...factory,
      create,
      prepare: (_params, abortSignal) => {
        signal = abortSignal
        return new Promise((resolve) => {
          prepared = () => resolve({ ready: true })
        })
      },
    })
    manager.cancelOwner('page')
    expect(signal?.aborted).toBe(true)
    prepared()
    await opening
    expect(create).not.toHaveBeenCalled()
    expect(manager.size).toBe(0)
  })
  it('rebinds MITM to the same window with new identity and replays only unacknowledged frames', async () => {
    const stream = new FakeStream()
    const sent: { owner: string; event: BridgeEvent }[] = []
    const manager = new StreamManager(
      (owner, event) => sent.push({ owner, event }),
      defaultStreamLimits,
      (owner) => owner.split('/')[0],
    )
    const factory: StreamFactory = {
      requestStream: true,
      responseStream: true,
      pauseable: false,
      persistent: true,
      create: () => stream,
    }
    const old = request('open', { api: 'MITMV2' })
    await manager.open('window1/page1', old, factory)
    stream.emit('data', { TaskID: 'first' })
    await tick()
    await manager.command('window1/page1', { ...old, action: 'ack', ack: 1 })
    stream.emit('data', { TaskID: 'unacknowledged' })
    await tick()
    manager.cancelOwner('window1/page1', true)
    expect(stream.cancel).not.toHaveBeenCalled()
    stream.emit('data', { TaskID: 'during-reload' })
    await tick()
    const rebound = request('open', { api: 'MITMV2', token: 'new-token', instanceId: 'new-instance', resume: true })
    await expect(manager.open('window2/page1', rebound, factory)).rejects.toThrow('No detached MITM')
    await manager.open('window1/page2', rebound, factory)
    expect(sent.at(-1)).toMatchObject({
      owner: 'window1/page2',
      event: {
        token: 'new-token',
        instanceId: 'new-instance',
        sequence: 1,
        items: [{ TaskID: 'unacknowledged' }, { TaskID: 'during-reload' }],
      },
    })
    await manager.command('window1/page1', { ...old, action: 'cancel' })
    await expect(manager.command('window1/page1', { ...old, action: 'write', params: {} })).rejects.toThrow(
      'no longer active',
    )
    expect(stream.cancel).not.toHaveBeenCalled()
    manager.cancelGroup('window1')
    expect(stream.cancel).toHaveBeenCalledOnce()
    expect(manager.size).toBe(0)
  })
  it('reserves MITM control capacity and coalesces only queued statistic snapshots', async () => {
    const stream = new FakeStream()
    const events: BridgeEvent[] = []
    const manager = new StreamManager((_owner, event) => events.push(event), { ...defaultStreamLimits, maxItems: 4 })
    const factory: StreamFactory = {
      requestStream: true,
      responseStream: true,
      pauseable: false,
      create: () => stream,
      isControl: (data) => !(data as { log?: string }).log,
      snapshotKey: (data) => ('stats' in (data as object) ? 'stats' : undefined),
    }
    await manager.open('page', request('open'), factory)
    stream.emit('data', { stats: 1 })
    stream.emit('data', { stats: 2 })
    stream.emit('data', { hijack: 'control' })
    stream.emit('data', { log: 'one' })
    stream.emit('data', { log: 'two' })
    await tick()
    expect(events).toEqual([
      expect.objectContaining({ items: [{ stats: 2 }, { hijack: 'control' }, { log: 'one' }, { log: 'two' }] }),
    ])
    expect(stream.pause).not.toHaveBeenCalled()
    await manager.command('page', request('ack', { ack: 1 }))
    stream.emit('data', { log: 'three' })
    await tick()
    expect(stream.cancel).not.toHaveBeenCalled()
    manager.cancelAll()
  })
  it('requires matching owner, API and namespace when aborting an opening request', async () => {
    const { manager, factory, stream } = streamFixture()
    const opening = request('open')
    await manager.open('a', opening, factory)
    manager.cancelRequest('b', opening.requestId, opening.api, 'grpc')
    manager.cancelRequest('a', opening.requestId, 'HybridScan', 'grpc')
    manager.cancelRequest('a', opening.requestId, opening.api, 'local')
    expect(stream.cancel).not.toHaveBeenCalled()
    expect(manager.size).toBe(1)
    manager.cancelRequest('a', opening.requestId, opening.api, 'grpc')
    expect(stream.cancel).toHaveBeenCalledOnce()
    expect(manager.size).toBe(0)
  })
  it('settles end successfully when a client stream responds synchronously from end', async () => {
    const { manager, stream, events } = streamFixture()
    await manager.open('a', request('open'), {
      requestStream: true,
      responseStream: false,
      pauseable: false,
      create: (_params, callback) => {
        stream.end.mockImplementation(() => callback(null, { FileName: 'complete' }))
        return stream
      },
    })
    await expect(manager.command('a', request('end'))).resolves.toBeUndefined()
    expect(events).toEqual([expect.objectContaining({ type: 'result', data: { FileName: 'complete' } })])
    expect(manager.size).toBe(0)
  })
  it('notifies live renderers when their engine connection changes', async () => {
    const { manager, factory, stream, events } = streamFixture()
    await manager.open('a', request('open'), factory)
    manager.cancelAll()
    expect(stream.cancel).toHaveBeenCalledOnce()
    expect(manager.size).toBe(0)
    expect(events).toEqual([
      expect.objectContaining({ type: 'error', error: expect.objectContaining({ code: 'UNAVAILABLE' }) }),
    ])
  })
  it('isolates windows and rejects duplicate live tokens within a window', async () => {
    const { manager, factory } = streamFixture()
    await manager.open('a', request('open'), factory)
    await expect(manager.open('a', request('open'), factory)).rejects.toThrow('live stream')
    await manager.open('b', request('open'), factory)
    expect(manager.size).toBe(2)
    manager.cancelOwner('a')
    expect(manager.size).toBe(1)
    manager.cancelAll()
  })
  it('prevents an old task cancelling a reused token', async () => {
    const { manager, factory, stream } = streamFixture()
    await manager.open('a', request('open'), factory)
    await manager.command('a', request('cancel'))
    await manager.open('a', request('open', { instanceId: 'instance-b' }), factory)
    await manager.command('a', request('cancel'))
    expect(stream.cancel).toHaveBeenCalledTimes(1)
    expect(manager.size).toBe(1)
    manager.cancelAll()
  })
  it('orders writes and end, and cancellation bypasses a stalled write', async () => {
    const { manager, factory, stream } = streamFixture()
    await manager.open('a', request('open'), factory)
    const first = manager.command('a', request('write', { params: 1 }))
    const second = manager.command('a', request('write', { params: 2 }))
    const end = manager.command('a', request('end'))
    const results = Promise.allSettled([first, second, end])
    expect(stream.write).toHaveBeenCalledTimes(1)
    stream.callbacks[0]()
    expect(stream.write).toHaveBeenCalledTimes(2)
    expect(stream.end).not.toHaveBeenCalled()
    await manager.command('a', request('cancel'))
    expect((await results).map((result) => result.status)).toEqual(['fulfilled', 'rejected', 'rejected'])
    stream.callbacks[1]()
    expect(stream.end).not.toHaveBeenCalled()
  })
  it('waits for renderer ACK before terminal delivery, and preserves binary data', async () => {
    const { manager, factory, stream, events } = streamFixture()
    await manager.open('a', request('open'), factory)
    const data = Buffer.from([0, 255, 128])
    stream.emit('data', data)
    stream.emit('end')
    expect(events).toEqual([expect.objectContaining({ type: 'data', sequence: 1, items: [data] })])
    await manager.command('a', request('ack', { ack: 1 }))
    expect(events[1]).toMatchObject({ type: 'end' })
    expect(manager.size).toBe(0)
    stream.emit('error', new Error('late error'))
    expect(events).toHaveLength(2)
  })
  it('counts in-flight IPC bytes and pauses/resumes when ACKs release capacity', async () => {
    const { manager, factory, stream, events } = streamFixture(true, { ...defaultStreamLimits, maxBytes: 100 })
    await manager.open('a', request('open'), factory)
    stream.emit('data', Buffer.alloc(60))
    await tick()
    expect(stream.pause).toHaveBeenCalledOnce()
    expect(events).toHaveLength(1)
    await manager.command('a', request('ack', { ack: 1 }))
    expect(stream.resume).toHaveBeenCalledOnce()
    manager.cancelAll()
  })
  it('fails explicitly on overflow without pausing a duplex control stream', async () => {
    const { manager, factory, stream, events } = streamFixture(false, { ...defaultStreamLimits, maxBytes: 100 })
    await manager.open('a', request('open'), factory)
    stream.emit('data', Buffer.alloc(60))
    stream.emit('data', Buffer.alloc(60))
    expect(stream.pause).not.toHaveBeenCalled()
    expect(stream.cancel).toHaveBeenCalled()
    await manager.command('a', request('ack', { ack: 1 }))
    expect(events.map((event) => event.type)).toEqual(['data', 'error'])
    expect(events[1]).toMatchObject({ error: { code: 'RESOURCE_EXHAUSTED' } })
    expect(manager.size).toBe(0)
  })
  it('client-stream end waits for the gRPC completion callback result', async () => {
    const { manager, stream, events } = streamFixture()
    let callback!: (error: unknown, data?: unknown) => void
    await manager.open('a', request('open'), {
      requestStream: true,
      responseStream: false,
      pauseable: false,
      create: (_params, cb) => {
        callback = cb
        return stream
      },
    })
    await manager.command('a', request('end'))
    expect(events).toHaveLength(0)
    callback(null, { FileName: 'engine-file' })
    expect(events).toEqual([expect.objectContaining({ type: 'result', data: { FileName: 'engine-file' } })])
    callback(null, { FileName: 'duplicate' })
    expect(events).toHaveLength(1)
  })
})

describe('renderer SDK', () => {
  function fixture(handler: Transport['request']) {
    let receive!: (event: BridgeEvent) => void
    const unsubscribe = vi.fn()
    const transport: Transport = {
      request: vi.fn(handler),
      subscribe: vi.fn((listener) => {
        receive = listener
        return unsubscribe
      }),
    }
    const client = createClient<{ business: { request: {}; response: { ok: boolean } } }>(transport)
    return { client, transport, emit: (event: BridgeEvent) => receive(event), unsubscribe }
  }
  it('restores gRPC details/code without reclassifying them as IPC errors', async () => {
    const { client } = fixture(async () => ({
      ok: false,
      error: {
        name: 'Error',
        message: 'true backend error',
        details: 'true backend error',
        originalMessage: '14 UNAVAILABLE: true backend error',
        code: 14,
        source: 'grpc',
        requestId: 'r',
        method: 'grpc.Echo',
      },
    }))
    const error = await client.invoke('grpc', 'Echo', {}).catch((error) => error)
    expect(error).toBeInstanceOf(BridgeError)
    expect(error).toMatchObject({
      message: 'true backend error',
      source: 'grpc',
      code: 14,
      details: 'true backend error',
    })
    client.dispose()
  })
  it('ACKs data only after the asynchronous consumer finishes, then delivers end', async () => {
    const f = fixture(async () => ({ ok: true, data: undefined }))
    let consumed!: () => void
    const onData = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          consumed = resolve
        }),
    )
    const onEnd = vi.fn()
    const task = await f.client.openStream('grpc', 'ExportProject', {}, { onData, onEnd })
    const identity = {
      namespace: 'grpc' as const,
      api: 'ExportProject',
      token: task.token,
      instanceId: task.instanceId,
    }
    f.emit({ ...identity, type: 'data', sequence: 1, items: [{}] })
    f.emit({ ...identity, type: 'end' })
    await tick()
    expect(f.transport.request).not.toHaveBeenCalledWith(expect.objectContaining({ action: 'ack' }))
    expect(onEnd).not.toHaveBeenCalled()
    consumed()
    await tick()
    expect(f.transport.request).toHaveBeenCalledWith(expect.objectContaining({ action: 'ack', ack: 1 }))
    expect(onEnd).toHaveBeenCalledOnce()
    f.client.dispose()
  })
  it('preserves resolved business failure payloads', async () => {
    const { client } = fixture(async () => ({ ok: true, data: { ok: false } }))
    await expect(client.invoke('local', 'business', {})).resolves.toEqual({ ok: false })
    client.dispose()
  })
  it('classifies invoke rejection as transport failure', async () => {
    const { client } = fixture(async () => {
      throw new Error('No handler registered')
    })
    await expect(client.invoke('grpc', 'Echo', {})).rejects.toMatchObject({ source: 'ipc' })
    client.dispose()
  })
  it('binds before open and ignores old packets after token reuse', async () => {
    const f = fixture(async (req) => {
      if (req.action === 'open')
        f.emit({
          namespace: 'grpc',
          api: req.api,
          token: req.token!,
          instanceId: req.instanceId!,
          type: 'data',
          sequence: 1,
          items: [{ Id: 'first' }],
        })
      return { ok: true, data: undefined }
    })
    const onData = vi.fn()
    const a = await f.client.openStream('grpc', 'StartAIReAct', {}, { token: 'same', onData })
    expect(onData).toHaveBeenCalledOnce()
    await a.cancel()
    const b = await f.client.openStream('grpc', 'StartAIReAct', {}, { token: 'same', onData })
    f.emit({ namespace: 'grpc', api: 'StartAIReAct', token: 'same', instanceId: a.instanceId, type: 'end' })
    await a.cancel()
    expect(onData).toHaveBeenCalledTimes(2)
    await b.write({})
    expect(f.transport.subscribe).toHaveBeenCalledOnce()
    f.client.dispose()
    expect(f.unsubscribe).toHaveBeenCalledOnce()
  })
  it('does not resurrect a stream that ends before the open reply', async () => {
    const f = fixture(async (req) => {
      if (req.action === 'open')
        f.emit({ namespace: 'grpc', api: req.api, token: req.token!, instanceId: req.instanceId!, type: 'end' })
      return { ok: true, data: undefined }
    })
    const onEnd = vi.fn()
    const a = await f.client.openStream('grpc', 'StartAIReAct', {}, { token: 'reuse', onEnd })
    await expect(a.write({})).rejects.toMatchObject({ code: 'STREAM_CLOSED' })
    await f.client.openStream('grpc', 'StartAIReAct', {}, { token: 'reuse', onEnd })
    expect(onEnd).toHaveBeenCalledTimes(2)
    f.client.dispose()
  })
  it('rejects an aborted request and sends backend cancellation', async () => {
    const { client, transport } = fixture(async (req) =>
      req.action === 'abort' ? { ok: true, data: undefined } : new Promise(() => {}),
    )
    const controller = new AbortController()
    const pending = client.invoke('grpc', 'Echo', {}, { signal: controller.signal })
    controller.abort()
    await expect(pending).rejects.toMatchObject({ name: 'AbortError' })
    expect(transport.request).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'abort', api: 'Echo', targetRequestId: expect.any(String) }),
    )
    client.dispose()
  })
})

describe('main request router', () => {
  it('cancels the backend on timeout and keeps windows isolated', async () => {
    const cancel = vi.fn()
    const router = new Router(
      {
        unary: () => ({ cancel }) as never,
        stream: () => {
          throw new Error('unused')
        },
      },
      () => true,
      () => {},
      () => {},
    )
    const req = request('call', { api: 'Echo', timeoutMs: 20 })
    const pending = router.handle('a', req)
    await router.handle('b', request('abort', { api: 'Echo', targetRequestId: req.requestId }))
    expect(cancel).not.toHaveBeenCalled()
    await expect(pending).resolves.toMatchObject({ ok: false })
    expect(cancel).toHaveBeenCalledOnce()
  })
  it('rejects unapproved APIs and malformed identities before touching the client', async () => {
    const unary = vi.fn()
    const router = new Router(
      { unary, stream: vi.fn() },
      () => false,
      () => {},
      () => {},
    )
    await expect(router.handle('a', request('call', { api: 'constructor' }))).resolves.toMatchObject({ ok: false })
    await expect(router.handle('a', { requestId: [] })).resolves.toMatchObject({ ok: false })
    expect(unary).not.toHaveBeenCalled()
  })
})
