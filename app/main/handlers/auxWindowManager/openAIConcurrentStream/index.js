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
   * 子窗通过 fetch-concurrent-stream-contents 主动向主窗口拉取 rawData。
   * 这里做 requestId 中转：转发请求到主窗口，等待响应后再 resolve 子窗口的 invoke。
   */
  ipcMain.handle(FETCH_CONTENTS, async (_event, frame) => {
    if (!frame?.session || !frame?.token || !mainWindow || mainWindow.isDestroyed()) {
      return { rawData: [], execFileRecord: [], childrenTokens: [] }
    }

    const requestId = crypto.randomUUID()
    const responseChannel = `fetch-concurrent-stream-contents-response-${requestId}`

    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        ipcMain.removeAllListeners(responseChannel)
        resolve({ rawData: [], execFileRecord: [], childrenTokens: [] })
      }, 15000)

      ipcMain.once(responseChannel, (_responseEvent, data) => {
        clearTimeout(timeout)
        resolve(data ?? { rawData: [], execFileRecord: [], childrenTokens: [] })
      })

      safeSendMain('fetch-concurrent-stream-contents-request', { requestId, ...frame })
    })
  })

  /**
   * 子窗转发交互动作（如工具卡"跳过长时间加载"）到主窗口会话。
   * 与 FETCH_CONTENTS 相同的 requestId 中转模式：转发到主窗口代发，回执后再 resolve。
   */
  const INTERACTIVE_ACTION = 'ai-concurrent-stream-interactive-action'
  ipcMain.removeHandler(INTERACTIVE_ACTION)
  ipcMain.handle(INTERACTIVE_ACTION, async (_event, payload) => {
    if (!payload?.session || !payload?.params || !mainWindow || mainWindow.isDestroyed()) {
      return { success: false, message: 'main window unavailable' }
    }

    const requestId = crypto.randomUUID()
    const responseChannel = `ai-concurrent-stream-interactive-action-response-${requestId}`

    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        ipcMain.removeAllListeners(responseChannel)
        resolve({ success: false, message: 'main window response timeout' })
      }, 5000)

      ipcMain.once(responseChannel, (_responseEvent, data) => {
        clearTimeout(timeout)
        resolve(data ?? { success: false, message: 'empty response' })
      })

      safeSendMain('ai-concurrent-stream-interactive-action-request', { requestId, ...payload })
    })
  })

  ipcMain.handle('open-ai-concurrent-stream-window', async (_event, data) => {
    if (!data || typeof data !== 'object') return
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
}

module.exports = { register, ROUTE }
