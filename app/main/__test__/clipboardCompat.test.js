// @vitest-environment node
import { readFileSync } from 'node:fs'
import { EventEmitter } from 'node:events'
import vm from 'node:vm'
import { describe, expect, it, vi } from 'vitest'

const load = (electron) => {
  const module = { exports: {} }
  vm.runInNewContext(readFileSync(new URL('../clipboardCompat.js', import.meta.url), 'utf8'), {
    module,
    Buffer,
    Blob,
    require: (id) => {
      if (id !== 'electron') throw new Error(`Unexpected dependency: ${id}`)
      return electron
    },
  })
  return module.exports
}

describe('clipboard compatibility', () => {
  it('uses the Electron 22 image methods', async () => {
    const image = { isEmpty: () => false }
    const clipboard = { readImage: vi.fn(() => image), writeImage: vi.fn() }
    const nativeImage = { createFromBuffer: vi.fn(() => image) }
    const api = load({ clipboard, nativeImage })

    expect(await api.readClipboardImage()).toBe(image)
    await api.writeClipboardImage(Uint8Array.from([1, 2]))
    expect(nativeImage.createFromBuffer).toHaveBeenCalledWith(Buffer.from([1, 2]))
    expect(clipboard.writeImage).toHaveBeenCalledWith(image)
  })

  it('reads Electron 44 image blobs and returns an empty image for text-only clipboard data', async () => {
    const image = { image: true }
    const empty = { empty: true }
    const getType = vi.fn(async () => new Blob([Uint8Array.from([1, 2])], { type: 'image/png' }))
    const clipboard = { read: vi.fn(async () => [{ types: ['text/plain', 'image/png'], getType }]) }
    const nativeImage = { createFromBuffer: vi.fn(() => image), createEmpty: vi.fn(() => empty) }
    const api = load({ clipboard, nativeImage })

    expect(await api.readClipboardImage()).toBe(image)
    expect(getType).toHaveBeenCalledWith('image/png')
    expect(nativeImage.createFromBuffer).toHaveBeenCalledWith(Buffer.from([1, 2]))
    clipboard.read.mockResolvedValue([{ types: ['text/plain'] }])
    expect(await api.readClipboardImage()).toBe(empty)
  })

  it('writes PNG data through Electron 44 and propagates clipboard failures', async () => {
    class ClipboardItem {
      constructor(data) {
        this.data = data
      }
    }
    const clipboard = { write: vi.fn(async () => {}) }
    const nativeImage = { createFromBuffer: vi.fn(() => ({ toPNG: () => Buffer.from([3, 4]) })) }
    const api = load({ clipboard, ClipboardItem, nativeImage })

    await api.writeClipboardImage(Uint8Array.from([1, 2]))
    const blob = clipboard.write.mock.calls[0][0][0].data['image/png']
    expect(Buffer.from(await blob.arrayBuffer())).toEqual(Buffer.from([3, 4]))
    clipboard.write.mockRejectedValue(new Error('clipboard unavailable'))
    await expect(api.writeClipboardImage(Uint8Array.from([1]))).rejects.toThrow('clipboard unavailable')
  })
})

describe('clipboard IPC', () => {
  it('propagates asynchronous text write failures for both IPC namespaces', async () => {
    const handlers = {}
    const clipboard = { writeText: vi.fn().mockRejectedValue(new Error('clipboard unavailable')) }
    const module = { exports: {} }
    vm.runInNewContext(readFileSync(new URL('../utils/clipboard.js', import.meta.url), 'utf8'), {
      module,
      require: (id) => {
        if (id === 'electron') return { ipcMain: { handle: (name, handler) => (handlers[name] = handler) }, clipboard }
        if (id === '../clipboardCompat') return { readClipboardImage: vi.fn() }
        throw new Error(`Unexpected dependency: ${id}`)
      },
    })
    module.exports.register()
    module.exports.registerNewIPC(null, null, 'link-')
    await expect(handlers['set-clipboard-text']({}, 'text')).rejects.toThrow('clipboard unavailable')
    await expect(handlers['link-set-clipboard-text']({}, 'text')).rejects.toThrow('clipboard unavailable')
  })

  it('finishes screenshots only after copying and reports write failures', async () => {
    const handlers = {}
    const writeClipboardImage = vi.fn()
    const dialog = { showErrorBox: vi.fn() }
    const logger = { error: vi.fn() }
    const module = { exports: {} }
    class BrowserView {
      webContents = { loadFile: vi.fn() }
    }
    class Event {
      defaultPrevented = false
    }
    vm.runInNewContext(readFileSync(new URL('../screenshots/index.js', import.meta.url), 'utf8'), {
      module,
      console: logger,
      require: (id) => {
        if (id === '../runtimePaths') return { appResourcePath: () => '', preloadPath: () => '' }
        if (id === 'electron') {
          return {
            BrowserView,
            dialog,
            ipcMain: { once: vi.fn(), on: (name, handler) => (handlers[name] = handler) },
          }
        }
        if (id === '../clipboardCompat') return { writeClipboardImage }
        if (id === 'events') return EventEmitter
        if (id === './event') return Event
        if (id === './nodeScreenshots') return {}
        if (['fs-extra', './getDisplay', './padStart'].includes(id)) return {}
        throw new Error(`Unexpected dependency: ${id}`)
      },
    })
    const screenshots = new module.exports({})
    screenshots.endCapture = vi.fn()
    const copied = vi.fn()
    screenshots.on('copied', copied)
    let resolveWrite
    writeClipboardImage.mockReturnValueOnce(new Promise((resolve) => (resolveWrite = resolve)))
    const copying = handlers['SCREENSHOTS:ok']({}, Buffer.from([1]), {})
    expect(screenshots.endCapture).not.toHaveBeenCalled()
    expect(copied).not.toHaveBeenCalled()
    resolveWrite()
    await copying
    expect(screenshots.endCapture).toHaveBeenCalledOnce()
    expect(copied).toHaveBeenCalledOnce()

    screenshots.endCapture.mockClear()
    copied.mockClear()
    const cancelled = vi.fn()
    screenshots.on('cancel', cancelled)
    writeClipboardImage.mockRejectedValueOnce(new Error('clipboard unavailable'))
    await handlers['SCREENSHOTS:ok']({}, Buffer.from([1]), {})
    expect(screenshots.endCapture).toHaveBeenCalledOnce()
    expect(copied).not.toHaveBeenCalled()
    expect(cancelled).toHaveBeenCalledOnce()
    expect(dialog.showErrorBox).toHaveBeenCalledWith('截图复制失败', 'Error: clipboard unavailable')
    expect(logger.error).toHaveBeenCalled()
  })
})
