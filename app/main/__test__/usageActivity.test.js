// @vitest-environment node
import { EventEmitter } from 'node:events'
import { describe, expect, it, vi } from 'vitest'
import { UsageActivityManager } from '../usageActivity'

class FakeIpcMain extends EventEmitter {
  constructor() {
    super()
    this.handlers = new Map()
  }

  handle(channel, handler) {
    this.handlers.set(channel, handler)
  }

  removeHandler(channel) {
    this.handlers.delete(channel)
  }

  invoke(channel, event) {
    return this.handlers.get(channel)(event)
  }
}

class FakeWindow extends EventEmitter {
  constructor(id) {
    super()
    this.id = id
    this.visible = true
    this.minimized = false
    this.focused = true
    this.destroyed = false
    this.webContents = {
      send: vi.fn(),
      getURL: () => 'http://127.0.0.1:3000',
    }
  }

  isVisible() {
    return this.visible
  }

  isMinimized() {
    return this.minimized
  }

  isFocused() {
    return this.focused
  }

  isDestroyed() {
    return this.destroyed
  }
}

const eventFor = (win, url = 'http://127.0.0.1:3000') => ({
  sender: win.webContents,
  senderFrame: { url },
})
const flushImmediate = () => new Promise((resolve) => setImmediate(resolve))

function setup() {
  let now = 100
  const ipcMain = new FakeIpcMain()
  const powerMonitor = new EventEmitter()
  const manager = new UsageActivityManager({ ipcMain, powerMonitor, now: () => now })
  const main = new FakeWindow(1)
  manager.registerWindow(main)
  return {
    ipcMain,
    powerMonitor,
    manager,
    main,
    setNow(value) {
      now = value
    },
  }
}

describe('UsageActivityManager', () => {
  it('keeps activity time at zero until trusted input and broadcasts input changes', () => {
    const { ipcMain, manager, main } = setup()

    expect(manager.refresh()).toMatchObject({ foreground: true, lastActivityAt: 0 })
    ipcMain.emit('usage-activity:input', eventFor(main))

    expect(manager.refresh()).toMatchObject({ foreground: true, lastActivityAt: 100 })
    expect(main.webContents.send).toHaveBeenLastCalledWith(
      'usage-activity:updated',
      expect.objectContaining({ lastActivityAt: 100 }),
    )
  })

  it('pauses for blur and minimize without treating focus or restore as activity', async () => {
    const { ipcMain, manager, main, setNow } = setup()
    ipcMain.emit('usage-activity:input', eventFor(main))
    const activeRevision = manager.refresh().revision

    setNow(200)
    main.focused = false
    main.emit('blur')
    await flushImmediate()
    expect(manager.refresh()).toEqual({ foreground: false, lastActivityAt: 100, revision: activeRevision + 1 })

    main.focused = true
    main.emit('focus')
    await flushImmediate()
    expect(manager.refresh()).toMatchObject({ foreground: true, lastActivityAt: 100 })

    main.minimized = true
    main.emit('minimize')
    expect(manager.refresh()).toMatchObject({ foreground: false, lastActivityAt: 100 })

    main.minimized = false
    main.emit('restore')
    expect(manager.refresh()).toMatchObject({ foreground: true, lastActivityAt: 100 })
  })

  it('coalesces focus transfer between business windows without broadcasting a transient background state', async () => {
    const { ipcMain, manager, main } = setup()
    const aux = new FakeWindow(2)
    aux.focused = false
    manager.registerWindow(aux)
    ipcMain.emit('usage-activity:input', eventFor(main))
    main.webContents.send.mockClear()
    aux.webContents.send.mockClear()

    main.focused = false
    main.emit('blur')
    aux.focused = true
    aux.emit('focus')
    await flushImmediate()

    expect(manager.refresh()).toMatchObject({ foreground: true, lastActivityAt: 100 })
    const broadcasts = [...main.webContents.send.mock.calls, ...aux.webContents.send.mock.calls]
    expect(broadcasts.some(([, snapshot]) => snapshot.foreground === false)).toBe(false)
  })

  it('pauses while the OS is locked or suspended and resumes without resetting activity time', () => {
    const { ipcMain, powerMonitor, manager, main, setNow } = setup()
    ipcMain.emit('usage-activity:input', eventFor(main))

    powerMonitor.emit('lock-screen')
    expect(manager.refresh()).toMatchObject({ foreground: false, lastActivityAt: 100 })
    setNow(200)
    ipcMain.emit('usage-activity:input', eventFor(main))
    expect(manager.refresh()).toMatchObject({ foreground: false, lastActivityAt: 100 })

    powerMonitor.emit('suspend')
    expect(manager.refresh()).toMatchObject({ foreground: false, lastActivityAt: 100 })
    powerMonitor.emit('resume')
    expect(manager.refresh()).toMatchObject({ foreground: false, lastActivityAt: 100 })
    powerMonitor.emit('unlock-screen')
    expect(manager.refresh()).toMatchObject({ foreground: true, lastActivityAt: 100 })
  })

  it('rejects untrusted or unregistered senders and ignores input from a background window', () => {
    const { ipcMain, manager, main } = setup()
    const foreign = new FakeWindow(99)

    expect(() => ipcMain.invoke('usage-activity:get', eventFor(main, 'https://example.com'))).toThrow(
      'untrusted IPC sender',
    )
    expect(ipcMain.emit('usage-activity:input', eventFor(foreign))).toBe(true)
    expect(manager.refresh().lastActivityAt).toBe(0)

    main.focused = false
    main.emit('blur')
    ipcMain.emit('usage-activity:input', eventFor(main))
    expect(manager.refresh().lastActivityAt).toBe(0)
  })

  it('recomputes current window state for queries and removes all listeners and pending work on dispose', async () => {
    const { ipcMain, powerMonitor, manager, main } = setup()
    main.focused = false

    expect(ipcMain.invoke('usage-activity:get', eventFor(main))).toMatchObject({ foreground: false })
    main.focused = true
    main.emit('focus')
    const broadcastsBeforeDispose = main.webContents.send.mock.calls.length
    manager.dispose()
    await flushImmediate()

    expect(ipcMain.handlers.has('usage-activity:get')).toBe(false)
    expect(ipcMain.listenerCount('usage-activity:input')).toBe(0)
    expect(powerMonitor.listenerCount('lock-screen')).toBe(0)
    expect(main.listenerCount('focus')).toBe(0)
    expect(main.webContents.send).toHaveBeenCalledTimes(broadcastsBeforeDispose)
  })
})
