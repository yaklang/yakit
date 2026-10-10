import type React from 'react'
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ENTERPRISE_DEFAULT_PRIVATE_DOMAIN } from '../privateDomainDefault'
import { ConfigPrivateDomain } from '../ConfigPrivateDomain'

const mocks = vi.hoisted(() => ({
  getRemoteValue: vi.fn(),
  onBaseUrlStatus: vi.fn(() => vi.fn()),
  setOnlineProfile: vi.fn().mockResolvedValue(undefined),
}))

vi.hoisted(() => {
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    value: vi.fn().mockImplementation((query) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  })
})

vi.mock('@/utils/kv', () => ({
  getRemoteValue: mocks.getRemoteValue,
  setRemoteValue: vi.fn(),
}))
vi.mock('@/utils/envfile', () => ({
  getRemoteConfigBaseUrlGV: () => 'private-domain-history',
  getRemoteHttpSettingGV: () => 'private-domain-setting',
}))
vi.mock('@/store', () => ({
  useStore: () => ({ userInfo: {}, setStoreUserInfo: vi.fn() }),
}))
vi.mock('@/utils/login', () => ({ loginOut: vi.fn() }))
vi.mock('@/utils/notification', () => ({ failed: vi.fn(), success: vi.fn() }))
vi.mock('@/utils/eventBus/eventBus', () => ({ default: { emit: vi.fn() } }))
vi.mock('@/components/layout/utils', () => ({
  useUploadInfoByEnpriTrace: () => [{ startUpload: vi.fn().mockResolvedValue([]) }],
}))
vi.mock('@/pages/ai-re-act/hooks/useAIGlobalConfig', () => ({
  default: () => [undefined, { getAIGlobalConfigAfterLogin: vi.fn() }],
}))
vi.mock('@/services/electronBridge', () => ({
  yakitAuth: {
    companySignIn: vi.fn(),
    editBaseUrl: vi.fn().mockResolvedValue(undefined),
    onBaseUrlStatus: mocks.onBaseUrlStatus,
    requestPasswordReset: vi.fn(),
  },
  yakitCodec: { run: vi.fn() },
  yakitProfile: { setOnlineProfile: mocks.setOnlineProfile },
  yakitUILayout: { requestSignOut: vi.fn() },
}))
vi.mock('@/i18n/useI18nNamespaces', () => ({
  useI18nNamespaces: () => ({ t: (key: string) => key }),
}))
vi.mock('@yakit-libs/yakit-ui-icons/outline', () => ({ InformationCircleOutlined: () => null }))
vi.mock('../../yakitUI/YakitButton/YakitButton', () => ({
  YakitButton: ({ children, htmlType }: React.PropsWithChildren<{ htmlType?: 'button' | 'submit' }>) => (
    <button type={htmlType || 'button'}>{children}</button>
  ),
}))
vi.mock('../../yakitUI/YakitInput/YakitInput', () => {
  type InputProps = React.InputHTMLAttributes<HTMLInputElement> & { allowClear?: boolean }
  const YakitInput = ({ allowClear, value, ...props }: InputProps) => {
    void allowClear
    return <input {...props} value={value ?? ''} />
  }
  YakitInput.Password = ({ allowClear, value, ...props }: InputProps) => {
    void allowClear
    return <input type="password" {...props} value={value ?? ''} />
  }
  return { YakitInput }
})
vi.mock('../../yakitUI/YakitAutoComplete/YakitAutoComplete', async () => {
  const ReactModule = await import('react')
  return {
    defYakitAutoCompleteRef: { onSetRemoteValues: vi.fn() },
    YakitAutoComplete: ReactModule.forwardRef(
      (
        props: {
          initValue?: string
          isCacheDefaultValue?: boolean
          cacheHistoryDataKey?: string
          value?: string
          onChange?: React.ChangeEventHandler<HTMLInputElement>
        },
        ref,
      ) => {
        ReactModule.useImperativeHandle(ref, () => ({ onSetRemoteValues: vi.fn() }))
        const fallbackValue = props.isCacheDefaultValue ? 'https://history.example.com' : props.initValue || ''
        return (
          <input
            readOnly
            data-testid={
              props.cacheHistoryDataKey === 'private-domain-history' ? 'private-domain-input' : 'proxy-input'
            }
            data-cache-default={String(props.isCacheDefaultValue)}
            value={props.value ?? fallbackValue}
            onChange={props.onChange}
          />
        )
      },
    ),
  }
})

const renderEnterpriseLogin = async (setting?: Record<string, unknown>) => {
  mocks.getRemoteValue.mockResolvedValue(setting ? JSON.stringify(setting) : '')
  await act(async () => {
    render(<ConfigPrivateDomain enterpriseLogin />)
    await Promise.resolve()
  })
  return screen.getByTestId('private-domain-input')
}

const submitEnterpriseLogin = async (expectedBaseUrl: string) => {
  fireEvent.change(screen.getByPlaceholderText('ConfigPrivateDomain.enterUsername'), {
    target: { value: 'enterprise-user' },
  })
  fireEvent.change(screen.getByPlaceholderText('ConfigPrivateDomain.enterPassword'), {
    target: { value: 'Aa1!aaaa' },
  })
  fireEvent.click(screen.getByRole('button', { name: 'YakitButton.login' }))
  await waitFor(() =>
    expect(mocks.setOnlineProfile).toHaveBeenCalledWith(expect.objectContaining({ BaseUrl: expectedBaseUrl })),
  )
}

describe('ConfigPrivateDomain 企业私有域回填', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.onBaseUrlStatus.mockReturnValue(vi.fn())
  })

  afterEach(cleanup)

  it('无已存配置时使用企业默认私有域', async () => {
    const input = await renderEnterpriseLogin()

    expect(input).toHaveValue(ENTERPRISE_DEFAULT_PRIVATE_DOMAIN)
    await submitEnterpriseLogin(ENTERPRISE_DEFAULT_PRIVATE_DOMAIN)
  })

  it('将旧公共默认域迁移为企业默认私有域', async () => {
    const input = await renderEnterpriseLogin({ BaseUrl: 'https://www.yaklang.com/' })

    await waitFor(() => expect(input).toHaveValue(ENTERPRISE_DEFAULT_PRIVATE_DOMAIN))
    await submitEnterpriseLogin(ENTERPRISE_DEFAULT_PRIVATE_DOMAIN)
  })

  it('回填已存自定义私有域', async () => {
    const input = await renderEnterpriseLogin({ BaseUrl: 'https://enterprise.example.com' })

    await waitFor(() => expect(input).toHaveValue('https://enterprise.example.com'))
    await submitEnterpriseLogin('https://enterprise.example.com')
  })

  it('企业登录不允许历史缓存覆盖私有域回填', async () => {
    const input = await renderEnterpriseLogin({ BaseUrl: 'https://enterprise.example.com' })

    await waitFor(() => expect(input).toHaveValue('https://enterprise.example.com'))
    expect(input).toHaveAttribute('data-cache-default', 'false')
    expect(input).not.toHaveValue('https://history.example.com')
  })
})
