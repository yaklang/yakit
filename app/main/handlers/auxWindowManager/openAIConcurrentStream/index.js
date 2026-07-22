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

  /**
   * 子窗口打开后通过 fetch-concurrent-stream-contents 主动向主窗口拉取 rawData。
   * 这里做 requestId 中转：转发请求到主窗口，等待响应后再 resolve 子窗口的 invoke。
   */
  ipcMain.handle(FETCH_CONTENTS, async (_event, frame) => {
    if (!frame?.session || !frame?.token || !mainWindow || mainWindow.isDestroyed()) {
      return { rawData: [], execFileRecord: [] }
    }

    const requestId = crypto.randomUUID()
    const responseChannel = `fetch-concurrent-stream-contents-response-${requestId}`

    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        ipcMain.removeAllListeners(responseChannel)
        resolve({ rawData: [], execFileRecord: [] })
      }, 15000)

      ipcMain.once(responseChannel, (_responseEvent, data) => {
        clearTimeout(timeout)
        resolve(data ?? { rawData: [], execFileRecord: [] })
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
