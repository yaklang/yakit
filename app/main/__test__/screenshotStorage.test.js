// @vitest-environment node
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import vm from 'node:vm'
import { createRequire } from 'node:module'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const require = createRequire(import.meta.url)
let directory

const loadBridge = () => {
  const handlers = new Map()
  const config = {}
  const win = {}
  const capture = vi.fn().mockResolvedValue({
    data: Buffer.from('watermarked PNG').toString('base64'),
    capturedAt: '2026-11-10 12:34:56 +08:00',
    width: 800,
    height: 600,
  })
  const select = vi.fn()
  const open = vi.fn().mockResolvedValue('')
  const persist = vi.fn((key, value) => {
    config[key] = value
    return true
  })
  const context = {
    module: { exports: {} },
    Buffer,
    AbortController,
    setTimeout,
    clearTimeout,
    require: (name) => {
      if (name === 'electron') {
        return {
          ipcMain: { handle: (channel, callback) => handlers.set(channel, callback) },
          dialog: { showOpenDialog: select },
          shell: { openPath: open },
        }
      }
      if (name === '../filePath') return { getYakitHome: () => directory, getConfig: () => config, setConfig: persist }
      if (name === '../yakitScreenshot') return { captureYakitScreenshot: capture }
      if (name === '../security') return require('../security')
      if (name === 'crypto') return { randomUUID: () => 'fixed-id' }
      return require(name)
    },
  }
  vm.runInNewContext(fs.readFileSync(new URL('../utils/screenshot.js', import.meta.url), 'utf8'), context)
  context.module.exports.register(win)
  const invoke = (channel, ...args) =>
    handlers.get(channel)({ senderFrame: { url: 'file:///yakit/index.html' } }, ...args)
  let loaded
  const preload = {
    process: { argv: [], on: (_event, callback) => (loaded = callback) },
    window: { addEventListener: vi.fn() },
    require: () => ({ ipcRenderer: { invoke, on: vi.fn() } }),
  }
  vm.runInNewContext(fs.readFileSync(new URL('../preload.js', import.meta.url), 'utf8'), preload)
  loaded()
  return { bridge: preload.window.yakitBridge.screenshot, capture, select, open, persist, config, handlers, win }
}

beforeEach(() => {
  directory = fs.mkdtempSync(path.join(os.tmpdir(), 'yakit-screenshot-test-'))
})

afterEach(() => {
  vi.useRealTimers()
  fs.rmSync(directory, { recursive: true, force: true })
})

