import { ipcRendererMock } from '../../../../ai-re-act/hooks/__test__/setupElectron'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { YakMcpSettings } from '../YakMcpSettings'
import { grpcGetMCPToolList, grpcSetMCPToolEnabled } from '@/pages/ai-agent/aiMCP/utils'
import { getRemoteValue, setRemoteValue } from '@/utils/kv'
import userEvent from '@testing-library/user-event'
import type { MCPToolConfig } from '@/pages/ai-agent/type/aiMCP'
import { yakitNotify } from '@/utils/notification'
import { SystemInfo } from '@/constants/hardware'
import { RemoteAIAgentGV } from '@/enums/aiAgent'

vi.mock('@/i18n/useI18nNamespaces', () => ({
  useI18nNamespaces: () => ({
    t: (key: string, params?: object) => (params ? `${key}:${JSON.stringify(params)}` : key),
    i18nRefresh: 0,
  }),
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
  TableVirtualResize: ({ data, columns }) => (
    <div data-testid="mcp-table">
      {data.map((tool) => (
        <div key={tool.ToolName} data-testid={`tool-${tool.ToolName}`}>
          {tool.ToolName}
          {columns.find((column) => column.dataKey === 'Enable').render(tool.Enable, tool)}
        </div>
      ))}
    </div>
  ),
}))

vi.mock('@/utils/kv', () => ({
  getRemoteValue: vi.fn(),
  setRemoteValue: vi.fn(),
}))

const makeTool = (ToolName: string, overrides: Partial<MCPToolConfig> = {}): MCPToolConfig => ({
  ID: 1,
  ToolName,
  Source: 'builtin',
  ServerName: '',
  Enable: true,
  Description: '',
  Params: [],
  ...overrides,
})
const listResponse = (Tools: MCPToolConfig[], Total = Tools.length, Page = 1) => ({
  Tools,
  Total,
  Pagination: { Page, Limit: 200, OrderBy: 'id', Order: 'asc' },
})
const getToolListMock = vi.mocked(grpcGetMCPToolList)
const setToolEnabledMock = vi.mocked(grpcSetMCPToolEnabled)
const searchTools = async (text: string) => {
  const input = screen.getByRole('textbox', { name: 'SettingsPage.yakMcp.searchPlaceholder' })
  await userEvent.clear(input)
  await userEvent.type(input, text)
}
const selectFilter = async (name: string, option: string) => {
  fireEvent.mouseDown(screen.getByRole('combobox', { name }))
  await userEvent.click(await screen.findByText(option, { selector: '.ant-select-item-option-content' }))
}

const getRemoteValueMock = vi.mocked(getRemoteValue)
const setRemoteValueMock = vi.mocked(setRemoteValue)

