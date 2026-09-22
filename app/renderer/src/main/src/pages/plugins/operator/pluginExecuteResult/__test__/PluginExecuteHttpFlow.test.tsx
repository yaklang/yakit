import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { ReactNode } from 'react'
import type { HTTPFlowTableProp } from '@/components/HTTPFlowTable/HTTPFlowTable.constants'
import type { HoldGRPCStreamInfo, StreamResult } from '@/hook/useHoldGRPCStream/useHoldGRPCStreamType'
import { compileReactModule } from '@/utils/__test__/helpers/compileReactModule'
import type * as PluginExecuteResultModule from '../PluginExecuteResult'

const tableSelectApi = vi.hoisted(() => ({ reset: vi.fn(), deselectId: vi.fn() }))

const { PluginExecuteResult, PluginExecuteHttpFlow, PluginExecuteLog } = await compileReactModule<
  typeof PluginExecuteResultModule
>(import.meta.url, '../PluginExecuteResult.tsx')

vi.hoisted(() => {
  Object.defineProperty(window, 'require', {
    configurable: true,
    value: () => ({ ipcRenderer: { invoke: vi.fn() } }),
  })
})

vi.mock('@/i18n/useI18nNamespaces', () => ({
  useI18nNamespaces: () => ({ t: (key: string) => key, i18n: { language: 'zh' }, i18nRefresh: 0 }),
}))
vi.mock('react-resize-detector', () => ({ default: () => null }))
vi.mock('@/components/HTTPHistory', () => ({
  HTTPFlowRealTimeTableAndEditor: ({
    pageType,
    runtimeId,
    params,
    onSetSelectedHttpFlowIds,
    onRegisterTableSelectApi,
  }: HTTPFlowTableProp & { runtimeId?: string }) => (
    <div
      data-testid="http-table"
      data-page-type={pageType}
      data-runtime-id={runtimeId}
      data-source-type={params?.SourceType}
    >
      <button onClick={() => onSetSelectedHttpFlowIds?.(['1', '2'])}>勾选流量</button>
      <button onClick={() => onSetSelectedHttpFlowIds?.([])}>取消勾选</button>
      <button onClick={() => onRegisterTableSelectApi?.(tableSelectApi)}>注册选择接口</button>
    </div>
  ),
}))
vi.mock('@/components/yakitUI/YakitResizeBox/YakitResizeBox', () => ({
  YakitResizeBox: ({ firstNode, secondNode }: { firstNode?: ReactNode; secondNode?: ReactNode }) => (
    <>
      {firstNode}
      {secondNode}
    </>
  ),
}))
vi.mock('@/components/businessUI/PluginTabs/PluginTabs', () => ({
  default: ({ items }: { items: { key: string; children: ReactNode }[] }) => (
    <div>
      {items.map((item) => (
        <div key={item.key}>{item.children}</div>
      ))}
    </div>
  ),
}))
vi.mock('../../horizontalScrollCard/HorizontalScrollCard', () => ({ HorizontalScrollCard: () => null }))
vi.mock('@/components/TableVirtualResize/TableVirtualResize', () => ({
  TableVirtualResize: ({
    data,
    onChange,
  }: {
    data: { name: string }[]
    onChange: (page: number, limit: number, sorter: { order: string }, filters: object) => void
  }) => (
    <div>
      <output data-testid="custom-rows">{data.map((row) => row.name).join(',')}</output>
      <button onClick={() => onChange(1, 50, { order: 'none' }, { name: 'match' })}>筛选匹配行</button>
    </div>
  ),
}))
vi.mock('@/pages/yakitStore/viewers/base', () => ({ formatJson: vi.fn() }))
vi.mock('@/components/baseConsole/BaseConsole', () => ({ EngineConsole: () => null }))
vi.mock('@/components/WebTree/WebTree', async () => {
  const { forwardRef } = await import('react')
  return { WebTree: forwardRef(() => null) }
})
vi.mock('@/components/DataExport/DataExport', () => ({ ExportExcel: () => null }))
vi.mock('@/components/yakitUI/YakitEditor/YakitEditor', () => ({ YakitEditor: () => null }))
vi.mock('@/pages/assetViewer/PortTable/PortTable', () => ({ PortTable: () => null }))
vi.mock('@/pages/assetViewer/PortTable/utils', () => ({ defQueryPortsRequest: {} }))
vi.mock('@/utils/notification', () => ({ yakitFailed: vi.fn() }))
vi.mock('@/pages/fuzzer/components/HTTPFuzzerPageTable/HTTPFuzzerPageTable', () => ({
  sorterFunction: (list: unknown[]) => list,
}))
vi.mock('@/pages/risks/YakitRiskTable/YakitRiskTable', () => ({ YakitRiskTable: () => null }))
vi.mock('@/pages/risks/YakitRiskTable/constants', () => ({ defQueryRisksRequest: {} }))
vi.mock('@/pages/risks/YakitRiskTable/utils', () => ({
  apiQueryRisksTotalByRuntimeId: vi.fn(async () => ({ Total: 0 })),
}))
vi.mock('../LocalPluginLog', () => ({
  LocalList: () => null,
  LocalText: () => null,
  LocalPluginLog: ({ loading, list }: { loading: boolean; list: StreamResult.Log[] }) => (
    <div data-testid="plugin-log" data-loading={loading}>
      {list.map((item) => (
        <div key={item.id}>{item.data}</div>
      ))}
    </div>
  ),
}))
vi.mock('@/pages/yakRunnerCodeScan/CodeScanResultTable/CodeScanResultTable', () => ({ CodeScanResult: () => null }))
vi.mock('@/pages/yakRunnerAuditHole/YakitAuditHoleTable/YakitAuditHoleTable', () => ({
  YakitAuditHoleTable: () => null,
}))
vi.mock('@/utils/tool', () => ({ JSONParseLog: vi.fn() }))
vi.mock('@/utils/clipboard', () => ({ setClipboardText: vi.fn() }))

