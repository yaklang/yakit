import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ManageRightClickPluginsTabKey } from '@/pages/manageRightClickPlugins/constants'
import {
  ContextMenuExecutionType,
  ContextMenuResultMode,
  type ContextMenuAction,
} from '@/pages/manageRightClickPlugins/types'
import { fetchSceneActions } from '@/pages/manageRightClickPlugins/utils'
import { grpcSetContextMenuActionBinding } from '@/pages/manageRightClickPlugins/api'
import { RightClickPluginsSettings } from '../RightClickPluginsSettings'

window.matchMedia = ((query: string) => ({
  matches: false,
  media: query,
  onchange: null,
  addListener: () => undefined,
  removeListener: () => undefined,
  addEventListener: () => undefined,
  removeEventListener: () => undefined,
  dispatchEvent: () => false,
})) as typeof window.matchMedia

vi.mock('@/i18n/useI18nNamespaces', () => ({
  useI18nNamespaces: () => ({ t: (key: string) => key, i18nRefresh: 0 }),
}))

vi.mock('@/utils/notification', () => ({
  yakitNotify: vi.fn(),
}))

vi.mock('@/utils/eventBus/eventBus', () => ({
  default: { on: vi.fn(), off: vi.fn(), emit: vi.fn() },
}))

const dnd = vi.hoisted(() => ({ onDragEnd: undefined as ((result: any) => void) | undefined }))

vi.mock('@hello-pangea/dnd', () => ({
  DragDropContext: ({ children, onDragEnd }: { children: React.ReactNode; onDragEnd?: (result: any) => void }) => {
    dnd.onDragEnd = onDragEnd
    return children
  },
  Droppable: ({ children }: { children: (provided: any, snapshot?: any) => React.ReactNode }) =>
    children({ droppableProps: {}, innerRef: vi.fn(), placeholder: null }, {}),
  Draggable: ({ children }: { children: (provided: any, snapshot: any) => React.ReactNode }) =>
    children({ innerRef: vi.fn(), draggableProps: {}, dragHandleProps: {} }, { isDragging: false }),
}))

vi.mock('@/pages/manageRightClickPlugins/api', () => ({
  grpcSetContextMenuActionBinding: vi.fn().mockResolvedValue({}),
  grpcFetchLocalPluginDetailByUUID: vi.fn(),
}))

vi.mock('@/pages/manageRightClickPlugins/utils', () => ({
  fetchSceneActions: vi.fn(),
  isSameAction: (a: { PluginUUID: string; ActionID: string }, b: { PluginUUID: string; ActionID: string }) =>
    a.PluginUUID === b.PluginUUID && a.ActionID === b.ActionID,
  patchAction: (
    list: Array<Record<string, unknown>>,
    target: { PluginUUID: string; ActionID: string },
    patch: Record<string, unknown>,
  ) => list.map((i) => (i.PluginUUID === target.PluginUUID && i.ActionID === target.ActionID ? { ...i, ...patch } : i)),
}))

vi.mock('@/utils/getMainOperatorPageBodyContainer', () => ({
  getMainOperatorPageBodyContainer: () => undefined,
}))

vi.mock('@/pages/pluginEditor/modifyYakitPlugin/ModifyYakitPlugin', () => ({
  ModifyYakitPlugin: () => null,
}))

vi.mock('@/pages/manageRightClickPlugins/shortcut', () => ({
  parseContextMenuShortcut: (shortcut?: string) => (shortcut ? shortcut.split('|').filter(Boolean) : []),
  serializeContextMenuShortcut: () => '',
  checkContextMenuShortcutConflict: () => undefined,
}))

vi.mock('@/utils/globalShortcutKey/utils', () => ({
  convertKeyboardToUIKey: (keys: string[] = []) => keys.join('+'),
  setIsActiveShortcutKeyPage: vi.fn(),
}))

