import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { ReactNode } from 'react'
import type { FuzzerResponse } from '../../../HTTPFuzzerPage'
import type * as FuzzerRawStoreModule from '../../../fuzzerRawStore'
import { compileReactModule } from '@/utils/__test__/helpers/compileReactModule'
import type * as HTTPFuzzerPageTableModule from '../HTTPFuzzerPageTable'

const { HTTPFuzzerPageTable } = await compileReactModule<typeof HTTPFuzzerPageTableModule>(
  import.meta.url,
  '../HTTPFuzzerPageTable.tsx',
)

vi.mock('@/i18n/useI18nNamespaces', () => ({
  useI18nNamespaces: () => ({ t: (key: string) => key, i18n: { language: 'zh' }, i18nRefresh: 0 }),
}))
vi.mock('@/components/TableVirtualResize/TableVirtualResize', () => ({
  TableVirtualResize: ({
    data,
    currentSelectItem,
    onSetCurrentRow,
  }: {
    data: FuzzerResponse[]
    currentSelectItem?: FuzzerResponse
    onSetCurrentRow?: (row?: FuzzerResponse) => void
    [key: string]: unknown
  }) => (
    <div>
      <div data-testid="table-current" data-uuid={currentSelectItem?.UUID ?? ''} />
      {data.map((row, index) => (
        <button
          key={row.RowKey ?? row.UUID ?? index}
          data-testid={`row-${row.RowKey ?? row.UUID}`}
          onClick={() => onSetCurrentRow?.(row)}
        >
          {row.UUID}
        </button>
      ))}
    </div>
  ),
}))
vi.mock('@/components/yakitUI/YakitResizeBox/YakitResizeBox', () => ({
  YakitResizeBox: ({
    firstNode,
    secondNode,
    secondNodeStyle,
  }: {
    firstNode?: ReactNode
    secondNode?: ReactNode
    secondNodeStyle?: React.CSSProperties
    [key: string]: unknown
  }) => (
    <div>
      <div data-testid="resize-second-style">{JSON.stringify(secondNodeStyle ?? null)}</div>
      {firstNode}
      {secondNode}
    </div>
  ),
}))
vi.mock('@/utils/editors', () => ({
  HTTP_PACKET_EDITOR_Response_Info: 'HTTP_PACKET_EDITOR_Response_Info',
  NewHTTPPacketEditor: ({ previewResponseId }: { previewResponseId?: string }) => (
    <div data-testid="packet-editor" data-preview-id={previewResponseId ?? ''} />
  ),
}))
vi.mock('../../../HTTPFuzzerPage', () => ({
  analyzeFuzzerResponse: vi.fn(),
  ByteCountTag: () => null,
  copyAsUrl: vi.fn(),
  onAddOverlayWidget: vi.fn(),
  isResponseChunkedData: () => false,
}))
vi.mock('@/utils/kv', () => ({
  getRemoteValue: vi.fn(async () => 'true'),
  setRemoteValue: vi.fn(),
}))
vi.mock('@/utils/notification', () => ({
  failed: vi.fn(),
  yakitFailed: vi.fn(),
  yakitNotify: vi.fn(),
}))
vi.mock('@/pages/yakitStore/viewers/base', () => ({
  compareAsc: (a?: number, b?: number) => (a || 0) - (b || 0),
  compareDesc: (a?: number, b?: number) => (b || 0) - (a || 0),
}))
vi.mock('@/components/HTTPFlowTable/HTTPFlowTable', () => ({
  DurationMsToColor: () => '',
  StatusCodeToColor: () => '',
  RangeInputNumberTable: () => null,
}))
vi.mock('@/utils/openWebsite', () => ({
  openABSFileLocated: vi.fn(),
  openExternalWebsite: vi.fn(),
  openPacketNewWindow: vi.fn(),
}))
vi.mock('@/components/yakitUI/YakitModal/YakitModalConfirm', () => ({
  showYakitModal: vi.fn(),
}))
vi.mock('../../../fuzzerRawStore', async (importOriginal) => {
  const actual = await importOriginal<typeof FuzzerRawStoreModule>()
  return { ...actual, useFuzzerResponseRaw: () => new Uint8Array() }
})

const makeRow = (uuid: string, count: number, rawScope?: string): FuzzerResponse =>
  ({ UUID: uuid, RowKey: uuid, Count: count, RawScope: rawScope }) as FuzzerResponse

const baseProps = {
  setQuery: vi.fn(),
  extractedMap: new Map<string, string>(),
  isEnd: true,
  inViewport: true,
}

afterEach(cleanup)

