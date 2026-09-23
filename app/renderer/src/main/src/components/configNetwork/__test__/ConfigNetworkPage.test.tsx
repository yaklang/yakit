import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { setRemoteValue, getRemoteValue } from '@/utils/kv'
import { GlobalConfigRemoteGV } from '@/enums/globalConfig'
import { ConfigNetworkPage, defaultParams } from '../ConfigNetworkPage'

const KEY = GlobalConfigRemoteGV.HTTPFlowListInlineMaxContentLength

const mocks = vi.hoisted(() => {
  const invoke = vi.fn()
  window.require = (() => ({ ipcRenderer: { invoke } })) as unknown as typeof window.require
  const remoteStore = new Map<string, string>()
  return { invoke, remoteStore }
})

vi.mock('@/utils/kv', () => ({
  getLocalValue: () => Promise.resolve(undefined),
  setLocalValue: () => Promise.resolve(),
  getRemoteValue: vi.fn((k: string) => Promise.resolve(mocks.remoteStore.get(k) ?? '')),
  setRemoteValue: vi.fn((k: string, v: string) => {
    mocks.remoteStore.set(k, v)
    return Promise.resolve()
  }),
}))
vi.mock('@/i18n/useI18nNamespaces', () => ({
  useI18nNamespaces: () => ({
    t: (key: string) => key,
    i18n: { language: 'zh-CN' },
    i18nRefresh: () => {},
  }),
}))
vi.mock('@/utils/notification', () => ({
  yakitInfo: vi.fn(),
  warn: vi.fn(),
  failed: vi.fn(),
  success: vi.fn(),
  yakitNotify: vi.fn(),
}))
vi.mock('@/utils/envfile', async (importOriginal) => {
  const actual = (await importOriginal()) as Record<string, unknown>
  return { ...actual, getReleaseEditionName: () => 'Yakit', isIRify: () => false }
})
vi.mock('@/utils/duplex/duplex', () => ({ setOpenPerformanceTips: vi.fn() }))
vi.mock('@/hook/useProxy', () => ({
  useProxy: () => ({ proxyConfig: { Routes: [], Endpoints: [] } }),
}))
vi.mock('@/utils/proxyConfigUtil', () => ({ checkProxyVersion: async () => true }))
vi.mock('@/pages/ai-re-act/hooks/useAIGlobalConfig', () => ({
  default: () => [{ aiGlobalConfig: {} }, { onRefresh: vi.fn() }],
}))
vi.mock('@/pages/ai-agent/aiModelList/AIModelList', () => ({ getTipByType: () => '' }))
vi.mock('@/pages/ai-agent/defaultConstant', () => ({ AIModelPolicyOptions: [] }))
vi.mock('@/pages/spaceEngine/utils', () => ({ handleAIConfig: vi.fn() }))
vi.mock('../CustomizeCode', () => ({ CodeCustomize: () => null }))
vi.mock('../ProxyRulesConfig', () => ({ default: () => null }))
vi.mock('@/pages/mitm/MITMServerStartForm/MITMAddTLS', () => ({
  InputCertificateForm: () => <div>cert-form</div>,
}))

beforeEach(() => {
  mocks.invoke.mockReset().mockImplementation((channel: string) => {
    switch (channel) {
      case 'GetGlobalNetworkConfig':
        return Promise.resolve({ ...defaultParams, MaxContentLength: 10 * 1024 * 1024 })
      case 'GetChromePath':
        return Promise.resolve('')
      case 'fetch-extra-cache':
        return Promise.resolve(true)
      default:
        return Promise.resolve(undefined)
    }
  })
  mocks.remoteStore.clear()
  vi.mocked(getRemoteValue).mockClear()
  vi.mocked(setRemoteValue).mockClear()
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe() {}
      disconnect() {}
      unobserve() {}
    },
  )
  vi.stubGlobal(
    'IntersectionObserver',
    class {
      observe() {}
      disconnect() {}
      unobserve() {}
      takeRecords() {
        return []
      }
    },
  )
  vi.stubGlobal(
    'matchMedia',
    vi.fn(() => ({
      matches: false,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })),
  )
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

/** 通过设置行标题定位「列表内联包大小」输入框 */
const getListInlineInput = () => {
  // 标题本身也是 div，不能用 closest；先到 setting-row-text 再回到整行
  const row = screen.getByText('ConfigNetworkPage.listInlinePacketSize').parentElement?.parentElement
  return row?.querySelector('input') as HTMLInputElement
}

const renderPage = async () => {
  render(<ConfigNetworkPage />)
  const input = await waitFor(() => {
    const el = getListInlineInput()
    expect(el).toBeTruthy()
    return el
  })
  return input
}

describe('ConfigNetworkPage 列表内联包大小设置', () => {
  it.each<[string, string, string | undefined]>([
    ['key 缺失（回退默认）', '300', undefined],
    ['0 字节（不带包）', '0', '0'],
    ['307200 字节（300K）', '300', '307200'],
    ['512000 字节（500K）', '500', '512000'],
    ['超过 500K（钳制为 500）', '500', '1024000'],
    ['非法值（回退默认 300）', '300', 'abc'],
  ])('读取持久化值 %s → 输入框显示 %s K', async (_name, expected, raw) => {
    if (raw !== undefined) mocks.remoteStore.set(KEY, raw)
    const input = await renderPage()
    // 先确认加载副作用确实读取了该 key，再断言换算后的展示值，
    // 避免「absent key」用例被初始 state=300 撞对而假通过
    await waitFor(() => expect(getRemoteValue).toHaveBeenCalledWith(KEY))
    await waitFor(() => expect(input.value).toBe(expected))
  })

  it('保存时把 KB 换算为字节写入持久化：0→0、300→307200、500→512000、999→512000', async () => {
    const input = await renderPage()
    const submit = () => screen.getByText('ConfigNetworkPage.updateGlobalConfig')

    fireEvent.change(input, { target: { value: '0' } })
    fireEvent.click(submit())
    await waitFor(() => expect(setRemoteValue).toHaveBeenCalledWith(KEY, '0'))

    fireEvent.change(input, { target: { value: '300' } })
    fireEvent.click(submit())
    await waitFor(() => expect(setRemoteValue).toHaveBeenCalledWith(KEY, '307200'))

    fireEvent.change(input, { target: { value: '500' } })
    fireEvent.click(submit())
    await waitFor(() => expect(setRemoteValue).toHaveBeenCalledWith(KEY, '512000'))

    fireEvent.change(input, { target: { value: '999' } })
    fireEvent.click(submit())
    await waitFor(() => expect(setRemoteValue).toHaveBeenCalledWith(KEY, '512000'))
    await waitFor(() => expect(input.value).toBe('500'))
    expect(mocks.remoteStore.get(KEY)).toBe('512000')
  })

  it('重置后写回默认 307200 字节并显示 300K', async () => {
    mocks.remoteStore.set(KEY, '512000')
    const input = await renderPage()
    await waitFor(() => expect(input.value).toBe('500'))

    fireEvent.click(screen.getByText('ConfigNetworkPage.reset'))
    fireEvent.click(await screen.findByText('YakitButton.ok'))

    await waitFor(() => expect(setRemoteValue).toHaveBeenCalledWith(KEY, '307200'))
    await waitFor(() => expect(input.value).toBe('300'))
    expect(mocks.remoteStore.get(KEY)).toBe('307200')
  })
})
