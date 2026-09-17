import { describe, expect, it, vi } from 'vitest'
import { createClient } from '../../shared/communication/client'
import type { BridgeEvent } from '../../shared/communication/protocol'
import { Router, type InvocationContext } from '../ipc/router'

function fixture() {
  const listeners = new Map<string, (event: BridgeEvent) => void>()
  const contexts: { context: InvocationContext; finish(value: string): void }[] = []
  const router = new Router(
    { unary: vi.fn(), stream: vi.fn() } as never,
    () => true,
    (owner, event) => listeners.get(owner)?.(event),
    vi.fn(),
  )
  router.registerLocal(
    'save',
    (_params, context) =>
      new Promise<string>((resolve) => {
        contexts.push({ context, finish: resolve })
        context.progress(0)
      }),
  )
  const client = (owner: string) =>
    createClient<{ save: { request: {}; response: string; progress: number } }>({
      request: (request) => router.handle(owner, request),
      subscribe: (listener) => {
        listeners.set(owner, listener)
        return () => listeners.delete(owner)
      },
    })
  return { client, contexts }
}

describe('local request progress', () => {
  it('subscribes before invoking and routes concurrent requests by request ID', async () => {
    const f = fixture(),
      client = f.client('page')
    const a = vi.fn(),
      b = vi.fn()
    const first = client.invoke('local', 'save', {}, { onProgress: a })
    const second = client.invoke('local', 'save', {}, { onProgress: b })
    expect(a).toHaveBeenCalledWith(0)
    expect(b).toHaveBeenCalledWith(0)
    f.contexts[0].context.progress(25)
    f.contexts[1].context.progress(75)
    expect(a.mock.calls.map(([value]) => value)).toEqual([0, 25])
    expect(b.mock.calls.map(([value]) => value)).toEqual([0, 75])
    f.contexts[0].finish('first')
    f.contexts[1].finish('second')
    await expect(Promise.all([first, second])).resolves.toEqual(['first', 'second'])
    f.contexts[0].context.progress(100)
    expect(a).toHaveBeenCalledTimes(2)
    client.dispose()
  })

  it('stops progress immediately on cancellation without affecting a different window', async () => {
    const f = fixture(),
      firstClient = f.client('first'),
      secondClient = f.client('second')
    const controller = new AbortController(),
      a = vi.fn(),
      b = vi.fn()
    const first = firstClient.invoke('local', 'save', {}, { signal: controller.signal, onProgress: a })
    const second = secondClient.invoke('local', 'save', {}, { onProgress: b })
    const rejected = expect(first).rejects.toMatchObject({ code: 'ABORTED' })
    controller.abort()
    f.contexts[0].context.progress(90)
    f.contexts[1].context.progress(80)
    await rejected
    expect(a.mock.calls.map(([value]) => value)).toEqual([0])
    expect(b.mock.calls.map(([value]) => value)).toEqual([0, 80])
    expect(f.contexts[0].context.signal.aborted).toBe(true)
    f.contexts[1].finish('second')
    await second
    firstClient.dispose()
    secondClient.dispose()
  })
})
