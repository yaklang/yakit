import React, { type ReactElement, type ReactNode, useEffect, useState } from 'react'
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type * as HistoryFilterModule from '../HTTPHistoryFilter'
import type { AIReActChatProps } from '@/pages/ai-re-act/aiReActChat/AIReActChatType'
import type { HttpFlowSelectionApi } from '@/components/useHttpFlowSelection'
import { compileReactModule } from '@/utils/__test__/helpers/compileReactModule'

const bridge = vi.hoisted(() => ({
  mountFlowTable: false,
}))

vi.hoisted(() => {
  Object.defineProperty(window, 'require', {
    configurable: true,
    value: () => ({ ipcRenderer: { invoke: vi.fn(async () => ({})) } }),
  })
})

vi.mock('@/components/historyAIReActChat', () => ({
  HistoryAIReActChatProvider: ({ children }: { children: ReactNode }) => children,
  useHistoryAIReActChat: () => ({
    historyAIReActChatBridge: { activeID: 'session-1' },
    setShowFreeChat: vi.fn(),
    renderHistoryAIReActChat: ({ externalParameters }: Pick<AIReActChatProps, 'externalParameters'>) => (
      <>
        <output aria-label="聊天流量勾选">{externalParameters?.selectedHttpFlowIds?.join(',')}</output>
        <button onClick={() => externalParameters?.onHttpFlowRemove?.('2', false)}>删除单条引用</button>
        <button onClick={() => externalParameters?.onHttpFlowRemove?.('1,2,3', true)}>清空引用</button>
        <button onClick={externalParameters?.onAfterSubmit}>发送完成</button>
      </>
    ),
  }),
}))
vi.mock('lodash', async () => {
  const actual = await vi.importActual<Record<string, unknown>>('lodash')
  const lodash = (actual.default ?? actual) as Record<string, unknown>
  return { ...lodash, default: lodash }
})
vi.mock('@/utils/kv', () => ({
  getRemoteValue: vi.fn(async () => ''),
  setRemoteValue: vi.fn(),
}))
vi.mock('@/i18n/useI18nNamespaces', () => ({
  useI18nNamespaces: () => ({ t: (key: string) => key, i18nRefresh: 0 }),
}))
vi.mock('@/components/HTTPFlowTable/useBuiltinTagList', () => ({
  useBuiltinTagList: () => ({ builtinTagList: [] }),
}))
vi.mock('@/components/HTTPHistory', () => ({ HistoryProcess: () => null, HistoryTab: [] }))
vi.mock('@/components/HTTPFlowTable/HTTPFlowRuleDataFilter', () => ({ HTTPFlowRuleDataFilter: () => null }))
vi.mock('@/components/HTTPFlowTable/HTTPFlowTableFormConfiguration/HTTPFlowTableFormConfiguration', () => ({
  HTTPFlowTableFormConfiguration: () => null,
  defFilterConfig: {
    filterMode: 'shield',
    shield: {
      hostName: [],
      urlPath: [],
      fileSuffix: [],
      searchContentType: [],
      excludeKeywords: [],
      statusCode: '',
    },
    show: {
      hostName: [],
      urlPath: [],
      fileSuffix: [],
      searchContentType: [],
    },
  },
}))
vi.mock('@/components/TableVirtualResize/TableVirtualResize', () => ({
  TableVirtualResize: (props: {
    renderTitle?: ReactNode
    query?: { IncludeId?: number[] }
    columns?: {
      dataKey: string
      filterProps?: { filterRender?: (closePopover: () => void) => ReactNode }
    }[]
    onChange?: (page: number, limit: number, sort: { order: string; orderBy: string }, filter: object) => void
  }) => {
    const idColumn = props.columns?.find((column) => column.dataKey === 'Id')
    return (
      <div>
        {props.renderTitle}
        <output aria-label="查询序号">{(props.query?.IncludeId || []).join(',')}</output>
        <div aria-label="序号列筛选">{idColumn?.filterProps?.filterRender?.(() => {})}</div>
        <button type="button" onClick={() => props.onChange?.(1, 30, { order: 'desc', orderBy: 'Id' }, {})}>
          触发表格筛选
        </button>
      </div>
    )
  },
}))
vi.mock('@/components/HTTPFlowTable/HTTPFlowTable', async () => {
  const utils = await import('@/components/HTTPFlowTable/HTTPFlowTable.utils')
  const constants = await import('@/components/HTTPFlowTable/HTTPFlowTable.constants')
  const actions = await import('@/components/HTTPFlowTable/HTTPFlowTable.actions')
  const colors = await import('@/components/HTTPFlowTable/HTTPFlowTable.availableColors')
  const searchInput = await import('@/components/HTTPFlowTable/components/searchInputTableWrapper')
  return {
    ...utils,
    ...constants,
    ...actions,
    ...colors,
    SearchInputTableWrapper: searchInput.SearchInputTableWrapper,
    HistorySearch: (props: {
      searchVal?: string
      setSearchVal?: (value: string) => void
      handleSearch: (searchValue: string, searchType: string) => void
      onLeaveIdSearch?: () => void
    }) => (
      <div>
        <input
          aria-label="关键词输入"
          value={props.searchVal ?? ''}
          onChange={(event) => props.setSearchVal?.(event.target.value)}
        />
        <button type="button" onClick={() => props.handleSearch(props.searchVal ?? '', 'id')}>
          关键词ID搜索
        </button>
        <button type="button" onClick={() => props.onLeaveIdSearch?.()}>
          离开ID
        </button>
      </div>
    ),
    ColorSearch: () => null,
    AdvancedSet: () => null,
    ImportExportProgress: () => null,
    RangeInputNumberTableWrapper: () => null,
    onExpandHTTPFlow: () => null,
  }
})
vi.mock('@/components/WebTree/WebTree', () => ({ WebTree: () => null }))
vi.mock('react-resize-detector', () => ({ default: () => null }))
vi.mock('@/components/yakitSideTab/YakitSideTab', () => ({
  YakitSideTab: ({ onActiveKey }: { onActiveKey: (key: string) => void }) => (
    <button onClick={() => onActiveKey('ai')}>AI 页签</button>
  ),
}))
vi.mock('@/components/DataExport/DataExport', () => ({}))
vi.mock('@/components/ShowInBrowser', () => ({}))
vi.mock('@/pages/websocket/WebsocketFuzzer', () => ({}))
vi.mock('@/pages/invoker/fromPacketToYakCode', () => ({}))

