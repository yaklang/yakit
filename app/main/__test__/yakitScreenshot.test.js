import { EventEmitter } from 'events'
import { afterEach, describe, expect, it, vi } from 'vitest'
import screenshot from '../yakitScreenshot'

const { attachYakitScreenshot, captureYakitScreenshot, formatLocalCaptureTime } = screenshot
const request = (requestId) => ({
  MessageType: 'yakit_screenshot_request',
  Data: Buffer.from(JSON.stringify({ requestId })),
})
const createWindow = () =>
  Object.assign(new EventEmitter(), {
    isDestroyed: () => false,
    getContentSize: () => [800, 600],
    webContents: Object.assign(new EventEmitter(), {
      isDestroyed: () => false,
      isLoadingMainFrame: vi.fn().mockReturnValue(false),
      isCrashed: vi.fn().mockReturnValue(false),
      capturePage: vi.fn().mockResolvedValue({ isEmpty: () => false, toPNG: () => Buffer.from('png') }),
      executeJavaScriptInIsolatedWorld: vi.fn().mockResolvedValue({
        data: 'cG5n',
        capturedAt: '2026-09-08 12:34:56 +08:00',
        width: 800,
        height: 600,
      }),
    }),
  })
const deferred = () => {
  let resolve
  let reject
  const promise = new Promise((resolvePromise, rejectPromise) => {
    resolve = resolvePromise
    reject = rejectPromise
  })
  return { promise, resolve, reject }
}
const capturedImage = () => ({ isEmpty: () => false, toPNG: vi.fn(() => Buffer.from('png')) })
const flush = () => new Promise((resolve) => setTimeout(resolve, 0))
const createStream = () => Object.assign(new EventEmitter(), { write: vi.fn() })
const replies = (stream) =>
  stream.write.mock.calls
    .map(([message]) => message)
    .filter((message) => message.MessageType === 'yakit_screenshot_response')
    .map((message) => JSON.parse(message.Data.toString()))

afterEach(() => vi.useRealTimers())