describe('desktop screenshot storage through the preload bridge', () => {
  it('saves original watermarked bytes under local screenshots without returning image data or overwriting', async () => {
    const { bridge, capture, win } = loadBridge()
    expect((await bridge.getSettings()).directory).toBe(path.join(directory, 'screenshots'))
    const result = await bridge.captureAndSave()
    expect(capture).toHaveBeenCalledWith(win, expect.any(AbortSignal), {
      watermarkEnabled: true,
      watermarkPosition: 'bottom-left',
    })
    expect(result.path).toBe(path.join(directory, 'screenshots', 'screenshot-2026-11-10-12-34-56-fixed-id.png'))
    expect(fs.readFileSync(result.path, 'utf8')).toBe('watermarked PNG')
    expect(result).not.toHaveProperty('data')
    await expect(bridge.captureAndSave()).rejects.toMatchObject({ code: 'EEXIST' })
    expect(fs.readFileSync(result.path, 'utf8')).toBe('watermarked PNG')
  })

  it('persists a selected folder, keeps it on cancellation, saves there, and restores the workspace default', async () => {
    const { bridge, select, persist, win } = loadBridge()
    const custom = path.join(directory, 'custom')
    select.mockResolvedValue({ canceled: false, filePaths: [custom] })
    expect((await bridge.selectDirectory()).directory).toBe(custom)
    expect(select).toHaveBeenCalledWith(
      win,
      expect.objectContaining({ properties: ['openDirectory', 'createDirectory'] }),
    )
    expect(persist).toHaveBeenCalledWith('screenshotDirectory', custom)
    expect(path.dirname((await bridge.captureAndSave()).path)).toBe(custom)
    select.mockResolvedValue({ canceled: true, filePaths: [] })
    expect(await bridge.selectDirectory()).toBeNull()
    expect((await bridge.getSettings()).directory).toBe(custom)
    expect((await bridge.resetDirectory()).directory).toBe(path.join(directory, 'screenshots'))
    expect(fs.readdirSync(custom)).toHaveLength(1)
  })

  it('reports failed settings writes and filesystem errors without a success response', async () => {
    const { bridge, select, persist, config } = loadBridge()
    select.mockResolvedValue({ canceled: false, filePaths: [directory] })
    persist.mockReturnValue(false)
    await expect(bridge.selectDirectory()).rejects.toThrow('Failed to save')
    await expect(bridge.resetDirectory()).rejects.toThrow('Failed to save')
    const file = path.join(directory, 'blocked')
    fs.writeFileSync(file, 'original')
    config.screenshotDirectory = file
    await expect(bridge.captureAndSave()).rejects.toBeTruthy()
    expect(fs.readFileSync(file, 'utf8')).toBe('original')
  })

  it('persists watermark preferences, keeps the hidden position, and applies them to local captures', async () => {
    const { bridge, capture, config, win } = loadBridge()
    expect(await bridge.getSettings()).toMatchObject({ watermarkEnabled: true, watermarkPosition: 'bottom-left' })
    await bridge.updateWatermark({ watermarkPosition: 'top-right' })
    await bridge.updateWatermark({ watermarkEnabled: false })
    expect(config.screenshotWatermark).toEqual({ enabled: false, position: 'top-right' })
    expect(await bridge.getSettings()).toMatchObject({ watermarkEnabled: false, watermarkPosition: 'top-right' })
    await bridge.captureAndSave()
    expect(capture).toHaveBeenCalledWith(win, expect.any(AbortSignal), {
      watermarkEnabled: false,
      watermarkPosition: 'top-right',
    })
    expect(await bridge.updateWatermark({ watermarkEnabled: true })).toMatchObject({
      watermarkEnabled: true,
      watermarkPosition: 'top-right',
    })
    expect(await bridge.resetDirectory()).toMatchObject({ watermarkEnabled: true, watermarkPosition: 'top-right' })
  })

  it('rejects invalid watermark options and reports persistence failures', async () => {
    const { bridge, persist } = loadBridge()
    for (const options of [null, [], { watermarkEnabled: 'false' }, { watermarkPosition: 'center' }]) {
      await expect(bridge.updateWatermark(options)).rejects.toThrow('Invalid')
    }
    expect(persist).not.toHaveBeenCalled()
    persist.mockReturnValue(false)
    await expect(bridge.updateWatermark({ watermarkEnabled: false })).rejects.toThrow('Failed to save')
    expect(await bridge.getSettings()).toMatchObject({ watermarkEnabled: true })
  })

  it('creates the folder before opening it and propagates shell errors', async () => {
    const { bridge, open } = loadBridge()
    await bridge.openDirectory()
    expect(fs.statSync(path.join(directory, 'screenshots')).isDirectory()).toBe(true)
    expect(open).toHaveBeenCalledWith(path.join(directory, 'screenshots'))
    open.mockResolvedValue('Cannot open folder')
    await expect(bridge.openDirectory()).rejects.toThrow('Cannot open folder')
  })

  it('bounds a stalled capture and does not create a file after cancellation', async () => {
    vi.useFakeTimers()
    const { bridge, capture } = loadBridge()
    capture.mockImplementation(
      (_win, signal) =>
        new Promise((_resolve, reject) => {
          signal.addEventListener('abort', () => reject(signal.reason), { once: true })
        }),
    )
    const pending = expect(bridge.captureAndSave()).rejects.toThrow('timed out')
    await vi.advanceTimersByTimeAsync(10000)
    await pending
    expect(fs.readdirSync(directory)).toEqual([])
    expect(vi.getTimerCount()).toBe(0)
  })

  it('rejects screenshot calls from an untrusted page before capturing', async () => {
    const { handlers, capture } = loadBridge()
    await expect(
      handlers.get('screenshot-capture-and-save')({ senderFrame: { url: 'https://example.com' } }),
    ).rejects.toThrow('untrusted')
    expect(capture).not.toHaveBeenCalled()
  })
})