interface SelectionTableProps {
  onSetSelectedHttpFlowIds: (ids: string[]) => void
  onRegisterTableSelectApi: (api: HttpFlowSelectionApi) => void
}

// 隔离同文件内的重型表格，只模拟其选择 API；父组件的注册、删除分支和引用同步均用真实实现。
function SelectionTable({ onSetSelectedHttpFlowIds, onRegisterTableSelectApi }: SelectionTableProps) {
  const [ids, setIds] = useState<string[]>([])
  useEffect(() => {
    onRegisterTableSelectApi({
      reset: () => setIds([]),
      deselectId: (id) => setIds((previous) => previous.filter((value) => value !== id)),
    })
  }, [onRegisterTableSelectApi])
  useEffect(() => onSetSelectedHttpFlowIds(ids), [ids, onSetSelectedHttpFlowIds])
  return (
    <>
      <button onClick={() => setIds(['1', '2', '3'])}>勾选流量</button>
      <output aria-label="表格勾选">{ids.join(',')}</output>
    </>
  )
}

vi.mock('@/components/yakitUI/YakitResizeBox/YakitResizeBox', () => ({
  YakitResizeBox: ({
    firstNode,
    secondNode,
  }: {
    firstNode: ReactNode
    secondNode: ReactElement<{ children: ReactElement<SelectionTableProps> }>
  }) => (
    <>
      {firstNode}
      <SelectionTable {...secondNode.props.children.props} />
      {bridge.mountFlowTable ? secondNode.props.children : null}
    </>
  ),
}))

const { HTTPHistoryFilter } = await compileReactModule<typeof HistoryFilterModule>(
  import.meta.url,
  '../HTTPHistoryFilter.tsx',
)

beforeEach(() => {
  bridge.mountFlowTable = false
  vi.resetAllMocks()
})
afterEach(cleanup)

