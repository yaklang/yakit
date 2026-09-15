const SCREENSHOT_REQUEST = 'yakit_screenshot_request'
const SCREENSHOT_RESPONSE = 'yakit_screenshot_response'
const SCREENSHOT_SUBSCRIBE = 'yakit_screenshot_subscribe'
const activeCaptures = new WeakMap()
const CAPTURE_BUSY = 'A Yakit screenshot is already in progress; retry shortly'

function formatLocalCaptureTime(date) {
  const pad = (value) => String(value).padStart(2, '0')
  const offset = -date.getTimezoneOffset()
  const zone = `${offset >= 0 ? '+' : '-'}${pad(Math.floor(Math.abs(offset) / 60))}:${pad(Math.abs(offset) % 60)}`
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())} ${zone}`
}

// Executed in an isolated renderer world. The canvas stays detached from the UI.
async function watermarkScreenshot(png, capturedAt, logicalWidth) {
  const bytes = Uint8Array.from(atob(png), (char) => char.charCodeAt(0))
  const bitmap = await createImageBitmap(new Blob([bytes], { type: 'image/png' }))
  const canvas = document.createElement('canvas')
  canvas.width = bitmap.width
  canvas.height = bitmap.height
  const context = canvas.getContext('2d')
  context.drawImage(bitmap, 0, 0)
  bitmap.close()

  const scale = canvas.width / logicalWidth
  const margin = Math.min(12 * scale, canvas.width / 20, canvas.height / 20)
  const padding = Math.min(8 * scale, canvas.height / 20)
  let fontSize = Math.min(16 * scale, (canvas.height - 2 * margin - 2 * padding) / 1.5)
  context.font = `600 ${fontSize}px monospace`
  const availableWidth = canvas.width - 2 * margin - 2 * padding
  fontSize *= Math.min(1, availableWidth / context.measureText(capturedAt).width)
  context.font = `600 ${fontSize}px monospace`
  const boxWidth = context.measureText(capturedAt).width + 2 * padding
  const boxHeight = fontSize * 1.5 + 2 * padding
  const top = canvas.height - margin - boxHeight
  context.fillStyle = 'rgba(0, 0, 0, 0.82)'
  context.fillRect(margin, top, boxWidth, boxHeight)
  context.fillStyle = '#ffffff'
  context.textBaseline = 'middle'
  context.fillText(capturedAt, margin + padding, top + boxHeight / 2)
  return {
    data: canvas.toDataURL('image/png').slice('data:image/png;base64,'.length),
    capturedAt,
    width: canvas.width,
    height: canvas.height,
  }
}

async function captureYakitScreenshot(win, signal) {
  if (!win || win.isDestroyed() || win.webContents.isDestroyed()) {
    throw new Error('Yakit main window is unavailable')
  }
  const contents = win.webContents
  if (activeCaptures.has(contents)) throw new Error(CAPTURE_BUSY)
  if (contents.isLoadingMainFrame() || contents.isCrashed()) {
    throw new Error('Yakit main window is not ready')
  }
  if (signal?.aborted) throw signal.reason

  const task = { error: null }
  activeCaptures.set(contents, task)
  let rejectInvalidated
  const invalidated = new Promise((_, reject) => {
    rejectInvalidated = reject
  })
  const invalidate = (error = new Error('Yakit screenshot request is no longer active')) => {
    task.error = error
    rejectInvalidated(error)
  }
  const onAbort = () => invalidate(signal.reason)
  const onNavigation = (_event, _url, _isInPlace, isMainFrame) => {
    if (isMainFrame) invalidate()
  }
  const release = () => {
    if (activeCaptures.get(contents) === task) activeCaptures.delete(contents)
    contents.removeListener('did-start-navigation', onNavigation)
    contents.removeListener('render-process-gone', onTerminated)
    contents.removeListener('destroyed', onTerminated)
    win.removeListener('closed', onTerminated)
    signal?.removeEventListener('abort', onAbort)
  }
  const onTerminated = () => {
    invalidate()
    release()
  }
  contents.on('did-start-navigation', onNavigation)
  contents.once('render-process-gone', onTerminated)
  contents.once('destroyed', onTerminated)
  win.once('closed', onTerminated)
  signal?.addEventListener('abort', onAbort, { once: true })

  const capture = (async () => {
    const capturedAt = formatLocalCaptureTime(new Date())
    const [logicalWidth] = win.getContentSize()
    const screenshot = await contents.capturePage()
    if (task.error) throw task.error
    if (screenshot.isEmpty() || logicalWidth <= 0) throw new Error('Yakit page capture is empty')
    const png = screenshot.toPNG().toString('base64')
    const code = `(${watermarkScreenshot.toString()})(${JSON.stringify(png)}, ${JSON.stringify(capturedAt)}, ${logicalWidth})`
    const result = await contents.executeJavaScriptInIsolatedWorld(999, [{ code }])
    if (task.error) throw task.error
    return result
  })()
  // A deadline/navigation ends the request, not the native work. Only actual
  // settlement or renderer termination may free this window's physical slot.
  capture.then(release, release)
  return Promise.race([capture, invalidated])
}

function attachYakitScreenshot(win, stream) {
  let closed = false
  const pendingRequests = new Set()
  const onData = async (message) => {
    if (closed || message.MessageType !== SCREENSHOT_REQUEST) return
    let request
    try {
      request = JSON.parse(Buffer.from(message.Data).toString('utf8'))
    } catch {
      return
    }
    if (typeof request?.requestId !== 'string' || !request.requestId) return
    const reply = (result) => {
      if (closed || stream.destroyed || stream.writableEnded) return
      stream.write({
        MessageType: SCREENSHOT_RESPONSE,
        Data: Buffer.from(JSON.stringify({ requestId: request.requestId, ...result })),
      })
    }
    if (win && activeCaptures.has(win.webContents)) {
      reply({ error: CAPTURE_BUSY })
      return
    }
    const controller = new AbortController()
    pendingRequests.add(controller)
    const timer = setTimeout(() => controller.abort(new Error('Yakit page capture timed out')), 10000)
    try {
      const result = await captureYakitScreenshot(win, controller.signal)
      if (result.data.length > 30 * 1024 * 1024) {
        throw new Error('Yakit screenshot exceeds the 30 MiB transfer limit')
      }
      reply(result)
    } catch (error) {
      reply({ error: error.message || String(error) })
    } finally {
      clearTimeout(timer)
      pendingRequests.delete(controller)
    }
  }
  const cleanup = () => {
    closed = true
    stream.removeListener('data', onData)
    for (const controller of pendingRequests) {
      controller.abort(new Error('Yakit screenshot connection closed'))
    }
  }
  stream.on('data', onData)
  stream.once('end', cleanup)
  stream.once('error', cleanup)
  stream.once('close', cleanup)
  stream.write({ MessageType: SCREENSHOT_SUBSCRIBE, Data: Buffer.from('{}') })
}

module.exports = { attachYakitScreenshot, captureYakitScreenshot, formatLocalCaptureTime }
