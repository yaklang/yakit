import { render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { GeneralSettings } from '../GeneralSettings'

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
  yakitDynamicStatus: () => ({ dynamicStatus: { isDynamicStatus: false } }),
}))

vi.mock('@/utils/kv', () => ({
  getRemoteValue: vi.fn().mockResolvedValue(''),
  setRemoteValue: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('@/utils/notification', () => ({
  failed: vi.fn(),
  success: vi.fn(),
  warn: vi.fn(),
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
      getOnlineProfile: vi
        .fn()
        .mockResolvedValue({ BaseUrl: 'https://www.example.com', Proxy: '', user_name: '', pwd: '' }),
      setOnlineProfile: vi.fn(),
    },
    yakitShell: { openSpecifiedFile: vi.fn() },
    yakitUILayout: { requestSignOut: vi.fn() },
  }
})

describe('GeneralSettings', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('展示工作空间路径，并把目录大小格式化成 KB', async () => {
    render(<GeneralSettings />)
    expect(screen.getByText('SettingsPage.general.workspace')).toBeInTheDocument()
    expect(screen.getByText('SettingsPage.general.pluginSource')).toBeInTheDocument()
    await waitFor(() => {
      expect(screen.getByTitle('/tmp/yakit-home')).toBeInTheDocument()
      expect(screen.getByText('used:1.0 KB')).toBeInTheDocument()
    })
  })
})
