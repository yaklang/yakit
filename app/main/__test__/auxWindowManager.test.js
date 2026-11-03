import fs from 'node:fs'
import path from 'node:path'
import vm from 'node:vm'
import { EventEmitter } from 'node:events'
import { describe, expect, it, vi } from 'vitest'

const managerDirectory = path.resolve(__dirname, '../handlers/auxWindowManager')
const channels = {
  CHANNEL_INIT: 'aux-window:init-data',
  CHANNEL_PUSH: 'aux-window:push-data',
  CHANNEL_OPENED: 'aux-window:opened',
  CHANNEL_CLOSED: 'aux-window:closed',
  CHANNEL_APP_SYNC: 'aux-window:app-sync',
}

function loadCommonJS(filename, requireModule, env = {}) {
  const module = { exports: {} }
  vm.runInNewContext(
    fs.readFileSync(filename, 'utf8'),
    {
      module,
      exports: module.exports,
      require: requireModule,
      __dirname: path.dirname(filename),
      URL,
      URLSearchParams,
      process: { env, platform: 'win32' },
    },
    { filename },
  )
  return module.exports
}

function setup({ isDev = true, rendererUrl } = {}) {
  const windows = []
  class BrowserWindow extends EventEmitter {
    constructor() {
      super()
      this.webContents = new EventEmitter()
      this.webContents.send = vi.fn()
      this.loadURL = vi.fn(() => Promise.resolve())
      this.loadFile = vi.fn(() => Promise.resolve())
      this.focus = vi.fn()
      this.show = vi.fn()
      this.setMenu = vi.fn()
      this.setTitle = vi.fn()
      this.destroyed = false
      windows.push(this)
    }
    isDestroyed() {
      return this.destroyed
    }
    close() {
      this.destroyed = true
      this.emit('closed')
    }
  }
  const handlers = new Map()
  const ipcMain = {
    handle: (channel, handler) => handlers.set(channel, handler),
    on: (channel, handler) => handlers.set(channel, handler),
  }
  const requireModule = (id) => {
    if (id === 'electron') return { BrowserWindow, ipcMain }
    if (id === 'electron-is-dev') return isDev
    if (id === 'path') return path
    if (id === 'crypto') return { randomUUID: () => `id-${windows.length}-${handlers.size}` }
    if (id === './channels') return channels
    throw new Error(`Unexpected dependency: ${id}`)
  }
  const { AuxWindowManager } = loadCommonJS(path.join(managerDirectory, 'AuxWindowManager.js'), requireModule, {
    YAKIT_DEV_RENDERER_URL: rendererUrl,
  })
  const mainWindow = { isDestroyed: () => false, webContents: { send: vi.fn() } }
  const manager = new AuxWindowManager(mainWindow)
  return { manager, mainWindow, windows, handlers, requireModule }
}

describe('AI chat log auxiliary window address and IPC', () => {
  it.each([
    [undefined, 'http://127.0.0.1:3000/yakit-aux.html'],
    ['', 'http://127.0.0.1:3000/yakit-aux.html'],
    ['http://127.0.0.1:18080', 'http://127.0.0.1:18080/yakit-aux.html'],
    ['http://localhost:18080/', 'http://localhost:18080/yakit-aux.html'],
    ['http://127.0.0.1:18080/preview/index.html?old=1#old', 'http://127.0.0.1:18080/preview/yakit-aux.html'],
  ])('opens alongside the main renderer configured as %s', (rendererUrl, expected) => {
    const { manager, windows } = setup({ rendererUrl })
    const result = manager.create({ route: 'ai-chat-log', title: '日志 & AI', singletonKey: 'ai-chat-log' })
    const loaded = new URL(windows[0].loadURL.mock.calls[0][0])
    expect(`${loaded.origin}${loaded.pathname}`).toBe(expected)
    expect(loaded.searchParams.get('windowId')).toBe(result.windowId)
    expect(loaded.searchParams.get('route')).toBe('ai-chat-log')
    expect(loaded.searchParams.get('title')).toBe('日志 & AI')
    expect(loaded.searchParams.has('old')).toBe(false)
    expect(loaded.hash).toBe('')
    expect(windows[0].loadFile).not.toHaveBeenCalled()
  })

  it('continues loading the bundled HTML in production regardless of development overrides', () => {
    const { manager, windows } = setup({ isDev: false, rendererUrl: 'http://127.0.0.1:18080' })
    manager.create({ route: 'ai-chat-log' })
    expect(windows[0].loadURL).not.toHaveBeenCalled()
    expect(windows[0].loadFile.mock.calls[0][0]).toBe(
      path.resolve(managerDirectory, '../../../renderer/pages/main/yakit-aux.html'),
    )
    expect(windows[0].loadFile.mock.calls[0][1].search).toContain('route=ai-chat-log')
  })

  it('opens via the real log IPC, shows on load, replays logs and permits reopening after close', async () => {
    const { manager, mainWindow, windows, handlers, requireModule } = setup({ rendererUrl: 'http://127.0.0.1:18080' })
    const { register } = loadCommonJS(path.join(managerDirectory, 'openAiChatLog/index.js'), requireModule)
    const logHandler = register(manager, mainWindow)
    manager.setLifecycleHook(logHandler)
    const open = handlers.get('open-ai-chat-log-window')
    const first = await open()
    expect(windows[0].loadURL.mock.calls[0][0]).toContain('http://127.0.0.1:18080/yakit-aux.html?')
    expect(windows[0].show).not.toHaveBeenCalled()
    windows[0].webContents.emit('did-finish-load')
    expect(windows[0].show).toHaveBeenCalledTimes(1)
    expect(mainWindow.webContents.send).toHaveBeenCalledWith('ai-chat-log-window-hash', { hash: first.windowId })

    await open()
    expect(windows).toHaveLength(1)
    expect(windows[0].focus).toHaveBeenCalledTimes(1)
    handlers.get('forward-ai-chat-log-data')(null, { level: 'info', timestamp: 'now', message: 'log smoke' })
    logHandler.onAuxReady(first.windowId)
    expect(windows[0].webContents.send).toHaveBeenCalledWith(channels.CHANNEL_PUSH, {
      windowId: first.windowId,
      route: 'ai-chat-log',
      payload: { type: 'ai-chat-log-data', data: expect.stringContaining('log smoke') },
    })
    handlers.get('close-ai-chat-window')()
    expect(manager.getEntry(first.windowId)).toBe(null)
    expect(mainWindow.webContents.send).toHaveBeenCalledWith('ai-chat-log-window-hash', { hash: '' })
    await open()
    expect(windows).toHaveLength(2)
  })
})
