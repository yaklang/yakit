import { EventEmitter } from 'events'
import { describe, expect, it, vi } from 'vitest'
import handlerHelper from '../handlers/handleStreamWithContext'

const createStream = () => {
  const stream = new EventEmitter()
  stream.cancel = vi.fn()
  return stream
}

const createWindow = () => ({
  isDestroyed: vi.fn(() => false),
  webContents: {
    isDestroyed: vi.fn(() => false),
    send: vi.fn(),
  },
})

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
})
