const { ipcMain } = require('electron')
const { AuxWindowManager } = require('./AuxWindowManager')
const { CHANNEL_APP_SYNC } = require('./channels')
const openConsoleNewWin = require('./openConsoleNewWin')
const openAiChatLog = require('./openAiChatLog')
const openAIConcurrentStream = require('./openAIConcurrentStream')

let auxWindowManager = null
/** @type {{ engineLinkWin?: import('electron').BrowserWindow, safeSend?: Function } | null} */
let broadcastContext = null

const AUX_IPC_HANDLES = [
  'aux-window:create',
  'aux-window:close',
  'aux-window:focus',
  'aux-window:push',
  CHANNEL_APP_SYNC,
]

function removeAuxHandlers() {
  AUX_IPC_HANDLES.forEach((channel) => {
    try {
      ipcMain.removeHandler(channel)
    } catch (_error) {}
  })
}

module.exports = {
  getAuxWindowManager: () => auxWindowManager,
  configureBroadcast: (ctx) => {
    broadcastContext = ctx
  },
  register: (win) => {
    removeAuxHandlers()

    const manager = new AuxWindowManager(win)
    auxWindowManager = manager

    const terminalHandlers = [openConsoleNewWin.register(manager, win), openAiChatLog.register(manager, win)]
    openAIConcurrentStream.register(manager, win)

    ipcMain.on('forward-xterm-theme', (_event, theme) => {
      terminalHandlers.forEach((handler) => {
        manager.pushBySingletonKey(handler.singletonKey, { type: 'xterm-theme', data: theme })
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

    ipcMain.handle('aux-window:create', (_event, options) => {
      try {
        return manager.create(options)
      } catch (error) {
        return Promise.reject(error)
      }
    })

    ipcMain.handle('aux-window:close', (_event, { windowId }) => manager.close(windowId))
    ipcMain.handle('aux-window:focus', (_event, { windowId }) => manager.focus(windowId))
    ipcMain.handle('aux-window:push', (_event, { windowId, payload }) => manager.push(windowId, payload))

    ipcMain.handle(CHANNEL_APP_SYNC, (_event, message) => {
      manager.broadcastAppSync(message, broadcastContext || {})
      return true
    })

    ipcMain.on('aux-window:ready', (event, { windowId }) => {
      if (!windowId) return
      manager.deliverInit(windowId, event.sender)
      manager.replayAppSyncTo(event.sender)
      terminalHandlers.forEach((handler) => handler.onAuxReady?.(windowId))
    })

    return manager
  },
}
