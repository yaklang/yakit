import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { ReactNode } from 'react'
import { HTTPHistory } from '../HTTPHistory'

const bridge = vi.hoisted(() => ({
  activeID: 'session-1',
  syncSelectedHttpFlowIds: vi.fn(),
  clearTableSelection: vi.fn(),
  deselectHttpFlowId: vi.fn(),
}))

vi.hoisted(() => {
  Object.defineProperty(window, 'require', {
    configurable: true,
    value: () => ({ ipcRenderer: { invoke: vi.fn(async () => ({})) } }),
  })
})

vi.mock('../historyAIReActChat', () => ({
  HistoryAIReActChatProvider: ({ children }: { children: ReactNode }) => children,
  useHistoryAIReActChat: () => ({
    historyAIReActChatBridge: bridge,
    renderHistoryAIReActChat: ({
      externalParameters,
    }: {
      externalParameters: { onHttpFlowRemove?: (id: string, isSummary: boolean) => void }
    }) => (
      <>
        <button onClick={() => externalParameters.onHttpFlowRemove?.('1', false)}>删除单条引用</button>
        <button onClick={() => externalParameters.onHttpFlowRemove?.('1,2', true)}>清空引用</button>
      </>
    ),
    setShowFreeChat: vi.fn(),
  }),
}))
vi.mock('@/utils/kv', () => ({
  getRemoteValue: vi.fn(async () => undefined),
  setRemoteValue: vi.fn(),
}))
vi.mock('@/i18n/useI18nNamespaces', () => ({
  useI18nNamespaces: () => ({ t: (key: string) => key, i18nRefresh: 0 }),
}))
vi.mock('@/utils/tool', () => ({ JSONParseLog: (value: string) => JSON.parse(value || '{}') }))
vi.mock('@/utils/notification', () => ({ yakitNotify: vi.fn() }))
vi.mock('@/utils/httpFlowFieldGroupCache', () => ({
  fetchHTTPFlowsFieldGroup: vi.fn(async () => ({})),
}))
vi.mock('@/store/mitmState', () => ({ useStore: () => ({}) }))
vi.mock('@/pages/mitm/Context/MITMContext', async () => {
  const { createContext } = await import('react')
  return { default: createContext({ mitmStore: { version: 0 } }) }
})
vi.mock('../HTTPFlowTable/useBuiltinTagList', () => ({ useBuiltinTagList: () => ({ builtinTagList: [] }) }))
vi.mock('../HTTPFlowTable/HTTPFlowTable.utils', () => ({ groupHTTPFlowFieldTags: () => ({}) }))
vi.mock('../HTTPFlowTable/HTTPFlowRuleDataFilter', () => ({ HTTPFlowRuleDataFilter: () => null }))
vi.mock('../WebTree/WebTree', () => ({ WebTree: () => null }))
vi.mock('react-resize-detector', () => ({ default: () => null }))
vi.mock('../yakitUI/YakitCollapse/YakitCollapse', () => ({
  default: Object.assign(() => null, { YakitPanel: () => null }),
}))
vi.mock('../yakitUI/YakitPopover/YakitPopover', () => ({ YakitPopover: () => null }))
vi.mock('../yakitUI/YakitResizeBox/YakitResizeBox', () => ({
  YakitResizeBox: ({ firstNode, secondNode }: { firstNode: ReactNode | (() => ReactNode); secondNode: ReactNode }) => (
    <>
      {typeof firstNode === 'function' ? firstNode() : firstNode}
      {secondNode}
    </>
  ),
}))
vi.mock('../yakitSideTab/YakitSideTab', () => ({
  YakitSideTab: ({
    onActiveKey,
    show,
    setShow,
  }: {
    onActiveKey: (key: string) => void
    show: boolean
    setShow: (show: boolean) => void
  }) => (
    <>
      <button onClick={() => onActiveKey('ai')}>AI 页签</button>
      <button onClick={() => onActiveKey('web-tree')}>网站树页签</button>
      <button onClick={() => setShow(!show)}>{show ? '收起侧栏' : '展开侧栏'}</button>
    </>
  ),
}))
vi.mock('../HTTPFlowTable/HTTPFlowTable', () => ({
  HTTPFlowTable: ({ onSetSelectedHttpFlowIds }: { onSetSelectedHttpFlowIds: (ids: string[]) => void }) => (
    <button onClick={() => onSetSelectedHttpFlowIds(['1', '2'])}>勾选流量</button>
  ),
}))

beforeEach(() => vi.clearAllMocks())
afterEach(cleanup)

describe('HTTPHistory 流量选择同步', () => {
  it('单条删除与清空引用分别调用表格取消勾选和清空操作', () => {
    render(<HTTPHistory pageType="History" />)
    fireEvent.click(screen.getByText('AI 页签'))
    fireEvent.click(screen.getByText('删除单条引用'))
    expect(bridge.deselectHttpFlowId).toHaveBeenCalledExactlyOnceWith('1')
    expect(bridge.clearTableSelection).not.toHaveBeenCalled()

    fireEvent.click(screen.getByText('清空引用'))
    expect(bridge.clearTableSelection).toHaveBeenCalledOnce()
    expect(bridge.syncSelectedHttpFlowIds).toHaveBeenCalledWith([])
    expect(bridge.deselectHttpFlowId).toHaveBeenCalledOnce()
  })

  it('AI 侧栏展开、收起和重新展开时均同步勾选，收起不清空选择', async () => {
    render(<HTTPHistory pageType="History" />)
    fireEvent.click(screen.getByText('AI 页签'))
    fireEvent.click(screen.getByText('勾选流量'))
    expect(bridge.syncSelectedHttpFlowIds).toHaveBeenCalledExactlyOnceWith(['1', '2'])

    fireEvent.click(screen.getByText('收起侧栏'))
    expect(bridge.clearTableSelection).not.toHaveBeenCalled()
    bridge.syncSelectedHttpFlowIds.mockClear()
    fireEvent.click(screen.getByText('勾选流量'))
    expect(bridge.syncSelectedHttpFlowIds).toHaveBeenCalledExactlyOnceWith(['1', '2'])

    fireEvent.click(screen.getByText('展开侧栏'))
    bridge.syncSelectedHttpFlowIds.mockClear()
    fireEvent.click(screen.getByText('勾选流量'))
    expect(bridge.syncSelectedHttpFlowIds).toHaveBeenCalledExactlyOnceWith(['1', '2'])
    await waitFor(() => expect(bridge.clearTableSelection).not.toHaveBeenCalled())
  })

  it('切到其他侧栏页签后不再同步勾选，切回 AI 后恢复', async () => {
    render(<HTTPHistory pageType="History" />)
    fireEvent.click(screen.getByText('AI 页签'))
    fireEvent.click(screen.getByText('收起侧栏'))
    fireEvent.click(screen.getByText('网站树页签'))
    fireEvent.click(screen.getByText('勾选流量'))
    expect(bridge.syncSelectedHttpFlowIds).not.toHaveBeenCalled()

    fireEvent.click(screen.getByText('AI 页签'))
    fireEvent.click(screen.getByText('勾选流量'))
    await waitFor(() => expect(bridge.syncSelectedHttpFlowIds).toHaveBeenCalledExactlyOnceWith(['1', '2']))
  })
})
