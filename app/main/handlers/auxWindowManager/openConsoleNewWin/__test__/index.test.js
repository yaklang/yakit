// @vitest-environment node
import { describe, expect, it, vi } from 'vitest'
import { EventEmitter } from 'node:events'
import { readFileSync } from 'node:fs'
import vm from 'node:vm'

const source = readFileSync(new URL('../index.js', import.meta.url), 'utf8')

function setup() {
  const ipcMain = Object.assign(new EventEmitter(), { handle: vi.fn() })
  const mainWindow = {
    isDestroyed: () => false,
    webContents: { send: vi.fn() },
  }
  const manager = {
    create: vi.fn(),
    closeBySingletonKey: vi.fn(),
    showInactiveBySingletonKey: vi.fn(),
    pushBySingletonKey: vi.fn(() => true),
    push: vi.fn(() => true),
    getEntry: vi.fn(),
  }
  const module = { exports: {} }
  vm.runInNewContext(source, {
    module,
    require: (id) => {
      if (id === 'electron') return { ipcMain }
      throw new Error(`unexpected require: ${id}`)
    },
  })
  const handler = module.exports.register(manager, mainWindow)
  const forward = (data) => ipcMain.emit('forward-xterm-data', {}, data)
  return { ipcMain, mainWindow, manager, handler, forward }
}

describe('engine console window', () => {
  it('pushes live data immediately before the window opens', () => {
    const { manager, forward } = setup()
    forward('startup')
    expect(manager.pushBySingletonKey).toHaveBeenCalledExactlyOnceWith('engine-console', {
      type: 'xterm-data',
      data: 'startup',
    })
    expect(manager.push).not.toHaveBeenCalled()
  })

  it('queues output after open and flushes it in order once the terminal is ready', () => {
    const { manager, handler, forward } = setup()
    manager.getEntry.mockReturnValue({ meta: { route: 'engine-console' } })

    handler.onOpened({ singletonKey: 'engine-console', windowId: 'console-1' })
    forward('history')
    forward('realtime')
    expect(manager.push).not.toHaveBeenCalled()
    expect(manager.pushBySingletonKey).not.toHaveBeenCalled()

    handler.onAuxReady('console-1')
    expect(manager.push).toHaveBeenNthCalledWith(1, 'console-1', { type: 'xterm-data', data: 'history' })
    expect(manager.push).toHaveBeenNthCalledWith(2, 'console-1', { type: 'xterm-data', data: 'realtime' })

    forward('later')
    expect(manager.pushBySingletonKey).toHaveBeenCalledExactlyOnceWith('engine-console', {
      type: 'xterm-data',
      data: 'later',
    })
  })

  it('drops the queue when the window closes before the terminal is ready', () => {
    const { mainWindow, manager, handler, forward } = setup()
    manager.getEntry.mockReturnValue({ meta: { route: 'engine-console' } })

    handler.onOpened({ singletonKey: 'engine-console', windowId: 'console-1' })
    forward('history')
    handler.onClosed({ singletonKey: 'engine-console', windowId: 'console-1' })
    handler.onAuxReady('console-1')

    expect(manager.push).not.toHaveBeenCalled()
    expect(mainWindow.webContents.send).toHaveBeenLastCalledWith('engineConsole-window-hash', { hash: '' })
  })

  it('keeps pushing live output when the terminal is ready before the load event', () => {
    const { mainWindow, manager, handler, forward } = setup()
    manager.getEntry.mockReturnValue({ meta: { route: 'engine-console' } })

    handler.onAuxReady('console-1')
    handler.onOpened({ singletonKey: 'engine-console', windowId: 'console-1' })
    forward('later')

    expect(manager.pushBySingletonKey).toHaveBeenCalledExactlyOnceWith('engine-console', {
      type: 'xterm-data',
      data: 'later',
    })
    expect(manager.push).not.toHaveBeenCalled()
    expect(mainWindow.webContents.send).toHaveBeenCalledWith('engineConsole-window-hash', { hash: 'console-1' })
  })

  it('keeps queued engine output when another aux window becomes ready', () => {
    const { manager, handler, forward } = setup()
    manager.getEntry.mockImplementation((windowId) => {
      if (windowId === 'log-1') return { meta: { route: 'ai-chat-log' } }
      if (windowId === 'console-1') return { meta: { route: 'engine-console' } }
      return null
    })

    handler.onOpened({ singletonKey: 'engine-console', windowId: 'console-1' })
    forward('history')
    handler.onAuxReady('log-1')
    expect(manager.push).not.toHaveBeenCalled()

    handler.onAuxReady('console-1')
    expect(manager.push).toHaveBeenCalledExactlyOnceWith('console-1', { type: 'xterm-data', data: 'history' })
  })
})
