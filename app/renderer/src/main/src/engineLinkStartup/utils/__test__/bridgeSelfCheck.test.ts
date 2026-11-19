import { beforeEach, describe, expect, it, vi } from 'vitest'
import { checkLinkBridgeCapabilities } from '../bridgeSelfCheck'

const mocks = vi.hoisted(() => ({
  getEngineLinkBridge: vi.fn(),
}))

vi.mock('../electronBridge', () => ({
  getEngineLinkBridge: mocks.getEngineLinkBridge,
}))

const fullBridge = () => ({
  app: { generateStartEngine: vi.fn(), onSync: vi.fn() },
  cache: { getLocalCache: vi.fn() },
  clipboard: { setText: vi.fn() },
  dialog: { openFileSystemDialog: vi.fn() },
  fileSystem: { fetchFileContent: vi.fn(), fetchFileInfoByPath: vi.fn() },
  logs: { debugPrintLog: vi.fn() },
  release: { setEditionRaw: vi.fn() },
  theme: { setTheme: vi.fn() },
})

beforeEach(() => {
  mocks.getEngineLinkBridge.mockReset()
  vi.spyOn(console, 'error').mockImplementation(() => undefined)
})

describe('checkLinkBridgeCapabilities', () => {
  it('能力齐全时不报错', () => {
    mocks.getEngineLinkBridge.mockReturnValue(fullBridge())

    expect(checkLinkBridgeCapabilities()).toEqual([])
    expect(console.error).not.toHaveBeenCalled()
  })

  it('缺失能力时返回并输出缺失项', () => {
    const bridge: any = fullBridge()
    bridge.app.onSync = undefined
    bridge.fileSystem.fetchFileInfoByPath = undefined
    mocks.getEngineLinkBridge.mockReturnValue(bridge)

    expect(checkLinkBridgeCapabilities()).toEqual(['app.onSync', 'fileSystem.fetchFileInfoByPath'])
    expect(console.error).toHaveBeenCalledWith(
      '[engine-link] missing bridge capabilities: app.onSync, fileSystem.fetchFileInfoByPath',
    )
  })

  it('bridge 不存在时报告 yakitBridge', () => {
    mocks.getEngineLinkBridge.mockReturnValue(undefined)

    expect(checkLinkBridgeCapabilities()).toEqual(['yakitBridge'])
  })
})
