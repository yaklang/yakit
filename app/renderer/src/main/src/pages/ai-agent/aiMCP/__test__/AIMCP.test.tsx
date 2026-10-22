import type React from 'react'
import type * as AhooksModule from 'ahooks'
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import '../../../ai-re-act/hooks/__test__/setupElectron'
import AIMCP from '../AIMCP'
import styles from '../AIMCP.module.scss'
import { getMCPServersById, grpcDeleteMCPServer, grpcGetAllMCPServers, grpcUpdateMCPServer } from '../utils'
import { showYakitModal, YakitModalConfirm } from '@/components/yakitUI/YakitModal/YakitModalConfirm'
import type { AddMCPServerRequest, GetAllMCPServersRequest, MCPServer, UpdateMCPServerRequest } from '../../type/aiMCP'

vi.mock('../utils', () => ({
  grpcGetAllMCPServers: vi.fn(),
  grpcUpdateMCPServer: vi.fn(),
  grpcDeleteMCPServer: vi.fn(),
  getMCPServersById: vi.fn(),
}))
vi.mock('../aiMCPForm/AIMCPForm', () => ({ AIMCPForm: () => null }))
// jsdom 无真实尺寸，useVirtualList 渲染不出条目，按 MessageCenter 测试的做法直接平铺数据
vi.mock('@/components/RollingLoadList/RollingLoadList', () => ({
  RollingLoadList: ({ data, renderRow }: { data: any[]; renderRow: (item: any, index: number) => React.ReactNode }) => (
    <div>{(data || []).map((row, index) => renderRow(row, index))}</div>
  ),
}))
vi.mock('@/components/yakitUI/YakitModal/YakitModalConfirm', () => ({
  showYakitModal: vi.fn(),
  YakitModalConfirm: vi.fn(),
}))
vi.mock('@/i18n/useI18nNamespaces', () => ({
  useI18nNamespaces: () => ({ t: (key: string) => key }),
}))
vi.mock('../../aiChatWelcome/AIChatWelcomeSideSetting', () => ({
  SideSettingButton: () => null,
}))
vi.mock('ahooks', async (importOriginal) => ({
  ...(await importOriginal<typeof AhooksModule>()),
  useInViewport: () => [true],
}))

const server: MCPServer = {
  ID: 1,
  Name: 'sse server',
  Type: 'sse',
  URL: 'http://127.0.0.1:8000/sse',
  Command: '',
  Enable: true,
  Tools: [],
  ErrorMsg: '',
  Envs: [],
  Headers: [],
}
const disabledServer: MCPServer = {
  ...server,
  ID: 2,
  Name: 'stdio server',
  Type: 'stdio',
  URL: '',
  Command: 'npx',
  Enable: false,
}
const responseFor = (servers: MCPServer[], total = servers.length, page = 1) => ({
  MCPServers: servers,
  Pagination: { Page: page, Limit: 20, OrderBy: 'created_at', Order: 'desc' },
  Total: total,
})

const group = (name: string) => screen.getByRole('region', { name: `AIMCP.${name}` })
const groupHeading = (name: string) => within(group(name)).getByRole('button', { expanded: true })
const modalForm = () => {
  const modal = vi.mocked(showYakitModal).mock.calls[0][0]
  return modal.content as React.ReactElement<{
    onCancel: (saved?: AddMCPServerRequest | UpdateMCPServerRequest) => void
  }>
}
const confirmConfig = () => {
  const config = vi.mocked(YakitModalConfirm).mock.calls[0][0]
  return config as unknown as {
    title: (t: (key: string) => string) => string
    onOk: () => void
    onCancel: () => void
  }
}

