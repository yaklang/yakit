import { ipcRendererMock } from '../../../../ai-re-act/hooks/__test__/setupElectron'
import { render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { YakMcpSettings } from '../YakMcpSettings'
import { grpcGetMCPToolList } from '@/pages/ai-agent/aiMCP/utils'
import { getRemoteValue, setRemoteValue } from '@/utils/kv'
import userEvent from '@testing-library/user-event'
import { RemoteAIAgentGV } from '@/enums/aiAgent'

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

const onStartMock = vi.fn()
const onCancelMock = vi.fn()
const onSetMcpUrlMock = vi.fn()

const mcpStreamInfoRef = {
  current: { mcpUrl: '127.0.0.1:11432', mcpCurrent: undefined as any, mcpServerUrl: '' },
}

vi.mock('@/store/yakMcpStream', () => ({
  useYakMcpStream: () => ({
    mcpStreamInfo: mcpStreamInfoRef.current,
    mcpStreamEvent: { onCancel: onCancelMock, onStart: onStartMock, onSetMcpUrl: onSetMcpUrlMock },
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

vi.mock('@/utils/kv', () => ({
  getRemoteValue: vi.fn(),
  setRemoteValue: vi.fn(),
}))

const getRemoteValueMock = vi.mocked(getRemoteValue)
const setRemoteValueMock = vi.mocked(setRemoteValue)

describe('YakMcpSettings', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getRemoteValueMock.mockResolvedValue('')
    setRemoteValueMock.mockResolvedValue(undefined)
    mcpStreamInfoRef.current = { mcpUrl: '127.0.0.1:11432', mcpCurrent: undefined, mcpServerUrl: '' }
  })

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

  it('进入设置页时读取缓存恢复能力层开关和自启动状态', async () => {
    ipcRendererMock.invoke.mockResolvedValue('/opt/yak')
    getRemoteValueMock.mockResolvedValue(
      JSON.stringify({
        autoStart: true,
        url: '127.0.0.1:9011',
        enableLegacyMcpTools: false,
        enableAIToolFramework: true,
        enableBridgeExternalMcp: true,
      }),
    )

    render(<YakMcpSettings />)

    await waitFor(() => {
      expect(getRemoteValueMock).toHaveBeenCalledWith(RemoteAIAgentGV.YakMCPStartConfig)
    })
  })

  it('切换自启动开关时把当前配置写入缓存', async () => {
    ipcRendererMock.invoke.mockResolvedValue('/opt/yak')
    getRemoteValueMock.mockResolvedValue('')
    render(<YakMcpSettings />)

    const autoStartSwitches = await screen.findAllByRole('switch')
    const autoStartSwitch = autoStartSwitches[autoStartSwitches.length - 1]

    await userEvent.click(autoStartSwitch)

    await waitFor(() => {
      expect(setRemoteValueMock).toHaveBeenCalledWith(
        RemoteAIAgentGV.YakMCPStartConfig,
        expect.stringContaining('"autoStart":true'),
      )
    })
    expect(setRemoteValueMock).toHaveBeenCalledWith(
      RemoteAIAgentGV.YakMCPStartConfig,
      expect.stringContaining('"enableLegacyMcpTools"'),
    )
  })

  it('切换 MCP 内置工具开关时把最新状态写入缓存', async () => {
    ipcRendererMock.invoke.mockResolvedValue('/opt/yak')
    getRemoteValueMock.mockResolvedValue('')
    render(<YakMcpSettings />)

    const switches = await screen.findAllByRole('switch')
    const legacySwitch = switches[1]

    await userEvent.click(legacySwitch)

    await waitFor(() => {
      expect(setRemoteValueMock).toHaveBeenCalledWith(
        RemoteAIAgentGV.YakMCPStartConfig,
        expect.stringContaining('"enableLegacyMcpTools":false'),
      )
    })
  })

  it('修改启动地址时防抖写入缓存', async () => {
    ipcRendererMock.invoke.mockResolvedValue('/opt/yak')
    getRemoteValueMock.mockResolvedValue('')
    const { rerender } = render(<YakMcpSettings />)

    const input = await screen.findByDisplayValue('127.0.0.1:11432')
    await userEvent.clear(input)
    await userEvent.type(input, '127.0.0.1:9011')

    // 模拟全局 store 同步更新后的 mcpUrl
    mcpStreamInfoRef.current = { ...mcpStreamInfoRef.current, mcpUrl: '127.0.0.1:9011' }
    rerender(<YakMcpSettings />)

    await waitFor(() => {
      expect(setRemoteValueMock).toHaveBeenCalledWith(
        RemoteAIAgentGV.YakMCPStartConfig,
        expect.stringContaining('"url":"127.0.0.1:9011"'),
      )
    })
  })

  it('地址为空时主启用开关和自启动开关被禁用', async () => {
    mcpStreamInfoRef.current = { mcpUrl: '', mcpCurrent: undefined, mcpServerUrl: '' }
    ipcRendererMock.invoke.mockResolvedValue('/opt/yak')
    getRemoteValueMock.mockResolvedValue('')

    render(<YakMcpSettings />)

    const switches = await screen.findAllByRole('switch')
    const mainSwitch = switches[0]
    const autoStartSwitch = switches[switches.length - 1]

    expect(mainSwitch).toBeDisabled()
    expect(autoStartSwitch).toBeDisabled()
  })

  it('远程模式下启动地址不写入缓存', async () => {
    mcpStreamInfoRef.current = { mcpUrl: '127.0.0.1:11432', mcpCurrent: undefined, mcpServerUrl: '' }
    ipcRendererMock.invoke.mockResolvedValue('/opt/yak')
    getRemoteValueMock.mockResolvedValue('')

    const { SystemInfo } = await import('@/constants/hardware')
    ;(SystemInfo as any).mode = 'remote'

    const { rerender } = render(<YakMcpSettings />)

    mcpStreamInfoRef.current = { ...mcpStreamInfoRef.current, mcpUrl: '0.0.0.0:11432' }
    rerender(<YakMcpSettings />)

    await waitFor(() => {
      expect(setRemoteValueMock).toHaveBeenCalledWith(
        RemoteAIAgentGV.YakMCPStartConfig,
        expect.stringContaining('"url":""'),
      )
    })
  })
})
