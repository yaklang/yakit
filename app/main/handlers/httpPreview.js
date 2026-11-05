const { ipcMain } = require('electron')
const { assertTrustedAppSender } = require('../security')

module.exports = (win, getClient) => {
  const calls = new Map()
  const owners = new Set()
  const keyFor = (event, token) => {
    assertTrustedAppSender(event, 'HTTP preview resources')
    if (event.senderFrame !== event.sender.mainFrame) throw new Error('preview requires the main frame')
    if (typeof token !== 'string' || !/^[\w-]{1,128}$/.test(token)) throw new Error('invalid preview token')
    return `${event.sender.id}:${token}`
  }
  ipcMain.handle('cancel-FetchHTTPPreviewResource', (event, token) => {
    const key = keyFor(event, token)
    calls.get(key)?.cancel()
    calls.delete(key)
  })
  const cleanup = () => {
    for (const call of calls.values()) call.cancel()
    calls.clear()
  }
  win.webContents.on('destroyed', cleanup)
  win.webContents.on('render-process-gone', cleanup)
  win.webContents.on('did-start-navigation', (_event, _url, _inPlace, mainFrame) => {
    if (mainFrame) cleanup()
  })
  ipcMain.handle('FetchHTTPPreviewResource', (event, params, token) => {
    const key = keyFor(event, token)
    if (calls.has(key) || calls.size >= 16) throw new Error('too many preview requests')
    if (!owners.has(event.sender)) {
      const owner = event.sender
      owners.add(owner)
      const cleanupOwner = () => {
        for (const [token, call] of calls) {
          if (token.startsWith(`${owner.id}:`)) {
            calls.delete(token)
            call.cancel()
          }
        }
      }
      owner.once('destroyed', () => {
        cleanupOwner()
        owners.delete(owner)
      })
      owner.on('render-process-gone', cleanupOwner)
      owner.on('did-start-navigation', (_event, _url, _inPlace, mainFrame) => {
        if (mainFrame) cleanupOwner()
      })
    }
    return new Promise((resolve, reject) => {
      const call = getClient().FetchHTTPPreviewResource(params, { deadline: Date.now() + 6000 }, (error, result) => {
        calls.delete(key)
        if (error?.code === 12) resolve({ Unsupported: true })
        else if (error) reject(error)
        else resolve(result)
      })
      calls.set(key, call)
    })
  })
}
