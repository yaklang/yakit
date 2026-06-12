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
    manager.pushBySingletonKey(SINGLETON_KEY, { type: 'xterm-data', data })
  })

  return {
    singletonKey: SINGLETON_KEY,
    onOpened(payload) {
      if (payload.singletonKey === SINGLETON_KEY) {
        safeSendMain('engineConsole-window-hash', { hash: payload.windowId })
      }
    },
    onClosed(payload) {
      if (payload.singletonKey === SINGLETON_KEY) {
        safeSendMain('engineConsole-window-hash', { hash: '' })
      }
    },
  }
}

module.exports = { register, ROUTE, SINGLETON_KEY }
