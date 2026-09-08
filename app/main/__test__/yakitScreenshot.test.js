import { EventEmitter } from 'events'
import { afterEach, describe, expect, it, vi } from 'vitest'
import screenshot from '../yakitScreenshot'

const { attachYakitScreenshot, captureYakitScreenshot, formatLocalCaptureTime } = screenshot
const request = (requestId) => ({
  MessageType: 'yakit_screenshot_request',
  Data: Buffer.from(JSON.stringify({ requestId })),
})
const createWindow = () => ({
  isDestroyed: () => false,
  getContentSize: () => [800, 600],
  webContents: {
    isDestroyed: () => false,
    capturePage: vi.fn().mockResolvedValue({ isEmpty: () => false, toPNG: () => Buffer.from('png') }),
    executeJavaScriptInIsolatedWorld: vi.fn().mockResolvedValue({
      data: 'cG5n',
      capturedAt: '2026-09-08 12:34:56 +08:00',
      width: 800,
      height: 600,
    }),
  },
})
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
})
