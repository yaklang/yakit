// @vitest-environment node
import { describe, expect, it, vi } from 'vitest'
import fs from 'node:fs'
import vm from 'node:vm'
import { EventEmitter } from 'node:events'

describe.each(['preload.js', 'engineLinkPreload.js'])('%s memory counters', (file) => {
  function load() {
    const ipcRenderer = Object.assign(new EventEmitter(), { send: vi.fn() })
    const process = Object.assign(new EventEmitter(), {
      argv: [],
      getHeapStatistics: vi.fn(() => ({ usedHeapSize: 100, heapSizeLimit: 1024, totalAvailableSize: 800 })),
      getBlinkMemoryInfo: vi.fn(() => ({ allocated: 10, total: 20 })),
    })
    const context = {
      process,
      window: { addEventListener: vi.fn() },
      require: (name) => {
        if (name !== 'electron') throw new Error('Sandboxed preload cannot require local modules')
        return { ipcRenderer, contextBridge: { exposeInMainWorld: vi.fn() } }
      },
    }
    vm.runInNewContext(fs.readFileSync(new URL(`../${file}`, import.meta.url), 'utf8'), context)
    return { ipcRenderer, process }
  }

  it('samples on demand in the sandbox before UI readiness, returning only numeric counters', () => {
    const { ipcRenderer, process } = load()
    expect(process.getHeapStatistics).not.toHaveBeenCalled()
    ipcRenderer.emit('renderer-diagnostics:memory', {}, 'nonce')
    expect(ipcRenderer.send).toHaveBeenCalledWith('renderer-diagnostics:memory', 'nonce', {
      usedHeapKB: 100,
      heapLimitKB: 1024,
      availableHeapKB: 800,
      blinkAllocatedKB: 10,
      blinkTotalKB: 20,
    })
  })

  it('rejects malformed requests and survives unavailable native counters', () => {
    const { ipcRenderer, process } = load()
    ipcRenderer.emit('renderer-diagnostics:memory', {}, {})
    ipcRenderer.emit('renderer-diagnostics:memory', {}, 'x'.repeat(65))
    expect(process.getHeapStatistics).not.toHaveBeenCalled()
    process.getHeapStatistics.mockImplementation(() => {
      throw new Error('unavailable')
    })
    ipcRenderer.emit('renderer-diagnostics:memory', {}, 'nonce')
    expect(ipcRenderer.send).toHaveBeenCalledWith('renderer-diagnostics:memory', 'nonce', null)
  })
})
