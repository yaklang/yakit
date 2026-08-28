const { ipcMain } = require('electron')
const handlerHelper = require('./handleStreamWithContext')

module.exports = (win, getClient) => {
  const executeStreams = new Map()
  handlerHelper.bindWindowLifecycle(win, executeStreams)

  const unary = (method, params) =>
    new Promise((resolve, reject) => {
      getClient()[method](params, (error, data) => {
        if (error) {
          reject(error)
          return
        }
        resolve(data)
      })
    })

  ipcMain.handle('QueryContextMenuActions', (_event, params) => unary('QueryContextMenuActions', params || {}))
  ipcMain.handle('SetContextMenuActionBinding', (_event, params) => unary('SetContextMenuActionBinding', params || {}))

  ipcMain.handle('cancel-ExecuteContextMenuAction', async (event, token) => {
    const { mapToken } = handlerHelper.resolveRendererStreamToken(event, win, token)
    const stream = executeStreams.get(mapToken)
    executeStreams.delete(mapToken)
    stream?.cancel?.()
  })

  ipcMain.handle('ExecuteContextMenuAction', (event, params, token) => {
    const { mapToken, eventToken } = handlerHelper.resolveRendererStreamToken(event, win, token)
    const staleStream = executeStreams.get(mapToken)
    if (staleStream) {
      executeStreams.delete(mapToken)
      staleStream.cancel?.()
    }

    const stream = getClient().ExecuteContextMenuAction(params)
    executeStreams.set(mapToken, stream)
    const isCurrent = () => executeStreams.get(mapToken) === stream
    const canSend = () => !!win && !win.isDestroyed() && !win.webContents.isDestroyed()

    stream.on('data', (data) => {
      if (!isCurrent() || !canSend()) return
      win.webContents.send(`${eventToken}-context-menu-event`, data)
      if (data?.Result) {
        win.webContents.send(`${eventToken}-data`, data.Result)
      }
    })
    stream.on('error', (error) => {
      if (!isCurrent()) return
      executeStreams.delete(mapToken)
      if (!canSend()) return
      const reason = error?.details || error?.message || `${error}`
      win.webContents.send(`${eventToken}-error`, reason)
      win.webContents.send(`${eventToken}-context-menu-error`, reason)
    })
    stream.on('end', () => {
      if (!isCurrent()) return
      executeStreams.delete(mapToken)
      if (!canSend()) return
      win.webContents.send(`${eventToken}-end`)
      win.webContents.send(`${eventToken}-context-menu-end`)
    })
  })
}
