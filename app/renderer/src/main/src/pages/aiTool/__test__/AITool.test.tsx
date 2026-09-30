import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { GetAIToolListResponse } from '../../ai-agent/type/aiTool'
import type { AITool } from '../../ai-agent/type/aiTool'
import { genDefaultPagination } from '@/pages/invoker/schema'

// 被测页面通过 ForgeName 弹窗组件承接导出/导入，mock 掉以捕获 open 参数并隔离 electron 依赖
const { openExportMock, openImportMock } = vi.hoisted(() => ({
  openExportMock: vi.fn(),
  openImportMock: vi.fn(),
}))
vi.mock('../../ai-agent/forgeName/ForgeName', async () => {
  const { forwardRef, useImperativeHandle } = await import('react')
  return {
    BatchExportAIforge: forwardRef((props: { isTool?: boolean }, ref: any) => {
      useImperativeHandle(ref, () => ({ open: (...args: any[]) => openExportMock(...args) }))
      return <div data-testid="batch-export-modal" data-is-tool={String(!!props.isTool)} />
    }),
    ImportAIforge: forwardRef((props: { isTool?: boolean; onSuccess?: () => void }, ref: any) => {
      useImperativeHandle(ref, () => ({ open: (...args: any[]) => openImportMock(...args) }))
      return (
        <div data-testid="import-modal" data-is-tool={String(!!props.isTool)}>
          <button data-testid="import-onsuccess" onClick={props.onSuccess} />
        </div>
      )
    }),
  }
})

vi.mock('../../ai-agent/aiToolList/utils', () => ({
  grpcGetAIToolList: vi.fn(),
  grpcDeleteAITool: vi.fn(),
  grpcToggleAIToolFavorite: vi.fn(),
}))
vi.mock('../../ai-agent/aiToolList/AIToolList', () => ({
  handleAddAITool: vi.fn(),
  handleModifyAITool: vi.fn(),
  toolMenu: () => [
    { key: 'copy', label: 'copy' },
    { key: 'delete', label: 'delete' },
  ],
  toolTypeOptions: () => [
    { label: 'all', value: 'all' },
    { label: 'collect', value: 'collect' },
  ],
}))
vi.mock('@/hook/useResultEmpty/SearchEmpty', () => ({ useEmptyImage: () => '' }))
vi.mock('@/utils/clipboard', () => ({ setClipboardText: vi.fn() }))
vi.mock('@/utils/notification', () => ({ yakitNotify: vi.fn() }))
vi.mock('@/i18n/useI18nNamespaces', () => ({
  useI18nNamespaces: () => ({ t: (key: string) => key, i18nRefresh: 0 }),
}))

// jsdom 无 IntersectionObserver，useInViewport 恒真即可；其余（useSelections 等）保持真实实现
vi.mock('ahooks', async (importOriginal) => {
  const actual = (await importOriginal()) as Record<string, unknown>
  return { ...actual, useInViewport: () => [true, { current: null }] }
})

