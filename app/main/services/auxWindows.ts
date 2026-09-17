import { sendEvent } from '../ipc/events'
import { registerRenderer, registerMainMethod, invocationWindow } from '../ipc/index'
import { preloadPath, rendererPath } from '../paths'
import { BrowserWindow, type WebContents } from 'electron'
const path = require('path')
import crypto from 'node:crypto'
import isDev from 'electron-is-dev'
const CHANNEL_INIT = 'aux-window:init-data'
const CHANNEL_PUSH = 'aux-window:push-data'
const CHANNEL_OPENED = 'aux-window:opened'
const CHANNEL_CLOSED = 'aux-window:closed'
const CHANNEL_APP_SYNC = 'aux-window:app-sync'

const AUX_APP_HTML = rendererPath('aux')

const lastAppSync: { theme: unknown; i18n: unknown } = {
  theme: null,
  i18n: null,
}

const DEFAULT_OPTIONS = {
  width: 1200,
  height: 800,
  minWidth: 900,
  minHeight: 500,
  titleBarStyle: 'default',
}

export interface AuxWindowOptions {
  route?: string
  payload?: Record<string, unknown>
  singletonKey?: string
  title?: string
  width?: number
  height?: number
  minWidth?: number
  minHeight?: number
  titleBarStyle?: 'default' | 'hidden'
  openDevTools?: boolean
}
export type AuxMetadata = {
  windowId: string
  route: string
  singletonKey?: string
  title?: string
  titleBarStyle?: string
}
export type AppSyncMessage = { type: string; payload?: unknown }
export type BroadcastContext = {
  engineLinkWin?: BrowserWindow
  safeSend?: (win: BrowserWindow, channel: string, data: unknown) => void
}
export interface AuxLifecycleHandler {
  singletonKey?: string
  onOpened?(payload: AuxMetadata): void
  onClosed?(payload: AuxMetadata): void
  onAuxReady?(windowId: string): void
}
export class AuxWindowManager {
  readonly mainWindow: BrowserWindow
  readonly windows: Map<string, { win: BrowserWindow; meta: AuxMetadata; pendingPayload: unknown }>
  private lifecycleHook: AuxLifecycleHandler | null
  /**
   * @param {import('electron').BrowserWindow} mainWindow
   */
  constructor(mainWindow: BrowserWindow) {
    this.mainWindow = mainWindow
    /** @type {Map<string, { win: import('electron').BrowserWindow, meta: Record<string, any>, pendingPayload: any }>} */
    this.windows = new Map()
    /** @type {{ onOpened?: Function, onClosed?: Function } | null} */
    this.lifecycleHook = null
  }

  setLifecycleHook(hook: AuxLifecycleHandler | null) {
    this.lifecycleHook = hook || null
  }

  getEntry(windowId: string) {
    return this.windows.get(windowId) || null
  }

