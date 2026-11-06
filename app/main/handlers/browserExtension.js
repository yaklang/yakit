const { assertTrustedAppSender } = require('../security')

module.exports = function registerBrowserExtension({ ipcMain, getClient }) {
  const streams = new Map()
  const trusted = (event, channel) => assertTrustedAppSender(event, channel)
  ipcMain.handle('BrowserExtensionRequest', (event, params) => {
    trusted(event, 'BrowserExtensionRequest')
    if (params?.Url?.Schema !== 'browser-extension' || params.Url.Location !== 'local')
      throw new Error('Invalid browser bridge URL')
    if (!['GET', 'POST', 'DELETE'].includes(params.Method)) throw new Error('Invalid browser bridge method')
    return new Promise((resolve, reject) =>
      getClient().RequestYakURL(params, (error, result) => (error ? reject(error) : resolve(result))),
    )
  })
  ipcMain.handle('ExecuteBrowserExtensionTask', (event, params, token) => {
    trusted(event, 'ExecuteBrowserExtensionTask')
    if (typeof token !== 'string' || !/^[a-zA-Z0-9-]{1,128}$/.test(token) || params?.TaskId !== token)
      throw new Error('Invalid browser task token')
    const key = `${event.sender.id}:${token}`
    if (streams.has(key)) throw new Error('Duplicate browser task')
    const client = getClient()
    if (typeof client.ExecuteBrowserExtensionTask !== 'function')
      throw new Error('Engine does not support browser extension tasks')
    const stream = client.ExecuteBrowserExtensionTask(params)
    streams.set(key, stream)
    const destroyed = () => {
      stream.cancel()
      cleanup()
    }
    const cleanup = () => {
      streams.delete(key)
      event.sender.removeListener('destroyed', destroyed)
    }
    const send = (suffix, value) => {
      if (!event.sender.isDestroyed()) event.sender.send(`${token}-${suffix}`, value)
    }
    event.sender.once('destroyed', destroyed)
    stream.on('data', (value) => send('data', value))
    stream.on('error', (error) => {
      send('error', error?.details || error?.message)
      cleanup()
    })
    stream.on('end', () => {
      send('end')
      cleanup()
    })
  })
  ipcMain.handle('cancel-ExecuteBrowserExtensionTask', (event, token) => {
    trusted(event, 'cancel-ExecuteBrowserExtensionTask')
    const key = `${event.sender.id}:${token}`
    streams.get(key)?.cancel()
  })
}
