// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
const state = vi.hoisted(() => ({ handlers: new Map<string, (params: unknown, context?: unknown) => unknown>() }))
vi.mock('../ipc/index', () => ({
  registerRenderer: vi.fn(),
  registerMainMethod: (api: string, handler: (params: unknown, context?: unknown) => unknown) =>
    state.handlers.set(api, handler),
  invocationWindow: (context: { win: unknown }) => context.win,
}))
vi.mock('../paths', () => ({ rendererPath: () => '/unused', preloadPath: () => '/unused' }))
vi.mock('electron', () => ({ BrowserWindow: class {} }))
vi.mock('electron-is-dev', () => ({ default: false }))
import { registerAuxWindows } from '../services/auxWindows'

function windowStub() {
  return { isDestroyed: () => false, webContents: { send: vi.fn() } }
}
describe('auxiliary window requests', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    state.handlers.clear()
  })
  afterEach(() => vi.useRealTimers())
  it('accepts a correlated reply only from the primary window', async () => {
    const main = windowStub()
    registerAuxWindows(main as never)
    const controller = new AbortController()
    const pending = state.handlers.get('fetch-concurrent-stream-contents')!(
      { session: 's', token: 't' },
      { signal: controller.signal },
    )
    const request = main.webContents.send.mock.calls[0][1].args[0]
    const reply = state.handlers.get('reply-concurrent-stream-contents')!
    expect(() => reply({ requestId: request.requestId, data: 'wrong' }, { win: windowStub() })).toThrow(
      'Only the main window',
    )
    reply({ requestId: request.requestId, data: { rawData: [] } }, { win: main })
    await expect(pending).resolves.toEqual({ rawData: [] })
    expect(vi.getTimerCount()).toBe(0)
  })
  it('cleans up canceled requests and ignores their late replies', async () => {
    const main = windowStub()
    registerAuxWindows(main as never)
    const controller = new AbortController()
    const pending = state.handlers.get('fetch-concurrent-stream-contents')!(
      { session: 's', token: 't' },
      { signal: controller.signal },
    )
    const result = Promise.allSettled([pending])
    const requestId = main.webContents.send.mock.calls[0][1].args[0].requestId
    controller.abort()
    state.handlers.get('reply-concurrent-stream-contents')!({ requestId, data: 'late' }, { win: main })
    expect((await result)[0].status).toBe('rejected')
    expect(vi.getTimerCount()).toBe(0)
  })
  it('does not deliver another auxiliary window’s initialization payload', () => {
    const manager = registerAuxWindows(windowStub() as never)
    const owned = windowStub()
    manager.windows.set('aux-a', {
      win: owned as never,
      meta: { windowId: 'aux-a', route: 'engine-console' },
      pendingPayload: 'private',
    })
    expect(() => manager.deliverInit('aux-a', windowStub().webContents as never)).toThrow('owner mismatch')
    expect(owned.webContents.send).not.toHaveBeenCalled()
    expect(manager.getEntry('aux-a')?.pendingPayload).toBe('private')
  })
})