const setup = () => {
  const onSetSelectedHttpFlowIds = vi.fn()
  render(
    <HTTPHistoryFilter
      onSetClickedHttpFlow={vi.fn()}
      onSetFirstHttpFlow={vi.fn()}
      onSetSelectedHttpFlowIds={onSetSelectedHttpFlowIds}
      onSetHTTPFlowFilter={vi.fn()}
    />,
  )
  fireEvent.click(screen.getByRole('button', { name: 'AI 页签' }))
  fireEvent.click(screen.getByRole('button', { name: '勾选流量' }))
  expect(screen.getByLabelText('聊天流量勾选')).toHaveTextContent('1,2,3')
  return { onSetSelectedHttpFlowIds }
}

const confirmColumnIds = (value: string) => {
  const columnFilter = screen.getByLabelText('序号列筛选')
  fireEvent.click(within(columnFilter).getByText('SearchInputTableWrapper.search'))
  const input = within(columnFilter).getByRole('textbox')
  fireEvent.change(input, { target: { value } })
  fireEvent.keyDown(input, { key: 'Enter' })
}

const renderFlowTable = async () => {
  bridge.mountFlowTable = true
  render(
    <HTTPHistoryFilter
      onSetClickedHttpFlow={vi.fn()}
      onSetFirstHttpFlow={vi.fn()}
      onSetSelectedHttpFlowIds={vi.fn()}
      onSetHTTPFlowFilter={vi.fn()}
    />,
  )
  await act(async () => {
    await vi.advanceTimersByTimeAsync(1500)
  })
}

describe('HTTPHistoryFilter 序号合并', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('关键词 ID 搜索与序号列取并集，表格筛选变化时按两侧当前值重新合并', async () => {
    await renderFlowTable()
    confirmColumnIds('1,2')
    expect(screen.getByLabelText('查询序号')).toHaveTextContent('1,2')

    fireEvent.change(screen.getByLabelText('关键词输入'), { target: { value: '2,3' } })
    fireEvent.click(screen.getByRole('button', { name: '关键词ID搜索' }))
    expect(screen.getByLabelText('查询序号')).toHaveTextContent('1,2,3')

    const columnInput = within(screen.getByLabelText('序号列筛选')).getByRole('textbox')
    fireEvent.change(columnInput, { target: { value: '9' } })
    fireEvent.click(screen.getByRole('button', { name: '触发表格筛选' }))
    expect(screen.getByLabelText('查询序号')).toHaveTextContent('9,2,3')
  })

  it('离开 ID 后清掉关键词序号，查询只保留序号列', async () => {
    await renderFlowTable()
    confirmColumnIds('1,2')
    fireEvent.change(screen.getByLabelText('关键词输入'), { target: { value: '2,3' } })
    fireEvent.click(screen.getByRole('button', { name: '关键词ID搜索' }))

    fireEvent.click(screen.getByRole('button', { name: '离开ID' }))
    expect(screen.getByLabelText('查询序号')).toHaveTextContent('1,2')
  })
})

describe('HTTPHistoryFilter 流量引用删除', () => {
  it('删除单条只取消对应 ID，并将剩余选择同步到输入框', () => {
    const { onSetSelectedHttpFlowIds } = setup()
    fireEvent.click(screen.getByRole('button', { name: '删除单条引用' }))
    expect(screen.getByLabelText('表格勾选')).toHaveTextContent('1,3')
    expect(onSetSelectedHttpFlowIds).toHaveBeenLastCalledWith(['1', '3'])
    expect(screen.getByLabelText('聊天流量勾选')).toHaveTextContent('1,3')
  })

  it.each(['清空引用', '发送完成'])('%s 清空全部选择和输入框引用', (action) => {
    const { onSetSelectedHttpFlowIds } = setup()
    fireEvent.click(screen.getByRole('button', { name: action }))
    expect(screen.getByLabelText('表格勾选')).toBeEmptyDOMElement()
    expect(onSetSelectedHttpFlowIds).toHaveBeenLastCalledWith([])
    expect(screen.getByLabelText('聊天流量勾选')).toBeEmptyDOMElement()
  })
})
