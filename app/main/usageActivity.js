const { assertTrustedAppSender } = require('./security')

const CHANNEL_GET = 'usage-activity:get'
const CHANNEL_INPUT = 'usage-activity:input'
const CHANNEL_UPDATED = 'usage-activity:updated'

/**
 * 统一维护“用户正在使用应用”的原始状态。
 *
 * 渲染端只上报可信的真实输入事件，时间戳与前后台状态均由主进程生成，
 * 避免页面伪造时间或在后台继续刷新活跃时间。业务层再基于该快照决定是否发送统计。
 */
class UsageActivityManager {
  /**
   * @param {{
   *   ipcMain: import('electron').IpcMain,
   *   powerMonitor: import('electron').PowerMonitor,
   *   now?: () => number,
   *   assertTrustedSender?: (event: Electron.IpcMainEvent | Electron.IpcMainInvokeEvent, action: string) => void,
   * }} options
   */
  constructor({ ipcMain, powerMonitor, now = Date.now, assertTrustedSender = assertTrustedAppSender }) {
    this.ipcMain = ipcMain
    this.powerMonitor = powerMonitor
    this.now = now
    this.assertTrustedSender = assertTrustedSender
    /** @type {Set<import('electron').BrowserWindow>} */
    this.windows = new Set()
    /** @type {Map<import('electron').BrowserWindow, Array<[string, () => void]>>} */
    this.windowListeners = new Map()
    this.suspended = false
    this.locked = this.powerMonitor.getSystemIdleState?.(1) === 'locked'
    this.snapshot = { foreground: false, lastActivityAt: 0, revision: 0 }
    this.pendingFocusRefresh = null

    this.handleInput = (event) => this.recordInput(event)
    this.handleSuspend = () => {
      this.suspended = true
      this.refresh()
    }
    this.handleResume = () => {
      this.suspended = false
      this.refresh()
    }
    this.handleLock = () => {
      this.locked = true
      this.refresh()
    }
    this.handleUnlock = () => {
      this.locked = false
      this.refresh()
    }

    this.registerIPC()
    this.registerPowerMonitor()
  }

  registerIPC() {
    this.ipcMain.removeHandler?.(CHANNEL_GET)
    this.ipcMain.handle(CHANNEL_GET, (event) => {
      this.assertRegisteredSender(event, CHANNEL_GET)
      // 查询时重新读取 BrowserWindow 状态，供统计请求发送前做最终复核。
      return this.refresh()
    })
    this.ipcMain.on(CHANNEL_INPUT, this.handleInput)
  }

  registerPowerMonitor() {
    this.powerMonitor.on('suspend', this.handleSuspend)
    this.powerMonitor.on('resume', this.handleResume)
    this.powerMonitor.on('lock-screen', this.handleLock)
    this.powerMonitor.on('unlock-screen', this.handleUnlock)
  }

  /** @param {import('electron').BrowserWindow} win */
  registerWindow(win) {
    if (!win || this.windows.has(win)) return () => {}
    this.windows.add(win)

    // Windows 在主、辅窗口切换焦点时会先发 blur 再发 focus。合并同一事件循环内的
    // 焦点事件，避免把应用内部切换短暂误判成退到后台并重置心跳等待。
    const scheduleFocusRefresh = () => this.scheduleFocusRefresh()
    const refresh = () => this.refresh()
    const close = () => this.unregisterWindow(win)
    const listeners = [
      ['focus', scheduleFocusRefresh],
      ['blur', scheduleFocusRefresh],
      ['minimize', refresh],
      ['restore', refresh],
      ['show', refresh],
      ['hide', refresh],
      ['closed', close],
    ]
    listeners.forEach(([event, listener]) => win.on(event, listener))
    this.windowListeners.set(win, listeners)
    this.refresh()
    return () => this.unregisterWindow(win)
  }

  /** @param {import('electron').BrowserWindow} win */
  unregisterWindow(win) {
    const listeners = this.windowListeners.get(win) || []
    listeners.forEach(([event, listener]) => win.removeListener(event, listener))
    this.windowListeners.delete(win)
    this.windows.delete(win)
    this.refresh()
  }

  /** @param {Electron.IpcMainEvent | Electron.IpcMainInvokeEvent} event */
  findSenderWindow(event) {
    for (const win of this.windows) {
      if (!win.isDestroyed() && win.webContents === event.sender) return win
    }
    return null
  }

  /** @param {Electron.IpcMainEvent | Electron.IpcMainInvokeEvent} event @param {string} action */
  assertRegisteredSender(event, action) {
    this.assertTrustedSender(event, action)
    const win = this.findSenderWindow(event)
    if (!win) throw new Error(`unregistered IPC sender for ${action}`)
    return win
  }

  /** @param {import('electron').BrowserWindow} win */
  isForegroundWindow(win) {
    return !win.isDestroyed() && win.isVisible() && !win.isMinimized() && win.isFocused()
  }

  computeForeground() {
    return !this.suspended && !this.locked && [...this.windows].some((win) => this.isForegroundWindow(win))
  }

  scheduleFocusRefresh() {
    if (this.pendingFocusRefresh) return
    this.pendingFocusRefresh = setImmediate(() => {
      this.pendingFocusRefresh = null
      this.applyRefresh()
    })
  }

  cancelFocusRefresh() {
    if (!this.pendingFocusRefresh) return
    clearImmediate(this.pendingFocusRefresh)
    this.pendingFocusRefresh = null
  }

  /** @param {Electron.IpcMainEvent} event */
  recordInput(event) {
    // 其他使用 main preload 的非业务窗口也可能产生输入；事件型 IPC 必须静默忽略，
    // 避免非法 sender 的异常冒泡为主进程 uncaughtException。查询型 IPC 仍会明确拒绝。
    let win
    try {
      win = this.assertRegisteredSender(event, CHANNEL_INPUT)
    } catch (_error) {
      return false
    }
    if (this.suspended || this.locked || !this.isForegroundWindow(win)) return false

    this.snapshot = {
      foreground: true,
      lastActivityAt: this.now(),
      revision: this.snapshot.revision + 1,
    }
    this.broadcast()
    return true
  }

  applyRefresh() {
    const foreground = this.computeForeground()
    if (foreground !== this.snapshot.foreground) {
      this.snapshot = {
        ...this.snapshot,
        foreground,
        revision: this.snapshot.revision + 1,
      }
      this.broadcast()
    }
    return { ...this.snapshot }
  }

  refresh() {
    // 最小化、隐藏、系统状态和查询都走这里，必须越过焦点事件合并并立即得到真实状态。
    this.cancelFocusRefresh()
    return this.applyRefresh()
  }

  broadcast() {
    const snapshot = { ...this.snapshot }
    for (const win of this.windows) {
      if (!win.isDestroyed()) win.webContents.send(CHANNEL_UPDATED, snapshot)
    }
  }

  dispose() {
    this.cancelFocusRefresh()
    this.ipcMain.removeHandler?.(CHANNEL_GET)
    this.ipcMain.removeListener(CHANNEL_INPUT, this.handleInput)
    this.powerMonitor.removeListener('suspend', this.handleSuspend)
    this.powerMonitor.removeListener('resume', this.handleResume)
    this.powerMonitor.removeListener('lock-screen', this.handleLock)
    this.powerMonitor.removeListener('unlock-screen', this.handleUnlock)
    ;[...this.windows].forEach((win) => this.unregisterWindow(win))
  }
}

module.exports = {
  UsageActivityManager,
  CHANNEL_GET,
  CHANNEL_INPUT,
  CHANNEL_UPDATED,
}
