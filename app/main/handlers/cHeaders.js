const { ipcMain } = require('electron')

const unary = (getClient, method) => (params) => {
  return new Promise((resolve, reject) => {
    getClient()[method](params || {}, (err, data) => {
      if (err) {
        reject(err)
        return
      }
      resolve(data)
    })
  })
}

module.exports = (win, getClient) => {
  const methods = [
    'GetCHeadersDir',
    'ListCHeaders',
    'ListCHeaderEntries',
    'ImportCHeaderPack',
    'DeleteCHeaderPack',
    'PreviewCHeaderFile',
    'DownloadOfficialCHeaders',
  ]
  methods.forEach((method) => {
    const fn = unary(getClient, method)
    ipcMain.handle(method, async (e, params) => {
      return await fn(params)
    })
  })
}
