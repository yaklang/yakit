const { assertTrustedAppSender } = require('../security')
const handlerHelper = require('./handleStreamWithContext')

module.exports = (ipcMain, win, getClient) => {
  const streams = new Map()
  const resolveToken = (event, token, action) => {
    assertTrustedAppSender(event, action)
    return handlerHelper.resolveRendererStreamToken(event, win, token)
  }
  const cancel = handlerHelper.cancelHandler(streams)

  handlerHelper.bindWindowLifecycle(win, streams)
  ipcMain.handle('cancel-SubscribeHTTPFlows', (event, token) => {
    const { mapToken } = resolveToken(event, token, 'cancel-SubscribeHTTPFlows')
    return cancel(event, mapToken)
  })
  ipcMain.handle('SubscribeHTTPFlows', (event, params, token) => {
    const { mapToken, eventToken } = resolveToken(event, token, 'SubscribeHTTPFlows')
    if (params?.SessionId !== eventToken) {
      throw new Error('HTTP flow subscription session does not match its stream token')
    }
    const stream = getClient().SubscribeHTTPFlows(params)
    handlerHelper.registerHandler(win, stream, streams, mapToken, eventToken)
  })
}
