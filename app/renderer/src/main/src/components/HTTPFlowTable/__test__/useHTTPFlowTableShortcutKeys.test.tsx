import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { codecHistoryPluginProps, HTTPFlow } from '../HTTPFlowTable.constants'
import {
  ContextMenuExecutionType,
  ContextMenuResultMode,
  ContextMenuScene,
  type ContextMenuAction,
} from '@/pages/manageRightClickPlugins/types'

const mocks = vi.hoisted(() => ({
  runContextMenuAction: vi.fn(),
  emit: vi.fn(),
  getCurrentShortcutFocus: vi.fn(() => null),
  getIsActiveShortcutKeyPage: vi.fn(() => false),
  callbacks: new Map<string, (focus?: string[] | null) => void>(),
}))

vi.mock('@/pages/manageRightClickPlugins/runContextMenuAction', () => ({
  runContextMenuAction: mocks.runContextMenuAction,
}))
vi.mock('@/pages/manageRightClickPlugins/shortcut', () => ({
  matchContextMenuShortcut: (eventKeys: string[], shortcut?: string) => shortcut === eventKeys.join('|'),
}))
vi.mock('@/utils/eventBus/eventBus', () => ({ default: { emit: mocks.emit } }))
vi.mock('@/utils/globalShortcutKey/utils', () => ({
  convertKeyEventToKeyCombination: (event: KeyboardEvent) => {
    if (event.key.toLowerCase() !== 'k' || !event.ctrlKey) return undefined
    return ['Ctrl', 'K']
  },
  getCurrentShortcutFocus: mocks.getCurrentShortcutFocus,
  getIsActiveShortcutKeyPage: mocks.getIsActiveShortcutKeyPage,
}))
vi.mock('@/utils/notification', () => ({ yakitNotify: vi.fn() }))
vi.mock('@/utils/openWebsite', () => ({ openExternalWebsite: vi.fn() }))
vi.mock('@/utils/clipboard', () => ({ setClipboardText: vi.fn() }))
vi.mock('@/components/ShowInBrowser', () => ({ showResponseViaHTTPFlowID: vi.fn() }))
vi.mock('@/pages/invoker/fromPacketToYakCode', () => ({ generateCSRFPocByRequest: vi.fn() }))
vi.mock('@/pages/websocket/WebsocketFuzzer', () => ({ newWebsocketFuzzerTab: vi.fn() }))
vi.mock('@/utils/yakQueryHTTPFlow', () => ({
  hydrateHTTPFlowRequest: vi.fn(() => Promise.resolve()),
}))
vi.mock('@/utils/globalShortcutKey/events/useShortcutKeyTrigger', () => ({
  default: (name: string, callback: (focus?: string[] | null) => void) => {
    mocks.callbacks.set(name, callback)
  },
}))

import { useHTTPFlowTableShortcutKeys } from '../useHTTPFlowTableShortcutKeys'

const makeFlow = (id: number): HTTPFlow =>
  ({
    Id: id,
    IsHTTPS: true,
    Request: new Uint8Array(),
    Response: new Uint8Array(),
  }) as HTTPFlow

const makeAction = (): ContextMenuAction => ({
  PluginUUID: 'plugin-1',
  PluginName: 'Plugin',
  ActionID: 'action-1',
  HookName: 'hook',
  Enabled: true,
  Locked: false,
  Sort: 0,
  Shortcut: 'Ctrl|K',
  ResultMode: ContextMenuResultMode.Tab,
  AskBeforeRun: false,
  Params: [],
  IsCorePlugin: false,
  Scene: ContextMenuScene.HistorySingle,
  PluginType: 'context-menu',
  ExecutionType: ContextMenuExecutionType.ContextMenu,
  Help: '',
  HeadImg: '',
  SupportsResultMode: true,
  IsAIPlugin: false,
})

const makePlugin = (action = makeAction()): codecHistoryPluginProps => ({
  key: 'plugin-1',
  label: 'Plugin',
  params: [],
  isAiPlugin: false,
  executionType: ContextMenuExecutionType.ContextMenu,
  action,
  shortcut: 'Ctrl|K',
})

const makeOptions = (overrides: Partial<Parameters<typeof useHTTPFlowTableShortcutKeys>[0]> = {}) => ({
  inViewport: true,
  getSelected: () => makeFlow(7),
  getData: () => [makeFlow(7), makeFlow(8)],
  getSelectedRows: () => [makeFlow(7), makeFlow(8)],
  getSelectedRowKeys: () => ['7'],
  getIsAllSelect: () => false,
  getTotal: () => 2,
  onClearSelection: vi.fn(),
  singlePlugins: [],
  multiplePlugins: [],
  downstreamProxyStr: '',
  fromMITM: false,
  t: vi.fn((key: string) => key),
  getUrlWithoutQuery: (url?: string) => url || '',
  onSendToTab: vi.fn(async () => {}),
  onShieldRecord: vi.fn(),
  onShieldURL: vi.fn(),
  onShieldDomain: vi.fn(),
  onRemoveHttpHistory: vi.fn(),
  ...overrides,
})

describe('useHTTPFlowTableShortcutKeys context-menu shortcuts', () => {
  beforeEach(() => {
    mocks.runContextMenuAction.mockReset()
    mocks.emit.mockReset()
    mocks.callbacks.clear()
    mocks.getCurrentShortcutFocus.mockReturnValue(null)
    mocks.getIsActiveShortcutKeyPage.mockReturnValue(false)
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('passes numeric HTTP flow IDs when a single shortcut runs a context-menu action', () => {
    const action = makeAction()
    const plugin = makePlugin(action)
    const onClearSelection = vi.fn()

    renderHook(() =>
      useHTTPFlowTableShortcutKeys(
        makeOptions({
          multiplePlugins: [plugin],
          getSelectedRows: () => [makeFlow(7)],
          onClearSelection,
        }),
      ),
    )
    const event = new KeyboardEvent('keydown', { key: 'k', ctrlKey: true, bubbles: true, cancelable: true })
    document.dispatchEvent(event)

    expect(mocks.runContextMenuAction).toHaveBeenCalledWith(
      expect.objectContaining({
        action,
        request: expect.objectContaining({ HTTPFlowIDs: [7] }),
      }),
    )
    expect(event.defaultPrevented).toBe(true)
    expect(onClearSelection).toHaveBeenCalledTimes(1)
  })

  it('passes all selected flow IDs and clears a multiple selection', () => {
    const action = makeAction()
    action.Scene = ContextMenuScene.HistoryMulti
    const plugin = makePlugin(action)
    const onClearSelection = vi.fn()

    renderHook(() =>
      useHTTPFlowTableShortcutKeys(
        makeOptions({
          getSelectedRowKeys: () => ['7', '8'],
          multiplePlugins: [plugin],
          onClearSelection,
        }),
      ),
    )
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true, bubbles: true, cancelable: true }))

    expect(mocks.runContextMenuAction).toHaveBeenCalledWith(
      expect.objectContaining({
        action,
        request: expect.objectContaining({ HTTPFlowIDs: [7, 8] }),
      }),
    )
    expect(onClearSelection).toHaveBeenCalledTimes(1)
  })

  it('does not run a plugin shortcut while an input is focused', () => {
    const plugin = makePlugin()
    const { unmount } = renderHook(() => useHTTPFlowTableShortcutKeys(makeOptions({ singlePlugins: [plugin] })))
    const input = document.body.appendChild(document.createElement('input'))
    input.focus()

    act(() => {
      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true, bubbles: true, cancelable: true }))
    })

    expect(mocks.runContextMenuAction).not.toHaveBeenCalled()
    unmount()
  })
})