describe('PluginExecuteHttpFlow 查询范围', () => {
  it.each(['History', 'Plugin'] as const)('%s 模式透传勾选变化与表格选择接口', (pageType) => {
    const onSetSelectedHttpFlowIds = vi.fn()
    const onRegisterTableSelectApi = vi.fn<NonNullable<HTTPFlowTableProp['onRegisterTableSelectApi']>>()
    render(
      <PluginExecuteHttpFlow
        pageType={pageType}
        runtimeId={pageType === 'History' ? '' : 'runtime-1'}
        onSetSelectedHttpFlowIds={onSetSelectedHttpFlowIds}
        onRegisterTableSelectApi={onRegisterTableSelectApi}
      />,
    )

    fireEvent.click(screen.getByText('勾选流量'))
    expect(onSetSelectedHttpFlowIds).toHaveBeenLastCalledWith(['1', '2'])
    fireEvent.click(screen.getByText('取消勾选'))
    expect(onSetSelectedHttpFlowIds).toHaveBeenLastCalledWith([])

    fireEvent.click(screen.getByText('注册选择接口'))
    expect(onRegisterTableSelectApi).toHaveBeenCalledWith(tableSelectApi)
    const [registeredApi] = onRegisterTableSelectApi.mock.calls[0]
    registeredApi.reset()
    registeredApi.deselectId('1')
    expect(tableSelectApi.reset).toHaveBeenCalled()
    expect(tableSelectApi.deselectId).toHaveBeenLastCalledWith('1')
  })

  it.each([false, true])('History 模式透传空 runtimeId 和显式空来源（isCrawler：%s）', (isCrawler) => {
    render(
      <PluginExecuteHttpFlow
        pageType="History"
        runtimeId=""
        sourceType=""
        isCrawler={isCrawler}
        showAdvancedSearch
        showSetting
      />,
    )
    const table = screen.getByTestId('http-table')
    expect(table).toHaveAttribute('data-page-type', 'History')
    expect(table).toHaveAttribute('data-runtime-id', '')
    expect(table).toHaveAttribute('data-source-type', '')
  })

  it.each([
    { isCrawler: false, sourceType: 'scan' },
    { isCrawler: true, sourceType: 'basic-crawler' },
  ])('Plugin 模式保留 runtimeId 和来源筛选（$sourceType）', ({ isCrawler, sourceType }) => {
    render(<PluginExecuteHttpFlow pageType="Plugin" runtimeId="runtime-1" isCrawler={isCrawler} />)
    const table = screen.getByTestId('http-table')
    expect(table).toHaveAttribute('data-page-type', 'Plugin')
    expect(table).toHaveAttribute('data-runtime-id', 'runtime-1')
    expect(table).toHaveAttribute('data-source-type', sourceType)
  })
})

