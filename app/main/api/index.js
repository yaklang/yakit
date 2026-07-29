const { service } = require('../httpServer')
const { ipcMain } = require('electron')
const { assertTrustedAppSender, normalizeRelativeApiPath } = require('../security')

module.exports = (win, getClient) => {
  ipcMain.handle('axios-api', async (e, params) => {
    assertTrustedAppSender(e, 'axios-api')

    const safeParams = {
      ...(params || {}),
      url: normalizeRelativeApiPath(params?.url),
    }
    delete safeParams.baseURL
    delete safeParams.proxy
    delete safeParams.httpAgent
    delete safeParams.httpsAgent
    delete safeParams.transport
    delete safeParams.adapter

    return service(safeParams)
  })
}
