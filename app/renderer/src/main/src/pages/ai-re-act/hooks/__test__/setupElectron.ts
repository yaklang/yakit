/**
 * 在导入 ChatMultiSessionController / AIAgentLogEmitter 之前加载本文件，
 * 避免顶层 window.require('electron') 在 jsdom 中抛错。
 */
import { vi } from 'vitest'

export const ipcRendererMock = {
  on: vi.fn(),
  off: vi.fn(),
  removeAllListeners: vi.fn(),
  send: vi.fn(),
  invoke: vi.fn().mockResolvedValue(undefined),
}

const electronStub = { ipcRenderer: ipcRendererMock }

;(window as unknown as { require: (id: string) => unknown }).require = (id: string) => {
  if (id === 'electron') return electronStub
  throw new Error(`Unexpected require: ${id}`)
}

export const resetIpcMocks = () => {
  sdkMock.invoke.mockReset()
  sdkMock.invoke.mockResolvedValue(undefined)
  sdkMock.openStream.mockClear()
  sdkMock.write.mockClear()
  sdkMock.cancel.mockClear()
  ipcRendererMock.on.mockClear()
  ipcRendererMock.off.mockClear()
  ipcRendererMock.removeAllListeners.mockClear()
  ipcRendererMock.send.mockClear()
  ipcRendererMock.invoke.mockClear()
  ipcRendererMock.invoke.mockResolvedValue(undefined)
}

const bridgeMocks = vi.hoisted(() => ({
  invoke: vi.fn().mockResolvedValue(undefined),
  openStream: vi.fn(),
  write: vi.fn().mockResolvedValue(undefined),
  cancel: vi.fn().mockResolvedValue(undefined),
}))
vi.mock('@/services/ipc', () => ({ ipc: bridgeMocks }))
export const sdkMock = bridgeMocks
sdkMock.openStream.mockImplementation(async (_namespace, _api, _params, options) => {
  const token = options.token
  options.signal.addEventListener('abort', () => sdkMock.cancel(token), { once: true })
  return {
    token,
    instanceId: `instance-${token}`,
    write: (params: unknown) => sdkMock.write(token, params),
    cancel: () => sdkMock.cancel(token),
  }
})
