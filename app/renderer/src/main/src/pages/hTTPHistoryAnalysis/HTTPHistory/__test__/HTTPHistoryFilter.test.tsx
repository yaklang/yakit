import React, { type ReactElement, type ReactNode, useEffect, useState } from 'react'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type * as HistoryFilterModule from '../HTTPHistoryFilter'
import type { AIReActChatProps } from '@/pages/ai-re-act/aiReActChat/AIReActChatType'
import type { HttpFlowSelectionApi } from '@/components/useHttpFlowSelection'
import { compileReactModule } from '@/utils/__test__/helpers/compileReactModule'

const bridge = vi.hoisted(() => ({
  syncSelectedHttpFlowIds: vi.fn(),
  clearTableSelection: vi.fn<() => void>(),
  deselectHttpFlowId: vi.fn<(id: string) => void>(),
  registerClearTableSelection: vi.fn<(callback: () => void) => void>(),
  registerDeselectHttpFlowId: vi.fn<(callback: (id: string) => void) => void>(),
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
    historyAIReActChatBridge: bridge,
    setShowFreeChat: vi.fn(),
    renderHistoryAIReActChat: ({ externalParameters }: Pick<AIReActChatProps, 'externalParameters'>) => (
      <>
        <button onClick={() => externalParameters?.onHttpFlowRemove?.('2', false)}>删除单条引用</button>
        <button onClick={() => externalParameters?.onHttpFlowRemove?.('1,2,3', true)}>清空引用</button>
        <button onClick={externalParameters?.onAfterSubmit}>发送完成</button>
      </>
    ),
  }),
}))
vi.mock('@/utils/kv', () => ({
  getRemoteValue: vi.fn(async () => undefined),
  setRemoteValue: vi.fn(),
}))
vi.mock('@/i18n/useI18nNamespaces', () => ({
  useI18nNamespaces: () => ({ t: (key: string) => key, i18nRefresh: 0 }),
}))
vi.mock('@/components/HTTPFlowTable/useBuiltinTagList', () => ({
  useBuiltinTagList: () => ({ builtinTagList: [] }),
}))
vi.mock('@/components/HTTPHistory', () => ({ HistoryProcess: () => null, HistoryTab: [] }))
vi.mock('@/components/HTTPFlowTable/HTTPFlowTable', () => ({}))
vi.mock('@/components/HTTPFlowTable/HTTPFlowRuleDataFilter', () => ({ HTTPFlowRuleDataFilter: () => null }))
vi.mock('@/components/HTTPFlowTable/HTTPFlowTableFormConfiguration/HTTPFlowTableFormConfiguration', () => ({}))
vi.mock('@/components/TableVirtualResize/TableVirtualResize', () => ({}))
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
    </>
  ),
}))

const { HTTPHistoryFilter } = await compileReactModule<typeof HistoryFilterModule>(
  import.meta.url,
  '../HTTPHistoryFilter.tsx',
)

beforeEach(() => {
  vi.resetAllMocks()
  vi.useFakeTimers()
  bridge.registerClearTableSelection.mockImplementation((callback) => {
    bridge.clearTableSelection.mockImplementation(callback)
  })
  bridge.registerDeselectHttpFlowId.mockImplementation((callback) => {
    bridge.deselectHttpFlowId.mockImplementation(callback)
  })
})
afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

// useDebounceEffect 未指定 wait 时使用 1000ms，推进真实 hook 的计时而不替换其实现。
const flushSelectionSync = () => act(async () => vi.advanceTimersByTimeAsync(1000))

async function setup() {
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
  await flushSelectionSync()
  expect(bridge.syncSelectedHttpFlowIds).toHaveBeenLastCalledWith(['1', '2', '3'])
  return { onSetSelectedHttpFlowIds }
}

describe('HTTPHistoryFilter 流量引用删除', () => {
  it('删除单条只取消对应 ID，并将剩余选择同步到输入框', async () => {
    const { onSetSelectedHttpFlowIds } = await setup()
    fireEvent.click(screen.getByRole('button', { name: '删除单条引用' }))
    expect(bridge.deselectHttpFlowId).toHaveBeenCalledExactlyOnceWith('2')
    expect(bridge.clearTableSelection).not.toHaveBeenCalled()
    expect(screen.getByLabelText('表格勾选')).toHaveTextContent('1,3')
    expect(onSetSelectedHttpFlowIds).toHaveBeenLastCalledWith(['1', '3'])
    await flushSelectionSync()
    expect(bridge.syncSelectedHttpFlowIds).toHaveBeenLastCalledWith(['1', '3'])
  })

  it.each(['清空引用', '发送完成'])('%s 清空全部选择和输入框引用', async (action) => {
    const { onSetSelectedHttpFlowIds } = await setup()
    fireEvent.click(screen.getByRole('button', { name: action }))
    expect(bridge.clearTableSelection).toHaveBeenCalledOnce()
    expect(bridge.deselectHttpFlowId).not.toHaveBeenCalled()
    expect(screen.getByLabelText('表格勾选')).toBeEmptyDOMElement()
    expect(onSetSelectedHttpFlowIds).toHaveBeenLastCalledWith([])
    await flushSelectionSync()
    expect(bridge.syncSelectedHttpFlowIds).toHaveBeenLastCalledWith([])
  })
})
