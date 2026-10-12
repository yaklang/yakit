import type React from 'react'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import SetPassword from '../SetPassword'

const mocks = vi.hoisted(() => ({
  encryptEnterprisePasswords: vi.fn(),
  failed: vi.fn(),
  loginOut: vi.fn(),
  netWorkApi: vi.fn(),
  requestSignOut: vi.fn(),
  success: vi.fn(),
  warn: vi.fn(),
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

vi.mock('@/services/enterprisePassword', () => ({
  encryptEnterprisePasswords: mocks.encryptEnterprisePasswords,
}))
vi.mock('@/services/fetch', () => ({ NetWorkApi: mocks.netWorkApi }))
vi.mock('@/utils/notification', () => ({
  failed: mocks.failed,
  success: mocks.success,
  warn: mocks.warn,
}))
vi.mock('@/utils/login', () => ({ loginOut: mocks.loginOut }))
vi.mock('@/store', () => ({
  useYakitDynamicStatus: () => ({ dynamicStatus: { isDynamicStatus: false } }),
}))
vi.mock('@/services/electronBridge', () => ({
  yakitNetwork: { logoutDynamicControl: vi.fn() },
  yakitUILayout: { requestSignOut: mocks.requestSignOut },
}))
vi.mock('@/i18n/useI18nNamespaces', () => ({
  useI18nNamespaces: () => ({ t: (key: string) => key }),
}))
vi.mock('@/components/yakitUI/YakitButton/YakitButton', () => ({
  YakitButton: ({ children, htmlType }: React.PropsWithChildren<{ htmlType?: 'button' | 'submit' }>) => (
    <button type={htmlType || 'button'}>{children}</button>
  ),
}))
vi.mock('@/components/yakitUI/YakitInput/YakitInput', () => {
  type InputProps = React.InputHTMLAttributes<HTMLInputElement> & { allowClear?: boolean }
  const Password = ({ allowClear, value, ...props }: InputProps) => {
    void allowClear
    return <input type="password" {...props} value={value ?? ''} />
  }
  return { YakitInput: { Password } }
})

const oldPassword = 'Old1!aaa'
const newPassword = 'New1!aaa'

const fillPasswordForm = (confirmPassword = newPassword) => {
  fireEvent.change(screen.getByPlaceholderText('SetPassword.inputOldPassword'), {
    target: { value: oldPassword },
  })
  fireEvent.change(screen.getByPlaceholderText('SetPassword.inputNewPassword'), {
    target: { value: newPassword },
  })
  fireEvent.change(screen.getByPlaceholderText('SetPassword.inputConfirmPassword'), {
    target: { value: confirmPassword },
  })
}

describe('SetPassword 企业密码加密', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.encryptEnterprisePasswords.mockResolvedValue(['encrypted-old', 'encrypted-new', 'encrypted-confirm'])
    mocks.netWorkApi.mockResolvedValue({ ok: true })
  })

  afterEach(cleanup)

  it('分别加密三个原始明文字段并提交对应密文', async () => {
    render(<SetPassword userInfo={{} as never} onCancel={vi.fn()} />)
    fillPasswordForm()

    fireEvent.click(screen.getByRole('button', { name: 'SetPassword.updatePassword' }))

    await waitFor(() => expect(mocks.netWorkApi).toHaveBeenCalledTimes(1))
    expect(mocks.encryptEnterprisePasswords).toHaveBeenCalledWith([oldPassword, newPassword, newPassword])
    expect(mocks.netWorkApi).toHaveBeenCalledWith({
      method: 'post',
      url: 'urm/up/userinfo',
      data: {
        old_pwd: 'encrypted-old',
        pwd: 'encrypted-new',
        confirm_pwd: 'encrypted-confirm',
      },
    })
    expect(mocks.netWorkApi.mock.calls[0][0].data.pwd).not.toBe(mocks.netWorkApi.mock.calls[0][0].data.confirm_pwd)
  })

  it('加密失败时不提交且保留明文表单供原值重试', async () => {
    mocks.encryptEnterprisePasswords
      .mockRejectedValueOnce(new Error('encrypt failed'))
      .mockResolvedValueOnce(['retry-old', 'retry-new', 'retry-confirm'])
    render(<SetPassword userInfo={{} as never} onCancel={vi.fn()} />)
    fillPasswordForm()

    fireEvent.click(screen.getByRole('button', { name: 'SetPassword.updatePassword' }))

    await waitFor(() => expect(mocks.failed).toHaveBeenCalledTimes(1))
    expect(mocks.netWorkApi).not.toHaveBeenCalled()
    expect(screen.getByPlaceholderText('SetPassword.inputOldPassword')).toHaveValue(oldPassword)
    expect(screen.getByPlaceholderText('SetPassword.inputNewPassword')).toHaveValue(newPassword)
    expect(screen.getByPlaceholderText('SetPassword.inputConfirmPassword')).toHaveValue(newPassword)

    fireEvent.click(screen.getByRole('button', { name: 'SetPassword.updatePassword' }))

    await waitFor(() => expect(mocks.netWorkApi).toHaveBeenCalledTimes(1))
    expect(mocks.encryptEnterprisePasswords).toHaveBeenNthCalledWith(2, [oldPassword, newPassword, newPassword])
    expect(mocks.netWorkApi).toHaveBeenCalledWith(
      expect.objectContaining({
        data: {
          old_pwd: 'retry-old',
          pwd: 'retry-new',
          confirm_pwd: 'retry-confirm',
        },
      }),
    )
  })

  it('两次新密码不一致时不请求加密或改密接口', async () => {
    render(<SetPassword userInfo={{} as never} onCancel={vi.fn()} />)
    fillPasswordForm('Other1!a')

    fireEvent.click(screen.getByRole('button', { name: 'SetPassword.updatePassword' }))

    await waitFor(() => expect(mocks.warn).toHaveBeenCalledWith('SetPassword.passwordMismatch'))
    expect(mocks.encryptEnterprisePasswords).not.toHaveBeenCalled()
    expect(mocks.netWorkApi).not.toHaveBeenCalled()
  })
})