describe('HTTPFuzzerPageTable 选中行淘汰清理', () => {
  it('选中行被渲染上限淘汰时清空选中并还原全屏', async () => {
    const rowA = makeRow('aaa', 1)
    const rowB = makeRow('bbb', 2)
    const { rerender } = render(<HTTPFuzzerPageTable {...baseProps} data={[rowA, rowB]} />)

    // 初始未选中：无详情编辑器，secondNode 收起
    expect(screen.queryByTestId('packet-editor')).not.toBeInTheDocument()

    // 点击行选中（onSetCurrentRow 防抖 200ms）
    await waitFor(() => fireEvent.click(screen.getByTestId('row-aaa')))
    await waitFor(() => {
      expect(screen.getByTestId('packet-editor')).toHaveAttribute('data-preview-id', 'aaa')
      expect(screen.getByTestId('table-current')).toHaveAttribute('data-uuid', 'aaa')
    })

    // 数据更新且选中行被淘汰：清空选中 + 还原全屏（secondNodeStyle 折叠为 display:none）
    rerender(<HTTPFuzzerPageTable {...baseProps} data={[rowB]} />)
    await waitFor(() => {
      expect(screen.queryByTestId('packet-editor')).not.toBeInTheDocument()
      expect(screen.getByTestId('table-current')).toHaveAttribute('data-uuid', '')
    })
    expect(screen.getByTestId('resize-second-style').textContent).toContain('"display":"none"')
  })

  it('数据更新但选中行仍在列表时不误清选中', async () => {
    const rowA = makeRow('aaa', 1)
    const rowB = makeRow('bbb', 2)
    const { rerender } = render(<HTTPFuzzerPageTable {...baseProps} data={[rowA, rowB]} />)

    await waitFor(() => fireEvent.click(screen.getByTestId('row-aaa')))
    await waitFor(() => expect(screen.getByTestId('packet-editor')).toHaveAttribute('data-preview-id', 'aaa'))

    // 新数组引用、选中行仍在（模拟流式追加）：选中保留
    await act(async () => {
      rerender(<HTTPFuzzerPageTable {...baseProps} data={[makeRow('aaa', 1), makeRow('bbb', 2), makeRow('ccc', 3)]} />)
      // 等清选中效果与节流重建（500ms）都跑完再断言，避免「效果未跑」假阳性
      await new Promise((resolve) => setTimeout(resolve, 700))
    })
    expect(screen.getByTestId('packet-editor')).toHaveAttribute('data-preview-id', 'aaa')
    expect(screen.getByTestId('table-current')).toHaveAttribute('data-uuid', 'aaa')
  })

  it('同 UUID 但不同 RawScope 的行不能留住详情：选中 scope A 行淘汰后须清空', async () => {
    const rowA = makeRow('same', 1, 'seq:group:concurrency:a')
    const rowB = makeRow('same', 2, 'seq:group:concurrency:b')
    const { rerender } = render(<HTTPFuzzerPageTable {...baseProps} data={[rowA, rowB]} />)

    await waitFor(() => fireEvent.click(screen.getByTestId('row-seq:group:concurrency:a|same')))
    await waitFor(() => expect(screen.getByTestId('packet-editor')).toHaveAttribute('data-preview-id', 'same'))

    // scope A 行被淘汰、仅剩 scope B 同 UUID 行：选中行按 scope+UUID 已不存在，须清空选中
    rerender(<HTTPFuzzerPageTable {...baseProps} data={[rowB]} />)
    await waitFor(() => {
      expect(screen.queryByTestId('packet-editor')).not.toBeInTheDocument()
      expect(screen.getByTestId('table-current')).toHaveAttribute('data-uuid', '')
    })
  })

  it('选中行换成另一 RawScope 的同 UUID 行时不误清', async () => {
    const rowA = makeRow('same', 1, 'seq:group:concurrency:a')
    const rowB = makeRow('same', 2, 'seq:group:concurrency:b')
    const { rerender } = render(<HTTPFuzzerPageTable {...baseProps} data={[rowA, rowB]} />)

    await waitFor(() => fireEvent.click(screen.getByTestId('row-seq:group:concurrency:a|same')))
    await waitFor(() => expect(screen.getByTestId('packet-editor')).toHaveAttribute('data-preview-id', 'same'))

    // scope A 行淘汰后用户点选了 scope B 的同 UUID 行（RawScope 不同即新行）：选中保留
    await waitFor(() => fireEvent.click(screen.getByTestId('row-seq:group:concurrency:b|same')))
    await act(async () => {
      rerender(<HTTPFuzzerPageTable {...baseProps} data={[rowB]} />)
      await new Promise((resolve) => setTimeout(resolve, 700))
    })
    expect(screen.getByTestId('packet-editor')).toHaveAttribute('data-preview-id', 'same')
    expect(screen.getByTestId('table-current')).toHaveAttribute('data-uuid', 'same')
  })
})
