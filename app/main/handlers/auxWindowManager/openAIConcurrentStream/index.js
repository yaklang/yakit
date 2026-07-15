const { ipcMain } = require('electron')
const crypto = require('crypto')

const ROUTE = 'ai-concurrent-stream'
const FETCH_CONTENTS = 'fetch-concurrent-stream-contents'
/** 全局单例：多个并发卡片共用一个 aux 窗，切换时替换内容 */
const SINGLETON_KEY = 'ai-concurrent-stream'

function buildSingletonKey(_data) {
  return SINGLETON_KEY
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

  /** @deprecated 获取数据的逻辑改为直接从主窗口推送，如需下面逻辑，需要按新版获取数据逻辑补充 */
  ipcMain.handle(FETCH_CONTENTS, async (_event, frame) => {
    if (!frame?.session || !frame?.token || !mainWindow || mainWindow.isDestroyed()) {
      return { rawData: [] }
    }

    const requestId = crypto.randomUUID()
    const responseChannel = `fetch-concurrent-stream-contents-response-${requestId}`

    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        ipcMain.removeAllListeners(responseChannel)
        resolve({ rawData: [] })
      }, 15000)

      ipcMain.once(responseChannel, (_responseEvent, data) => {
        clearTimeout(timeout)
        resolve(data ?? { rawData: [] })
      })

      safeSendMain('fetch-concurrent-stream-contents-request', { requestId, ...frame })
    })
  })

  ipcMain.handle('open-ai-concurrent-stream-window', async (_event, data) => {
    if (!data || typeof data !== 'object' || !Array.isArray(data.childrenTokens)) return
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
