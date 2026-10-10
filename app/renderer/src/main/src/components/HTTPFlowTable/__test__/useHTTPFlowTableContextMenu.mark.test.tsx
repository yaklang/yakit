import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { HTTPFlow } from '../HTTPFlowTable.constants'

const contextMenuMocks = vi.hoisted(() => ({
  showByRightContext: vi.fn(),
}))

vi.hoisted(() => {
  Object.defineProperty(window, 'require', {
    configurable: true,
    value: vi.fn(() => ({ ipcRenderer: { invoke: vi.fn() } })),
  })
})
vi.mock('@/utils/envfile', () => ({
  isEnpriTrace: () => false,
  isEnterpriseEdition: () => true,
}))
vi.mock('@/utils/globalShortcutKey/events/global', () => ({
  GlobalShortcutKey: {},
  getGlobalShortcutKeyEvents: () => new Proxy({}, { get: () => ({ keys: [] }) }),
}))
vi.mock('@/utils/globalShortcutKey/events/multiple/yakitMultiple', () => ({
  YakitMultipleShortcutKey: {},
  getYakitMultipleShortcutKeyEvents: () => new Proxy({}, { get: () => ({ keys: [] }) }),
}))
vi.mock('@/utils/globalShortcutKey/utils', () => ({ convertKeyboardToUIKey: vi.fn() }))
vi.mock('@/utils/notification', () => ({ yakitNotify: vi.fn() }))
vi.mock('@/components/ShowInBrowser', () => ({ showResponseViaHTTPFlowID: vi.fn() }))
vi.mock('@/components/yakitUI/YakitMenu/showByRightContext', () => ({
  showByRightContext: contextMenuMocks.showByRightContext,
}))
vi.mock('@/utils/clipboard', () => ({ setClipboardText: vi.fn() }))
vi.mock('@/utils/openWebsite', () => ({ openExternalWebsite: vi.fn(), saveABSFileToOpen: vi.fn() }))
vi.mock('@/pages/invoker/fromPacketToYakCode', () => ({ generateCSRFPocByRequest: vi.fn() }))
vi.mock('@/pages/packetScanner/DefaultPacketScanGroup', () => ({
  GetPacketScanByCursorMenuItem: vi.fn(() => []),
  packetScanDefaultValue: [],
}))
vi.mock('@/pages/packetScanner/PacketScanner', () => ({ execPacketScan: vi.fn() }))
vi.mock('@/pages/websocket/WebsocketFuzzer', () => ({ newWebsocketFuzzerTab: vi.fn() }))
vi.mock('@/pages/manageRightClickPlugins/runContextMenuAction', () => ({ runContextMenuAction: vi.fn() }))
vi.mock('@/pages/manageRightClickPlugins/utils', () => ({ checkContextMenuVersion: vi.fn() }))
vi.mock('../HTTPFlowTable.actions', () => ({
  CalloutColor: vi.fn(),
  calloutColorBatch: vi.fn(),
  onBatchExecPacketScan: vi.fn(),
  onRemoveCalloutColor: vi.fn(),
  onRemoveCalloutColorBatch: vi.fn(),
  onSendToTab: vi.fn(),
  toggleHTTPFlowFavorite: vi.fn(),
  toggleHTTPFlowFavoriteBatch: vi.fn(),
}))
vi.mock('../HTTPFlowTable.availableColors', () => ({ availableColors: [] }))
vi.mock('../HTTPFlowTable.packet', () => ({
  hydrateHTTPFlowRequest: vi.fn((flow) => Promise.resolve(flow)),
  hydrateHTTPFlowRequests: vi.fn((flows) => Promise.resolve(flows)),
}))
vi.mock('../../yakitUI/YakitEditor/YakitEditor', () => ({ PLUGIN_PREFIX: 'plugin_', PLUGIN_RIGHT_MAG: 'right_' }))

import { useHTTPFlowTableContextMenu } from '../useHTTPFlowTableContextMenu'

const makeFlow = (id: number): HTTPFlow =>
  ({
    Id: id,
    IsHTTPS: true,
    IsWebsocket: false,
    Request: new Uint8Array(),
    Response: new Uint8Array(),
  }) as HTTPFlow

const makeOptions = (overrides: Partial<Parameters<typeof useHTTPFlowTableContextMenu>[0]> = {}) => ({
  t: vi.fn((key: string) => key),
  i18nRefresh: '',
  userInfo: { isLogin: true },
  data: [],
  setData: vi.fn(),
  onlyFavorite: false,
  selected: undefined,
  selectedRowKeys: [],
  selectedRows: [],
  isAllSelect: false,
  total: 0,
  downstreamProxyStr: '',
  fromMITM: false,
  setSelected: vi.fn(),
  setSelectedRowKeys: vi.fn(),
  setSelectedRows: vi.fn(),
  setBatchVisible: vi.fn(),
  setCompareLeft: vi.fn(),
  setCompareRight: vi.fn(),
  getUrlWithoutQuery: (url?: string) => url || '',
  getCodecHistoryPlugin: () => [],
  codecMultipleHistoryPluginCom: undefined,
  codecSingleHistoryPluginCom: undefined,
  selectedRowKeysCom: undefined,
  onRemoveHttpHistory: vi.fn(),
  onShareData: vi.fn(),
  onUploadData: vi.fn(),
  onEditTags: vi.fn(),
  onHTTPFlowTableRowDoubleClick: vi.fn(),
  onExcelExport: vi.fn(),
  onHarExport: vi.fn(),
  onPocMould: vi.fn(),
  onBatchPocMould: vi.fn(),
  onShieldRecord: vi.fn(),
  onShieldURL: vi.fn(),
  onShieldDomain: vi.fn(),
  onBatch: vi.fn(),
  onViewAttachmentDataRefresh: vi.fn(),
  onClearSelection: vi.fn(),
  ...overrides,
})

describe('useHTTPFlowTableContextMenu modify mark', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('dispatches the current record through the single-row menu', async () => {
    const record = makeFlow(7)
    const onOpenFlowMarkEdit = vi.fn()
    const { result } = renderHook(() => useHTTPFlowTableContextMenu(makeOptions({ onOpenFlowMarkEdit })))

    result.current.onRowContextMenu(record, undefined, { clientX: 0, clientY: 0 } as React.MouseEvent)
    const menuOptions = contextMenuMocks.showByRightContext.mock.calls[0][0]
    await menuOptions.onClick({ key: 'modifyMark', keyPath: ['modifyMark'] })

    expect(onOpenFlowMarkEdit).toHaveBeenCalledWith(record)
  })

  it('dispatches all selected records through the batch menu', async () => {
    const selectedRows = [makeFlow(7), makeFlow(8)]
    const onOpenBatchMarkEdit = vi.fn()
    const { result } = renderHook(() =>
      useHTTPFlowTableContextMenu(
        makeOptions({
          selectedRows,
          selectedRowKeys: ['7', '8'],
          total: selectedRows.length,
          onOpenBatchMarkEdit,
        }),
      ),
    )

    await act(async () => {
      await result.current.onMultipleClick('modifyMark', ['modifyMark'])
    })

    expect(onOpenBatchMarkEdit).toHaveBeenCalledWith(selectedRows)
  })
})
