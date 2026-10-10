import type React from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { ModalProps } from 'antd'
import Login from '../Login'

const { edition, showModal, onSignInData, unsubscribe } = vi.hoisted(() => {
  const unsubscribe = vi.fn()
  return {
    edition: { enterprise: false },
    showModal: vi.fn((_props: { content?: React.ReactNode; modalAfterClose?: () => void }) => ({ destroy: vi.fn() })),
    onSignInData: vi.fn(() => unsubscribe),
    unsubscribe,
  }
})

vi.mock('antd', () => ({
  Modal: ({ open, children, onCancel }: ModalProps) =>
    open ? (
      <div role="dialog">
        <button onClick={onCancel}>关闭登录</button>
        {children}
      </div>
    ) : null,
}))
vi.mock('@/components/ConfigPrivateDomain/ConfigPrivateDomain', () => ({
  ConfigPrivateDomain: ({ onClose, enterpriseLogin }: { onClose: () => void; enterpriseLogin: boolean }) => (
    <button onClick={onClose}>{enterpriseLogin ? '完成企业登录' : '关闭配置'}</button>
  ),
}))
vi.mock('@/utils/showModal', () => ({ showModal }))
vi.mock('@/utils/envfile', () => ({ isEnterpriseEdition: () => edition.enterprise }))
vi.mock('@/services/electronBridge', () => ({ yakitAuth: { onSignInData } }))
vi.mock('@/services/fetch', () => ({ NetWorkApi: vi.fn() }))
vi.mock('@/utils/notification', () => ({ failed: vi.fn() }))
vi.mock('@/pages/plugins/utils', () => ({ apiDownloadPluginMine: vi.fn() }))
vi.mock('@/components/yakitUI/YakitModal/YakitModalConfirm', () => ({
  showYakitModal: showModal,
  YakitModalConfirm: vi.fn(),
}))
vi.mock('@/components/yakitUI/YakitModal/YakitModal', () => ({
  YakitModal: ({ open, children, onCancel }: ModalProps) =>
    open ? (
      <div role="dialog">
        <button onClick={onCancel}>关闭登录</button>
        {children}
      </div>
    ) : null,
}))
vi.mock('@/components/yakitUI/YakitSpin/YakitSpin', () => ({
  YakitSpin: ({ children }: { children: React.ReactNode }) => children,
}))
vi.mock('@/i18n/useI18nNamespaces', () => ({
  useI18nNamespaces: () => ({ t: (key: string) => key, i18n: { language: 'zh-CN' } }),
}))

beforeEach(() => {
  edition.enterprise = false
  vi.clearAllMocks()
})

describe('Login', () => {
  it('企业登录由 visible 控制，关闭后可再次显示，不依赖首次挂载或动画回调', () => {
    edition.enterprise = true
    const onCancel = vi.fn()
    const { rerender } = render(<Login visible={false} onCancel={onCancel} />)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    rerender(<Login visible onCancel={onCancel} />)
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(onCancel).not.toHaveBeenCalled()
    expect(onSignInData).not.toHaveBeenCalled()
    rerender(<Login visible={false} onCancel={onCancel} />)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    rerender(<Login visible onCancel={onCancel} />)
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(showModal).not.toHaveBeenCalled()
  })

  it('企业登录成功或取消时立即通知上层关闭登录流程', () => {
    edition.enterprise = true
    const onCancel = vi.fn()
    render(<Login visible onCancel={onCancel} />)
    fireEvent.click(screen.getByRole('button', { name: '完成企业登录' }))
    expect(onCancel).toHaveBeenCalledTimes(1)
  })

  it('社区版保留登录窗口、取消回调和登录事件的订阅清理', () => {
    const onCancel = vi.fn()
    const { rerender, unmount } = render(<Login visible onCancel={onCancel} />)
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByText('Login.loginWithGithub')).toBeInTheDocument()
    expect(screen.getByText('Login.loginWithWechat')).toBeInTheDocument()
    expect(showModal).not.toHaveBeenCalled()
    expect(onCancel).not.toHaveBeenCalled()

    rerender(<Login visible onCancel={onCancel} />)
    expect(onSignInData).toHaveBeenCalledTimes(1)
    fireEvent.click(screen.getByRole('button', { name: '关闭登录' }))
    expect(onCancel).toHaveBeenCalledTimes(1)

    unmount()
    expect(unsubscribe).toHaveBeenCalledTimes(1)
  })
})
