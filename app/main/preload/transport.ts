import { ipcRenderer } from 'electron'
import { EVENT_CHANNEL, REQUEST_CHANNEL, type BridgeEvent, type Transport } from '../../shared/communication/protocol'

const subscribers = new Set<(event: BridgeEvent) => void>()
const receive = (_event: Electron.IpcRendererEvent, payload: BridgeEvent) => {
  for (const listener of [...subscribers]) listener(payload)
}

export const transport: Transport = {
  request: (request) => ipcRenderer.invoke(REQUEST_CHANNEL, request),
  subscribe(listener) {
    if (!subscribers.size) ipcRenderer.on(EVENT_CHANNEL, receive)
    subscribers.add(listener)
    return () => {
      subscribers.delete(listener)
      if (!subscribers.size) ipcRenderer.removeListener(EVENT_CHANNEL, receive)
    }
  },
}
