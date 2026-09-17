import { createClient } from './client'
import type { Transport } from './protocol'
import type { LocalMethods } from './local-methods'

declare global {
  interface Window {
    yakitTransport?: Transport
    yakitDebugHooks?: boolean
  }
}

let client: ReturnType<typeof createClient<LocalMethods>> | undefined
function getClient() {
  if (!client) {
    if (!window.yakitTransport) throw new Error('Yakit IPC transport is unavailable')
    client = createClient<LocalMethods>(window.yakitTransport)
  }
  return client
}

export const ipc: ReturnType<typeof createClient<LocalMethods>> = {
  get invoke() {
    return getClient().invoke
  },
  get openStream() {
    return getClient().openStream
  },
  get on() {
    return getClient().on
  },
  dispose(options) {
    client?.dispose(options)
    client = undefined
  },
}