  notifyMain(channel: string, payload: unknown) {
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      sendEvent(this.mainWindow.webContents, channel, payload)
    }
  }

  findBySingletonKey(singletonKey?: string) {
    if (!singletonKey) return null
    for (const [windowId, entry] of this.windows) {
      if (entry.meta.singletonKey === singletonKey && entry.win && !entry.win.isDestroyed()) {
        return { windowId, entry }
      }
    }
    return null
  }

  buildAuxAppQuery(meta: AuxMetadata) {
    const searchParams = new URLSearchParams({
      windowId: meta.windowId,
      route: meta.route,
    })
    if (meta.title) {
      searchParams.set('title', meta.title)
    }
    return searchParams.toString()
  }

  buildAuxAppLoadTarget(meta: AuxMetadata) {
    const query = this.buildAuxAppQuery(meta)
    if (isDev) {
      return { type: 'url', value: `http://127.0.0.1:3000/yakit-aux.html?${query}` }
    }
    return {
      type: 'file',
      value: AUX_APP_HTML,
      search: query,
    }
  }

  loadAuxApp(win: BrowserWindow, meta: AuxMetadata) {
    const target = this.buildAuxAppLoadTarget(meta)
    if (target.type === 'url') {
      return win.loadURL(target.value)
    }
    return win.loadFile(target.value, { search: target.search })
  }

  /**
   * @param {object} options
   * @param {string} options.route
   * @param {any} [options.payload]
   * @param {string} [options.singletonKey]
   * @param {string} [options.title]
   * @param {number} [options.width]
   * @param {number} [options.height]
   * @param {number} [options.minWidth]
   * @param {number} [options.minHeight]
   * @param {'default' | 'hidden'} [options.titleBarStyle]
   * @param {boolean} [options.openDevTools=false] 是否开启开发者工具
   */
  create(options: AuxWindowOptions = {}) {
    const {
      route,
      payload = {},
      singletonKey,
      title,
      width = DEFAULT_OPTIONS.width,
      height = DEFAULT_OPTIONS.height,
      minWidth: minWidthOption,
      minHeight: minHeightOption,
      titleBarStyle = DEFAULT_OPTIONS.titleBarStyle,
      openDevTools = false,
    } = options

    const minWidth = minWidthOption ?? Math.min(width, DEFAULT_OPTIONS.minWidth)
    const minHeight = minHeightOption ?? Math.min(height, DEFAULT_OPTIONS.minHeight)

    if (!route) {
      throw new Error('aux-window:create requires route')
    }

    const existing = this.findBySingletonKey(singletonKey)
    if (existing) {
      const { windowId, entry } = existing
      if (title) {
        entry.meta.title = title
        entry.win.setTitle(title)
      }
      entry.win.focus()
      if (payload && Object.keys(payload).length > 0) {
        sendEvent(entry.win.webContents, CHANNEL_PUSH, { windowId, route: entry.meta.route, payload })
      }
      return { windowId, focused: true, created: false }
    }

    const windowId = crypto.randomUUID()
    const titleBar = titleBarStyle === 'default' ? 'default' : 'hidden'
    const auxWin = new BrowserWindow({
      width,
      height,
      minWidth,
      minHeight,
      titleBarStyle: titleBar,
      webPreferences: {
        preload: preloadPath('main'),
        nodeIntegration: true,
        contextIsolation: false,
        sandbox: true,
      },
      show: false,
    })
    registerRenderer(auxWin.webContents, 'main')

    if (process.platform === 'darwin' && titleBar === 'hidden') {
      auxWin.setWindowButtonVisibility(false)
    }

    auxWin.setMenu(null)
    if (title) {
      auxWin.setTitle(title)
    }

    const meta = { windowId, route, singletonKey, title, titleBarStyle: titleBar }
    const entry = {
      win: auxWin,
      meta,
      pendingPayload: payload,
    }
    this.windows.set(windowId, entry)

    this.loadAuxApp(auxWin, meta)

    auxWin.webContents.once('did-finish-load', () => {
      if (auxWin.isDestroyed()) return
      auxWin.show()
      if (openDevTools) {
        auxWin.webContents.openDevTools({ mode: 'detach' })
      }
      const openedPayload = { windowId, route, singletonKey, title }
      this.notifyMain(CHANNEL_OPENED, openedPayload)
      this.lifecycleHook?.onOpened?.(openedPayload)
    })

    auxWin.webContents.once('did-fail-load', (_event, _errorCode, _errorDescription, validatedURL) => {
      if (validatedURL && validatedURL.includes('yakit-aux.html')) {
        this.close(windowId)
        this.notifyMain(CHANNEL_CLOSED, { windowId, route, singletonKey, failed: true })
      }
    })

    auxWin.on('closed', () => {
      this.windows.delete(windowId)
      const closedPayload = { windowId, route, singletonKey }
      this.notifyMain(CHANNEL_CLOSED, closedPayload)
      this.lifecycleHook?.onClosed?.(closedPayload)
    })

    return { windowId, focused: false, created: true }
  }

  /**
   * @param {string} windowId
   * @param {import('electron').WebContents} [sender]
   */
  deliverInit(windowId: string, sender?: WebContents) {
    const entry = this.windows.get(windowId)
    if (!entry || entry.win.isDestroyed()) return false

    if (sender && sender !== entry.win.webContents) throw new Error('Auxiliary window owner mismatch')
    const target = sender || entry.win.webContents
    sendEvent(target, CHANNEL_INIT, {
      windowId,
      route: entry.meta.route,
      title: entry.meta.title,
      payload: entry.pendingPayload ?? {},
    })
    entry.pendingPayload = null
    return true
  }

  /**
   * @param {string} windowId
   * @param {any} payload
   */
  push(windowId: string, payload: unknown) {
    const entry = this.windows.get(windowId)
    if (!entry || entry.win.isDestroyed()) return false
    sendEvent(entry.win.webContents, CHANNEL_PUSH, {
      windowId,
      route: entry.meta.route,
      payload,
    })
    return true
  }

  focus(windowId: string) {
    const entry = this.windows.get(windowId)
    if (!entry || entry.win.isDestroyed()) return false
    entry.win.focus()
    return true
  }

  close(windowId: string) {
    const entry = this.windows.get(windowId)
    if (!entry || entry.win.isDestroyed()) return false
    entry.win.close()
    return true
  }

  closeBySingletonKey(singletonKey: string) {
    const found = this.findBySingletonKey(singletonKey)
    if (!found) return false
    return this.close(found.windowId)
  }

  focusBySingletonKey(singletonKey: string) {
    const found = this.findBySingletonKey(singletonKey)
    if (!found) return false
    return this.focus(found.windowId)
  }

  pushBySingletonKey(singletonKey: string, payload: unknown) {
    const found = this.findBySingletonKey(singletonKey)
    if (!found) return false
    return this.push(found.windowId, payload)
  }

  showInactiveBySingletonKey(singletonKey: string) {
    const found = this.findBySingletonKey(singletonKey)
    if (!found || found.entry.win.isDestroyed()) return false
    found.entry.win.showInactive()
    found.entry.win.moveTop()
    return true
  }

  rememberAppSync(message: AppSyncMessage) {
    if (!message?.type) return
    if (message.type === 'theme') lastAppSync.theme = message.payload
    if (message.type === 'i18n') lastAppSync.i18n = message.payload
  }

  replayAppSyncTo(webContents?: WebContents) {
    if (!webContents || webContents.isDestroyed()) return
    if (lastAppSync.theme != null) {
      sendEvent(webContents, CHANNEL_APP_SYNC, { type: 'theme', payload: lastAppSync.theme })
    }
    if (lastAppSync.i18n != null) {
      sendEvent(webContents, CHANNEL_APP_SYNC, { type: 'i18n', payload: lastAppSync.i18n })
    }
  }

  /**
   * 广播全局设置到主渲染 / engineLink / 子窗口 / 所有辅助窗（统一走 aux-window:app-sync）
   * @param {{ type: string, payload?: unknown }} message
   * @param {{ engineLinkWin?: import('electron').BrowserWindow, safeSend?: (win: import('electron').BrowserWindow, channel: string, data: unknown) => void }} ctx
   */
  broadcastAppSync(message: AppSyncMessage, ctx: BroadcastContext = {}) {
    if (!message?.type) return
    this.rememberAppSync(message)

    const { engineLinkWin, safeSend } = ctx
    const sentIds = new Set()

    const sendToWindow = (bw?: BrowserWindow) => {
      if (!bw || bw.isDestroyed() || sentIds.has(bw.id)) return
      sentIds.add(bw.id)
      const useSafeSend = safeSend && (bw === this.mainWindow || (engineLinkWin && bw === engineLinkWin))
      if (useSafeSend) {
        safeSend(bw, CHANNEL_APP_SYNC, message)
      } else {
        sendEvent(bw.webContents, CHANNEL_APP_SYNC, message)
      }
    }

    sendToWindow(this.mainWindow)
    if (engineLinkWin) sendToWindow(engineLinkWin)
    for (const entry of this.windows.values()) {
      sendToWindow(entry.win)
    }
    BrowserWindow.getAllWindows().forEach(sendToWindow)
  }
}

