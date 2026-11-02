const { ipcMain } = require('electron')

const ROUTE = 'engine-console'
const SINGLETON_KEY = 'engine-console'

/**
 * 引擎 Console 辅助窗（aux route: engine-console）
 * @param {import('../AuxWindowManager').AuxWindowManager} manager
 * @param {import('electron').BrowserWindow} mainWindow
 */
function register(manager, mainWindow) {
  const safeSendMain = (channel, payload) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send(channel, payload)
    }
  }

  // did-finish-load 早于终端 onPush。这段时间内的输出先排队，ready 后再按到达顺序补推。
  /** @type {unknown[]} */
  let pendingData = []
  let bufferUntilReady = false

  const resetPending = () => {
    pendingData = []
    bufferUntilReady = false
  }

  ipcMain.handle('open-console-new-window', async () => {
    return manager.create({
      route: ROUTE,
      singletonKey: SINGLETON_KEY,
      title: '引擎 Console',
    })
  })

  ipcMain.on('close-console-new-window', () => {
    manager.closeBySingletonKey(SINGLETON_KEY)
  })

  ipcMain.on('onTop-console-new-window', () => {
    manager.showInactiveBySingletonKey(SINGLETON_KEY)
  })

  ipcMain.on('forward-xterm-data', (_event, data) => {
    if (bufferUntilReady) {
      pendingData.push(data)
      return
    }
    manager.pushBySingletonKey(SINGLETON_KEY, { type: 'xterm-data', data })
  })

  return {
    singletonKey: SINGLETON_KEY,
    onOpened(payload) {
      if (payload.singletonKey !== SINGLETON_KEY) return
      pendingData = []
      bufferUntilReady = true
      safeSendMain('engineConsole-window-hash', { hash: payload.windowId })
    },
    onClosed(payload) {
      if (payload.singletonKey !== SINGLETON_KEY) return
      resetPending()
      safeSendMain('engineConsole-window-hash', { hash: '' })
    },
    onAuxReady(windowId) {
      const entry = manager.getEntry(windowId)
      if (entry?.meta?.route !== ROUTE) return
      const queued = pendingData
      resetPending()
      queued.forEach((data) => {
        manager.push(windowId, { type: 'xterm-data', data })
      })
    },
  }
}

module.exports = { register, ROUTE, SINGLETON_KEY }
