import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { ReactNode } from 'react'
import type { HTTPFlowTableProp } from '@/components/HTTPFlowTable/HTTPFlowTable.constants'
import { PluginExecuteHttpFlow } from '../PluginExecuteResult'

vi.hoisted(() => {
  Object.defineProperty(window, 'require', {
    configurable: true,
    value: () => ({ ipcRenderer: { invoke: vi.fn() } }),
  })
})

vi.mock('@/i18n/useI18nNamespaces', () => ({ useI18nNamespaces: () => ({ t: (key: string) => key }) }))
vi.mock('react-resize-detector', () => ({ default: () => null }))
vi.mock('@/components/HTTPHistory', () => ({
  HTTPFlowRealTimeTableAndEditor: ({ pageType, runtimeId, params }: HTTPFlowTableProp & { runtimeId?: string }) => (
    <div
      data-testid="http-table"
      data-page-type={pageType}
      data-runtime-id={runtimeId}
      data-source-type={params?.SourceType}
    />
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
vi.mock('@/components/businessUI/PluginTabs/PluginTabs', () => ({ default: () => null }))
vi.mock('../../horizontalScrollCard/HorizontalScrollCard', () => ({ HorizontalScrollCard: () => null }))
vi.mock('@/components/TableVirtualResize/TableVirtualResize', () => ({ TableVirtualResize: () => null }))
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
vi.mock('@/pages/fuzzer/components/HTTPFuzzerPageTable/HTTPFuzzerPageTable', () => ({ sorterFunction: vi.fn() }))
vi.mock('@/pages/risks/YakitRiskTable/YakitRiskTable', () => ({ YakitRiskTable: () => null }))
vi.mock('@/pages/risks/YakitRiskTable/constants', () => ({ defQueryRisksRequest: {} }))
vi.mock('@/pages/risks/YakitRiskTable/utils', () => ({ apiQueryRisksTotalByRuntimeId: vi.fn() }))
vi.mock('../LocalPluginLog', () => ({ LocalList: () => null, LocalPluginLog: () => null, LocalText: () => null }))
vi.mock('@/pages/yakRunnerCodeScan/CodeScanResultTable/CodeScanResultTable', () => ({ CodeScanResult: () => null }))
vi.mock('@/pages/yakRunnerAuditHole/YakitAuditHoleTable/YakitAuditHoleTable', () => ({
  YakitAuditHoleTable: () => null,
}))
vi.mock('@/utils/tool', () => ({ JSONParseLog: vi.fn() }))
vi.mock('@/utils/clipboard', () => ({ setClipboardText: vi.fn() }))

describe('PluginExecuteHttpFlow 查询范围', () => {
  it('History 模式透传空 runtimeId，且不限制 SourceType', () => {
    render(<PluginExecuteHttpFlow pageType="History" runtimeId="" showAdvancedSearch showSetting />)
    const table = screen.getByTestId('http-table')
    expect(table).toHaveAttribute('data-page-type', 'History')
    expect(table).toHaveAttribute('data-runtime-id', '')
    expect(table).not.toHaveAttribute('data-source-type')
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
