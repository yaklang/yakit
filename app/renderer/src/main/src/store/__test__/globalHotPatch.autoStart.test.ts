const { ipcRendererMock } = vi.hoisted(() => {
  const ipcRendererMock = {
    invoke: vi.fn(),
    on: vi.fn(),
    removeAllListeners: vi.fn(),
  }
  ;(window as unknown as { require: (id: string) => unknown }).require = (id: string) => {
    if (id === 'electron') return { ipcRenderer: ipcRendererMock }
    return {}
  }
  return { ipcRendererMock }
})

import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/utils/notification', () => ({
  yakitFailed: vi.fn(),
  yakitNotify: vi.fn(),
}))

import { yakitFailed } from '@/utils/notification'
import {
  autoEnableGlobalHotPatch,
  DEFAULT_GLOBAL_TEMPLATES,
  GLOBAL_HOT_PATCH_AUTO_START,
  useGlobalHotPatch,
} from '../globalHotPatch'

const savedConfig = { Enabled: false, Version: '3', Items: [] }
const defaultAutoStartTemplate = '[全局] HTTP流量测试项打标'

describe('autoEnableGlobalHotPatch', () => {
  beforeEach(() => {
    vi.mocked(yakitFailed).mockClear()
    ipcRendererMock.invoke.mockReset()
    useGlobalHotPatch.setState({ globalHotPatchConfig: null })
  })

  it('每次启动都保存并启用 HTTP 流量测试项模板', async () => {
    ipcRendererMock.invoke.mockImplementation(async (channel: string) => {
      if (channel === 'QueryHotPatchTemplate') return { Data: [{ Name: defaultAutoStartTemplate }] }
      if (channel === 'GetGlobalHotPatchConfig') return savedConfig
      if (channel === 'SetGlobalHotPatchConfig') return { ...savedConfig, Enabled: true }
      return undefined
    })

    await autoEnableGlobalHotPatch()

    expect(ipcRendererMock.invoke).toHaveBeenCalledWith('SetKey', {
      Key: GLOBAL_HOT_PATCH_AUTO_START,
      Value: defaultAutoStartTemplate,
    })
    expect(ipcRendererMock.invoke).toHaveBeenCalledWith('SetGlobalHotPatchConfig', {
      Config: {
        Enabled: true,
        Version: '3',
        Items: [{ Name: defaultAutoStartTemplate, Type: 'global', Enabled: true }],
      },
      ExpectedVersion: '3',
    })
    expect(ipcRendererMock.invoke).not.toHaveBeenCalledWith('GetKey', {
      Key: GLOBAL_HOT_PATCH_AUTO_START,
    })
  })

  it('模板不存在时从默认模板创建', async () => {
    ipcRendererMock.invoke.mockImplementation(async (channel: string) => {
      if (channel === 'QueryHotPatchTemplate') return { Data: [] }
      if (channel === 'GetGlobalHotPatchConfig') return null
      return undefined
    })

    await autoEnableGlobalHotPatch()

    expect(ipcRendererMock.invoke).toHaveBeenCalledWith('CreateHotPatchTemplate', {
      Type: 'global',
      Content: DEFAULT_GLOBAL_TEMPLATES.find((item) => item.name === defaultAutoStartTemplate)?.content,
      Name: defaultAutoStartTemplate,
      Tags: [],
    })
    expect(ipcRendererMock.invoke).not.toHaveBeenCalledWith('SetGlobalHotPatchConfig', expect.anything())
  })

  it('全局配置还没加载成功时不启用', async () => {
    ipcRendererMock.invoke.mockImplementation(async (channel: string) => {
      if (channel === 'QueryHotPatchTemplate') return { Data: [{ Name: defaultAutoStartTemplate }] }
      if (channel === 'GetGlobalHotPatchConfig') return null
      return undefined
    })

    await autoEnableGlobalHotPatch()

    expect(ipcRendererMock.invoke).toHaveBeenCalledWith('GetGlobalHotPatchConfig', {})
    expect(ipcRendererMock.invoke).not.toHaveBeenCalledWith('SetGlobalHotPatchConfig', expect.anything())
  })

  it('模板仍在且配置可读时，用保存的名字启用全局热加载', async () => {
    ipcRendererMock.invoke.mockImplementation(async (channel: string) => {
      if (channel === 'QueryHotPatchTemplate') return { Data: [{ Name: defaultAutoStartTemplate }] }
      if (channel === 'GetGlobalHotPatchConfig') return savedConfig
      if (channel === 'SetGlobalHotPatchConfig') return { ...savedConfig, Enabled: true }
      return undefined
    })

    await autoEnableGlobalHotPatch()

    expect(ipcRendererMock.invoke).toHaveBeenCalledWith('SetGlobalHotPatchConfig', {
      Config: {
        Enabled: true,
        Version: '3',
        Items: [{ Name: defaultAutoStartTemplate, Type: 'global', Enabled: true }],
      },
      ExpectedVersion: '3',
    })
    expect(ipcRendererMock.invoke).toHaveBeenCalledWith('SetKey', {
      Key: GLOBAL_HOT_PATCH_AUTO_START,
      Value: defaultAutoStartTemplate,
    })
    expect(yakitFailed).not.toHaveBeenCalled()
  })

  it('读取自启动配置失败时提示错误', async () => {
    ipcRendererMock.invoke.mockRejectedValueOnce(new Error('kv down'))

    await autoEnableGlobalHotPatch()

    expect(yakitFailed).toHaveBeenCalledWith('Error: kv down')
    expect(ipcRendererMock.invoke).not.toHaveBeenCalledWith('SetGlobalHotPatchConfig', expect.anything())
  })
})
