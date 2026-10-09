import type React from 'react'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { FlowDisposalLog } from '../FlowDisposalLog'
import { apiGetFlowDisposalLogs } from '../utils'

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
  FlowDisposalLogItemView: ({ info }: { info: { id: number } }) => <div data-testid="log-item">{info.id}</div>,
}))
vi.mock('../utils', () => ({
  apiGetFlowDisposalLogs: mocks.getLogs,
  apiDeleteFlowDisposalComment: vi.fn(),
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
})
