const { ipcMain } = require('electron')
const crypto = require('crypto')

const ROUTE = 'ai-chat-log'
const SINGLETON_KEY = 'ai-chat-log'

const levelColorMap = {
  default: '\x1b[38;2;136;98;248m',
  info: '\x1b[38;2;40;192;142m',
  warn: '\x1b[38;2;40;192;142m',
  error: '\x1b[38;2;241;87;87m',
}

const MAX_LOG_SIZE = 500
const KEEP_LOG_COUNT = 50

/** @type {Map<string, string>} */
const aiChatLogMap = new Map()

function formatLogLine(data) {
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

function replayAiChatLogs(manager, windowId) {
  for (const log of aiChatLogMap.values()) {
    manager.push(windowId, { type: 'ai-chat-log-data', data: log })
  }
}

/**
 * AI Chat Log 辅助窗（aux route: ai-chat-log）
 * @param {import('../AuxWindowManager').AuxWindowManager} manager
 * @param {import('electron').BrowserWindow} mainWindow
 */
function register(manager, mainWindow) {
  const safeSendMain = (channel, payload) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send(channel, payload)
    }
  }

  ipcMain.handle('open-ai-chat-log-window', async () => {
    const existing = manager.findBySingletonKey(SINGLETON_KEY)
    if (existing) {
      existing.entry.win.focus()
      return
    }
    return manager.create({
      route: ROUTE,
      singletonKey: SINGLETON_KEY,
      title: 'AI Chat Log',
    })
  })

  ipcMain.on('close-ai-chat-window', () => {
    manager.closeBySingletonKey(SINGLETON_KEY)
  })

  ipcMain.handle('forward-ai-chat-log-data', (_event, data) => {
    if (!data || typeof data !== 'object') return
    const logLine = formatLogLine(data)
    if (aiChatLogMap.size >= MAX_LOG_SIZE) {
      const firstKey = aiChatLogMap.keys().next().value
      if (firstKey) aiChatLogMap.delete(firstKey)
    }
    aiChatLogMap.set(crypto.randomUUID(), logLine)
    manager.pushBySingletonKey(SINGLETON_KEY, { type: 'ai-chat-log-data', data: logLine })
  })

  ipcMain.handle('clear-ai-chat-log-data', () => {
    aiChatLogMap.clear()
    manager.pushBySingletonKey(SINGLETON_KEY, { type: 'ai-chat-log-clear' })
  })

  return {
    singletonKey: SINGLETON_KEY,
    onOpened(payload) {
      if (payload.singletonKey === SINGLETON_KEY) {
        safeSendMain('ai-chat-log-window-hash', { hash: payload.windowId })
      }
    },
    onClosed(payload) {
      if (payload.singletonKey === SINGLETON_KEY) {
        trimLogMap()
        safeSendMain('ai-chat-log-window-hash', { hash: '' })
      }
    },
    onAuxReady(windowId) {
      const entry = manager.getEntry(windowId)
      if (entry?.meta?.route === ROUTE) {
        replayAiChatLogs(manager, windowId)
      }
    },
  }
}

module.exports = { register, ROUTE, SINGLETON_KEY }