describe('Yakit screenshot', () => {
  it('uses local calendar fields and supports positive and negative fractional UTC offsets', () => {
    const date = new Date(2026, 8, 8, 12, 34, 56)
    vi.spyOn(date, 'getTimezoneOffset').mockReturnValue(-345)
    expect(formatLocalCaptureTime(date)).toBe('2026-09-08 12:34:56 +05:45')
    date.getTimezoneOffset.mockReturnValue(210)
    expect(formatLocalCaptureTime(date)).toBe('2026-09-08 12:34:56 -03:30')
  })

  it('subscribes and returns the captured image with the matching request ID', async () => {
    const stream = createStream()
    const win = createWindow()
    attachYakitScreenshot(win, stream)
    expect(stream.write.mock.calls[0][0].MessageType).toBe('yakit_screenshot_subscribe')
    stream.emit('data', request('capture-1'))
    await vi.waitFor(() => expect(replies(stream)).toHaveLength(1))
    expect(replies(stream)[0]).toMatchObject({ requestId: 'capture-1', data: 'cG5n', width: 800 })
    expect(win.webContents.capturePage).toHaveBeenCalledWith()
  })

  it('reports a closed window and an empty capture', async () => {
    await expect(captureYakitScreenshot(null)).rejects.toThrow('unavailable')
    const win = createWindow()
    win.webContents.capturePage.mockResolvedValue({ isEmpty: () => true })
    const stream = createStream()
    attachYakitScreenshot(win, stream)
    stream.emit('data', request('empty'))
    await vi.waitFor(() => expect(replies(stream)[0]?.error).toContain('empty'))
  })

  it('rejects overlapping captures and bounds a hung renderer', async () => {
    vi.useFakeTimers()
    const win = createWindow()
    win.webContents.capturePage.mockReturnValue(new Promise(() => {}))
    const stream = createStream()
    attachYakitScreenshot(win, stream)
    stream.emit('data', request('hung'))
    stream.emit('data', request('overlap'))
    expect(replies(stream)[0]).toMatchObject({
      requestId: 'overlap',
      error: expect.stringContaining('already in progress'),
    })
    await vi.advanceTimersByTimeAsync(10000)
    expect(replies(stream)[1]).toMatchObject({ requestId: 'hung', error: expect.stringContaining('timed out') })
  })

  it('does not write a late capture after the connection closes', async () => {
    const stream = createStream()
    attachYakitScreenshot(createWindow(), stream)
    stream.emit('data', request('late'))
    stream.emit('end')
    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(replies(stream)).toEqual([])
    expect(stream.listenerCount('data')).toBe(0)
  })

  it('keeps timed-out physical captures occupied across retries until they settle', async () => {
    vi.useFakeTimers()
    const win = createWindow()
    const pending = deferred()
    win.webContents.capturePage.mockReturnValueOnce(pending.promise)
    const stream = createStream()
    attachYakitScreenshot(win, stream)
    stream.emit('data', request('slow'))
    await vi.advanceTimersByTimeAsync(10000)
    for (let index = 0; index < 3; index += 1) {
      stream.emit('data', request(`retry-${index}`))
      await vi.advanceTimersByTimeAsync(10000)
    }
    expect(win.webContents.capturePage).toHaveBeenCalledTimes(1)
    expect(
      replies(stream)
        .slice(1)
        .every(({ error }) => error.includes('already in progress')),
    ).toBe(true)
    const image = capturedImage()
    pending.resolve(image)
    await vi.advanceTimersByTimeAsync(0)
    expect(image.toPNG).not.toHaveBeenCalled()
    expect(win.webContents.executeJavaScriptInIsolatedWorld).not.toHaveBeenCalled()
    expect(replies(stream).filter(({ requestId }) => requestId === 'slow')).toHaveLength(1)
    stream.emit('data', request('recovered'))
    await vi.advanceTimersByTimeAsync(0)
    expect(replies(stream).at(-1)).toMatchObject({ requestId: 'recovered', data: 'cG5n' })
    stream.emit('end')
    expect(vi.getTimerCount()).toBe(0)
  })

  it.each(['end', 'error', 'close'])(
    'shares the window slot after stream %s and skips stale watermark work',
    async (event) => {
      const win = createWindow()
      const pending = deferred()
      win.webContents.capturePage.mockReturnValueOnce(pending.promise)
      const oldStream = createStream()
      attachYakitScreenshot(win, oldStream)
      oldStream.emit('data', request('old'))
      oldStream.emit(event)
      const newStream = createStream()
      attachYakitScreenshot(win, newStream)
      newStream.emit('data', request('new'))
      await flush()
      expect(win.webContents.capturePage).toHaveBeenCalledTimes(1)
      expect(replies(newStream)[0].error).toContain('already in progress')
      const image = capturedImage()
      pending.resolve(image)
      await flush()
      expect(image.toPNG).not.toHaveBeenCalled()
      expect(win.webContents.executeJavaScriptInIsolatedWorld).not.toHaveBeenCalled()
      expect(replies(oldStream)).toEqual([])
      newStream.emit('data', request('recovered'))
      await flush()
      expect(replies(newStream).at(-1).data).toBe('cG5n')
      newStream.emit('end')
    },
  )

  it('retains the slot while timed-out watermark work is still running', async () => {
    vi.useFakeTimers()
    const win = createWindow()
    const pending = deferred()
    win.webContents.executeJavaScriptInIsolatedWorld.mockReturnValueOnce(pending.promise)
    const stream = createStream()
    attachYakitScreenshot(win, stream)
    stream.emit('data', request('watermark'))
    await vi.advanceTimersByTimeAsync(10000)
    stream.emit('data', request('retry'))
    expect(win.webContents.capturePage).toHaveBeenCalledTimes(1)
    pending.reject(new Error('late renderer error'))
    await vi.advanceTimersByTimeAsync(0)
    expect(replies(stream)).toHaveLength(2)
    stream.emit('data', request('recovered'))
    await vi.advanceTimersByTimeAsync(0)
    expect(replies(stream).at(-1).data).toBe('cG5n')
    stream.emit('end')
  })

  it('invalidates main-frame navigation without freeing the pending physical slot', async () => {
    const win = createWindow()
    const pending = deferred()
    win.webContents.capturePage.mockReturnValueOnce(pending.promise)
    const stream = createStream()
    attachYakitScreenshot(win, stream)
    stream.emit('data', request('old-page'))
    win.webContents.emit('did-start-navigation', {}, 'about:blank', false, true)
    stream.emit('data', request('too-early'))
    expect(win.webContents.capturePage).toHaveBeenCalledTimes(1)
    pending.resolve(capturedImage())
    await flush()
    expect(win.webContents.executeJavaScriptInIsolatedWorld).not.toHaveBeenCalled()
    expect(replies(stream).find(({ requestId }) => requestId === 'old-page').error).toBeTruthy()
    win.webContents.isLoadingMainFrame.mockReturnValue(true)
    stream.emit('data', request('loading'))
    await flush()
    expect(win.webContents.capturePage).toHaveBeenCalledTimes(1)
    win.webContents.isLoadingMainFrame.mockReturnValue(false)
    stream.emit('data', request('ready'))
    await flush()
    expect(replies(stream).at(-1).data).toBe('cG5n')
    stream.emit('end')
  })

  it('ignores subframe navigation and releases lifecycle listeners on completion', async () => {
    const win = createWindow()
    const pending = deferred()
    win.webContents.capturePage.mockReturnValueOnce(pending.promise)
    const capture = captureYakitScreenshot(win)
    win.webContents.emit('did-start-navigation', {}, 'about:blank', false, false)
    pending.resolve(capturedImage())
    await expect(capture).resolves.toMatchObject({ data: 'cG5n' })
    expect(win.eventNames()).toEqual([])
    expect(win.webContents.eventNames()).toEqual([])
  })

  it('does not let an old renderer completion release its replacement task', async () => {
    const win = createWindow()
    const oldCapture = deferred()
    const newCapture = deferred()
    win.webContents.capturePage.mockReturnValueOnce(oldCapture.promise).mockReturnValueOnce(newCapture.promise)
    const stream = createStream()
    attachYakitScreenshot(win, stream)
    stream.emit('data', request('old-renderer'))
    win.webContents.isCrashed.mockReturnValue(true)
    win.webContents.emit('render-process-gone', {}, { reason: 'crashed' })
    stream.emit('data', request('crashed'))
    await flush()
    expect(win.webContents.capturePage).toHaveBeenCalledTimes(1)
    win.webContents.isCrashed.mockReturnValue(false)
    stream.emit('data', request('replacement'))
    expect(win.webContents.capturePage).toHaveBeenCalledTimes(2)
    oldCapture.resolve(capturedImage())
    await flush()
    stream.emit('data', request('overlap'))
    expect(win.webContents.capturePage).toHaveBeenCalledTimes(2)
    newCapture.resolve(capturedImage())
    await flush()
    expect(replies(stream).find(({ requestId }) => requestId === 'replacement').data).toBe('cG5n')
    stream.emit('end')
  })

  it('allows independent windows to capture concurrently', async () => {
    const windows = [createWindow(), createWindow()]
    const pending = windows.map(() => deferred())
    windows.forEach((win, index) => win.webContents.capturePage.mockReturnValueOnce(pending[index].promise))
    const captures = windows.map((win) => captureYakitScreenshot(win))
    pending.forEach((capture) => capture.resolve(capturedImage()))
    expect(await Promise.all(captures)).toHaveLength(2)
  })

  it.each(['closed', 'destroyed'])('invalidates a request when the window is %s', async (event) => {
    const win = createWindow()
    const pending = deferred()
    win.webContents.capturePage.mockReturnValueOnce(pending.promise)
    const stream = createStream()
    attachYakitScreenshot(win, stream)
    stream.emit('data', request('destroyed'))
    const eventSource = event === 'closed' ? win : win.webContents
    eventSource.emit(event)
    await flush()
    expect(replies(stream)[0]?.error).toBeTruthy()
    pending.resolve(capturedImage())
    await flush()
    expect(win.webContents.executeJavaScriptInIsolatedWorld).not.toHaveBeenCalled()
    expect(replies(stream)).toHaveLength(1)
    stream.emit('end')
  })

  it('ignores invalid requests and reports oversized images and renderer failures', async () => {
    const win = createWindow()
    const stream = createStream()
    attachYakitScreenshot(win, stream)
    stream.emit('data', { MessageType: 'yakit_screenshot_request', Data: Buffer.from('{') })
    stream.emit('data', request(''))
    expect(win.webContents.capturePage).not.toHaveBeenCalled()
    win.webContents.executeJavaScriptInIsolatedWorld.mockResolvedValueOnce({ data: 'x'.repeat(30 * 1024 * 1024 + 1) })
    stream.emit('data', request('large'))
    await flush()
    expect(replies(stream)[0].error).toContain('transfer limit')
    win.webContents.executeJavaScriptInIsolatedWorld.mockRejectedValueOnce(new Error('renderer failure'))
    stream.emit('data', request('failure'))
    await flush()
    expect(replies(stream)[1].error).toBe('renderer failure')
    stream.emit('end')
  })

  it('cleans request timers once when terminal stream events arrive together', async () => {
    vi.useFakeTimers()
    const win = createWindow()
    const pending = deferred()
    win.webContents.capturePage.mockReturnValueOnce(pending.promise)
    const stream = createStream()
    attachYakitScreenshot(win, stream)
    stream.emit('data', request('closed'))
    stream.emit('end')
    stream.emit('error', new Error('cancelled'))
    stream.emit('close')
    await vi.advanceTimersByTimeAsync(0)
    expect(vi.getTimerCount()).toBe(0)
    pending.reject(new Error('late native error'))
    await vi.advanceTimersByTimeAsync(0)
    expect(replies(stream)).toEqual([])
    expect(stream.listenerCount('data')).toBe(0)
    expect(win.webContents.eventNames()).toEqual([])
  })
})
