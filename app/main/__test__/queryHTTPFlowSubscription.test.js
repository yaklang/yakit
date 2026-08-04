import { EventEmitter } from 'events'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import registerHTTPFlowSubscription from '../handlers/httpFlowSubscription'

const ipcHandlers = new Map()

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

const createEvent = (senderId = 17) => ({
  sender: {
    id: senderId,
    getURL: () => 'file:///opt/yakit/index.html',
  },
  senderFrame: {
    url: 'file:///opt/yakit/index.html',
  },
})

const createStream = () => {
  const stream = new EventEmitter()
  stream.cancel = vi.fn()
  return stream
}

describe('SubscribeHTTPFlows IPC ownership', () => {
  let window
  let stream
  let client

  beforeEach(() => {
    ipcHandlers.clear()
    window = createWindow()
    stream = createStream()
    client = {
      SubscribeHTTPFlows: vi.fn(() => stream),
    }
    const ipcMain = {
      handle: vi.fn((channel, handler) => ipcHandlers.set(channel, handler)),
    }
    registerHTTPFlowSubscription(ipcMain, window, () => client)
  })

  it('keeps the renderer token on event channels while using an owned registry key', () => {
    const subscribe = ipcHandlers.get('SubscribeHTTPFlows')

    expect(subscribe(createEvent(), { SessionId: 'liveToken' }, 'liveToken')).toBeUndefined()
    stream.emit('data', { Id: 42 })

    expect(client.SubscribeHTTPFlows).toHaveBeenCalledWith({ SessionId: 'liveToken' })
    expect(window.webContents.send).toHaveBeenCalledWith('liveToken-data', { Id: 42 })
  })

  it('allows only the owning renderer to cancel a subscription', async () => {
    const subscribe = ipcHandlers.get('SubscribeHTTPFlows')
    const cancel = ipcHandlers.get('cancel-SubscribeHTTPFlows')
    subscribe(createEvent(), { SessionId: 'ownedToken' }, 'ownedToken')

    expect(() => cancel(createEvent(99), 'ownedToken')).toThrow(/does not belong/)
    expect(stream.cancel).not.toHaveBeenCalled()

    await cancel(createEvent(), 'ownedToken')
    expect(stream.cancel).toHaveBeenCalledOnce()
  })

  it('rejects a mismatched session before opening a backend stream', () => {
    const subscribe = ipcHandlers.get('SubscribeHTTPFlows')

    expect(() => subscribe(createEvent(), { SessionId: 'otherToken' }, 'ownedToken')).toThrow(/session does not match/)
    expect(client.SubscribeHTTPFlows).not.toHaveBeenCalled()
  })
})