// 网格/按钮/勾选等 UI 组件打桩为可交互的最小 DOM，保证选择与导出交互可控可断言
vi.mock('../../pluginHub/pluginHubList/funcTemplate', () => ({
  HubGridList: (props: any) => (
    <div data-testid="hub-list">
      {(props.data || []).map((it: any, i: number) => props.gridNode({ index: i, data: it }))}
    </div>
  ),
  HubGridOpt: (props: any) => (
    <div
      data-testid={`opt-${props.info.ID}`}
      data-checked={props.checked ? 'true' : 'false'}
      onClick={() => props.onCheck?.(props.info)}
    >
      <div data-testid={`opt-extra-${props.info.ID}`}>{props.extraFooter?.(props.info)}</div>
    </div>
  ),
}))
vi.mock('@/components/yakitUI/YakitButton/YakitButton', () => ({
  YakitButton: ({ children, icon, ...rest }: any) => (
    <button {...rest}>
      {icon}
      {children}
    </button>
  ),
}))
vi.mock('@/components/yakitUI/YakitInput/YakitInput', () => ({
  YakitInput: Object.assign((props: any) => <input {...props} />, {
    Search: (props: any) => (
      <div>
        <input data-testid="kw-input" value={props.value ?? ''} onChange={props.onChange} />
        <button data-testid="kw-search" onClick={() => props.onSearch?.(props.value)} />
      </div>
    ),
  }),
}))
vi.mock('@/components/yakitUI/YakitCheckbox/YakitCheckbox', () => ({
  YakitCheckbox: ({ indeterminate, ...rest }: any) => (
    <input type="checkbox" data-testid="select-all-checkbox" data-indeterminate={String(!!indeterminate)} {...rest} />
  ),
}))
vi.mock('@/components/yakitUI/YakitSpin/YakitSpin', () => ({
  YakitSpin: (props: any) => <div>{props.children}</div>,
}))
vi.mock('@/components/yakitUI/YakitEmpty/YakitEmpty', () => ({
  YakitEmpty: () => <div data-testid="empty" />,
}))
vi.mock('@/components/yakitUI/YakitRadioButtons/YakitRadioButtons', () => ({
  YakitRadioButtons: (props: any) => (
    <div data-testid="radio-buttons">
      {(props.options || []).map((o: any) => (
        <button key={o.value} data-value={o.value} onClick={() => props.onChange({ target: { value: o.value } })} />
      ))}
    </div>
  ),
}))
vi.mock('@/components/yakitUI/YakitDropdownMenu/YakitDropdownMenu', () => ({
  YakitDropdownMenu: (props: any) => (
    <div data-testid="dropdown">
      {(props.menu?.data || []).map((i: any) => (
        <button key={i.key} data-menu-key={i.key} onClick={() => props.menu.onClick({ key: i.key })} />
      ))}
    </div>
  ),
}))
vi.mock('@/components/TableTotalAndSelectNumber/TableTotalAndSelectNumber', () => ({
  TableTotalAndSelectNumber: (props: any) => (
    <div data-testid="total-and-select" data-total={props.total} data-select={props.selectNum} />
  ),
}))

import AIToolPage from '../AITool'
import { grpcDeleteAITool, grpcGetAIToolList } from '../../ai-agent/aiToolList/utils'
import { yakitNotify } from '@/utils/notification'

const mockGetAIToolList = vi.mocked(grpcGetAIToolList)
const mockDeleteAITool = vi.mocked(grpcDeleteAITool)

const makeTool = (id: number, name: string, verboseName?: string): AITool => ({
  ID: id,
  Name: name,
  VerboseName: verboseName || '',
  Description: '',
  Content: '',
  ToolPath: '',
  Keywords: [],
  IsFavorite: false,
  UpdatedAt: 0,
  CreatedAt: 0,
  IsBuiltin: false,
  Author: '',
})

// 每次调用返回全新对象：fetchData 会原地 ++ 修改 Pagination.Page，避免用例间串扰
const makeListResponse = (): GetAIToolListResponse => ({
  Tools: [makeTool(1, 'tool-a', '工具A'), makeTool(2, 'tool-b')],
  Pagination: { ...genDefaultPagination(20), Page: 1 },
  Total: 2,
})

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

// 首次请求后 loading 有 300ms 收尾窗口，期间 fetchData 直接 return；交互类用例需先等窗口结束
const renderAndWaitReady = async () => {
  const utils = render(<AIToolPage pageId={'test-page'} />)
  await waitFor(() => {
    expect(screen.getByTestId('opt-1')).toBeInTheDocument()
    expect(screen.getByTestId('opt-2')).toBeInTheDocument()
  })
  await sleep(500)
  return utils
}

const clickBatchExport = () => fireEvent.click(screen.getByRole('button', { name: /YakitButton\.batchExport/ }))
const selectNum = () => screen.getByTestId('total-and-select').getAttribute('data-select')

