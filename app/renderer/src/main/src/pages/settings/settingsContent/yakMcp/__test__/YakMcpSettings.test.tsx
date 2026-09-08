import { ipcRendererMock } from '../../../../ai-re-act/hooks/__test__/setupElectron'
import { render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { YakMcpSettings } from '../YakMcpSettings'
import { grpcGetMCPToolList } from '@/pages/ai-agent/aiMCP/utils'

vi.mock('@/i18n/useI18nNamespaces', () => ({
  useI18nNamespaces: () => ({ t: (key: string) => key, i18nRefresh: 0 }),
}))

vi.mock('@/pages/ai-agent/aiMCP/utils', () => ({
  grpcGetMCPToolList: vi.fn().mockResolvedValue({
    Tools: [],
    Total: 0,
    Pagination: { Page: 1, Limit: 20, OrderBy: 'created_at', Order: 'desc' },
  }),
  grpcSetMCPToolEnabled: vi.fn(),
  resolveMCPToolDescriptionLabel: () => 'desc',
}))

vi.mock('@/store/yakMcpStream', () => ({
  useYakMcpStream: () => ({
    mcpStreamInfo: { mcpUrl: '', mcpCurrent: undefined, mcpServerUrl: '' },
    mcpStreamEvent: { onCancel: vi.fn(), onStart: vi.fn(), onSetMcpUrl: vi.fn() },
  }),
}))

vi.mock('@/pages/ai-re-act/hooks/useAINodeLabel', () => ({
  default: () => ({ getLabelByParams: (v: { Zh?: string }) => v.Zh || '' }),
}))

vi.mock('@/constants/hardware', () => ({
  SystemInfo: { mode: 'local' },
}))

vi.mock('@/utils/notification', () => ({
  yakitNotify: vi.fn(),
}))

vi.mock('@/components/TableVirtualResize/TableVirtualResize', () => ({
  TableVirtualResize: () => <div data-testid="mcp-table">mcp-table</div>,
}))

describe('YakMcpSettings', () => {
  it('渲染工具配置分区并请求工具列表', async () => {
    ipcRendererMock.invoke.mockResolvedValue('/opt/yak')
    render(<YakMcpSettings />)
    expect(document.querySelector('[data-settings-section="tool-config"]')).toBeTruthy()
    expect(screen.getByText('SettingsPage.item.yak-mcp')).toBeInTheDocument()
    await waitFor(() => {
      expect(grpcGetMCPToolList).toHaveBeenCalled()
    })
    expect(screen.getByTestId('mcp-table')).toBeInTheDocument()
  })
})