describe('PluginExecuteLog（启用 React Compiler）', () => {
  const messages: StreamResult.Log[] = [{ id: 'log-1', level: 'info', data: '原始日志', timestamp: 1 }]

  it.each([true, false])('日志数组不变时同步 loading（初始值 %s）', (loading) => {
    const { rerender } = render(<PluginExecuteLog loading={loading} messageList={messages} />)
    expect(screen.getByTestId('plugin-log')).toHaveAttribute('data-loading', String(loading))
    rerender(<PluginExecuteLog loading={!loading} messageList={messages} />)
    expect(screen.getByTestId('plugin-log')).toHaveAttribute('data-loading', String(!loading))
  })

  it('收到新日志后更新列表', () => {
    const { rerender } = render(<PluginExecuteLog loading messageList={messages} />)
    expect(screen.getByTestId('plugin-log')).toHaveTextContent('原始日志')
    rerender(<PluginExecuteLog loading messageList={[{ ...messages[0], data: '更新后的日志' }]} />)
    expect(screen.getByTestId('plugin-log')).toHaveTextContent('更新后的日志')
    expect(screen.getByTestId('plugin-log')).not.toHaveTextContent('原始日志')
  })
})

describe('PluginExecuteResult（经过 React Compiler 处理）', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => {
    cleanup()
    vi.clearAllTimers()
    vi.useRealTimers()
  })

  const stream: HoldGRPCStreamInfo = {
    progressState: [],
    cardState: [],
    tabsState: [{ tabName: '日志', type: 'log' }],
    tabsInfoState: {},
    riskState: [],
    logState: [],
    rulesState: [],
  }

  it('页签定义不变时同步执行状态和日志内容', () => {
    const { rerender } = render(<PluginExecuteResult runtimeId="runtime" streamInfo={stream} loading />)
    expect(screen.getByTestId('plugin-log')).toHaveAttribute('data-loading', 'true')
    rerender(
      <PluginExecuteResult
        runtimeId="runtime"
        streamInfo={{ ...stream, logState: [{ id: 'log', level: 'info', data: '执行完成', timestamp: 1 }] }}
        loading={false}
      />,
    )
    expect(screen.getByTestId('plugin-log')).toHaveAttribute('data-loading', 'false')
    expect(screen.getByTestId('plugin-log')).toHaveTextContent('执行完成')
  })

  it('自定义表格继续接收数据并响应筛选', async () => {
    const streamInfo = {
      ...stream,
      tabsState: [{ tabName: 'table', type: 'table' }],
      tabsInfoState: {
        table: {
          name: 'table',
          columns: [{ title: '名称', dataKey: 'name' }],
          data: [{ name: 'match-1' }, { name: 'other' }],
        },
      },
    }
    const { rerender } = render(<PluginExecuteResult runtimeId="runtime" streamInfo={streamInfo} loading={false} />)
    await act(async () => {
      await vi.advanceTimersByTimeAsync(500)
    })
    expect(screen.getByTestId('custom-rows')).toHaveTextContent('match-1,other')
    fireEvent.click(screen.getByText('筛选匹配行'))
    await act(async () => {
      await vi.advanceTimersByTimeAsync(500)
    })
    expect(screen.getByTestId('custom-rows')).toHaveTextContent(/^match-1$/)
    rerender(
      <PluginExecuteResult
        runtimeId="runtime"
        streamInfo={{
          ...streamInfo,
          tabsInfoState: {
            table: { ...streamInfo.tabsInfoState.table, data: [{ name: 'match-2' }, { name: 'other' }] },
          },
        }}
        loading={false}
      />,
    )
    await act(async () => {
      await vi.advanceTimersByTimeAsync(500)
    })
    expect(screen.getByTestId('custom-rows')).toHaveTextContent(/^match-2$/)
  })
})