describe('YakMcpSettings', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getToolListMock.mockReset().mockResolvedValue(listResponse([]))
    setToolEnabledMock.mockReset().mockResolvedValue({ Ok: true, Reason: '' })
    SystemInfo.mode = 'local'
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
    expect(await screen.findByText('SettingsPage.yakMcp.noResults')).toBeInTheDocument()
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

    // 等缓存加载完成（configLoadedRef 置位）后再改地址，贴合真实时序
    await waitFor(() => {
      expect(getRemoteValueMock).toHaveBeenCalledWith(RemoteAIAgentGV.YakMCPStartConfig)
    })
    await new Promise((r) => setTimeout(r, 0))

    mcpStreamInfoRef.current = { ...mcpStreamInfoRef.current, mcpUrl: '0.0.0.0:11432' }
    rerender(<YakMcpSettings />)

    await waitFor(() => {
      expect(setRemoteValueMock).toHaveBeenCalledWith(
        RemoteAIAgentGV.YakMCPStartConfig,
        expect.stringContaining('"url":""'),
      )
    })
  })

  it('MCP 运行中打开设置页不会用默认 state 覆盖缓存配置', async () => {
    ipcRendererMock.invoke.mockResolvedValue('/opt/yak')
    // 缓存中存有用户自定义的自启动与能力层配置
    const cached = {
      autoStart: true,
      url: '127.0.0.1:9011',
      enableLegacyMcpTools: false,
      enableAIToolFramework: false,
      enableBridgeExternalMcp: false,
    }
    getRemoteValueMock.mockResolvedValue(JSON.stringify(cached))
    // MCP 正在运行：enableMcp 为 true，挂载即触发 [enableMcp] effect
    mcpStreamInfoRef.current = {
      mcpUrl: '127.0.0.1:9011',
      mcpCurrent: { Status: 'running' },
      mcpServerUrl: 'http://127.0.0.1:9011/sse',
    }

    render(<YakMcpSettings />)

    await waitFor(() => {
      expect(getRemoteValueMock).toHaveBeenCalledWith(RemoteAIAgentGV.YakMCPStartConfig)
    })

    // 等过 500ms 防抖落盘窗口
    await new Promise((r) => setTimeout(r, 600))

    // 不应以尚未恢复的默认 state（autoStart:false / enableLegacyMcpTools:true）覆盖缓存
    expect(setRemoteValueMock).not.toHaveBeenCalledWith(
      RemoteAIAgentGV.YakMCPStartConfig,
      expect.stringContaining('"autoStart":false'),
    )
    expect(setRemoteValueMock).not.toHaveBeenCalledWith(
      RemoteAIAgentGV.YakMCPStartConfig,
      expect.stringContaining('"enableLegacyMcpTools":true'),
    )
  })

  it('跨页加载并通过中文描述搜索截图，英文名称忽略大小写和首尾空格', async () => {
    getToolListMock.mockResolvedValueOnce(listResponse([makeTool('port_scan')], 2)).mockResolvedValueOnce(
      listResponse(
        [
          makeTool('browser_capture', {
            Description: 'Capture the browser page',
            DescriptionI18n: { Zh: '对当前网页截图', En: 'Capture the browser page' },
          }),
        ],
        2,
        2,
      ),
    )
    render(<YakMcpSettings />)
    await screen.findByTestId('tool-browser_capture')
    expect(getToolListMock).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        Keyword: '',
        Pagination: expect.objectContaining({ Page: 2 }),
        ForceSync: false,
      }),
      true,
    )
    await searchTools('截图')
    expect(screen.getByTestId('tool-browser_capture')).toBeInTheDocument()
    expect(screen.queryByTestId('tool-port_scan')).not.toBeInTheDocument()
    await searchTools('  BROWSER_CAPTURE  ')
    expect(screen.getByTestId('tool-browser_capture')).toBeInTheDocument()
    expect(getToolListMock).toHaveBeenCalledTimes(2)
  })

  it('组合来源、状态和搜索条件批量启用全部匹配项，跳过已启用和不匹配的工具', async () => {
    getToolListMock.mockResolvedValue(
      listResponse([
        makeTool('screen_a', { Source: 'aitool', Enable: false }),
        makeTool('screen_b', { Source: 'aitool', Enable: false }),
        makeTool('screen_enabled', { Source: 'aitool' }),
        makeTool('screen_builtin', { Enable: false }),
        makeTool('other', { Source: 'aitool', Enable: false }),
      ]),
    )
    render(<YakMcpSettings />)
    await screen.findByTestId('tool-screen_a')
    await searchTools('screen')
    await selectFilter('ConfigSystemMcp.tool_source', 'ConfigSystemMcp.source_aitool')
    await selectFilter('SettingsPage.yakMcp.statusFilter', 'SettingsPage.yakMcp.disabledOnly')
    await userEvent.click(screen.getByRole('button', { name: 'SettingsPage.yakMcp.enableResults' }))
    await waitFor(() => expect(setToolEnabledMock).toHaveBeenCalledTimes(2))
    expect(setToolEnabledMock).toHaveBeenCalledWith({ ToolName: 'screen_a', Enable: true }, true)
    expect(setToolEnabledMock).toHaveBeenCalledWith({ ToolName: 'screen_b', Enable: true }, true)
    expect(await screen.findByText('SettingsPage.yakMcp.noResults')).toBeInTheDocument()
    await userEvent.click(screen.getAllByRole('button', { name: 'SettingsPage.yakMcp.clearFilters' })[0])
    expect(screen.getByRole('switch', { name: 'screen_a' })).toBeChecked()
    expect(screen.getByRole('switch', { name: 'screen_builtin' })).not.toBeChecked()
  })

  it('批量关闭覆盖未滚动到的后续页，并区分业务失败和传输失败，重试只处理失败项', async () => {
    getToolListMock
      .mockResolvedValueOnce(listResponse([makeTool('first')], 4))
      .mockResolvedValueOnce(
        listResponse([makeTool('second'), makeTool('third'), makeTool('already_off', { Enable: false })], 4, 2),
      )
    setToolEnabledMock.mockImplementation(async ({ ToolName }) => {
      if (ToolName === 'second') return { Ok: false, Reason: 'denied' }
      if (ToolName === 'third') throw new Error('disconnected')
      return { Ok: true, Reason: '' }
    })
    render(<YakMcpSettings />)
    await screen.findByTestId('tool-second')
    await userEvent.click(screen.getByRole('button', { name: 'SettingsPage.yakMcp.disableResults' }))
    await waitFor(() =>
      expect(yakitNotify).toHaveBeenCalledWith('error', 'SettingsPage.yakMcp.batchResult:{"success":1,"failed":2}'),
    )
    expect(setToolEnabledMock).toHaveBeenCalledTimes(3)
    expect(screen.getByRole('switch', { name: 'first' })).not.toBeChecked()
    expect(screen.getByRole('switch', { name: 'second' })).toBeChecked()
    setToolEnabledMock.mockClear().mockResolvedValue({ Ok: true, Reason: '' })
    await userEvent.click(screen.getByRole('button', { name: 'SettingsPage.yakMcp.disableResults' }))
    await waitFor(() => expect(screen.getByRole('switch', { name: 'second' })).not.toBeChecked())
    expect(setToolEnabledMock).toHaveBeenCalledTimes(2)
    expect(setToolEnabledMock).not.toHaveBeenCalledWith(expect.objectContaining({ ToolName: 'first' }), true)
  })

  it('单个工具返回 Ok=false 时保留原开关状态', async () => {
    getToolListMock.mockResolvedValue(listResponse([makeTool('capture')]))
    setToolEnabledMock.mockResolvedValue({ Ok: false, Reason: 'not found' })
    render(<YakMcpSettings />)
    await userEvent.click(await screen.findByRole('switch', { name: 'capture' }))
    await waitFor(() =>
      expect(yakitNotify).toHaveBeenCalledWith('error', 'ConfigSystemMcp.disable_tool_failed:{"name":"capture"}'),
    )
    expect(screen.getByRole('switch', { name: 'capture' })).toBeChecked()
  })

  it('加载后续页期间及加载失败后禁用批量操作，支持重试', async () => {
    let rejectPage!: (error: Error) => void
    getToolListMock.mockResolvedValueOnce(listResponse([makeTool('first')], 2)).mockImplementationOnce(
      () =>
        new Promise((_, reject) => {
          rejectPage = reject
        }),
    )
    render(<YakMcpSettings />)
    await waitFor(() => expect(getToolListMock).toHaveBeenCalledTimes(2))
    expect(screen.getByRole('button', { name: 'SettingsPage.yakMcp.disableResults' })).toBeDisabled()
    await act(async () => rejectPage(new Error('network')))
    expect(await screen.findByText('SettingsPage.yakMcp.loadFailed')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'SettingsPage.yakMcp.disableResults' })).toBeDisabled()
    getToolListMock.mockResolvedValue(listResponse([makeTool('recovered')]))
    await userEvent.click(screen.getByRole('button', { name: 'SettingsPage.yakMcp.retry' }))
    expect(await screen.findByTestId('tool-recovered')).toBeInTheDocument()
  })

  it('恢复能力层后按正确来源加载，强制同步仅首请求启用，筛选和刷新不重复同步', async () => {
    getRemoteValueMock.mockResolvedValue(
      JSON.stringify({
        enableLegacyMcpTools: false,
        enableAIToolFramework: true,
        enableBridgeExternalMcp: true,
        autoStart: false,
      }),
    )
    getToolListMock.mockResolvedValue(listResponse([makeTool('capture', { Source: 'aitool' })]))
    render(<YakMcpSettings />)
    await screen.findByTestId('tool-capture')
    expect(getToolListMock).toHaveBeenCalledWith(
      expect.objectContaining({ Source: 'aitool,bridge', ForceSync: false }),
      true,
    )
    getToolListMock
      .mockClear()
      .mockResolvedValueOnce(listResponse([makeTool('capture')], 2))
      .mockResolvedValueOnce(listResponse([makeTool('remote')], 2, 2))
    await userEvent.click(screen.getByRole('button', { name: 'ConfigSystemMcp.force_sync' }))
    await screen.findByTestId('tool-remote')
    expect(getToolListMock.mock.calls.map(([params]) => params.ForceSync)).toEqual([true, false])
    await searchTools('capture')
    expect(getToolListMock).toHaveBeenCalledTimes(2)
    await userEvent.click(screen.getByRole('button', { name: 'SettingsPage.yakMcp.refreshTools' }))
    await waitFor(() => expect(getToolListMock).toHaveBeenCalledTimes(3))
    expect(getToolListMock.mock.lastCall?.[0].ForceSync).toBe(false)
  })

  it('切换能力层后丢弃旧请求，不让过期结果恢复已关闭来源', async () => {
    let resolveOld!: (value: ReturnType<typeof listResponse>) => void
    getToolListMock
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveOld = resolve
          }),
      )
      .mockResolvedValue(listResponse([makeTool('ai_tool', { Source: 'aitool' })]))
    render(<YakMcpSettings />)
    await waitFor(() => expect(getToolListMock).toHaveBeenCalledTimes(1))
    await userEvent.click(screen.getAllByRole('switch')[1])
    await screen.findByTestId('tool-ai_tool')
    await act(async () => resolveOld(listResponse([makeTool('stale_builtin')])))
    expect(screen.queryByTestId('tool-stale_builtin')).not.toBeInTheDocument()
    expect(screen.getByTestId('tool-ai_tool')).toBeInTheDocument()
  })

  it('批量更新限制并发数，执行期间锁定筛选、单项开关和能力层开关', async () => {
    const pending: Array<() => void> = []
    getToolListMock.mockResolvedValue(listResponse(Array.from({ length: 7 }, (_, i) => makeTool(`tool_${i}`))))
    setToolEnabledMock.mockImplementation(
      () =>
        new Promise((resolve) => {
          pending.push(() => resolve({ Ok: true, Reason: '' }))
        }),
    )
    render(<YakMcpSettings />)
    await screen.findByTestId('tool-tool_6')
    await userEvent.click(screen.getByRole('button', { name: 'SettingsPage.yakMcp.disableResults' }))
    expect(setToolEnabledMock).toHaveBeenCalledTimes(5)
    expect(screen.getByRole('textbox', { name: 'SettingsPage.yakMcp.searchPlaceholder' })).toBeDisabled()
    expect(screen.getByRole('switch', { name: 'tool_0' })).toBeDisabled()
    expect(screen.getAllByRole('switch')[1]).toBeDisabled()
    await act(async () => pending.splice(0).forEach((resolve) => resolve()))
    await waitFor(() => expect(setToolEnabledMock).toHaveBeenCalledTimes(7))
    await act(async () => pending.splice(0).forEach((resolve) => resolve()))
    await waitFor(() => expect(screen.getByRole('switch', { name: 'tool_6' })).not.toBeChecked())
    expect(screen.getByRole('textbox', { name: 'SettingsPage.yakMcp.searchPlaceholder' })).toBeEnabled()
  })

  it('不把提前结束的分页结果作为完整批量操作范围', async () => {
    getToolListMock
      .mockResolvedValueOnce(listResponse([makeTool('first')], 2))
      .mockResolvedValueOnce(listResponse([], 2, 2))
    render(<YakMcpSettings />)
    expect(await screen.findByText('SettingsPage.yakMcp.loadFailed')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'SettingsPage.yakMcp.disableResults' })).toBeDisabled()
    expect(screen.queryByTestId('tool-first')).not.toBeInTheDocument()
  })

  it('所有能力层关闭时不查询工具，并禁用空范围的批量操作', async () => {
    getRemoteValueMock.mockResolvedValue(
      JSON.stringify({
        enableLegacyMcpTools: false,
        enableAIToolFramework: false,
        enableBridgeExternalMcp: false,
        autoStart: false,
      }),
    )
    render(<YakMcpSettings />)
    expect(await screen.findByText('ConfigSystemMcp.no_tool_tier_title')).toBeInTheDocument()
    expect(getToolListMock).not.toHaveBeenCalled()
    expect(screen.getByRole('button', { name: 'SettingsPage.yakMcp.enableResults' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'SettingsPage.yakMcp.disableResults' })).toBeDisabled()
  })
})
