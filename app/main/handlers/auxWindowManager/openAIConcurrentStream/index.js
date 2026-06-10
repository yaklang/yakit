const { ipcMain } = require('electron')
const crypto = require('crypto')

const ROUTE = 'ai-concurrent-stream'
const FETCH_CONTENTS = 'fetch-concurrent-stream-contents'

function buildSingletonKey(data) {
  return `ai-concurrent-stream:${data.session}:${data.token}:${data.chatType}`
}

/**
 * AI 并发流辅助窗（aux route: ai-concurrent-stream）
 * @param {import('../AuxWindowManager').AuxWindowManager} manager
 * @param {import('electron').BrowserWindow} mainWindow
 */
function register(manager, mainWindow) {
  try {
    ipcMain.removeHandler('open-ai-concurrent-stream-window')
  } catch (_error) {}
  try {
    ipcMain.removeHandler(FETCH_CONTENTS)
  } catch (_error) {}

  const safeSendMain = (channel, payload) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send(channel, payload)
    }
  }

  ipcMain.handle(FETCH_CONTENTS, async (_event, frame) => {
    if (!frame?.session || !frame?.token || !mainWindow || mainWindow.isDestroyed()) {
      return { contentEntries: [] }
    }

    const requestId = crypto.randomUUID()
    const responseChannel = `fetch-concurrent-stream-contents-response-${requestId}`

    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        ipcMain.removeAllListeners(responseChannel)
        resolve({ contentEntries: [] })
      }, 15000)

      ipcMain.once(responseChannel, (_responseEvent, data) => {
        clearTimeout(timeout)
        resolve(data ?? { contentEntries: [] })
      })

      safeSendMain('fetch-concurrent-stream-contents-request', { requestId, ...frame })
    })
  })

  ipcMain.handle('open-ai-concurrent-stream-window', async (_event, data) => {
    if (!data || typeof data !== 'object' || !Array.isArray(data.elements)) return
    const singletonKey = buildSingletonKey(data)
    const title = typeof data.taskName === 'string' && data.taskName ? data.taskName : 'Concurrent Stream'
    return manager.create({
      route: ROUTE,
      singletonKey,
      title,
      payload: data,
      width: 1200,
      height: 800,
    })
  })

  ipcMain.on('request-ai-concurrent-stream-refresh', (event, params) => {
    for (const entry of manager.windows.values()) {
      if (entry.win.isDestroyed()) continue
      if (entry.meta.route !== ROUTE) continue
      if (entry.win.webContents !== event.sender) continue
      safeSendMain('refresh-ai-concurrent-stream', params)
      return
    }
  })
}

module.exports = { register, ROUTE }
