import { createClient } from '../shared/communication/client'
import type { LocalMethods, ScreenshotData } from '../shared/communication/local-methods'
import type { Transport } from '../shared/communication/protocol'

declare global {
  interface Window {
    yakitTransport?: Transport
  }
}
if (!window.yakitTransport) throw new Error('Screenshot transport is unavailable')
const ipc = createClient<LocalMethods>(window.yakitTransport)
type Callback = (...args: unknown[]) => void
const listeners = new Map<Callback, Map<string, () => void>>()
const resetIds: string[] = []
const report = (error: unknown) => console.error('Screenshot operation failed', error)

// The bundled screenshot UI expects this interface. It lives in the renderer;
// preload exposes only the shared transport, without business methods.
Object.assign(window, {
  screenshots: {
    ready: () => {
      void ipc.invoke('local', 'ScreenshotReady', {}).catch(report)
    },
    reset: () => {
      const resetId = resetIds.shift()
      if (resetId) void ipc.invoke('local', 'ScreenshotReset', { resetId }).catch(report)
    },
    cancel: () => {
      void ipc.invoke('local', 'ScreenshotCancel', {}).catch(report)
    },
    ok: (buffer: ArrayBuffer, data: ScreenshotData) => {
      void ipc.invoke('local', 'ScreenshotOK', { buffer: new Uint8Array(buffer), data }).catch(report)
    },
    save: (buffer: ArrayBuffer, data: ScreenshotData) => {
      void ipc.invoke('local', 'ScreenshotSave', { buffer: new Uint8Array(buffer), data }).catch(report)
    },
    on: (channel: string, callback: Callback) => {
      if (!['setLang', 'capture', 'reset'].includes(channel)) throw new Error('Invalid screenshot event')
      const entries = listeners.get(callback) ?? new Map<string, () => void>()
      entries.get(channel)?.()
      entries.set(
        channel,
        ipc.on(`SCREENSHOTS:${channel}`, (...args) => {
          if (channel === 'reset' && typeof args[0] === 'string') resetIds.push(args[0])
          callback(...args)
        }),
      )
      listeners.set(callback, entries)
    },
    off: (channel: string, callback: Callback) => {
      const entries = listeners.get(callback)
      entries?.get(channel)?.()
      entries?.delete(channel)
      if (!entries?.size) listeners.delete(callback)
    },
  },
})
window.addEventListener(
  'pagehide',
  () => {
    ipc.dispose()
    listeners.clear()
    resetIds.length = 0
  },
  { once: true },
)