export { CHANNEL_INIT, CHANNEL_PUSH, CHANNEL_OPENED, CHANNEL_CLOSED, CHANNEL_APP_SYNC }

const CONSOLE_ROUTE = 'engine-console'
const CONSOLE_KEY = 'engine-console'

/**
 * 引擎 Console 辅助窗（aux route: engine-console）
 * @param {import('../AuxWindowManager').AuxWindowManager} manager
 * @param {import('electron').BrowserWindow} mainWindow
 */
function registerConsole(manager: AuxWindowManager, mainWindow: BrowserWindow) {
  const safeSendMain = (channel: string, payload: unknown) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      sendEvent(mainWindow.webContents, channel, payload)
    }
  }

  registerMainMethod('open-console-new-window', async () => {
    return manager.create({
      route: CONSOLE_ROUTE,
      singletonKey: CONSOLE_KEY,
      title: '引擎 Console',
    })
  })

  registerMainMethod('close-console-new-window', () => {
    manager.closeBySingletonKey(CONSOLE_KEY)
  })

  registerMainMethod('onTop-console-new-window', () => {
    manager.showInactiveBySingletonKey(CONSOLE_KEY)
  })

  registerMainMethod('forward-xterm-data', (data) => {
    manager.pushBySingletonKey(CONSOLE_KEY, { type: 'xterm-data', data })
  })

  return {
    singletonKey: CONSOLE_KEY,
    onOpened(payload: AuxMetadata) {
      if (payload.singletonKey === CONSOLE_KEY) {
        safeSendMain('engineConsole-window-hash', { hash: payload.windowId })
      }
    },
    onClosed(payload: AuxMetadata) {
      if (payload.singletonKey === CONSOLE_KEY) {
        safeSendMain('engineConsole-window-hash', { hash: '' })
      }
    },
  }
}

