import { vi } from 'vitest'

/** 在导入客户端 IPC 模块前提供边界 stub；不加载或启动真实 Electron / 引擎。 */
export const ipcRendererMock = {
  on: vi.fn(),
  off: vi.fn(),
  removeAllListeners: vi.fn(),
  send: vi.fn(),
  invoke: vi.fn().mockResolvedValue(undefined),
}

// 部分兼容模块在加载时读取 bridge 分组；具体调用由各测试显式 mock。
window.yakitBridge = { release: { setEditionRaw: vi.fn().mockResolvedValue(undefined) } } as unknown as YakitBridge
;(window as unknown as { require: (name: string) => unknown }).require = (name) => {
  if (name !== 'electron') throw new Error(`Unexpected require: ${name}`)
  return { ipcRenderer: ipcRendererMock }
}

export const resetIpcMocks = () => {
  ipcRendererMock.invoke.mockReset().mockResolvedValue(undefined)
  ipcRendererMock.on.mockClear()
  ipcRendererMock.removeAllListeners.mockClear()
}
