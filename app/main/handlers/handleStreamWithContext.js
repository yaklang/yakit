module.exports = {
  cancelHandler: (streamMap, callback) => {
    return async (e, token) => {
      const stream = streamMap.get(token)
      stream && stream.cancel()
      streamMap.delete(token)
      callback && callback(token)
    }
  },
  registerHandler: (windows, stream, streamMap, token) => {
    const currentStream = streamMap.get(token)
    if (!!currentStream) {
      stream !== currentStream && stream?.cancel?.()
      return false
    }

    streamMap.set(token, stream)
    const isCurrent = () => streamMap.get(token) === stream
    const canSend = () => !!windows && !windows.isDestroyed() && !windows.webContents.isDestroyed()
    const stopIfWindowUnavailable = () => {
      if (canSend()) return false
      if (isCurrent()) {
        streamMap.delete(token)
        stream?.cancel?.()
      }
      return true
    }

    stream.on('data', (data) => {
      if (!isCurrent() || stopIfWindowUnavailable()) return
      windows.webContents.send(`${token}-data`, data)
    })
    stream.on('error', (error) => {
      if (!isCurrent()) return
      streamMap.delete(token)
      if (!canSend()) return
      windows.webContents.send(`${token}-error`, error && error.details)
    })
    stream.on('end', () => {
      if (!isCurrent()) return
      streamMap.delete(token)
      if (!canSend()) return
      windows.webContents.send(`${token}-end`)
    })
    return true
  },
}
