// @vitest-environment node
import { describe, expect, it, vi } from 'vitest'
import { EventEmitter } from 'node:events'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import vm from 'node:vm'

const require = createRequire(import.meta.url)
const source = readFileSync(new URL('../index.js', import.meta.url), 'utf8')
const { appResourcePath } = require('../../../runtimePaths')

function setup(isDev = false, onLoad = () => {}) {
  const ipcMain = Object.assign(new EventEmitter(), { handle: vi.fn() })
  const parent = { send: vi.fn() }
  const windows = []
  class BrowserWindow extends EventEmitter {
    constructor() {
      super()
      this.webContents = Object.assign(new EventEmitter(), { send: vi.fn() })
      this.destroyed = false
      this.isDestroyed = () => this.destroyed
      this.loadFile = vi.fn((...args) => onLoad(this, ipcMain, ...args))
      this.loadURL = vi.fn((...args) => onLoad(this, ipcMain, ...args))
      this.setMenu = vi.fn()
      this.setWindowButtonVisibility = vi.fn()
      this.show = vi.fn()
      this.destroy = () => {
        this.destroyed = true
        this.emit('closed')
      }
      this.close = () => this.emit('close', { preventDefault: vi.fn() })
      windows.push(this)
    }
  }
  const module = { exports: {} }
  vm.runInNewContext(source, {
    module,
    process,
    setTimeout,
    require: (id) => {
      if (id === 'electron') return { ipcMain, BrowserWindow }
      if (id === 'electron-is-dev') return isDev
      if (id === '../../runtimePaths') return require('../../../runtimePaths')
      return require(id)
    },
  })
  module.exports.register(parent)
  const open = (data = { type: 'openPacketNewWindow', data: { id: 1 } }) => {
    ipcMain.emit('open-new-child-window', {}, data)
    return windows.at(-1)
  }
  return { ipcMain, parent, windows, open }
}

describe('child detail window', () => {
  it.each([false, true])('loads the aux static loading mode first (dev=%s)', (isDev) => {
    const { open } = setup(isDev)
    const child = open()
    if (isDev) {
      expect(child.loadURL).toHaveBeenCalledExactlyOnceWith('http://127.0.0.1:3000/yakit-aux.html?mode=child-loading')
      expect(child.loadFile).not.toHaveBeenCalled()
    } else {
      expect(child.loadFile).toHaveBeenCalledExactlyOnceWith(
        appResourcePath('renderer', 'pages', 'main', 'yakit-aux.html'),
        { search: 'mode=child-loading' },
      )
      expect(child.loadURL).not.toHaveBeenCalled()
    }
  })

  it('registers the handshake before loading even when the page responds immediately', () => {
    const { open } = setup(true, (child, ipcMain, url) => {
      if (url.endsWith('/yakit-aux.html?mode=child-loading')) {
        ipcMain.emit('ready-to-load-child', { sender: child.webContents })
      }
    })
    expect(open().loadURL).toHaveBeenLastCalledWith('http://127.0.0.1:3000/?window=child')
  })

  it('ignores other senders without consuming the handshake and navigates only once', () => {
    const { ipcMain, open } = setup(true)
    const child = open()
    ipcMain.emit('ready-to-load-child', { sender: {} })
    expect(child.loadURL).toHaveBeenCalledTimes(1)
    ipcMain.emit('ready-to-load-child', { sender: child.webContents })
    ipcMain.emit('ready-to-load-child', { sender: child.webContents })
    expect(child.loadURL).toHaveBeenCalledTimes(2)
    expect(ipcMain.listenerCount('ready-to-load-child')).toBe(0)
  })

  it.each(['close', 'load-failure'])('cleans up the pending handshake on %s before reopening', (reason) => {
    const { ipcMain, open } = setup(true)
    const child = open()
    if (reason === 'close') child.close()
    else child.webContents.emit('did-fail-load', {}, -6, 'NOT_FOUND', 'yakit-aux.html?mode=child-loading')
    expect(ipcMain.listenerCount('ready-to-load-child')).toBe(0)
    const reopened = open()
    ipcMain.emit('ready-to-load-child', { sender: child.webContents })
    expect(reopened.loadURL).toHaveBeenCalledTimes(1)
    ipcMain.emit('ready-to-load-child', { sender: reopened.webContents })
    expect(reopened.loadURL).toHaveBeenCalledTimes(2)
    expect(child.loadURL).toHaveBeenCalledTimes(1)
  })

  it.each([false, true])('loads the detail page after the loading handshake (dev=%s)', (isDev) => {
    const { ipcMain, parent, open } = setup(isDev)
    const child = open()
    expect(parent.send).toHaveBeenCalledWith('child-window-hash', { hash: expect.any(String) })
    ipcMain.emit('ready-to-load-child', { sender: child.webContents })
    expect(child.webContents.send).not.toHaveBeenCalledWith('start-child-loading')
    if (isDev) {
      expect(child.loadURL).toHaveBeenLastCalledWith('http://127.0.0.1:3000/?window=child')
    } else {
      expect(child.loadFile).toHaveBeenLastCalledWith(appResourcePath('renderer', 'pages', 'main', 'index.html'), {
        search: 'window=child',
      })
    }
    child.webContents.emit('did-finish-load')
    expect(child.show).toHaveBeenCalledOnce()
  })

  it.each(['openPacketNewWindow', 'openRiskNewWindow', 'openSSARiskNewWindow'])(
    'retains and forwards the latest %s data',
    (type) => {
      const { ipcMain, open } = setup()
      const initial = { type, data: { id: 1 } }
      const child = open(initial)
      ipcMain.emit('request-parent-data', { sender: child.webContents })
      expect(child.webContents.send).toHaveBeenLastCalledWith('get-parent-window-data', initial)
      const updated = { type, data: { id: 2 } }
      ipcMain.emit('minWin-send-to-childWin', {}, updated)
      expect(child.webContents.send).toHaveBeenLastCalledWith('get-parent-window-data', updated)
      child.webContents.send.mockClear()
      ipcMain.emit('request-parent-data', { sender: child.webContents })
      expect(child.webContents.send).toHaveBeenCalledWith('get-parent-window-data', updated)
    },
  )

  it('clears the window hash on close and initializes a reopened window with new data', () => {
    const { ipcMain, parent, open } = setup()
    open().close()
    expect(parent.send).toHaveBeenLastCalledWith('child-window-hash', { hash: '' })
    const updated = { type: 'openRiskNewWindow', data: { id: 3 } }
    const reopened = open(updated)
    ipcMain.emit('request-parent-data', { sender: reopened.webContents })
    expect(reopened.webContents.send).toHaveBeenLastCalledWith('get-parent-window-data', updated)
  })
})