describe('AITool 批量选择与导入导出', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetAIToolList.mockImplementation(async () => makeListResponse())
  })

  it('页面挂载 BatchExportAIforge / ImportAIforge 并传 isTool', () => {
    render(<AIToolPage pageId={'test-page'} />)
    expect(screen.getByTestId('batch-export-modal')).toHaveAttribute('data-is-tool', 'true')
    expect(screen.getByTestId('import-modal')).toHaveAttribute('data-is-tool', 'true')
  })

  it('部分选中：批量导出按选中名单传 ToolNames', async () => {
    await renderAndWaitReady()
    fireEvent.click(screen.getByTestId('opt-1'))
    expect(selectNum()).toBe('1')
    expect(screen.getByTestId('opt-1')).toHaveAttribute('data-checked', 'true')
    expect(screen.getByTestId('opt-2')).toHaveAttribute('data-checked', 'false')

    clickBatchExport()
    expect(openExportMock).toHaveBeenCalledTimes(1)
    expect(openExportMock).toHaveBeenCalledWith({ ToolNames: ['tool-a'] })
  })

  it('全选：批量导出按当前过滤条件传 Filter（默认 tab、空关键词）', async () => {
    await renderAndWaitReady()
    const selectAll = screen.getByTestId('select-all-checkbox')
    expect(selectAll).toHaveProperty('indeterminate', false)
    fireEvent.click(selectAll)
    expect(selectNum()).toBe('2')
    expect(selectAll).toHaveProperty('checked', true)

    clickBatchExport()
    expect(openExportMock).toHaveBeenCalledWith({ Filter: { Keyword: '', OnlyFavorites: false } })
  })

  it('带关键词搜索后全选导出：Filter 携带 Keyword', async () => {
    await renderAndWaitReady()
    fireEvent.change(screen.getByTestId('kw-input'), { target: { value: 'kw' } })
    fireEvent.click(screen.getByTestId('kw-search'))
    await sleep(400)
    expect(mockGetAIToolList.mock.calls.length).toBeGreaterThanOrEqual(3)

    fireEvent.click(screen.getByTestId('select-all-checkbox'))
    clickBatchExport()
    expect(openExportMock).toHaveBeenCalledWith({ Filter: { Keyword: 'kw', OnlyFavorites: false } })
  })

  it('切到收藏 tab 后全选导出：Filter.OnlyFavorites 为 true 且关键词被清空', async () => {
    await renderAndWaitReady()
    fireEvent.change(screen.getByTestId('kw-input'), { target: { value: 'kw' } })
    fireEvent.click(screen.getByTestId('kw-search'))
    await sleep(400)

    fireEvent.click(screen.getByTestId('radio-buttons').querySelector('[data-value="collect"]')!)
    await sleep(400)

    fireEvent.click(screen.getByTestId('select-all-checkbox'))
    clickBatchExport()
    expect(openExportMock).toHaveBeenCalledWith({ Filter: { Keyword: '', OnlyFavorites: true } })
  })

  it('单项导出：按工具名组装 ToolNames 与 OutputName', async () => {
    await renderAndWaitReady()
    const extraA = screen.getByTestId('opt-extra-1')
    fireEvent.click(extraA.querySelector('[data-menu-key="export"]')!)
    expect(openExportMock).toHaveBeenCalledWith({ ToolNames: ['tool-a'], OutputName: '工具A' })

    const extraB = screen.getByTestId('opt-extra-2')
    fireEvent.click(extraB.querySelector('[data-menu-key="export"]')!)
    expect(openExportMock).toHaveBeenCalledWith({ ToolNames: ['tool-b'], OutputName: 'tool-b' })
  })

  it('删除工具：列表过滤且选中集合同步 unSelect', async () => {
    mockDeleteAITool.mockResolvedValue({ IsFavorite: false, Message: '' })
    await renderAndWaitReady()
    fireEvent.click(screen.getByTestId('select-all-checkbox'))
    expect(selectNum()).toBe('2')

    fireEvent.click(screen.getByTestId('opt-extra-1').querySelector('[data-menu-key="delete"]')!)
    await waitFor(() => {
      expect(screen.queryByTestId('opt-1')).not.toBeInTheDocument()
    })
    expect(selectNum()).toBe('1')
    expect(screen.getByTestId('opt-2')).toHaveAttribute('data-checked', 'true')
    expect(yakitNotify).toHaveBeenCalledWith('success', '删除成功')
  })

  it('导入成功回调：刷新列表并清空选中集合', async () => {
    await renderAndWaitReady()
    fireEvent.click(screen.getByTestId('opt-1'))
    expect(selectNum()).toBe('1')

    const callsBefore = mockGetAIToolList.mock.calls.length
    fireEvent.click(screen.getByTestId('import-onsuccess'))
    await waitFor(() => {
      expect(mockGetAIToolList.mock.calls.length).toBeGreaterThan(callsBefore)
    })
    expect(selectNum()).toBe('0')
    expect(screen.getByTestId('opt-1')).toHaveAttribute('data-checked', 'false')
  })
})