const CHATLOG_ROUTE = 'ai-chat-log'
const CHATLOG_KEY = 'ai-chat-log'

const levelColorMap: Record<string, string> = {
  default: '\x1b[38;2;136;98;248m',
  info: '\x1b[38;2;40;192;142m',
  warn: '\x1b[38;2;40;192;142m',
  error: '\x1b[38;2;241;87;87m',
}

const MAX_LOG_SIZE = 500
const KEEP_LOG_COUNT = 50

/** @type {Map<string, string>} */
const aiChatLogMap = new Map<string, string>()

function formatLogLine(data: { level?: string; timestamp?: string; message?: string; isStream?: boolean }) {
  const { level, timestamp, message, isStream } = data
  const key = typeof level === 'string' ? level.toLowerCase() : 'default'
  const color = levelColorMap[key] || levelColorMap.default
  if (isStream) return `\n${color}[${level?.toUpperCase()}] ${timestamp} ${message}\x1b[0m \n\n`
  return `${color}[${level?.toUpperCase()}]\x1b[0m ${timestamp} ${message}\n`
}

function trimLogMap(keepCount = KEEP_LOG_COUNT) {
  if (aiChatLogMap.size <= keepCount) return
  const entries = Array.from(aiChatLogMap.entries()).slice(-keepCount)
  aiChatLogMap.clear()
  for (const [k, v] of entries) aiChatLogMap.set(k, v)
}

function replayAiChatLogs(manager: AuxWindowManager, windowId: string) {
  for (const log of aiChatLogMap.values()) {
    manager.push(windowId, { type: 'ai-chat-log-data', data: log })
  }
}

/**
 * AI Chat Log 辅助窗（aux route: ai-chat-log）
 * @param {import('../AuxWindowManager').AuxWindowManager} manager
 * @param {import('electron').BrowserWindow} mainWindow
 */
function registerChatLog(manager: AuxWindowManager, mainWindow: BrowserWindow) {
  const safeSendMain = (channel: string, payload: unknown) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      sendEvent(mainWindow.webContents, channel, payload)
    }
  }

  registerMainMethod('open-ai-chat-log-window', async () => {
    const existing = manager.findBySingletonKey(CHATLOG_KEY)
    if (existing) {
      existing.entry.win.focus()
      return
    }
    return manager.create({
      route: CHATLOG_ROUTE,
      singletonKey: CHATLOG_KEY,
      title: 'AI Chat Log',
    })
  })

  registerMainMethod('close-ai-chat-window', () => {
    manager.closeBySingletonKey(CHATLOG_KEY)
  })

  registerMainMethod('forward-ai-chat-log-data', (data) => {
    if (!data || typeof data !== 'object') return
    const logLine = formatLogLine(data)
    if (aiChatLogMap.size >= MAX_LOG_SIZE) {
      const firstKey = aiChatLogMap.keys().next().value
      if (firstKey) aiChatLogMap.delete(firstKey)
    }
    aiChatLogMap.set(crypto.randomUUID(), logLine)
    manager.pushBySingletonKey(CHATLOG_KEY, { type: 'ai-chat-log-data', data: logLine })
  })

  registerMainMethod('clear-ai-chat-log-data', () => {
    aiChatLogMap.clear()
    manager.pushBySingletonKey(CHATLOG_KEY, { type: 'ai-chat-log-clear' })
  })

  return {
    singletonKey: CHATLOG_KEY,
    onOpened(payload: AuxMetadata) {
      if (payload.singletonKey === CHATLOG_KEY) {
        safeSendMain('ai-chat-log-window-hash', { hash: payload.windowId })
      }
    },
    onClosed(payload: AuxMetadata) {
      if (payload.singletonKey === CHATLOG_KEY) {
        trimLogMap()
        safeSendMain('ai-chat-log-window-hash', { hash: '' })
      }
    },
    onAuxReady(windowId: string) {
      const entry = manager.getEntry(windowId)
      if (entry?.meta?.route === CHATLOG_ROUTE) {
        replayAiChatLogs(manager, windowId)
      }
    },
  }
}

