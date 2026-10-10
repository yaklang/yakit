import type React from 'react'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { WebMessageSyncButton } from '../WebMessageSyncButton'
import { apiHTTPFlowsFromOnline, apiRisksFromOnline } from '../utils'
import { yakitNotify } from '@/utils/notification'
import emiter from '@/utils/eventBus/eventBus'

const mocks = vi.hoisted(() => ({
  cleanupFlow: vi.fn(),
  cleanupRisk: vi.fn(),
  userInfo: { isLogin: true, token: 'login-token', user_id: 1 },
}))

vi.mock('@/store', () => ({
  useStore: () => ({ userInfo: mocks.userInfo }),
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
    mocks.userInfo = { isLogin: true, token: 'login-token', user_id: 1 }
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
    const emit = vi.spyOn(emiter, 'emit')
    render(<WebMessageSyncButton onSuccess={onSuccess} />)
    fireEvent.click(screen.getByRole('button', { name: 'MessageCenter.updateFlow' }))

    const handlers = vi.mocked(apiHTTPFlowsFromOnline).mock.calls[0][2]
    act(() => handlers.onEnd())

    expect(mocks.cleanupFlow).toHaveBeenCalledTimes(1)
    expect(onSuccess).toHaveBeenCalledTimes(1)
    expect(emit).toHaveBeenCalledWith('onRefreshMessageUnread', 'web')
    expect(yakitNotify).toHaveBeenCalledWith('success', 'MessageCenter.syncSuccess')
    expect(screen.getByRole('button', { name: /MessageCenter\.updateData/ })).not.toHaveAttribute('aria-busy', 'true')
  })

  it('仅更新已有流量且没有新增时，同步完成后也刷新 History 列表', () => {
    const emit = vi.spyOn(emiter, 'emit')
    render(<WebMessageSyncButton />)
    fireEvent.click(screen.getByRole('button', { name: 'MessageCenter.updateFlow' }))
    const handlers = vi.mocked(apiHTTPFlowsFromOnline).mock.calls[0][2]

    act(() => handlers.onProgress(100, '更新: 6条, 新增: 0条'))
    expect(emit).not.toHaveBeenCalledWith('onRefreshQueryHTTPFlows', expect.anything())
    act(() => handlers.onEnd())

    expect(emit.mock.calls.filter(([event]) => event === 'onRefreshQueryHTTPFlows')).toEqual([
      ['onRefreshQueryHTTPFlows', JSON.stringify({ action: 'sync-complete' })],
    ])
  })

  it('漏洞同步完成刷新风险列表，不触发流量列表刷新', () => {
    const emit = vi.spyOn(emiter, 'emit')
    render(<WebMessageSyncButton />)
    fireEvent.click(screen.getByRole('button', { name: 'MessageCenter.updateRisk' }))
    const handlers = vi.mocked(apiRisksFromOnline).mock.calls[0][2]

    act(() => handlers.onEnd())

    expect(emit).toHaveBeenCalledWith('onRefRiskList')
    expect(emit).not.toHaveBeenCalledWith('onRefreshQueryHTTPFlows', expect.anything())
  })

  it.each([
    ['MessageCenter.updateFlow', apiHTTPFlowsFromOnline, '同步完成，共同步 12 条流量'],
    ['MessageCenter.updateRisk', apiRisksFromOnline, '同步完成，共同步 3 条漏洞'],
  ])('%s 完成后显示后端最后一条非空提示', (label, startApi, message) => {
    render(<WebMessageSyncButton />)
    fireEvent.click(screen.getByRole('button', { name: label }))
    const handlers = vi.mocked(startApi).mock.calls[0][2]

    act(() => {
      handlers.onProgress(10, '正在同步')
      handlers.onProgress(100, message)
      handlers.onProgress(100, '  ')
      handlers.onProgress(100)
    })
    expect(yakitNotify).not.toHaveBeenCalled()
    act(() => handlers.onEnd())
    expect(yakitNotify).toHaveBeenCalledExactlyOnceWith('success', message)
  })

  it('重新同步时不沿用上一次后端提示', () => {
    render(<WebMessageSyncButton />)
    const update = screen.getByRole('button', { name: 'MessageCenter.updateFlow' })
    fireEvent.click(update)
    const first = vi.mocked(apiHTTPFlowsFromOnline).mock.calls[0][2]
    act(() => {
      first.onProgress(100, '同步完成，共同步 12 条流量')
      first.onEnd()
    })

    fireEvent.click(update)
    const second = vi.mocked(apiHTTPFlowsFromOnline).mock.calls[1][2]
    act(() => second.onEnd())
    expect(yakitNotify).toHaveBeenLastCalledWith('success', 'MessageCenter.syncSuccess')
  })

  it.each([
    ['MessageCenter.updateFlow', apiHTTPFlowsFromOnline, mocks.cleanupFlow],
    ['MessageCenter.updateRisk', apiRisksFromOnline, mocks.cleanupRisk],
  ] as const)('%s 报错时清理资源且不回调成功或刷新列表', (label, startApi, cleanupSync) => {
    const onSuccess = vi.fn()
    const emit = vi.spyOn(emiter, 'emit')
    render(<WebMessageSyncButton onSuccess={onSuccess} />)
    fireEvent.click(screen.getByRole('button', { name: label }))

    const handlers = vi.mocked(startApi).mock.calls[0][2]
    act(() => handlers.onError(new Error('sync failed')))

    expect(cleanupSync).toHaveBeenCalledTimes(1)
    expect(onSuccess).not.toHaveBeenCalled()
    expect(emit).not.toHaveBeenCalledWith('onRefreshMessageUnread', 'web')
    expect(emit).not.toHaveBeenCalledWith('onRefreshQueryHTTPFlows', expect.anything())
    expect(emit).not.toHaveBeenCalledWith('onRefRiskList')
    expect(screen.getByRole('button', { name: /MessageCenter\.updateData/ })).not.toHaveAttribute('aria-busy', 'true')
  })

  it('同步中卸载组件时清理当前流', () => {
    const { unmount } = render(<WebMessageSyncButton />)
    fireEvent.click(screen.getByRole('button', { name: 'MessageCenter.updateFlow' }))

    unmount()

    expect(mocks.cleanupFlow).toHaveBeenCalledTimes(1)
  })

  it('切换账号时取消旧同步并忽略旧账号的完成回调', () => {
    const onSuccess = vi.fn()
    const emit = vi.spyOn(emiter, 'emit')
    const view = render(<WebMessageSyncButton onSuccess={onSuccess} />)
    fireEvent.click(screen.getByRole('button', { name: 'MessageCenter.updateFlow' }))
    const oldHandlers = vi.mocked(apiHTTPFlowsFromOnline).mock.calls[0][2]

    mocks.userInfo = { isLogin: true, token: 'next-token', user_id: 2 }
    view.rerender(<WebMessageSyncButton onSuccess={onSuccess} />)
    mocks.userInfo = { isLogin: true, token: 'login-token', user_id: 1 }
    view.rerender(<WebMessageSyncButton onSuccess={onSuccess} />)

    expect(mocks.cleanupFlow).toHaveBeenCalledTimes(1)
    act(() => oldHandlers.onEnd())
    expect(onSuccess).not.toHaveBeenCalled()
    expect(yakitNotify).not.toHaveBeenCalledWith('success', expect.anything())
    expect(emit).not.toHaveBeenCalledWith('onRefreshQueryHTTPFlows', expect.anything())
    expect(emit).not.toHaveBeenCalledWith('onRefreshMessageUnread', 'web')
  })
})
