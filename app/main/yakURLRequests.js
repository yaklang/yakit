function registerYakURLRequests(ipcMain, getClient, legacyRequest) {
  const requests = new Map()
  ipcMain.handle('RequestYakURL', async (event, params, token) => {
    if (!token) return await legacyRequest(params)
    if (typeof token !== 'string' || token.length > 128) throw new Error('Invalid request token')
    const key = `${event.sender.id}:${token}`
    if (requests.has(key)) throw new Error('Duplicate request token')
    return new Promise((resolve, reject) => {
      let completed = false
      const onDestroyed = () => requests.get(key)?.cancel()
      const call = getClient().RequestYakURL(params, (error, data) => {
        completed = true
        requests.delete(key)
        event.sender.removeListener('destroyed', onDestroyed)
        error ? reject(error) : resolve(data)
      })
      if (!completed) {
        requests.set(key, call)
        event.sender.once('destroyed', onDestroyed)
      }
    })
  })
  ipcMain.handle('cancel-RequestYakURL', async (event, token) => {
    requests.get(`${event.sender.id}:${token}`)?.cancel()
  })
}
module.exports = { registerYakURLRequests }
