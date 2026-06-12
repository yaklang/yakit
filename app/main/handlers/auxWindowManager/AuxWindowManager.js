const { BrowserWindow } = require('electron')
const path = require('path')
const crypto = require('crypto')
const isDev = require('electron-is-dev')
const { CHANNEL_INIT, CHANNEL_PUSH, CHANNEL_OPENED, CHANNEL_CLOSED, CHANNEL_APP_SYNC } = require('./channels')

const AUX_APP_HTML = path.resolve(__dirname, '../../../renderer/pages/main/yakit-aux.html')

const lastAppSync = {
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

class AuxWindowManager {
  /**
   * @param {import('electron').BrowserWindow} mainWindow
   */
  constructor(mainWindow) {
    this.mainWindow = mainWindow
    /** @type {Map<string, { win: import('electron').BrowserWindow, meta: Record<string, any>, pendingPayload: any }>} */
    this.windows = new Map()
    /** @type {{ onOpened?: Function, onClosed?: Function } | null} */
    this.lifecycleHook = null
  }

  setLifecycleHook(hook) {
    this.lifecycleHook = hook || null
  }

  getEntry(windowId) {
    return this.windows.get(windowId) || null
  }

  notifyMain(channel, payload) {
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.webContents.send(channel, payload)
    }
  }

  findBySingletonKey(singletonKey) {
    if (!singletonKey) return null
    for (const [windowId, entry] of this.windows) {
      if (entry.meta.singletonKey === singletonKey && entry.win && !entry.win.isDestroyed()) {
        return { windowId, entry }
      }
    }
    return null
  }

  buildAuxAppQuery(meta) {
    const searchParams = new URLSearchParams({
      windowId: meta.windowId,
      route: meta.route,
    })
    if (meta.title) {
      searchParams.set('title', meta.title)
    }
    return searchParams.toString()
  }

  buildAuxAppLoadTarget(meta) {
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

  loadAuxApp(win, meta) {
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
  create(options = {}) {
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
        entry.win.webContents.send(CHANNEL_PUSH, { windowId, route: entry.meta.route, payload })
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
        preload: path.join(__dirname, '../../preload.js'),
        nodeIntegration: true,
        contextIsolation: false,
        sandbox: true,
      },
      show: false,
    })

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
  deliverInit(windowId, sender) {
    const entry = this.windows.get(windowId)
    if (!entry || entry.win.isDestroyed()) return false

    const target = sender || entry.win.webContents
    target.send(CHANNEL_INIT, {
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
  push(windowId, payload) {
    const entry = this.windows.get(windowId)
    if (!entry || entry.win.isDestroyed()) return false
    entry.win.webContents.send(CHANNEL_PUSH, {
      windowId,
      route: entry.meta.route,
      payload,
    })
    return true
  }

  focus(windowId) {
    const entry = this.windows.get(windowId)
    if (!entry || entry.win.isDestroyed()) return false
    entry.win.focus()
    return true
  }

  close(windowId) {
    const entry = this.windows.get(windowId)
    if (!entry || entry.win.isDestroyed()) return false
    entry.win.close()
    return true
  }

  closeBySingletonKey(singletonKey) {
    const found = this.findBySingletonKey(singletonKey)
    if (!found) return false
    return this.close(found.windowId)
  }

  focusBySingletonKey(singletonKey) {
    const found = this.findBySingletonKey(singletonKey)
    if (!found) return false
    return this.focus(found.windowId)
  }

  pushBySingletonKey(singletonKey, payload) {
    const found = this.findBySingletonKey(singletonKey)
    if (!found) return false
    return this.push(found.windowId, payload)
  }

  showInactiveBySingletonKey(singletonKey) {
    const found = this.findBySingletonKey(singletonKey)
    if (!found || found.entry.win.isDestroyed()) return false
    found.entry.win.showInactive()
    found.entry.win.moveTop()
    return true
  }

  rememberAppSync(message) {
    if (!message?.type) return
    if (message.type === 'theme') lastAppSync.theme = message.payload
    if (message.type === 'i18n') lastAppSync.i18n = message.payload
  }

  replayAppSyncTo(webContents) {
    if (!webContents || webContents.isDestroyed()) return
    if (lastAppSync.theme != null) {
      webContents.send(CHANNEL_APP_SYNC, { type: 'theme', payload: lastAppSync.theme })
    }
    if (lastAppSync.i18n != null) {
      webContents.send(CHANNEL_APP_SYNC, { type: 'i18n', payload: lastAppSync.i18n })
    }
  }

  /**
   * 广播全局设置到主渲染 / engineLink / 子窗口 / 所有辅助窗（统一走 aux-window:app-sync）
   * @param {{ type: string, payload?: unknown }} message
   * @param {{ engineLinkWin?: import('electron').BrowserWindow, safeSend?: (win: import('electron').BrowserWindow, channel: string, data: unknown) => void }} ctx
   */
  broadcastAppSync(message, ctx = {}) {
    if (!message?.type) return
    this.rememberAppSync(message)

    const { engineLinkWin, safeSend } = ctx
    const sentIds = new Set()

    const sendToWindow = (bw) => {
      if (!bw || bw.isDestroyed() || sentIds.has(bw.id)) return
      sentIds.add(bw.id)
      const useSafeSend = safeSend && (bw === this.mainWindow || (engineLinkWin && bw === engineLinkWin))
      if (useSafeSend) {
        safeSend(bw, CHANNEL_APP_SYNC, message)
      } else {
        bw.webContents.send(CHANNEL_APP_SYNC, message)
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

module.exports = {
  AuxWindowManager,
  CHANNEL_INIT,
  CHANNEL_PUSH,
  CHANNEL_OPENED,
  CHANNEL_CLOSED,
  CHANNEL_APP_SYNC,
}