const mockFetch = fetchSceneActions as ReturnType<typeof vi.fn>
const mockBind = grpcSetContextMenuActionBinding as ReturnType<typeof vi.fn>
const expectBefore = (a: string, b: string) => {
  expect(
    screen.getByText(a).compareDocumentPosition(screen.getByText(b)) & Node.DOCUMENT_POSITION_FOLLOWING,
  ).toBeTruthy()
}

const makeAction = (over: Partial<ContextMenuAction>): ContextMenuAction =>
  ({
    PluginUUID: 'p1',
    PluginName: 'sqlmap',
    ActionID: 'a1',
    HookName: 'hook',
    Enabled: false,
    Locked: false,
    Sort: 0,
    Shortcut: '',
    ResultMode: ContextMenuResultMode.Tab,
    AskBeforeRun: false,
    Params: [],
    IsCorePlugin: false,
    Scene: 'history-single',
    PluginType: 'yak',
    ExecutionType: ContextMenuExecutionType.ContextMenu,
    Help: 'send to sqlmap',
    HeadImg: '',
    SupportsResultMode: true,
    IsAIPlugin: false,
    ...over,
  }) as ContextMenuAction

describe('RightClickPluginsSettings', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockFetch.mockResolvedValue([
      makeAction({ PluginName: 'sqlmap', Enabled: true, Sort: 0 }),
      makeAction({
        PluginUUID: 'p2',
        ActionID: 'a2',
        PluginName: 'path-extract',
        Enabled: false,
        Help: 'extract path',
      }),
    ])
    mockBind.mockResolvedValue({})
  })

  it('渲染三组 tab、计数与插件列表', async () => {
    render(<RightClickPluginsSettings />)
    expect(screen.getByText('SettingsPage.item.right-click-plugins')).toBeInTheDocument()
    expect(screen.getByText('SettingsPage.rightClickPlugins.tabSingle')).toBeInTheDocument()
    expect(screen.getByText('SettingsPage.rightClickPlugins.tabMultiple')).toBeInTheDocument()
    expect(screen.getByText('SettingsPage.rightClickPlugins.tabPacket')).toBeInTheDocument()
    await waitFor(() => {
      expect(screen.getByText('sqlmap')).toBeInTheDocument()
    })
    expect(screen.getByText('path-extract')).toBeInTheDocument()
    expect(screen.getByText('ManageRightClickPlugins.addedPluginsCount')).toBeInTheDocument()
    expect(mockFetch).toHaveBeenCalledWith(ManageRightClickPluginsTabKey.PluginExtensionSingle)
  })

  it('已绑定快捷键时名称行展示 tag', async () => {
    mockFetch.mockResolvedValue([makeAction({ PluginName: 'sqlmap', Enabled: true, Shortcut: 'Control|s' })])
    render(<RightClickPluginsSettings />)
    await waitFor(() => expect(screen.getByText('sqlmap')).toBeInTheDocument())
    expect(screen.getByText('Control+s')).toBeInTheDocument()
  })

  it('开关打开时保存为已添加', async () => {
    const user = userEvent.setup()
    render(<RightClickPluginsSettings />)
    await waitFor(() => expect(screen.getByText('path-extract')).toBeInTheDocument())
    const switches = document.querySelectorAll('button.ant-switch')
    expect(switches.length).toBeGreaterThan(1)
    await user.click(switches[1])
    await waitFor(() => {
      expect(mockBind).toHaveBeenCalled()
    })
    expect(mockBind.mock.calls[0][0]).toMatchObject({
      PluginUUID: 'p2',
      ActionID: 'a2',
      Enabled: true,
      Sort: 1,
    })
    expectBefore('sqlmap', 'path-extract')
  })

  it('拉取后未启用项排在已启用之后', async () => {
    mockFetch.mockResolvedValue([
      makeAction({ PluginUUID: 'p2', ActionID: 'a2', PluginName: 'path-extract', Enabled: false, Sort: 0 }),
      makeAction({ PluginName: 'sqlmap', Enabled: true, Sort: 3 }),
    ])
    render(<RightClickPluginsSettings />)
    await waitFor(() => expect(screen.getByText('sqlmap')).toBeInTheDocument())
    expectBefore('sqlmap', 'path-extract')
  })

  it('禁用后移到列表末尾', async () => {
    const user = userEvent.setup()
    mockFetch.mockResolvedValue([
      makeAction({ PluginName: 'sqlmap', Enabled: true, Sort: 0 }),
      makeAction({ PluginUUID: 'p2', ActionID: 'a2', PluginName: 'keep-off', Enabled: false, Sort: 0 }),
      makeAction({ PluginUUID: 'p3', ActionID: 'a3', PluginName: 'to-disable', Enabled: true, Sort: 1 }),
    ])
    render(<RightClickPluginsSettings />)
    await waitFor(() => expect(screen.getByText('to-disable')).toBeInTheDocument())
    await user.click(document.querySelectorAll('button.ant-switch')[1])
    await waitFor(() => expect(mockBind).toHaveBeenCalled())
    expect(mockBind.mock.calls.some((call) => call[0].PluginUUID === 'p3' && call[0].Enabled === false)).toBe(true)
    expectBefore('keep-off', 'to-disable')
  })

  it('拖拽不能把已启用项排到未启用区域', async () => {
    mockFetch.mockResolvedValue([
      makeAction({ PluginName: 'sqlmap', Enabled: true, Sort: 0 }),
      makeAction({ PluginUUID: 'p2', ActionID: 'a2', PluginName: 'keep-on', Enabled: true, Sort: 1 }),
      makeAction({ PluginUUID: 'p3', ActionID: 'a3', PluginName: 'keep-off', Enabled: false, Sort: 0 }),
    ])
    render(<RightClickPluginsSettings />)
    await waitFor(() => expect(screen.getByText('keep-off')).toBeInTheDocument())
    dnd.onDragEnd?.({ source: { index: 0 }, destination: { index: 2 } })
    await waitFor(() => expect(mockBind).toHaveBeenCalled())
    expect(mockBind.mock.calls.some((call) => call[0].PluginUUID === 'p3')).toBe(false)
    expectBefore('keep-on', 'sqlmap')
    expectBefore('sqlmap', 'keep-off')
  })

  it('搜索会筛选列表，切换 tab 会清空关键词', async () => {
    const user = userEvent.setup()
    render(<RightClickPluginsSettings />)
    await waitFor(() => expect(screen.getByText('path-extract')).toBeInTheDocument())
    const input = screen.getByPlaceholderText('ManageRightClickPlugins.searchPlaceholder')
    await user.type(input, 'sqlmap')
    expect(screen.getByText('sqlmap')).toBeInTheDocument()
    expect(screen.queryByText('path-extract')).not.toBeInTheDocument()
    await user.click(screen.getByText('SettingsPage.rightClickPlugins.tabPacket'))
    expect((screen.getByPlaceholderText('ManageRightClickPlugins.searchPlaceholder') as HTMLInputElement).value).toBe(
      '',
    )
  })

  it('切换 tab 会重新拉取对应场景插件', async () => {
    const user = userEvent.setup()
    mockFetch.mockResolvedValueOnce([makeAction({ PluginName: 'sqlmap', Enabled: true })]).mockResolvedValueOnce([])
    render(<RightClickPluginsSettings />)
    await waitFor(() => expect(screen.getByText('sqlmap')).toBeInTheDocument())
    await user.click(screen.getByText('SettingsPage.rightClickPlugins.tabPacket'))
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(ManageRightClickPluginsTabKey.PacketContextMenu)
    })
  })

  it('section 会定位到对应 tab', async () => {
    mockFetch.mockResolvedValue([])
    const { rerender } = render(<RightClickPluginsSettings section={ManageRightClickPluginsTabKey.PacketContextMenu} />)
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(ManageRightClickPluginsTabKey.PacketContextMenu)
    })
    rerender(
      <RightClickPluginsSettings section={ManageRightClickPluginsTabKey.PluginExtensionSingle} sectionTick={1} />,
    )
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(ManageRightClickPluginsTabKey.PluginExtensionSingle)
    })
  })
})
