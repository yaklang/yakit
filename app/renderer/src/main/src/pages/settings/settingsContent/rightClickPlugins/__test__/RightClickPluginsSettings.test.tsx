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

vi.mock('@hello-pangea/dnd', () => ({
  DragDropContext: ({ children }: { children: React.ReactNode }) => children,
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
  parseContextMenuShortcut: () => [],
  serializeContextMenuShortcut: () => '',
  checkContextMenuShortcutConflict: () => undefined,
}))

vi.mock('@/utils/globalShortcutKey/utils', () => ({
  convertKeyboardToUIKey: () => '',
  setIsActiveShortcutKeyPage: vi.fn(),
}))

const mockFetch = fetchSceneActions as ReturnType<typeof vi.fn>
const mockBind = grpcSetContextMenuActionBinding as ReturnType<typeof vi.fn>

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
    })
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
})
