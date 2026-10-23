import type React from 'react'
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import MCPHistory from '../MCPHistory'
import styles from '../MCPHistory.module.scss'
import {
  grpcDeleteMCPToolCallHistory,
  grpcGetMCPToolCallHistoryDetail,
  grpcQueryMCPToolCallHistory,
} from '../../aiMCP/utils'
import { YakitModalConfirm } from '@/components/yakitUI/YakitModal/YakitModalConfirm'
import type { MCPToolCallHistory, MCPToolCallHistorySummary } from '../../type/aiMCP'

vi.mock('../../aiMCP/utils', () => ({
  grpcQueryMCPToolCallHistory: vi.fn(),
  grpcGetMCPToolCallHistoryDetail: vi.fn(),
  grpcDeleteMCPToolCallHistory: vi.fn(),
}))
vi.mock('@/utils/editors', () => ({
  NewHTTPPacketEditor: (props: { title?: React.ReactNode; originValue?: string }) => (
    <div data-testid="packet-editor">
      <div data-testid="editor-title">{props.title}</div>
      <pre data-testid="editor-value">{props.originValue}</pre>
    </div>
  ),
}))
vi.mock('@/components/yakitUI/YakitResizeBox/YakitResizeBox', () => ({
  YakitResizeBox: ({ firstNode, secondNode }: { firstNode?: React.ReactNode; secondNode?: React.ReactNode }) => (
    <div data-testid="resize-box">
      {firstNode}
      {secondNode}
    </div>
  ),
}))
// jsdom 无真实尺寸，虚拟列表渲染不出条目，按 MessageCenter 测试的做法直接平铺数据
vi.mock('@/components/RollingLoadList/RollingLoadList', () => ({
  RollingLoadList: ({
    data,
    renderRow,
    loadMoreData,
    noMoreText,
    hasMore,
    loading,
    page,
  }: {
    data: MCPToolCallHistorySummary[]
    renderRow: (row: MCPToolCallHistorySummary, index: number) => React.ReactNode
    loadMoreData: () => void
    noMoreText?: string
    hasMore: boolean
    loading: boolean
    page: number
  }) => (
    <div data-testid="rolling-list">
      {(data || []).map((row, index) => renderRow(row, index))}
      <button type="button" onClick={() => loadMoreData()}>
        load-more
      </button>
      {!loading && !hasMore && (page || 0) > 0 && <div>{noMoreText || 'YakitEmpty.noMoreData'}</div>}
    </div>
  ),
}))
vi.mock('@/components/yakitUI/YakitModal/YakitModalConfirm', () => ({
  showYakitModal: vi.fn(),
  YakitModalConfirm: vi.fn(() => ({ destroy: vi.fn() })),
}))
vi.mock('@/i18n/useI18nNamespaces', () => ({
  useI18nNamespaces: () => ({ t: (key: string) => key, i18nRefresh: 0 }),
}))

const summary = (id: number, toolName: string, success = true): MCPToolCallHistorySummary => ({
  ID: id,
  ToolName: toolName,
  Success: success,
  ErrorMessage: success ? '' : 'boom',
  DurationMillis: 45,
  ClientID: 'client-1',
  SessionID: 'sess-1',
  CreatedAt: 1792479131,
  ClientName: 'Claude Desktop',
  ClientVersion: '2.1.0',
})
const detailOf = (id: number, over: Partial<MCPToolCallHistory> = {}): MCPToolCallHistory => ({
  ...summary(id, 'detail-tool'),
  Arguments: '{"a":1}',
  Result: '{"ok":true}',
  ErrorMessage: '',
  ...over,
})
const responseFor = (histories: MCPToolCallHistorySummary[], total = histories.length) => ({
  Histories: histories,
  Total: total,
  Pagination: { Page: 1, Limit: 30, OrderBy: 'created_at', Order: 'desc' },
})

