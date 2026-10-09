import type React from 'react'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { RiskDisposalLog } from '../RiskDisposalLog'
import { apiGetDisposalLogs } from '../utils'

const mocks = vi.hoisted(() => ({
  getLogs: vi.fn(),
  publish: vi.fn(),
  clearComposer: vi.fn(),
}))

vi.mock('@/store', () => ({ useStore: () => ({ userInfo: { companyName: 'tester' } }) }))
vi.mock('@/i18n/useI18nNamespaces', () => ({
  useI18nNamespaces: () => ({ t: (key: string) => key }),
}))
vi.mock('@/hook/useResultEmpty/SearchEmpty', () => ({ useEmptyImage: () => '' }))
vi.mock('@/components/yakitUI/YakitSpin/YakitSpin', () => ({
  YakitSpin: ({ children }: React.PropsWithChildren) => children,
}))
vi.mock('@/components/yakitUI/YakitEmpty/YakitEmpty', () => ({ YakitEmpty: () => <div>需要登录</div> }))
vi.mock('@/components/yakitUI/YakitButton/YakitButton', () => ({
  YakitButton: ({ children, onClick }: React.PropsWithChildren<{ onClick?: () => void }>) => (
    <button onClick={onClick}>{children}</button>
  ),
}))
vi.mock('@/pages/Login', () => ({
  default: ({ visible, onCancel }: { visible: boolean; onCancel: () => void }) =>
    visible ? (
      <div role="dialog">
        <button onClick={onCancel}>关闭登录</button>
      </div>
    ) : null,
}))
vi.mock('@/pages/pluginEditor/pluginImageTextarea/PluginImageTextarea', async () => {
  const ReactModule = await import('react')
  return {
    PluginImageTextarea: ReactModule.forwardRef(({ onSubmit }: { onSubmit: (data: unknown) => void }, ref) => {
      ReactModule.useImperativeHandle(ref, () => ({ onClear: mocks.clearComposer }))
      return (
        <button
          onClick={() =>
            onSubmit({
              value: '处理意见',
              imgs: [],
              files: [],
            })
          }
        >
          发布评论
        </button>
      )
    }),
  }
})
vi.mock('../RiskDisposalLogItem', () => ({
  RiskDisposalLogItem: ({ info }: { info: { id: number } }) => <div data-testid="log-item">{info.id}</div>,
}))
vi.mock('../utils', () => ({
  apiGetDisposalLogs: mocks.getLogs,
  apiDeleteDisposalComment: vi.fn(),
  apiPublishDisposalComment: mocks.publish,
  apiUploadDisposalImage: vi.fn(),
}))

const deferred = <T,>() => {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((done) => {
    resolve = done
  })
  return { promise, resolve }
}

describe('RiskDisposalLog', () => {
  beforeEach(() => vi.clearAllMocks())
  afterEach(cleanup)

  it('未登录时可呼出并关闭登录框', () => {
    render(<RiskDisposalLog info={{ Hash: 'risk' } as never} isLogin={false} />)

    fireEvent.click(screen.getByRole('button', { name: 'YakitButton.loginNow' }))
    expect(screen.getByRole('dialog')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: '关闭登录' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('切换风险后忽略旧风险的迟到响应', async () => {
    const oldRequest = deferred<{ data: Array<{ id: number; createdAt: number; logType: 'comment' }> }>()
    mocks.getLogs
      .mockReturnValueOnce(oldRequest.promise)
      .mockResolvedValueOnce({ data: [{ id: 2, createdAt: 200, logType: 'comment' }] })

    const { rerender } = render(<RiskDisposalLog info={{ Hash: 'old-risk' } as never} isLogin refreshKey={0} />)
    rerender(<RiskDisposalLog info={{ Hash: 'new-risk' } as never} isLogin refreshKey={0} />)

    await waitFor(() => expect(screen.getByText('2')).toBeInTheDocument())
    oldRequest.resolve({ data: [{ id: 1, createdAt: 300, logType: 'comment' }] })

    await waitFor(() => expect(screen.queryByText('1')).not.toBeInTheDocument())
  })

  it('外部刷新后替换列表并滚动到顶部', async () => {
    mocks.getLogs
      .mockResolvedValueOnce({ data: [{ id: 1, createdAt: 100, logType: 'comment' }] })
      .mockResolvedValueOnce({ data: [{ id: 2, createdAt: 300, logType: 'comment' }] })

    const { rerender } = render(<RiskDisposalLog info={{ Hash: 'risk' } as never} isLogin refreshKey={0} />)
    await waitFor(() => expect(screen.getByText('1')).toBeInTheDocument())
    const list = screen.getByTestId('risk-disposal-log-list')
    list.scrollTop = 120

    rerender(<RiskDisposalLog info={{ Hash: 'risk' } as never} isLogin refreshKey={1} />)

    await waitFor(() => expect(screen.getAllByTestId('log-item').map((item) => item.textContent)).toEqual(['2']))
    expect(list.scrollTop).toBe(0)
  })

  it('滚动到底部请求第二页并合并去重', async () => {
    const firstPage = Array.from({ length: 20 }, (_, index) => ({
      id: 20 - index,
      createdAt: 200 - index,
      logType: 'comment' as const,
    }))
    mocks.getLogs.mockResolvedValueOnce({ data: firstPage, total: 21 }).mockResolvedValueOnce({
      data: [
        { id: 1, createdAt: 181, logType: 'comment' },
        { id: 21, createdAt: 50, logType: 'comment' },
      ],
      total: 21,
    })

    render(<RiskDisposalLog info={{ Hash: 'risk' } as never} isLogin refreshKey={0} />)
    await waitFor(() => expect(apiGetDisposalLogs).toHaveBeenCalledWith(expect.objectContaining({ page: 1 })))
    const list = screen.getByTestId('risk-disposal-log-list')
    Object.defineProperties(list, {
      scrollTop: { configurable: true, value: 100 },
      clientHeight: { configurable: true, value: 100 },
      scrollHeight: { configurable: true, value: 200 },
    })
    fireEvent.scroll(list)

    await waitFor(() => expect(apiGetDisposalLogs).toHaveBeenCalledWith(expect.objectContaining({ page: 2 })))
    await waitFor(() => expect(screen.getAllByTestId('log-item')).toHaveLength(21))
  })

  it('评论发布成功后刷新日志并清空编辑器', async () => {
    mocks.getLogs.mockResolvedValue({ data: [] })
    mocks.publish.mockResolvedValue(undefined)
    render(<RiskDisposalLog info={{ Hash: 'risk' } as never} isLogin />)
    await waitFor(() => expect(mocks.getLogs).toHaveBeenCalledTimes(1))

    fireEvent.click(screen.getByRole('button', { name: '发布评论' }))

    await waitFor(() => expect(mocks.publish).toHaveBeenCalledWith(expect.objectContaining({ risk_hash: 'risk' })))
    await waitFor(() => expect(mocks.getLogs).toHaveBeenCalledTimes(2))
    expect(mocks.clearComposer).toHaveBeenCalledTimes(1)
  })
})
