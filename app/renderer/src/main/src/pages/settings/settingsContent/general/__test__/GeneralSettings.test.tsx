import { act, cleanup, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { CacheDropDownGV } from '@/yakitGV'

window.matchMedia = ((query: string) => ({
  matches: false,
  media: query,
  onchange: null,
  addListener: () => undefined,
  removeListener: () => undefined,
  addEventListener: () => undefined,
  removeEventListener: () => undefined,
  dispatchEvent: () => false,
})) as typeof window.matchMedia

const mocks = vi.hoisted(() => ({
  getRemoteValue: vi.fn(),
  setRemoteValue: vi.fn().mockResolvedValue(undefined),
  getOnlineProfile: vi.fn(),
}))

// GeneralSettings 在模块顶层用 fetchEnv() 冻结 isYakitEE，各用例须先设 edition 再 resetModules 重导入
const env = vi.hoisted(() => ({ edition: 'yakit' }))

vi.mock('@/i18n/useI18nNamespaces', () => ({
  useI18nNamespaces: () => ({
    t: (key: string, options?: { size?: string }) => {
      if (key === 'SettingsPage.general.usedSpace') return `used:${options?.size}`
      return key
    },
  }),
}))

vi.mock('@/store', () => ({
  useStore: () => ({ userInfo: { isLogin: false } }),
  useYakitDynamicStatus: () => ({ dynamicStatus: { isDynamicStatus: false } }),
}))

vi.mock('@/utils/kv', () => ({
  getRemoteValue: mocks.getRemoteValue,
  setRemoteValue: mocks.setRemoteValue,
}))

vi.mock('@/utils/envfile', () => ({
  fetchEnv: () => env.edition,
  getRemoteConfigBaseUrlGV: () => 'private-domain-history',
  getRemoteHttpSettingGV: () => 'http-setting',
}))

vi.mock('@/utils/notification', () => ({
  failed: vi.fn(),
  success: vi.fn(),
  warn: vi.fn(),
  yakitNotify: vi.fn(),
}))

vi.mock('@/utils/login', () => ({
  loginOut: vi.fn(),
}))

vi.mock('@/components/layout/utils', () => ({
  useUploadInfoByEnpriTrace: () => [{ startUpload: vi.fn().mockResolvedValue([]) }],
}))

vi.mock('@/pages/ai-re-act/hooks/useAIGlobalConfig', () => ({
  default: () => [{}, { getAIGlobalConfigAfterLogin: vi.fn() }],
}))

vi.mock('@/services/electronBridge', async (importOriginal) => {
  const actual = (await importOriginal()) as Record<string, unknown>
  return {
    ...actual,
    yakitApp: {
      getYakitHomeConfig: vi.fn().mockResolvedValue({ currentHome: '/tmp/yakit-home', YAKIT_HOME: '/tmp/yakit-home' }),
      getDirSize: vi.fn().mockResolvedValue(1024),
    },
    yakitAuth: { onBaseUrlStatus: () => () => undefined, editBaseUrl: vi.fn() },
    yakitCodec: { run: vi.fn() },
    yakitProfile: {
      getOnlineProfile: mocks.getOnlineProfile,
      setOnlineProfile: vi.fn(),
    },
    yakitShell: { openSpecifiedFile: vi.fn() },
    yakitUILayout: { requestSignOut: vi.fn() },
  }
})

const HTTP_SETTING_KEY = 'http-setting'
const PRIVATE_DOMAIN_KEY = 'private-domain-history'
const PROXY_KEY = CacheDropDownGV.ConfigProxy
const BACKFILL = {
  BaseUrl: 'https://www.example.com',
  Proxy: 'http://proxy.example.com:8080',
  user_name: '',
  pwd: '',
}
const STALE_DOMAIN = 'https://old.example.com'
const STALE_PROXY = 'http://old-proxy.example.com:8080'

const deferred = () => {
  let resolve!: (value: string) => void
  const promise = new Promise<string>((r) => {
    resolve = r
  })
  return { promise, resolve }
}

const importGeneralSettings = async () => {
  const { GeneralSettings } = await import('../GeneralSettings')
  return GeneralSettings
}

/** 历史值经 deferred 晚于配置回填返回：回填先落地，再 resolve 历史，模拟延迟到达的时序 */
const renderWithBackfillFirst = async () => {
  const GeneralSettings = await importGeneralSettings()
  const view = render(<GeneralSettings />)
  await waitFor(() => expect(mocks.getOnlineProfile).toHaveBeenCalledTimes(1), { timeout: 3000 })
  await act(async () => {
    await new Promise((r) => setTimeout(r, 0))
  })
  return view
}

/** antd AutoComplete 的搜索 input 不挂 placeholder，按 Form.Item name 派生的 id 定位 */
const expectFieldValues = async (container: HTMLElement, baseUrl: string, proxy: string) => {
  await waitFor(
    () => {
      const domain = container.querySelector('#BaseUrl') as HTMLInputElement
      const proxyInput = container.querySelector('#Proxy') as HTMLInputElement
      expect(domain).toHaveValue(baseUrl)
      expect(proxyInput).toHaveValue(proxy)
    },
    { timeout: 3000 },
  )
}

describe('GeneralSettings', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
    env.edition = 'yakit'
    mocks.getRemoteValue.mockResolvedValue('')
    mocks.getOnlineProfile.mockResolvedValue({ ...BACKFILL })
  })

  afterEach(cleanup)

  // 首个用例需为整条依赖链（含 icons 包）的动态求值付费，并行跑其他测试文件时会更慢
  it('展示工作空间路径，并把目录大小格式化成 KB', async () => {
    const GeneralSettings = await importGeneralSettings()
    render(<GeneralSettings />)
    expect(screen.getByText('SettingsPage.general.workspace')).toBeInTheDocument()
    expect(screen.getByText('SettingsPage.general.pluginSource')).toBeInTheDocument()
    await waitFor(() => {
      expect(screen.getByTitle('/tmp/yakit-home')).toBeInTheDocument()
      expect(screen.getByText('used:1.0 KB')).toBeInTheDocument()
    })
  }, 20000)

  it('yakitEE 空历史值延迟返回时，私有域与代理保留配置回填值', async () => {
    env.edition = 'yakitEE'
    const history = { private: deferred(), proxy: deferred() }
    mocks.getRemoteValue.mockImplementation((key: string) => {
      if (key === PRIVATE_DOMAIN_KEY) return history.private.promise
      if (key === PROXY_KEY) return history.proxy.promise
      return Promise.resolve('')
    })

    const { container } = await renderWithBackfillFirst()
    history.private.resolve('')
    history.proxy.resolve('')

    await expectFieldValues(container, BACKFILL.BaseUrl, BACKFILL.Proxy)
  })

  it('yakitEE 过期历史值延迟返回时，私有域与代理保留配置回填值', async () => {
    env.edition = 'yakitEE'
    const history = { private: deferred(), proxy: deferred() }
    mocks.getRemoteValue.mockImplementation((key: string) => {
      if (key === PRIVATE_DOMAIN_KEY) return history.private.promise
      if (key === PROXY_KEY) return history.proxy.promise
      return Promise.resolve('')
    })

    const { container } = await renderWithBackfillFirst()
    history.private.resolve(JSON.stringify({ options: [{ value: STALE_DOMAIN }], defaultValue: STALE_DOMAIN }))
    history.proxy.resolve(JSON.stringify({ options: [{ value: STALE_PROXY }], defaultValue: STALE_PROXY }))

    await expectFieldValues(container, BACKFILL.BaseUrl, BACKFILL.Proxy)
  })

  it('非企业版保留历史默认值覆盖回填的既有行为', async () => {
    env.edition = 'yakit'
    const history = { private: deferred(), proxy: deferred() }
    mocks.getRemoteValue.mockImplementation((key: string) => {
      if (key === PRIVATE_DOMAIN_KEY) return history.private.promise
      if (key === PROXY_KEY) return history.proxy.promise
      return Promise.resolve('')
    })

    const { container } = await renderWithBackfillFirst()
    history.private.resolve(JSON.stringify({ options: [{ value: STALE_DOMAIN }], defaultValue: STALE_DOMAIN }))
    history.proxy.resolve(JSON.stringify({ options: [{ value: STALE_PROXY }], defaultValue: STALE_PROXY }))

    await expectFieldValues(container, STALE_DOMAIN, STALE_PROXY)
  })
})