beforeEach(() => {
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  )
  vi.resetAllMocks()
  vi.mocked(grpcQueryMCPToolCallHistory).mockResolvedValue(
    responseFor([summary(1, 'encode-tool'), summary(2, 'now-tool')]),
  )
  vi.mocked(grpcGetMCPToolCallHistoryDetail).mockResolvedValue(detailOf(1))
  vi.mocked(grpcDeleteMCPToolCallHistory).mockResolvedValue({} as never)
})
afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe('MCPHistory 调用历史', () => {
  it('点击刷新时在列表顶部水平展示加载中', async () => {
    render(<MCPHistory />)
    await screen.findByText('encode-tool')
    let resolveRefresh!: (value: ReturnType<typeof responseFor>) => void
    vi.mocked(grpcQueryMCPToolCallHistory).mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveRefresh = resolve
        }),
    )
    fireEvent.click(screen.getByTitle('YakitButton.refresh'))
    expect(screen.queryByText('encode-tool')).not.toBeInTheDocument()
    expect(screen.queryByText('MCPHistory.emptyList')).not.toBeInTheDocument()
    expect(document.querySelector(`.${styles['history-list-loading']}`)).toBeInTheDocument()
    await act(async () => {
      resolveRefresh(responseFor([summary(3, 'refreshed-tool')]))
    })
    expect(await screen.findByText('refreshed-tool')).toBeInTheDocument()
    expect(document.querySelector(`.${styles['history-list-loading']}`)).not.toBeInTheDocument()
  })

  it('默认按成功状态查询第一页', async () => {
    render(<MCPHistory />)
    expect(await screen.findByText('encode-tool')).toBeInTheDocument()
    expect(vi.mocked(grpcQueryMCPToolCallHistory).mock.calls[0][0]).toMatchObject({
      Keyword: '',
      Status: 'success',
      Pagination: { Page: 1, Limit: 30 },
    })
    expect(screen.getByText('now-tool')).toBeInTheDocument()
  })

  it('切换失败状态后按新状态重新查询第一页', async () => {
    vi.mocked(grpcQueryMCPToolCallHistory)
      .mockResolvedValueOnce(responseFor([summary(1, 'ok-tool')]))
      .mockResolvedValueOnce(responseFor([summary(2, 'bad-tool', false)]))
    render(<MCPHistory />)
    await screen.findByText('ok-tool')
    fireEvent.click(screen.getByRole('radio', { name: 'MCPHistory.failed' }))
    await screen.findByText('bad-tool')
    expect(screen.queryByText('ok-tool')).not.toBeInTheDocument()
    expect(vi.mocked(grpcQueryMCPToolCallHistory).mock.calls[1][0]).toMatchObject({
      Status: 'failed',
      Pagination: { Page: 1 },
    })
  })

  it('搜索防抖仅查询最终关键词，清空后恢复', async () => {
    render(<MCPHistory />)
    await screen.findByText('encode-tool')
    const search = screen.getByRole('textbox')
    fireEvent.change(search, { target: { value: 'first' } })
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 250))
    })
    expect(grpcQueryMCPToolCallHistory).toHaveBeenCalledTimes(1)
    fireEvent.change(search, { target: { value: ' final ' } })
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 350))
    })
    expect(grpcQueryMCPToolCallHistory).toHaveBeenCalledTimes(2)
    expect(vi.mocked(grpcQueryMCPToolCallHistory).mock.calls[1][0]).toMatchObject({ Keyword: 'final' })
    fireEvent.change(search, { target: { value: '' } })
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 350))
    })
    expect(grpcQueryMCPToolCallHistory).toHaveBeenCalledTimes(3)
    expect(vi.mocked(grpcQueryMCPToolCallHistory).mock.calls[2][0]).toMatchObject({ Keyword: '' })
  })

  it('左栏可收起与展开，收起期间不重复查询', async () => {
    render(<MCPHistory />)
    await screen.findByText('encode-tool')
    fireEvent.click(screen.getByTitle('YakitButton.collapse'))
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
    expect(screen.queryByText('encode-tool')).not.toBeInTheDocument()
    expect(grpcQueryMCPToolCallHistory).toHaveBeenCalledTimes(1)
    fireEvent.click(screen.getByTitle('YakitButton.expand'))
    expect(await screen.findByText('encode-tool')).toBeInTheDocument()
    expect(grpcQueryMCPToolCallHistory).toHaveBeenCalledTimes(1)
  })

  it('打开详情后收起左栏，详情头部保留展开按钮与工具名', async () => {
    vi.mocked(grpcGetMCPToolCallHistoryDetail).mockImplementation((req: { ID: number }) =>
      Promise.resolve(detailOf(req.ID, { ToolName: `detail-tool-${req.ID}` })),
    )
    render(<MCPHistory />)
    fireEvent.click(await screen.findByText('encode-tool'))
    await waitFor(() => expect(screen.getByText('detail-tool-1')).toBeInTheDocument())
    fireEvent.click(screen.getByTitle('YakitButton.collapse'))
    expect(screen.getByText('detail-tool-1')).toBeInTheDocument()
    fireEvent.click(screen.getByTitle('YakitButton.expand'))
    expect(await screen.findByRole('textbox')).toBeInTheDocument()
  })

  it('详情请求未完成时收起左栏，展开按钮仍可用', async () => {
    let resolveDetail!: (value: MCPToolCallHistory) => void
    vi.mocked(grpcGetMCPToolCallHistoryDetail).mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveDetail = resolve
        }),
    )
    render(<MCPHistory />)
    // 触发详情请求但保持 pending
    fireEvent.click(await screen.findByText('encode-tool'))
    expect(screen.queryByTitle('YakitButton.expand')).not.toBeInTheDocument()
    fireEvent.click(screen.getByTitle('YakitButton.collapse'))
    // loading 分支也渲染展开按钮，用户不会被卡住
    expect(screen.getByTitle('YakitButton.expand')).toBeInTheDocument()
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
    fireEvent.click(screen.getByTitle('YakitButton.expand'))
    expect(await screen.findByRole('textbox')).toBeInTheDocument()
    await act(async () => {
      resolveDetail(detailOf(1))
    })
    await waitFor(() => expect(screen.getByText('detail-tool')).toBeInTheDocument())
  })

  it('结果与错误同时存在时展示双 Tab 并可切换', async () => {
    vi.mocked(grpcGetMCPToolCallHistoryDetail).mockResolvedValue(
      detailOf(2, { Result: '{"ok":true}', ErrorMessage: 'boom-error' }),
    )
    render(<MCPHistory />)
    fireEvent.click(await screen.findByText('now-tool'))
    await waitFor(() => expect(screen.getAllByTestId('editor-value')[1]).toHaveTextContent('"ok": true'))
    fireEvent.click(screen.getByText('MCPHistory.error'))
    await waitFor(() => expect(screen.getAllByTestId('editor-value')[1]).toHaveTextContent('boom-error'))
  })

  it('仅错误信息时自动选中错误 Tab', async () => {
    vi.mocked(grpcGetMCPToolCallHistoryDetail).mockResolvedValue(
      detailOf(2, { Result: '', ErrorMessage: 'only-error' }),
    )
    render(<MCPHistory />)
    fireEvent.click(await screen.findByText('now-tool'))
    await waitFor(() => expect(screen.getByText('MCPHistory.error')).toBeInTheDocument())
    expect(screen.queryByText('MCPHistory.result')).not.toBeInTheDocument()
    const values = screen.getAllByTestId('editor-value')
    expect(values[values.length - 1]).toHaveTextContent('only-error')
  })

  it('加载更多请求下一页并按 ID 去重追加', async () => {
    vi.mocked(grpcQueryMCPToolCallHistory)
      .mockResolvedValueOnce(responseFor([summary(1, 'page1-tool')], 2))
      .mockResolvedValueOnce(responseFor([summary(1, 'page1-tool'), summary(2, 'page2-tool')], 2))
    render(<MCPHistory />)
    await screen.findByText('page1-tool')
    fireEvent.click(screen.getByText('load-more'))
    await screen.findByText('page2-tool')
    expect(vi.mocked(grpcQueryMCPToolCallHistory).mock.calls[1][0]).toMatchObject({ Pagination: { Page: 2 } })
    expect(screen.getAllByText('page1-tool')).toHaveLength(1)
  })

  it('旧查询晚返回时不覆盖新搜索结果', async () => {
    let resolveOld!: (value: ReturnType<typeof responseFor>) => void
    vi.mocked(grpcQueryMCPToolCallHistory)
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveOld = resolve
          }),
      )
      .mockResolvedValueOnce(responseFor([summary(2, 'new-tool')]))
    render(<MCPHistory />)
    await waitFor(() => expect(grpcQueryMCPToolCallHistory).toHaveBeenCalledTimes(1))
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'new' } })
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 350))
    })
    await screen.findByText('new-tool')
    await act(async () => {
      resolveOld(responseFor([summary(1, 'old-tool')]))
    })
    expect(screen.getByText('new-tool')).toBeInTheDocument()
    expect(screen.queryByText('old-tool')).not.toBeInTheDocument()
  })

  it('删除按当前状态过滤执行并在确认后刷新', async () => {
    render(<MCPHistory />)
    await screen.findByText('encode-tool')
    fireEvent.click(screen.getByTitle('MCPHistory.clearHistoryTitle'))
    const modal = vi.mocked(YakitModalConfirm).mock.calls[0][0]
    await act(async () => {
      modal.onOk?.(undefined as unknown as React.MouseEvent)
    })
    expect(grpcDeleteMCPToolCallHistory).toHaveBeenCalledExactlyOnceWith({
      DeleteAll: false,
      DeleteFiltered: true,
      Keyword: undefined,
      Status: 'success',
    })
    await waitFor(() => expect(grpcQueryMCPToolCallHistory).toHaveBeenCalledTimes(2))
  })
})