beforeEach(() => {
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  )
  vi.resetAllMocks()
  vi.mocked(showYakitModal).mockReturnValue({ destroy: vi.fn() } as ReturnType<typeof showYakitModal>)
  vi.mocked(YakitModalConfirm).mockReturnValue({ destroy: vi.fn() } as ReturnType<typeof YakitModalConfirm>)
  vi.mocked(grpcGetAllMCPServers).mockResolvedValue(responseFor([server, disabledServer]))
  vi.mocked(getMCPServersById).mockResolvedValue(server)
  vi.mocked(grpcUpdateMCPServer).mockResolvedValue({} as never)
  vi.mocked(grpcDeleteMCPServer).mockResolvedValue({} as never)
})
afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe('AIMCP 服务器列表', () => {
  it('按启停状态分组展示卡片与数量，空分组不渲染', async () => {
    vi.mocked(grpcGetAllMCPServers).mockResolvedValueOnce(responseFor([server]))
    render(<AIMCP />)
    await screen.findByText(server.Name)
    expect(within(group('runningGroup')).getByText(server.Name)).toBeInTheDocument()
    expect(groupHeading('runningGroup')).toHaveTextContent('1')
    expect(screen.queryByRole('region', { name: 'AIMCP.disabledGroup' })).not.toBeInTheDocument()
  })

  it('列表为空时展示空状态', async () => {
    vi.mocked(grpcGetAllMCPServers).mockResolvedValueOnce(responseFor([]))
    render(<AIMCP />)
    await screen.findByText('YakitEmpty.noData')
    expect(screen.queryByText(server.Name)).not.toBeInTheDocument()
  })

  it('分组可折叠与展开，不重新查询列表', async () => {
    render(<AIMCP />)
    await screen.findByText(server.Name)
    const heading = groupHeading('runningGroup')
    fireEvent.click(heading)
    expect(heading).toHaveAttribute('aria-expanded', 'false')
    expect(within(group('runningGroup')).getByText(server.Name)).not.toBeVisible()
    fireEvent.click(heading)
    expect(await screen.findByText(server.Name)).toBeInTheDocument()
    expect(grpcGetAllMCPServers).toHaveBeenCalledTimes(1)
  })

  it('停用需二次确认，确认后移入停用分组且不重新查询', async () => {
    vi.mocked(grpcGetAllMCPServers).mockResolvedValueOnce(responseFor([server]))
    vi.mocked(getMCPServersById).mockResolvedValue({ ...server, Enable: false })
    render(<AIMCP />)
    fireEvent.click(await screen.findByRole('switch', { name: 'YakitButton.deactivated' }))
    expect(await screen.findByText('AIMCP.disableConfirm')).toBeInTheDocument()
    expect(grpcUpdateMCPServer).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'YakitButton.ok' }))
    await waitFor(() =>
      expect(grpcUpdateMCPServer).toHaveBeenCalledExactlyOnceWith(
        expect.objectContaining({ ID: server.ID, Enable: false }),
      ),
    )
    expect(within(group('disabledGroup')).getByText(server.Name)).toBeInTheDocument()
    expect(grpcGetAllMCPServers).toHaveBeenCalledTimes(1)
    expect(screen.queryByText('AIMCP.toolList')).not.toBeInTheDocument()
  })

  it('停用结果晚于搜索切换返回时不插入新搜索结果', async () => {
    let resolveDisable!: (value: MCPServer) => void
    vi.mocked(getMCPServersById).mockImplementationOnce(
      () =>
        new Promise<MCPServer>((resolve) => {
          resolveDisable = resolve
        }),
    )
    vi.mocked(grpcGetAllMCPServers)
      .mockResolvedValueOnce(responseFor([server, disabledServer]))
      .mockResolvedValueOnce(responseFor([disabledServer]))
    render(<AIMCP />)
    fireEvent.click(await screen.findByRole('switch', { name: 'YakitButton.deactivated' }))
    fireEvent.click(screen.getByRole('button', { name: 'YakitButton.ok' }))
    await waitFor(() =>
      expect(grpcUpdateMCPServer).toHaveBeenCalledExactlyOnceWith(
        expect.objectContaining({ ID: server.ID, Enable: false }),
      ),
    )
    // 停用详情未返回前切换搜索词，新结果只含 stdio server
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'stdio' } })
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 350))
    })
    await screen.findByText(disabledServer.Name)
    await act(async () => {
      resolveDisable({ ...server, Enable: false })
    })
    expect(screen.getByText(disabledServer.Name)).toBeInTheDocument()
    expect(screen.queryByText(server.Name)).not.toBeInTheDocument()
  })

  it('启用后自动打开该服务器的工具列表', async () => {
    vi.mocked(grpcGetAllMCPServers).mockResolvedValueOnce(responseFor([disabledServer]))
    vi.mocked(getMCPServersById).mockResolvedValue({
      ...disabledServer,
      Enable: true,
      Tools: [{ Name: 'echo tool', Description: 'echo desc', Params: [] }],
    })
    render(<AIMCP />)
    fireEvent.click(await screen.findByRole('switch', { name: 'YakitButton.enable' }))
    await screen.findByText('AIMCP.toolList')
    expect(grpcUpdateMCPServer).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({ ID: disabledServer.ID, Enable: true }),
    )
    expect(await screen.findByText('echo tool')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'YakitButton.back' }))
    expect(await screen.findByText(disabledServer.Name)).toBeInTheDocument()
  })

  it('启用结果晚于打开其他服务器返回时不覆盖当前工具页', async () => {
    const enabledA: MCPServer = {
      ...disabledServer,
      Enable: true,
      Tools: [{ Name: 'tool-a', Description: 'tool-a desc', Params: [] }],
    }
    let resolveEnableA!: (value: MCPServer) => void
    // A 的首次详情请求挂起；若页面被错误切到 A，后续详情请求立即返回，使劫持可见
    let enableAResolved = false
    vi.mocked(getMCPServersById).mockImplementation((id: number) => {
      if (id === disabledServer.ID) {
        if (enableAResolved) return Promise.resolve(enabledA)
        return new Promise<MCPServer>((resolve) => {
          resolveEnableA = (value) => {
            enableAResolved = true
            resolve(value)
          }
        })
      }
      return Promise.resolve({
        ...server,
        Tools: [{ Name: 'tool-b', Description: 'tool-b desc', Params: [] }],
      })
    })
    render(<AIMCP />)
    // A(stdio server) 的启用工具详情挂起未返回
    fireEvent.click(await screen.findByRole('switch', { name: 'YakitButton.enable' }))
    // 用户此时点开另一台服务器(sse server)的工具页
    fireEvent.click(screen.getByText(server.Name))
    await screen.findByText('tool-b')
    // A 的启用结果迟到返回，不得把当前工具页覆盖为 A
    await act(async () => {
      resolveEnableA(enabledA)
    })
    expect(screen.getByText('tool-b')).toBeInTheDocument()
    expect(screen.queryByText('tool-a')).not.toBeInTheDocument()
  })

  it('新增保存后刷新列表并自动打开启用的新服务器', async () => {
    const created: AddMCPServerRequest = {
      Name: 'fresh server',
      Type: 'sse',
      URL: '',
      Command: '',
      Enable: true,
      Envs: [],
      Headers: [],
    }
    const saved = { ...server, ID: 9, Name: 'fresh server' }
    let savedInDb = false
    vi.mocked(grpcGetAllMCPServers).mockImplementation(async (req: GetAllMCPServersRequest) => {
      if (req.Keyword === saved.Name) return responseFor(savedInDb ? [saved] : [])
      return responseFor(savedInDb ? [saved] : [])
    })
    vi.mocked(getMCPServersById).mockResolvedValue(saved)
    render(<AIMCP />)
    await screen.findByText('YakitEmpty.noData')
    fireEvent.click(screen.getByRole('button', { name: 'AIMCP.addMcpServer' }))
    expect(showYakitModal).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({ width: 600 }))
    const form = modalForm()
    await act(async () => {
      savedInDb = true
      form.props.onCancel(created)
    })
    await screen.findByText('AIMCP.toolList')
    // 定位查询按新服务器名独立发起，可见列表仍按当前关键词刷新
    expect(vi.mocked(grpcGetAllMCPServers).mock.calls.filter(([req]) => req.Keyword === saved.Name)).toHaveLength(1)
    expect(vi.mocked(grpcGetAllMCPServers).mock.calls.filter(([req]) => req.Keyword === '')).toHaveLength(2)
    expect(vi.mocked(showYakitModal).mock.results[0].value.destroy).toHaveBeenCalled()
  })

  it('非匹配搜索下新增启用服务器仍会自动打开工具列表', async () => {
    const created: AddMCPServerRequest = {
      Name: 'fresh server',
      Type: 'sse',
      URL: '',
      Command: '',
      Enable: true,
      Envs: [],
      Headers: [],
    }
    const saved = { ...server, ID: 9, Name: 'fresh server' }
    let savedInDb = false
    vi.mocked(grpcGetAllMCPServers).mockImplementation(async (req: GetAllMCPServersRequest) => {
      if (req.Keyword === saved.Name) return responseFor(savedInDb ? [saved] : [])
      if (req.Keyword === 'missing') return responseFor([])
      return responseFor(savedInDb ? [saved] : [])
    })
    vi.mocked(getMCPServersById).mockResolvedValue(saved)
    render(<AIMCP />)
    await screen.findByText('YakitEmpty.noData')
    // 输入与新服务器名不匹配的搜索词并等待防抖生效
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'missing' } })
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 350))
    })
    await waitFor(() => expect(vi.mocked(grpcGetAllMCPServers).mock.calls.some(([req]) => req.Keyword === 'missing')))
    fireEvent.click(screen.getByRole('button', { name: 'AIMCP.addMcpServer' }))
    const form = modalForm()
    await act(async () => {
      savedInDb = true
      form.props.onCancel(created)
    })
    await screen.findByText('AIMCP.toolList')
    // 定位查询按新服务器名独立发起；可见列表仍按 'missing' 过滤，保持空态
    expect(vi.mocked(grpcGetAllMCPServers).mock.calls.filter(([req]) => req.Keyword === saved.Name)).toHaveLength(1)
    expect(
      vi.mocked(grpcGetAllMCPServers).mock.calls.filter(([req]) => req.Keyword === 'missing').length,
    ).toBeGreaterThanOrEqual(2)
  })

  it('新增保存未启用的服务器仅刷新列表且不跳转', async () => {
    const created: AddMCPServerRequest = {
      Name: 'fresh server',
      Type: 'sse',
      URL: '',
      Command: '',
      Enable: false,
      Envs: [],
      Headers: [],
    }
    const saved = { ...server, ID: 9, Name: 'fresh server', Enable: false }
    let savedInDb = false
    vi.mocked(grpcGetAllMCPServers).mockImplementation(async (req: GetAllMCPServersRequest) => {
      return responseFor(savedInDb ? [saved] : [])
    })
    render(<AIMCP />)
    await screen.findByText('YakitEmpty.noData')
    fireEvent.click(screen.getByRole('button', { name: 'AIMCP.addMcpServer' }))
    const form = modalForm()
    await act(async () => {
      savedInDb = true
      form.props.onCancel(created)
    })
    // 未启用的保存只刷新列表，不打开工具页
    await waitFor(() =>
      expect(vi.mocked(grpcGetAllMCPServers).mock.calls.filter(([req]) => req.Keyword === '')).toHaveLength(2),
    )
    expect(screen.queryByText('AIMCP.toolList')).not.toBeInTheDocument()
    expect(within(group('disabledGroup')).getByText(saved.Name)).toBeInTheDocument()
    expect(vi.mocked(showYakitModal).mock.results[0].value.destroy).toHaveBeenCalled()
  })

  it('新增后定位请求失败仅刷新列表且不跳转', async () => {
    const created: AddMCPServerRequest = {
      Name: 'fresh server',
      Type: 'sse',
      URL: '',
      Command: '',
      Enable: true,
      Envs: [],
      Headers: [],
    }
    const saved = { ...server, ID: 9, Name: 'fresh server' }
    let savedInDb = false
    vi.mocked(grpcGetAllMCPServers).mockImplementation(async (req: GetAllMCPServersRequest) => {
      if (req.Keyword === saved.Name) throw new Error('lookup failed')
      return responseFor(savedInDb ? [saved] : [])
    })
    render(<AIMCP />)
    await screen.findByText('YakitEmpty.noData')
    fireEvent.click(screen.getByRole('button', { name: 'AIMCP.addMcpServer' }))
    const form = modalForm()
    await act(async () => {
      savedInDb = true
      form.props.onCancel(created)
    })
    await waitFor(() =>
      expect(vi.mocked(grpcGetAllMCPServers).mock.calls.filter(([req]) => req.Keyword === '')).toHaveLength(2),
    )
    expect(screen.queryByText('AIMCP.toolList')).not.toBeInTheDocument()
    expect(within(group('runningGroup')).getByText(saved.Name)).toBeInTheDocument()
  })

  it('新增后定位无同名结果不跳转也不误开其他服务器', async () => {
    const created: AddMCPServerRequest = {
      Name: 'fresh server',
      Type: 'sse',
      URL: '',
      Command: '',
      Enable: true,
      Envs: [],
      Headers: [],
    }
    const saved = { ...server, ID: 9, Name: 'fresh server' }
    let savedInDb = false
    vi.mocked(grpcGetAllMCPServers).mockImplementation(async (req: GetAllMCPServersRequest) => {
      // 定位查询只能查到别的服务器，不得误开
      if (req.Keyword === saved.Name) return responseFor([server])
      return responseFor(savedInDb ? [saved] : [])
    })
    render(<AIMCP />)
    await screen.findByText('YakitEmpty.noData')
    fireEvent.click(screen.getByRole('button', { name: 'AIMCP.addMcpServer' }))
    const form = modalForm()
    await act(async () => {
      savedInDb = true
      form.props.onCancel(created)
    })
    await waitFor(() =>
      expect(vi.mocked(grpcGetAllMCPServers).mock.calls.filter(([req]) => req.Keyword === '')).toHaveLength(2),
    )
    expect(screen.queryByText('AIMCP.toolList')).not.toBeInTheDocument()
    expect(within(group('runningGroup')).getByText(saved.Name)).toBeInTheDocument()
  })

  it('新增弹窗直接关闭不刷新列表', async () => {
    render(<AIMCP />)
    await screen.findByText(server.Name)
    fireEvent.click(screen.getByRole('button', { name: 'AIMCP.addMcpServer' }))
    const form = modalForm()
    await act(async () => {
      form.props.onCancel()
    })
    expect(grpcGetAllMCPServers).toHaveBeenCalledTimes(1)
    expect(screen.getByText(server.Name)).toBeInTheDocument()
  })

  it('编辑保存为启用态后直接打开工具列表，不再刷新列表', async () => {
    vi.mocked(grpcGetAllMCPServers).mockResolvedValueOnce(responseFor([disabledServer]))
    render(<AIMCP />)
    fireEvent.click(await screen.findByRole('button', { name: 'YakitButton.edit' }))
    const form = modalForm()
    await act(async () => {
      form.props.onCancel({ ...disabledServer, Name: 'renamed server', Enable: true })
    })
    await screen.findByText('AIMCP.toolList')
    expect(grpcGetAllMCPServers).toHaveBeenCalledTimes(1)
  })

  it('编辑保存未启用时仅刷新列表', async () => {
    vi.mocked(grpcGetAllMCPServers)
      .mockResolvedValueOnce(responseFor([disabledServer]))
      .mockResolvedValueOnce(responseFor([disabledServer]))
    render(<AIMCP />)
    fireEvent.click(await screen.findByRole('button', { name: 'YakitButton.edit' }))
    const form = modalForm()
    await act(async () => {
      form.props.onCancel({ ...disabledServer, Enable: false })
    })
    await waitFor(() => expect(grpcGetAllMCPServers).toHaveBeenCalledTimes(2))
    expect(screen.queryByText('AIMCP.toolList')).not.toBeInTheDocument()
    expect(screen.getByText(disabledServer.Name)).toBeInTheDocument()
  })

  it('删除需二次确认，确认前不删除且点击不冒泡打开工具页', async () => {
    render(<AIMCP />)
    fireEvent.click(await screen.findByRole('button', { name: 'YakitButton.delete' }))
    const config = confirmConfig()
    expect(config.title((key) => key)).toBe('AIMCP.deleteMcpServer')
    expect(grpcDeleteMCPServer).not.toHaveBeenCalled()
    // 删除按钮阻止冒泡：不触发卡片 onClick 打开工具页
    expect(screen.queryByText('AIMCP.toolList')).not.toBeInTheDocument()
  })

  it('确认删除按正确 ID 删除并刷新列表', async () => {
    render(<AIMCP />)
    fireEvent.click(await screen.findByRole('button', { name: 'YakitButton.delete' }))
    await act(async () => {
      confirmConfig().onOk()
    })
    await waitFor(() => expect(grpcDeleteMCPServer).toHaveBeenCalledExactlyOnceWith({ ID: disabledServer.ID }))
    await waitFor(() => expect(grpcGetAllMCPServers).toHaveBeenCalledTimes(2))
    expect(vi.mocked(YakitModalConfirm).mock.results[0].value.destroy).toHaveBeenCalled()
  })

  it('取消删除不调用删除接口也不刷新', async () => {
    render(<AIMCP />)
    fireEvent.click(await screen.findByRole('button', { name: 'YakitButton.delete' }))
    act(() => {
      confirmConfig().onCancel()
    })
    expect(grpcDeleteMCPServer).not.toHaveBeenCalled()
    expect(grpcGetAllMCPServers).toHaveBeenCalledTimes(1)
    expect(vi.mocked(YakitModalConfirm).mock.results[0].value.destroy).toHaveBeenCalled()
  })

  it('工具获取失败的服务展示失败标识、错误状态点与完整错误提示', async () => {
    const failed = { ...server, ErrorMsg: 'connection refused' }
    vi.mocked(grpcGetAllMCPServers).mockResolvedValueOnce(responseFor([failed]))
    render(<AIMCP />)
    await screen.findByText(failed.Name)
    // 名称旁恢复常驻失败标签，悬停可见完整错误
    expect(screen.getByText('AIMCP.toolFetchFailed')).toBeInTheDocument()
    expect(screen.getByText(failed.Name)).toHaveAttribute('title', 'connection refused')
    // 已启用但工具获取失败不再显示绿色状态点
    expect(document.querySelector(`.${styles['mcp-status-dot-error']}`)).toBeInTheDocument()
  })

  it('搜索连续输入仅在防抖后查询最终关键词', async () => {
    render(<AIMCP />)
    await screen.findByText(server.Name)
    const search = screen.getByRole('textbox')
    fireEvent.change(search, { target: { value: 'first' } })
    expect(search).toHaveValue('first')
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 250))
    })
    expect(grpcGetAllMCPServers).toHaveBeenCalledTimes(1)
    fireEvent.change(search, { target: { value: 'final' } })
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 350))
    })
    expect(grpcGetAllMCPServers).toHaveBeenCalledTimes(2)
    expect(vi.mocked(grpcGetAllMCPServers).mock.calls[1][0]).toMatchObject({
      Keyword: 'final',
      Pagination: { Page: 1 },
    })
  })

  it('旧查询晚返回时不覆盖新搜索结果', async () => {
    let resolveOld!: (value: ReturnType<typeof responseFor>) => void
    vi.mocked(grpcGetAllMCPServers)
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveOld = resolve
          }),
      )
      .mockResolvedValueOnce(responseFor([disabledServer]))
    render(<AIMCP />)
    await waitFor(() => expect(grpcGetAllMCPServers).toHaveBeenCalledTimes(1))
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'stdio' } })
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 350))
    })
    await screen.findByText(disabledServer.Name)
    await act(async () => {
      resolveOld(responseFor([server, disabledServer]))
    })
    expect(screen.getByText(disabledServer.Name)).toBeInTheDocument()
    expect(screen.queryByText(server.Name)).not.toBeInTheDocument()
  })

  it('单次请求全量拉取，滚动不触发新查询', async () => {
    const servers = Array.from({ length: 25 }, (_, index) => ({
      ...server,
      ID: index + 1,
      Name: `full server ${index + 1}`,
    }))
    vi.mocked(grpcGetAllMCPServers).mockResolvedValueOnce(responseFor(servers, servers.length, 1))
    render(<AIMCP />)
    // 一次查询即返回全部数据，请求携带全量 Limit
    expect(await screen.findByText('full server 25')).toBeInTheDocument()
    expect(vi.mocked(grpcGetAllMCPServers)).toHaveBeenCalledTimes(1)
    expect(vi.mocked(grpcGetAllMCPServers).mock.calls[0][0]).toMatchObject({ Pagination: { Limit: 10000 } })
    // loading 300ms 定时器结束后才显示到底提示
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 350))
    })
    expect(screen.getByText('YakitEmpty.end_of_list')).toBeInTheDocument()
    // 滚动列表不再触发分页查询
    const list = screen.getByText('full server 1').closest('section')!.parentElement!
    fireEvent.scroll(list)
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 350))
    })
    expect(grpcGetAllMCPServers).toHaveBeenCalledTimes(1)
  })
})
