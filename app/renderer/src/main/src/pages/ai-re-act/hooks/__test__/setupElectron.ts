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
  ipcRendererMock.on.mockClear()
  ipcRendererMock.off.mockClear()
  ipcRendererMock.removeAllListeners.mockClear()
  ipcRendererMock.send.mockClear()
  ipcRendererMock.invoke.mockClear()
  ipcRendererMock.invoke.mockResolvedValue(undefined)
}
