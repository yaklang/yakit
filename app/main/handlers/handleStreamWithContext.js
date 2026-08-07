const STREAM_TOKEN_PATTERN = /^[A-Za-z0-9_-]{1,128}$/

const cancelAll = (streamMap, callback) => {
  const streams = [...streamMap.entries()]
  // A cancelled gRPC stream may emit a terminal event synchronously. Clear the
  // registry first so those stale events cannot be forwarded to a new page.
  streamMap.clear()
  streams.forEach(([token, stream]) => {
    try {
      stream?.cancel?.()
    } catch {}
    callback?.(token)
  })
  return streams.length
}

module.exports = {
  cancelAll,
  cancelHandler: (streamMap, callback) => {
    return async (e, token) => {
      const stream = streamMap.get(token)
      streamMap.delete(token)
      stream?.cancel?.()
      callback?.(token)
    }
  },
  bindWindowLifecycle: (windows, streamMap, callback) => {
    const cleanup = () => cancelAll(streamMap, callback)
    const cleanupOnMainFrameNavigation = (event, url, isInPlace, isMainFrame) => {
      if (isMainFrame) cleanup()
    }
    windows?.once?.('closed', cleanup)
    windows?.webContents?.once?.('destroyed', cleanup)
    windows?.webContents?.on?.('render-process-gone', cleanup)
    windows?.webContents?.on?.('did-start-navigation', cleanupOnMainFrameNavigation)
    return cleanup
  },
  resolveRendererStreamToken: (event, windows, token) => {
    const senderId = event?.sender?.id
    const ownerId = windows?.webContents?.id
    if (!Number.isInteger(senderId) || senderId !== ownerId) {
      throw new Error('stream token does not belong to the main renderer')
    }
    if (typeof token !== 'string' || !STREAM_TOKEN_PATTERN.test(token)) {
      throw new Error('invalid stream token')
    }
    return {
      mapToken: `${senderId}:${token}`,
      eventToken: token,
    }
  },
  registerHandler: (windows, stream, streamMap, token, eventToken = token) => {
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
      windows.webContents.send(`${eventToken}-data`, data)
    })
    stream.on('error', (error) => {
      if (!isCurrent() || stopIfWindowUnavailable()) return
      streamMap.delete(token)
      windows.webContents.send(`${eventToken}-error`, error && error.details)
    })
    stream.on('end', () => {
      if (!isCurrent() || stopIfWindowUnavailable()) return
      streamMap.delete(token)
      windows.webContents.send(`${eventToken}-end`)
    })
    return true
  },
}