let auxWindowManager: AuxWindowManager | null = null
let broadcastContext: BroadcastContext | null = null
export function getAuxWindowManager() {
  return auxWindowManager
}
export function configureBroadcast(context: BroadcastContext) {
  broadcastContext = context
}
export function registerAuxWindows(win: BrowserWindow) {
  const manager = new AuxWindowManager(win)
  auxWindowManager = manager
  const terminalHandlers: AuxLifecycleHandler[] = [registerConsole(manager, win), registerChatLog(manager, win)]
  registerConcurrentWindow(manager, win)
  registerMainMethod('forward-xterm-theme', (theme) => {
    terminalHandlers.forEach((handler) => {
      if (handler.singletonKey) manager.pushBySingletonKey(handler.singletonKey, { type: 'xterm-theme', data: theme })
    })
  })
  manager.setLifecycleHook({
    onOpened(payload) {
      terminalHandlers.forEach((handler) => handler.onOpened?.(payload))
    },
    onClosed(payload) {
      terminalHandlers.forEach((handler) => handler.onClosed?.(payload))
    },
  })
  registerMainMethod('aux-window:create', (options) => manager.create(options))
  registerMainMethod('aux-window:close', ({ windowId }) => manager.close(windowId))
  registerMainMethod('aux-window:focus', ({ windowId }) => manager.focus(windowId))
  registerMainMethod('aux-window:push', ({ windowId, payload }) => manager.push(windowId, payload))
  registerMainMethod(
    'aux-window:app-sync',
    (message) => {
      if (!['theme', 'i18n'].includes(message.type) || typeof message.payload !== 'string')
        throw new Error('Invalid app setting')
      manager.broadcastAppSync(message, broadcastContext || {})
      return true
    },
    ['main', 'link'],
  )
  registerMainMethod('aux-window:ready', ({ windowId }, context) => {
    const sender = invocationWindow(context).webContents
    if (!manager.deliverInit(windowId, sender)) return
    manager.replayAppSyncTo(sender)
    terminalHandlers.forEach((handler) => handler.onAuxReady?.(windowId))
  })
  return manager
}

function registerConcurrentWindow(manager: AuxWindowManager, mainWindow: BrowserWindow) {
  const pending = new Map<string, (data: unknown) => void>()
  registerMainMethod('fetch-concurrent-stream-contents', (frame, context) => {
    if (!frame.session || !frame.token || mainWindow.isDestroyed()) throw new Error('Concurrent stream is unavailable')
    const requestId = crypto.randomUUID()
    return new Promise<unknown>((resolve, reject) => {
      const cleanup = () => {
        clearTimeout(timer)
        pending.delete(requestId)
        context.signal.removeEventListener('abort', abort)
      }
      const abort = () => {
        cleanup()
        reject(context.signal.reason)
      }
      const timer = setTimeout(() => {
        cleanup()
        reject(new Error('Concurrent stream contents request timed out'))
      }, 15000)
      pending.set(requestId, (data) => {
        cleanup()
        resolve(data)
      })
      context.signal.addEventListener('abort', abort, { once: true })
      if (context.signal.aborted) {
        abort()
        return
      }
      sendEvent(mainWindow.webContents, 'fetch-concurrent-stream-contents-request', { requestId, ...frame })
    })
  })
  registerMainMethod('reply-concurrent-stream-contents', ({ requestId, data }, context) => {
    if (invocationWindow(context) !== mainWindow) throw new Error('Only the main window can provide stream contents')
    pending.get(requestId)?.(data)
  })
  registerMainMethod('open-ai-concurrent-stream-window', (data) =>
    manager.create({
      route: 'ai-concurrent-stream',
      singletonKey: 'ai-concurrent-stream',
      title: typeof data.taskName === 'string' && data.taskName ? data.taskName : 'Concurrent Stream',
      payload: { ...data },
      width: 1200,
      height: 800,
    }),
  )
}
