import type React from 'react'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { WebMessageSyncButton } from '../WebMessageSyncButton'
import { apiHTTPFlowsFromOnline, apiRisksFromOnline } from '../utils'

const mocks = vi.hoisted(() => ({
  cleanupFlow: vi.fn(),
  cleanupRisk: vi.fn(),
}))

vi.mock('@/store', () => ({
  useStore: () => ({ userInfo: { isLogin: true, token: 'login-token' } }),
}))

vi.mock('@/i18n/useI18nNamespaces', () => ({
  useI18nNamespaces: () => ({ t: (key: string) => key }),
}))

vi.mock('@/utils/randomUtil', () => ({
  randomString: () => 'stream-token',
}))

vi.mock('@/utils/notification', () => ({
  failed: vi.fn(),
  yakitNotify: vi.fn(),
}))

vi.mock('@yakit-libs/yakit-ui-icons/outline', () => ({
  ChevronDownOutlined: () => <span>chevron</span>,
}))

vi.mock('../../yakitUI/YakitButton/YakitButton', () => ({
  YakitButton: ({ children, loading }: React.PropsWithChildren<{ loading?: boolean }>) => (
    <button aria-busy={loading}>{children}</button>
  ),
}))

vi.mock('../../yakitUI/YakitDropdownMenu/YakitDropdownMenu', () => ({
  YakitDropdownMenu: ({
    children,
    menu,
  }: React.PropsWithChildren<{
    menu: { data: { key: string; label: React.ReactNode }[]; onClick: (info: { key: string }) => void }
  }>) => (
    <div>
      {children}
      {menu.data.map((item) => (
        <button key={item.key} onClick={() => menu.onClick({ key: item.key })}>
          {item.label}
        </button>
      ))}
    </div>
  ),
}))

vi.mock('../utils', () => ({
  apiHTTPFlowsFromOnline: vi.fn(() => mocks.cleanupFlow),
  apiRisksFromOnline: vi.fn(() => mocks.cleanupRisk),
}))

describe('WebMessageSyncButton', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(cleanup)

  it.each([
    ['MessageCenter.updateFlow', apiHTTPFlowsFromOnline],
    ['MessageCenter.updateRisk', apiRisksFromOnline],
  ])('选择 %s 时使用登录 token 启动对应同步流', (label, startApi) => {
    render(<WebMessageSyncButton />)

    fireEvent.click(screen.getByRole('button', { name: label }))

    expect(startApi).toHaveBeenCalledWith('login-token', 'stream-token', expect.any(Object))
    expect(apiHTTPFlowsFromOnline).toHaveBeenCalledTimes(label.endsWith('updateFlow') ? 1 : 0)
    expect(apiRisksFromOnline).toHaveBeenCalledTimes(label.endsWith('updateRisk') ? 1 : 0)

    const handlers = vi.mocked(startApi).mock.calls[0][2]
    act(() => handlers.onProgress(41.9, 'syncing'))
    expect(screen.getByRole('button', { name: /MessageCenter\.updateData 41%/ })).toBeInTheDocument()
  })

  it('流结束时清理资源并回调成功', () => {
    const onSuccess = vi.fn()
    render(<WebMessageSyncButton onSuccess={onSuccess} />)
    fireEvent.click(screen.getByRole('button', { name: 'MessageCenter.updateFlow' }))

    const handlers = vi.mocked(apiHTTPFlowsFromOnline).mock.calls[0][2]
    act(() => handlers.onEnd())

    expect(mocks.cleanupFlow).toHaveBeenCalledTimes(1)
    expect(onSuccess).toHaveBeenCalledTimes(1)
    expect(screen.getByRole('button', { name: /MessageCenter\.updateData/ })).not.toHaveAttribute('aria-busy', 'true')
  })

  it('流报错时清理资源且不回调成功', () => {
    const onSuccess = vi.fn()
    render(<WebMessageSyncButton onSuccess={onSuccess} />)
    fireEvent.click(screen.getByRole('button', { name: 'MessageCenter.updateRisk' }))

    const handlers = vi.mocked(apiRisksFromOnline).mock.calls[0][2]
    act(() => handlers.onError(new Error('sync failed')))

    expect(mocks.cleanupRisk).toHaveBeenCalledTimes(1)
    expect(onSuccess).not.toHaveBeenCalled()
    expect(screen.getByRole('button', { name: /MessageCenter\.updateData/ })).not.toHaveAttribute('aria-busy', 'true')
  })

  it('同步中卸载组件时清理当前流', () => {
    const { unmount } = render(<WebMessageSyncButton />)
    fireEvent.click(screen.getByRole('button', { name: 'MessageCenter.updateFlow' }))

    unmount()

    expect(mocks.cleanupFlow).toHaveBeenCalledTimes(1)
  })
})
