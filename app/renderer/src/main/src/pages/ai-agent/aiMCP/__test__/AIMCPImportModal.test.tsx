import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import type { NotificationArgsProps } from 'antd'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { showYakitModal } from '@/components/yakitUI/YakitModal/YakitModalConfirm'
import { genDefaultPagination } from '@/pages/invoker/schema'
import { yakitNotify } from '@/utils/notification'
import type { MCPServer } from '../../type/aiMCP'
import { showMCPImportModal } from '../AIMCPImportModal'
import { parseMCPImportConfig } from '../mcpImportConfig'
import { getMCPServersById, grpcAddMCPServer, grpcGetAllMCPServers, grpcUpdateMCPServer } from '../utils'

vi.mock('../utils', () => ({
  getMCPServersById: vi.fn(),
  grpcAddMCPServer: vi.fn(),
  grpcGetAllMCPServers: vi.fn(),
  grpcUpdateMCPServer: vi.fn(),
}))
vi.mock('@/components/yakitUI/YakitModal/YakitModalConfirm', () => ({ showYakitModal: vi.fn() }))
vi.mock('@/utils/notification', () => ({ yakitNotify: vi.fn() }))
vi.mock('@/i18n/useI18nNamespaces', () => ({
  useI18nNamespaces: () => ({
    t: (key: string, values?: { name?: string; count?: number }) =>
      [key, values?.name ?? values?.count].join(' ').trim(),
  }),
}))

const ytray = {
  type: 'http',
  url: 'http://127.0.0.1:51373/mcp?access_token=example-query-token',
  headers: { Authorization: 'Bearer example-token' },
}
const config = JSON.stringify({
  mcpServers: {
    'ytray-browser': ytray,
    'ytray-system': { ...ytray, url: 'http://127.0.0.1:51373/system/mcp' },
    invalid: { type: 'websocket', url: ytray.url },
  },
})
const system: MCPServer = {
  ID: 10,
  Name: 'ytray-system',
  Type: 'sse',
  URL: 'http://127.0.0.1:51373/sse',
  Command: '',
  Enable: false,
  Envs: [],
  Headers: [],
  ErrorMsg: '',
  Tools: [],
}
const browser: MCPServer = {
  ...system,
  ID: 11,
  Name: 'ytray-browser',
  Type: 'streamable_http',
  URL: ytray.url,
  Enable: true,
  Tools: [{ Name: 'example', Description: '', Params: [] }],
}

const successful = { Ok: true, Reason: '' }
const listing = (MCPServers: MCPServer[]) => ({
  MCPServers,
  Total: MCPServers.length,
  Pagination: genDefaultPagination(),
})
const open = (source: Parameters<typeof showMCPImportModal>[0] = config) => {
  const onImported = vi.fn()
  const modal = showMCPImportModal(source, onImported)
  const props = vi.mocked(showYakitModal).mock.lastCall![0]
  render(props.content as ReactNode)
  return { onImported, modal }
}
const confirm = () => fireEvent.click(screen.getByRole('button', { name: 'AIMCPImport.confirm' }))
const notice = () => vi.mocked(yakitNotify).mock.lastCall![1] as NotificationArgsProps

beforeEach(() => {
  vi.resetAllMocks()
  vi.mocked(showYakitModal).mockReturnValue({ destroy: vi.fn() } as ReturnType<typeof showYakitModal>)
  vi.mocked(grpcGetAllMCPServers).mockResolvedValue(listing([system]))
  vi.mocked(grpcAddMCPServer).mockResolvedValue(successful)
  vi.mocked(grpcUpdateMCPServer).mockResolvedValue(successful)
  vi.mocked(getMCPServersById).mockResolvedValue(browser)
})
afterEach(cleanup)

