import { EventEmitter } from 'events'
import { describe, expect, it, vi } from 'vitest'
import handlerHelper from '../handlers/handleStreamWithContext'

const createStream = () => {
  const stream = new EventEmitter()
  stream.cancel = vi.fn()
  return stream
}

const createWindow = () => {
  const webContents = Object.assign(new EventEmitter(), {
    id: 17,
    isDestroyed: vi.fn(() => false),
    send: vi.fn(),
  })
  return Object.assign(new EventEmitter(), {
    isDestroyed: vi.fn(() => false),
    webContents,
  })
}

describe('handleStreamWithContext', () => {
  it('removes an errored stream and forwards one terminal error', () => {
    const streams = new Map()
    const stream = createStream()
    const window = createWindow()

    expect(handlerHelper.registerHandler(window, stream, streams, 'live')).toBe(true)
    stream.emit('error', { details: 'unavailable' })

    expect(streams.has('live')).toBe(false)
    expect(window.webContents.send).toHaveBeenCalledWith('live-error', 'unavailable')
    stream.emit('end')
    expect(window.webContents.send).toHaveBeenCalledTimes(1)
  })

  it('cancels an untracked duplicate token instead of leaking its stream', () => {
    const streams = new Map()
    const first = createStream()
    const duplicate = createStream()

    expect(handlerHelper.registerHandler(createWindow(), first, streams, 'same')).toBe(true)
    expect(handlerHelper.registerHandler(createWindow(), duplicate, streams, 'same')).toBe(false)

    expect(streams.get('same')).toBe(first)
    expect(duplicate.cancel).toHaveBeenCalledOnce()
  })

  it('ignores stale events after cancellation and token reuse', async () => {
    const streams = new Map()
    const first = createStream()
    const second = createStream()
    const window = createWindow()

    handlerHelper.registerHandler(window, first, streams, 'reused')
    await handlerHelper.cancelHandler(streams)({}, 'reused')
    handlerHelper.registerHandler(window, second, streams, 'reused')
    first.emit('data', { Id: 1 })
    first.emit('end')

    expect(streams.get('reused')).toBe(second)
    expect(window.webContents.send).not.toHaveBeenCalled()
    second.emit('data', { Id: 2 })
    expect(window.webContents.send).toHaveBeenCalledWith('reused-data', { Id: 2 })
  })

  it('cancels the current stream when its window has been destroyed', () => {
    const streams = new Map()
    const stream = createStream()
    const window = createWindow()
    window.isDestroyed.mockReturnValue(true)

    handlerHelper.registerHandler(window, stream, streams, 'destroyed')
    stream.emit('data', { Id: 1 })

    expect(stream.cancel).toHaveBeenCalledOnce()
    expect(streams.has('destroyed')).toBe(false)
    expect(window.webContents.send).not.toHaveBeenCalled()
  })

  it('cancels an errored stream instead of forwarding after its window is destroyed', () => {
    const streams = new Map()
    const stream = createStream()
    const window = createWindow()

    handlerHelper.registerHandler(window, stream, streams, 'destroyed-error')
    window.webContents.isDestroyed.mockReturnValue(true)
    stream.emit('error', { details: 'unavailable' })

    expect(stream.cancel).toHaveBeenCalledOnce()
    expect(streams.has('destroyed-error')).toBe(false)
    expect(window.webContents.send).not.toHaveBeenCalled()
  })

  it.each([
    ['window close', (window) => window.emit('closed')],
    ['webContents destruction', (window) => window.webContents.emit('destroyed')],
    ['renderer exit', (window) => window.webContents.emit('render-process-gone')],
    ['renderer reload', (window) => window.webContents.emit('did-start-navigation', {}, '', false, true)],
  ])('clears idle streams proactively on %s', (_eventName, emitLifecycleEvent) => {
    const streams = new Map()
    const first = createStream()
    const second = createStream()
    const window = createWindow()

    handlerHelper.registerHandler(window, first, streams, 'first')
    handlerHelper.registerHandler(window, second, streams, 'second')
    handlerHelper.bindWindowLifecycle(window, streams)
    emitLifecycleEvent(window)

    expect(streams.size).toBe(0)
    expect(first.cancel).toHaveBeenCalledOnce()
    expect(second.cancel).toHaveBeenCalledOnce()
  })

  it('keeps subscriptions during subframe navigation', () => {
    const streams = new Map()
    const stream = createStream()
    const window = createWindow()

    handlerHelper.registerHandler(window, stream, streams, 'subframe')
    handlerHelper.bindWindowLifecycle(window, streams)
    window.webContents.emit('did-start-navigation', {}, '', false, false)

    expect(streams.get('subframe')).toBe(stream)
    expect(stream.cancel).not.toHaveBeenCalled()
  })

  it('removes all registry entries before cancellation emits terminal events', () => {
    const streams = new Map()
    const stream = createStream()
    const window = createWindow()
    stream.cancel.mockImplementation(() => stream.emit('error', { details: 'cancelled' }))

    handlerHelper.registerHandler(window, stream, streams, 'sync-error')
    expect(handlerHelper.cancelAll(streams)).toBe(1)

    expect(streams.size).toBe(0)
    expect(window.webContents.send).not.toHaveBeenCalled()
  })

  it('namespaces registry keys by sender while preserving the renderer event token', () => {
    const window = createWindow()
    const ownedToken = handlerHelper.resolveRendererStreamToken({ sender: { id: 17 } }, window, 'live_TOKEN-1')

    expect(ownedToken).toEqual({ mapToken: '17:live_TOKEN-1', eventToken: 'live_TOKEN-1' })

    const streams = new Map()
    const stream = createStream()
    handlerHelper.registerHandler(window, stream, streams, ownedToken.mapToken, ownedToken.eventToken)
    stream.emit('data', { Id: 1 })

    expect(window.webContents.send).toHaveBeenCalledWith('live_TOKEN-1-data', { Id: 1 })
  })

  it('rejects stream tokens from another renderer or outside the bounded token alphabet', () => {
    const window = createWindow()

    expect(() => handlerHelper.resolveRendererStreamToken({ sender: { id: 99 } }, window, 'live')).toThrow(
      /does not belong/,
    )
    expect(() => handlerHelper.resolveRendererStreamToken({ sender: { id: 17 } }, window, '../live')).toThrow(
      /invalid stream token/,
    )
    expect(() => handlerHelper.resolveRendererStreamToken({ sender: { id: 17 } }, window, 'x'.repeat(129))).toThrow(
      /invalid stream token/,
    )
  })
})
