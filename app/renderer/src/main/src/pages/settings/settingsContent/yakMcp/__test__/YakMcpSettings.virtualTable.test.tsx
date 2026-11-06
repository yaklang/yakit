import { ipcRendererMock } from '../../../../ai-re-act/hooks/__test__/setupElectron'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { DndProvider } from 'react-dnd'
import { HTML5Backend } from 'react-dnd-html5-backend'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import userEvent from '@testing-library/user-event'
import { YakMcpSettings } from '../YakMcpSettings'
import { grpcGetMCPToolList, grpcSetMCPToolEnabled } from '@/pages/ai-agent/aiMCP/utils'
import type { MCPToolConfig } from '@/pages/ai-agent/type/aiMCP'

vi.mock('@/i18n/useI18nNamespaces', () => ({
  useI18nNamespaces: () => ({
    t: (key: string) => key,
    i18nRefresh: 0,
    i18n: { language: 'en' },
  }),
}))
vi.mock('@/pages/ai-agent/aiMCP/utils', () => ({
  grpcGetMCPToolList: vi.fn(),
  grpcSetMCPToolEnabled: vi.fn(),
  resolveMCPToolDescriptionLabel: () => 'description',
}))
vi.mock('@/store/yakMcpStream', () => ({
  useYakMcpStream: () => ({
    mcpStreamInfo: { mcpUrl: '127.0.0.1:11432', mcpServerUrl: '' },
    mcpStreamEvent: { onCancel: vi.fn(), onStart: vi.fn(), onSetMcpUrl: vi.fn() },
  }),
}))
vi.mock('@/pages/ai-re-act/hooks/useAINodeLabel', () => ({
  default: () => ({ getLabelByParams: (value: { En?: string }) => value.En || '' }),
}))
vi.mock('@/constants/hardware', () => ({ SystemInfo: { mode: 'local' } }))
vi.mock('@/utils/notification', () => ({ yakitNotify: vi.fn() }))
vi.mock('@/utils/kv', () => ({ getRemoteValue: async () => '', setRemoteValue: vi.fn() }))
vi.mock('@/utils/globalShortcutKey/events/useShortcutKeyTrigger', () => ({ default: () => {} }))
vi.mock('@/utils/globalShortcutKey/events/global', () => ({ ShortcutKeyFocusType: { TableVirtual: 'table' } }))
vi.mock('@/utils/globalShortcutKey/shortcutKeyFocusHook/ShortcutKeyFocusHook', () => ({
  default: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}))
vi.mock('@/components/TableVirtualResize/TableVirtualResize.module.scss', () => ({
  default: { 'virtual-table-list-container': 'virtual-table-list-container' },
}))

beforeEach(() => {
  vi.clearAllMocks()
  ipcRendererMock.invoke.mockResolvedValue('/opt/yak')
  vi.spyOn(HTMLElement.prototype, 'clientHeight', 'get').mockReturnValue(300)
  vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(600)
  vi.stubGlobal(
    'ResizeObserver',
    class {
      constructor(private callback: ResizeObserverCallback) {}
      observe(target: Element) {
        this.callback(
          [{ target, contentRect: { width: 600, height: 300 } } as ResizeObserverEntry],
          this as unknown as ResizeObserver,
        )
      }
      unobserve() {}
      disconnect() {}
    },
  )
})

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('YakMcpSettings real virtual table', () => {
  it('keeps failed rows visible after bulk disabling a deeply scrolled filtered list', async () => {
    const tools: MCPToolConfig[] = Array.from({ length: 200 }, (_, index) => ({
      ID: index + 1,
      ToolName: `tool_${index}`,
      Source: 'builtin',
      ServerName: '',
      Enable: true,
      Description: '',
      Params: [],
    }))
    vi.mocked(grpcGetMCPToolList).mockResolvedValue({
      Tools: tools,
      Total: tools.length,
      Pagination: { Page: 1, Limit: 200, OrderBy: 'id', Order: 'asc' },
    })
    vi.mocked(grpcSetMCPToolEnabled).mockImplementation(async ({ ToolName }) => ({
      Ok: ToolName !== 'tool_0' && ToolName !== 'tool_1',
      Reason: 'denied',
    }))
    render(
      <DndProvider backend={HTML5Backend}>
        <YakMcpSettings />
      </DndProvider>,
    )
    await screen.findByRole('switch', { name: 'tool_0' })
    fireEvent.mouseDown(screen.getByRole('combobox', { name: 'SettingsPage.yakMcp.statusFilter' }))
    await userEvent.click(
      await screen.findByText('SettingsPage.yakMcp.enabledOnly', {
        selector: '.ant-select-item-option-content',
      }),
    )
    const viewport = document.querySelector<HTMLElement>('.virtual-table-list-container')!
    expect(viewport).not.toBeNull()
    // jsdom does not dispatch the scroll event caused by the table's initial scrollTo(0).
    fireEvent.scroll(viewport)
    fireEvent.scroll(viewport, { target: { scrollTop: 4200 } })
    await waitFor(() => expect(screen.queryByRole('switch', { name: 'tool_0' })).not.toBeInTheDocument())
    await userEvent.click(screen.getByRole('button', { name: 'SettingsPage.yakMcp.disableResults' }))
    await waitFor(() => expect(grpcSetMCPToolEnabled).toHaveBeenCalledTimes(200))
    expect(await screen.findByRole('switch', { name: 'tool_0' })).toBeChecked()
    expect(screen.getByRole('switch', { name: 'tool_1' })).toBeChecked()
    expect(viewport.scrollTop).toBe(0)
  })
})
