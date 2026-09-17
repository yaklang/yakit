import { ipcRenderer } from 'electron'
import { transport } from './transport'

// Sandboxed preloads cannot require local helpers; keep this bounded responder in both entry points.
// It returns counters only, never a heap snapshot or application content.
ipcRenderer.on('renderer-diagnostics:memory', (_event, nonce) => {
  if (typeof nonce !== 'string' || nonce.length > 64) return
  try {
    const heap = process.getHeapStatistics()
    const blink = process.getBlinkMemoryInfo()
    ipcRenderer.send('renderer-diagnostics:memory', nonce, {
      usedHeapKB: Math.round(heap.usedHeapSize / 1024),
      heapLimitKB: Math.round(heap.heapSizeLimit / 1024),
      availableHeapKB: Math.round(heap.totalAvailableSize / 1024),
      blinkAllocatedKB: Math.round(blink.allocated / 1024),
      blinkTotalKB: Math.round(blink.total / 1024),
    })
  } catch {
    ipcRenderer.send('renderer-diagnostics:memory', nonce, null)
  }
})

Object.assign(window, {
  yakitTransport: transport,
  yakitDebugHooks: process.argv.includes('--yakit-mitm-debug-hooks=1'),
})
