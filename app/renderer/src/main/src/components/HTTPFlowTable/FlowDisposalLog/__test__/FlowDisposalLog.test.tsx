import type React from 'react'
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { FlowDisposalLog } from '../FlowDisposalLog'
import { apiGetFlowDisposalLogs } from '../utils'

const mocks = vi.hoisted(() => ({
  getLogs: vi.fn(),
  deleteLog: vi.fn(),
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
vi.mock('@/components/yakitUI/YakitEmpty/YakitEmpty', () => ({ YakitEmpty: () => null }))
vi.mock('@/components/yakitUI/YakitButton/YakitButton', () => ({ YakitButton: () => null }))
vi.mock('@/pages/Login', () => ({ default: () => null }))
vi.mock('@/pages/pluginEditor/pluginImageTextarea/PluginImageTextarea', async () => {
  const ReactModule = await import('react')
  return {
    PluginImageTextarea: ReactModule.forwardRef(({ onSubmit }: { onSubmit: (data: unknown) => void }, ref) => {
      ReactModule.useImperativeHandle(ref, () => ({ onClear: mocks.clearComposer }))
      return (
        <button
          data-testid="composer"
          onClick={() =>
            onSubmit({
              value: '',
              imgs: [],
              files: [{ url: 'https://files.test/report.zip', name: '报告.zip', size: 1024 }],
            })
          }
        >
          发布附件评论
        </button>
      )
    }),
  }
})
vi.mock('../FlowDisposalLogItem', () => ({
  FlowDisposalLogItemView: ({
    info,
    onDelete,
  }: {
    info: { id: number }
    onDelete?: (info: { id: number }) => void
  }) => (
    <div data-testid="log-item">
      {info.id}
      <button aria-label={`删除 ${info.id}`} onClick={() => onDelete?.(info)} />
    </div>
  ),
}))
vi.mock('../utils', () => ({
  apiGetFlowDisposalLogs: mocks.getLogs,
  apiDeleteFlowDisposalComment: mocks.deleteLog,
  apiPublishFlowDisposalComment: mocks.publish,
  apiUploadFlowDisposalImage: vi.fn(),
}))

const deferred = <T,>() => {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((done) => {
    resolve = done
  })
  return { promise, resolve }
}

describe('FlowDisposalLog', () => {
  beforeEach(() => vi.clearAllMocks())
  afterEach(cleanup)

  it('附件评论提交文件节点，切换对象后旧发布响应不清空新编辑框', async () => {
    const pending = deferred<void>()
    mocks.getLogs.mockResolvedValue({ data: [] })
    mocks.publish.mockReturnValue(pending.promise)
    const { rerender } = render(<FlowDisposalLog flow={{ Id: 1, Hash: 'old-flow' } as never} isLogin />)
    fireEvent.click(screen.getByRole('button', { name: '发布附件评论' }))
    expect(mocks.publish).toHaveBeenCalledWith(
      expect.objectContaining({
        hash: 'old-flow',
        description: JSON.stringify([
          { type: 'file', value: { url: 'https://files.test/report.zip', name: '报告.zip', size: 1024 } },
        ]),
      }),
    )
    rerender(<FlowDisposalLog flow={{ Id: 2, Hash: 'new-flow' } as never} isLogin />)
    const clearedOnSwitch = mocks.clearComposer.mock.calls.length
    pending.resolve()
    await waitFor(() => expect(mocks.getLogs).toHaveBeenCalledWith(expect.objectContaining({ hash: 'new-flow' })))
    await pending.promise
    expect(mocks.clearComposer).toHaveBeenCalledTimes(clearedOnSwitch)
  })

  it('切换流量后忽略旧对象的迟到响应', async () => {
    const oldRequest = deferred<{ data: Array<{ id: number; createdAt: number; logType: 'comment' }> }>()
    mocks.getLogs
      .mockReturnValueOnce(oldRequest.promise)
      .mockResolvedValueOnce({ data: [{ id: 2, createdAt: 200, logType: 'comment' }] })

    const { rerender } = render(<FlowDisposalLog flow={{ Id: 1, Hash: 'old-flow' } as never} isLogin refreshKey={0} />)
    rerender(<FlowDisposalLog flow={{ Id: 2, Hash: 'new-flow' } as never} isLogin refreshKey={0} />)

    await waitFor(() => expect(screen.getByText('2')).toBeInTheDocument())
    oldRequest.resolve({ data: [{ id: 1, createdAt: 300, logType: 'comment' }] })

    await waitFor(() => expect(screen.queryByText('1')).not.toBeInTheDocument())
  })

  it('刷新后最新日志置顶并滚动到顶部', async () => {
    mocks.getLogs
      .mockResolvedValueOnce({ data: [{ id: 1, createdAt: 100, logType: 'comment' }] })
      .mockResolvedValueOnce({
        data: [
          { id: 2, createdAt: 300, logType: 'comment' },
          { id: 3, createdAt: 200, logType: 'comment' },
        ],
      })

    const { rerender } = render(<FlowDisposalLog flow={{ Id: 1, Hash: 'flow' } as never} isLogin refreshKey={0} />)
    await waitFor(() => expect(screen.getByText('1')).toBeInTheDocument())
    const list = screen.getByTestId('flow-disposal-log-list')
    list.scrollTop = 120

    rerender(<FlowDisposalLog flow={{ Id: 1, Hash: 'flow' } as never} isLogin refreshKey={1} />)

    await waitFor(() => expect(screen.getAllByTestId('log-item').map((item) => item.textContent)).toEqual(['2', '3']))
    expect(list.scrollTop).toBe(0)
  })

  it('滚动到底部后请求第二页并合并去重', async () => {
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

    render(<FlowDisposalLog flow={{ Id: 1, Hash: 'flow' } as never} isLogin refreshKey={0} />)
    await waitFor(() => expect(apiGetFlowDisposalLogs).toHaveBeenCalledWith(expect.objectContaining({ page: 1 })))
    const list = screen.getByTestId('flow-disposal-log-list')
    Object.defineProperties(list, {
      scrollTop: { configurable: true, value: 100 },
      clientHeight: { configurable: true, value: 100 },
      scrollHeight: { configurable: true, value: 200 },
    })
    fireEvent.scroll(list)

    await waitFor(() => expect(apiGetFlowDisposalLogs).toHaveBeenCalledWith(expect.objectContaining({ page: 2 })))
    await waitFor(() => expect(screen.getAllByTestId('log-item')).toHaveLength(21))
  })

  it('删除成功后从第一页重新加载并重置分页', async () => {
    const pendingSecondPage = deferred<{
      data: Array<{ id: number; createdAt: number; logType: 'comment' }>
      total: number
    }>()
    const firstPage = Array.from({ length: 20 }, (_, index) => ({
      id: 20 - index,
      createdAt: 200 - index,
      logType: 'comment' as const,
    }))
    const refreshedPage = Array.from({ length: 20 }, (_, index) => ({
      id: 19 - index,
      createdAt: 199 - index,
      logType: 'comment' as const,
    }))
    mocks.getLogs
      .mockResolvedValueOnce({ data: firstPage, total: 21 })
      .mockReturnValueOnce(pendingSecondPage.promise)
      .mockResolvedValueOnce({ data: refreshedPage, total: 20 })
    mocks.deleteLog.mockResolvedValue(undefined)

    render(<FlowDisposalLog flow={{ Id: 1, Hash: 'flow' } as never} isLogin />)
    await waitFor(() => expect(screen.getByRole('button', { name: '删除 20' })).toBeInTheDocument())
    const list = screen.getByTestId('flow-disposal-log-list')
    Object.defineProperties(list, {
      scrollTop: { configurable: true, value: 100 },
      clientHeight: { configurable: true, value: 100 },
      scrollHeight: { configurable: true, value: 200 },
    })
    fireEvent.scroll(list)
    await waitFor(() => expect(mocks.getLogs).toHaveBeenCalledTimes(2))

    fireEvent.click(screen.getByRole('button', { name: '删除 20' }))

    await waitFor(() => expect(mocks.getLogs).toHaveBeenCalledTimes(3))
    expect(mocks.getLogs.mock.calls.map(([request]) => request.page)).toEqual([1, 2, 1])
    await act(async () => {
      pendingSecondPage.resolve({ data: [{ id: 99, createdAt: 99, logType: 'comment' }], total: 21 })
      await pendingSecondPage.promise
    })
    expect(screen.queryByText('99')).not.toBeInTheDocument()
  })

  it('切换流量后旧删除回调不刷新新流量', async () => {
    const pendingDelete = deferred<void>()
    mocks.getLogs
      .mockResolvedValueOnce({ data: [{ id: 1, createdAt: 100, logType: 'comment' }] })
      .mockResolvedValueOnce({ data: [{ id: 2, createdAt: 200, logType: 'comment' }] })
    mocks.deleteLog.mockReturnValue(pendingDelete.promise)

    const { rerender } = render(<FlowDisposalLog flow={{ Id: 1, Hash: 'old-flow' } as never} isLogin />)
    await waitFor(() => expect(screen.getByRole('button', { name: '删除 1' })).toBeInTheDocument())
    fireEvent.click(screen.getByRole('button', { name: '删除 1' }))

    rerender(<FlowDisposalLog flow={{ Id: 2, Hash: 'new-flow' } as never} isLogin />)
    await waitFor(() => expect(screen.getByText('2')).toBeInTheDocument())
    pendingDelete.resolve()

    await pendingDelete.promise
    await waitFor(() => expect(mocks.getLogs).toHaveBeenCalledTimes(2))
    expect(mocks.getLogs).toHaveBeenLastCalledWith(expect.objectContaining({ hash: 'new-flow', page: 1 }))
  })

  it('删除失败时保留当前列表且不刷新', async () => {
    mocks.getLogs.mockResolvedValue({ data: [{ id: 1, createdAt: 100, logType: 'comment' }], total: 1 })
    mocks.deleteLog.mockRejectedValue(new Error('delete failed'))

    render(<FlowDisposalLog flow={{ Id: 1, Hash: 'flow' } as never} isLogin />)
    await waitFor(() => expect(screen.getByRole('button', { name: '删除 1' })).toBeInTheDocument())
    fireEvent.click(screen.getByRole('button', { name: '删除 1' }))

    await waitFor(() => expect(mocks.deleteLog).toHaveBeenCalledWith(1))
    expect(mocks.getLogs).toHaveBeenCalledOnce()
    expect(screen.getByText('1')).toBeInTheDocument()
  })
})