describe('MCP 配置导入', () => {
  it('确认保存后立即关闭，连接结果更新同一条导入通知', async () => {
    const read = vi.fn().mockResolvedValue(config)
    const { onImported, modal } = open(read)
    let finishConnection!: (value: MCPServer) => void
    vi.mocked(getMCPServersById).mockImplementation(
      () =>
        new Promise((resolve) => {
          finishConnection = resolve
        }),
    )
    const add = await screen.findByRole('checkbox', { name: 'ytray-browser' })
    expect(add).toBeChecked()
    const update = screen.getByRole('checkbox', { name: 'AIMCPImport.updateServer ytray-system' })
    expect(update).not.toBeChecked()
    expect(screen.getByText('AIMCPImport.invalidTransport')).toBeInTheDocument()
    expect(screen.queryByText(/example-token|example-query-token/)).not.toBeInTheDocument()
    expect(read).toHaveBeenCalledTimes(1)
    expect(grpcAddMCPServer).not.toHaveBeenCalled()
    expect(grpcUpdateMCPServer).not.toHaveBeenCalled()
    expect(getMCPServersById).not.toHaveBeenCalled()

    vi.mocked(grpcGetAllMCPServers)
      .mockResolvedValueOnce(listing([system]))
      .mockResolvedValueOnce(listing([system, browser]))
    confirm()
    await waitFor(() => expect(getMCPServersById).toHaveBeenCalledExactlyOnceWith(browser.ID, true))
    expect(modal.destroy).toHaveBeenCalledTimes(1)
    expect(yakitNotify).toHaveBeenCalledTimes(1)
    const pendingNotice = notice()
    expect(pendingNotice.message).toBe('AIMCPImport.importedCount 1')
    await act(async () => finishConnection(browser))
    expect(yakitNotify).toHaveBeenCalledTimes(2)
    expect(notice().key).toBe(pendingNotice.key)
    expect(render(notice().description).getByText('AIMCPImport.connected 1')).toBeInTheDocument()
    expect(grpcAddMCPServer).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({
        Name: browser.Name,
        Type: 'streamable_http',
        URL: ytray.url,
        Enable: true,
        Headers: [{ Key: 'authorization', Value: 'Bearer example-token' }],
      }),
      true,
    )
    expect(grpcUpdateMCPServer).not.toHaveBeenCalled()
    expect(onImported).toHaveBeenCalledTimes(1)
  })

  it('快服务完成后先更新同一条通知，慢服务保持检查中', async () => {
    const slowServer = { ...system, Enable: true, ErrorMsg: 'unavailable' }
    vi.mocked(grpcGetAllMCPServers)
      .mockResolvedValueOnce(listing([]))
      .mockResolvedValueOnce(listing([]))
      .mockResolvedValue(listing([browser, slowServer]))
    let finishSlowConnection!: (value: MCPServer) => void
    vi.mocked(getMCPServersById).mockImplementation((id) => {
      if (id === browser.ID) return Promise.resolve(browser)
      return new Promise((resolve) => {
        finishSlowConnection = resolve
      })
    })
    const { modal } = open()
    expect(await screen.findByRole('checkbox', { name: browser.Name })).toBeChecked()
    expect(screen.getByRole('checkbox', { name: slowServer.Name })).toBeChecked()
    confirm()

    await waitFor(() => expect(yakitNotify).toHaveBeenCalledTimes(2))
    expect(modal.destroy).toHaveBeenCalledTimes(1)
    expect(getMCPServersById).toHaveBeenCalledWith(slowServer.ID, true)
    const { key, description } = notice()
    expect(notice().message).toBe('AIMCPImport.importedCount 2')
    const { getByText, queryByText, rerender } = render(description)
    expect(getByText('AIMCPImport.connected 1').closest('li')).toHaveTextContent(browser.Name)
    expect(getByText('AIMCPImport.checking').closest('li')).toHaveTextContent(slowServer.Name)

    await act(async () => finishSlowConnection(slowServer))
    expect(notice().key).toBe(key)
    rerender(notice().description)
    expect(getByText('AIMCPImport.connected 1').closest('li')).toHaveTextContent(browser.Name)
    expect(getByText('AIMCPImport.connectionFailed').closest('li')).toHaveTextContent(slowServer.Name)
    expect(queryByText('AIMCPImport.checking')).not.toBeInTheDocument()
  })

  it('可以只更新同名项，并保留该服务的启停状态', async () => {
    const { modal } = open()
    fireEvent.click(await screen.findByRole('checkbox', { name: 'ytray-browser' }))
    fireEvent.click(screen.getByRole('checkbox', { name: 'AIMCPImport.updateServer ytray-system' }))
    confirm()

    await waitFor(() => expect(modal.destroy).toHaveBeenCalledTimes(1))
    expect(yakitNotify).toHaveBeenCalledTimes(1)
    expect(render(notice().description).getByText('AIMCP.disabledGroup')).toBeInTheDocument()
    expect(grpcAddMCPServer).not.toHaveBeenCalled()
    expect(grpcUpdateMCPServer).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({
        ID: system.ID,
        Name: system.Name,
        URL: 'http://127.0.0.1:51373/system/mcp',
        Type: 'streamable_http',
        Enable: false,
      }),
      true,
    )
    expect(getMCPServersById).not.toHaveBeenCalled()
  })

  it('剪贴板不可用时可以手动粘贴并取消', async () => {
    const { modal, onImported } = open(() => Promise.reject(new Error('unavailable')))
    expect(await screen.findByRole('alert')).toHaveTextContent('AIMCPImport.clipboardFailed')
    const input = screen.getByRole('textbox', { name: 'AIMCPImport.configLabel' })
    fireEvent.change(input, { target: { value: '{' } })
    fireEvent.click(screen.getByRole('button', { name: 'AIMCPImport.parse' }))
    expect(screen.getByRole('alert')).toHaveTextContent('AIMCPImport.invalidJson')
    fireEvent.change(input, { target: { value: config } })
    fireEvent.click(screen.getByRole('button', { name: 'AIMCPImport.parse' }))
    await screen.findByRole('checkbox', { name: 'ytray-browser' })
    fireEvent.click(screen.getByRole('button', { name: 'YakitButton.cancel' }))
    expect(modal.destroy).toHaveBeenCalledTimes(1)
    expect(grpcAddMCPServer).not.toHaveBeenCalled()
    expect(grpcUpdateMCPServer).not.toHaveBeenCalled()
    expect(onImported).not.toHaveBeenCalled()
  })

  it('预览后出现新的同名服务时，需要重新勾选确认', async () => {
    open()
    await screen.findByRole('checkbox', { name: 'ytray-browser' })
    vi.mocked(grpcGetAllMCPServers).mockResolvedValue(listing([system, browser]))
    confirm()
    expect(await screen.findByText('AIMCPImport.serverChanged')).toBeInTheDocument()
    expect(grpcAddMCPServer).not.toHaveBeenCalled()
    expect(grpcUpdateMCPServer).not.toHaveBeenCalled()

    fireEvent.click(screen.getByRole('checkbox', { name: 'AIMCPImport.updateServer ytray-browser' }))
    confirm()
    await waitFor(() => expect(grpcUpdateMCPServer).toHaveBeenCalledTimes(1))
    expect(grpcUpdateMCPServer).toHaveBeenCalledWith(expect.objectContaining({ ID: browser.ID }), true)
  })

  it('部分保存失败时只重试失败项，并保留已保存项的连接结果', async () => {
    const { onImported, modal } = open()
    await screen.findByRole('checkbox', { name: 'ytray-browser' })
    fireEvent.click(screen.getByRole('checkbox', { name: 'AIMCPImport.updateServer ytray-system' }))
    vi.mocked(grpcGetAllMCPServers)
      .mockResolvedValue(listing([system, browser]))
      .mockResolvedValueOnce(listing([system]))
    vi.mocked(grpcUpdateMCPServer).mockRejectedValueOnce(new Error('unavailable'))
    confirm()
    expect(await screen.findByText('AIMCPImport.saveFailed')).toBeInTheDocument()
    expect(modal.destroy).not.toHaveBeenCalled()
    expect(screen.getByRole('checkbox', { name: 'ytray-browser' })).toBeDisabled()
    expect(await screen.findByText('AIMCPImport.connected 1')).toBeInTheDocument()
    fireEvent.click(await screen.findByRole('button', { name: 'AIMCPImport.confirm' }))
    await waitFor(() => expect(modal.destroy).toHaveBeenCalledTimes(1))
    expect(grpcAddMCPServer).toHaveBeenCalledTimes(1)
    expect(grpcUpdateMCPServer).toHaveBeenCalledTimes(2)
    expect(onImported).toHaveBeenCalledTimes(2)
  })

  it('解析常用 MCP 配置并返回具体的校验错误', () => {
    expect(parseMCPImportConfig('{}')).toEqual({ error: 'emptyConfig' })
    expect(parseMCPImportConfig('{"mcpServers":{}}')).toEqual({ error: 'emptyConfig' })

    expect(
      parseMCPImportConfig(
        JSON.stringify({
          mcpServers: {
            sse: { url: 'https://example.test/sse?example=1' },
            stdio: { command: 'npx', args: ['-y', 'mcp-example'], env: { SAMPLE: 'value' } },
            yakit: { type: 'streamable-http', url: 'http://127.0.0.1:8080/mcp' },
            unsupported: { command: 'node', args: ['path with spaces'] },
          },
        }),
      ),
    ).toEqual({
      entries: [
        expect.objectContaining({ server: expect.objectContaining({ Type: 'sse' }) }),
        expect.objectContaining({
          server: expect.objectContaining({
            Type: 'stdio',
            Command: 'npx -y mcp-example',
            Envs: [{ Key: 'SAMPLE', Value: 'value' }],
            Enable: false,
          }),
        }),
        expect.objectContaining({
          name: 'yakit',
          server: expect.objectContaining({ Type: 'streamable_http', URL: 'http://127.0.0.1:8080/mcp' }),
        }),
        { name: 'unsupported', error: 'invalidCommand' },
      ],
    })

    expect(
      parseMCPImportConfig(
        JSON.stringify({
          mcpServers: {
            invalidServer: null,
            invalidTransport: { type: 'websocket', url: 'https://example.test/mcp' },
            missingUrl: { type: 'sse' },
            malformedUrl: { url: 'example.test/mcp' },
            invalidScheme: { url: 'ftp://example.test/mcp' },
            invalidArgs: { command: 'node', args: 'server.js' },
            invalidEnv: { command: 'node', env: { PORT: 8080 } },
            invalidHeaders: { url: 'https://example.test/mcp', headers: { 'X-Port': 8080 } },
            invalidHeaderName: { url: 'https://example.test/mcp', headers: { 'Invalid Header': 'value' } },
          },
        }),
      ),
    ).toEqual({
      entries: [
        { name: 'invalidServer', error: 'invalidServer' },
        { name: 'invalidTransport', error: 'invalidTransport' },
        { name: 'missingUrl', error: 'invalidUrl' },
        { name: 'malformedUrl', error: 'invalidUrl' },
        { name: 'invalidScheme', error: 'invalidUrl' },
        { name: 'invalidArgs', error: 'invalidCommand' },
        { name: 'invalidEnv', error: 'invalidPairs' },
        { name: 'invalidHeaders', error: 'invalidPairs' },
        { name: 'invalidHeaderName', error: 'invalidPairs' },
      ],
    })
  })

  it('将校验后的 HTTP 地址和请求头用于保存', () => {
    const result = parseMCPImportConfig(
      JSON.stringify({
        mcpServers: {
          example: {
            type: 'streamable-http',
            url: ' http:EXAMPLE.test:80/mcp?name=sample ',
            headers: { Authorization: '\tBearer example-token\r\n' },
          },
        },
      }),
    )
    expect(result).toEqual({
      entries: [
        expect.objectContaining({
          target: 'http://example.test',
          server: expect.objectContaining({
            URL: 'http://example.test/mcp?name=sample',
            Headers: [{ Key: 'authorization', Value: 'Bearer example-token' }],
          }),
        }),
      ],
    })
  })
})
