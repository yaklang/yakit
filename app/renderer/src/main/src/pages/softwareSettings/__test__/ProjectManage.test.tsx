import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type * as Ahooks from 'ahooks'
import type * as Store from '@/store'
import type * as EnvFile from '@/utils/envfile'
import type * as Notification from '@/utils/notification'
import type { ProjectDescription } from '../projectUtils'
// 先于被测模块注册 window.require('electron') stub（ProjectManage 模块顶层解构 ipcRenderer）
import { ipcRendererMock, resetIpcMocks } from '../../ai-re-act/hooks/__test__/setupElectron'

const mocks = vi.hoisted(() => ({
  startUpload: vi.fn(),
  delTemporaryProject: vi.fn(),
}))

// jsdom 中容器高度为 0，真实 useVirtualList 不渲染任何行；这里直接全量返回
vi.mock('ahooks', async (importOriginal) => {
  const actual = await importOriginal<typeof Ahooks>()
  return {
    ...actual,
    useVirtualList: <T,>(list: T[]) => [list.map((data, index) => ({ data, index })), vi.fn()],
  }
})

vi.mock('@/i18n/useI18nNamespaces', () => ({
  useI18nNamespaces: () => ({ t: (key: string) => key, i18nRefresh: 0 }),
}))

vi.mock('@/utils/notification', async (importOriginal) => {
  const actual = await importOriginal<typeof Notification>()
  return { ...actual, failed: vi.fn(), info: vi.fn(), yakitFailed: vi.fn(), warn: vi.fn(), success: vi.fn() }
})

vi.mock('@/utils/envfile', async (importOriginal) => {
  const actual = await importOriginal<typeof EnvFile>()
  return { ...actual, isCommunityEdition: () => true, isEnpriTrace: () => false, isIRify: () => false }
})

vi.mock('@/store', async (importOriginal) => {
  const actual = await importOriginal<typeof Store>()
  return {
    ...actual,
    useEeSystemConfig: () => ({ eeSystemConfig: [] }),
    useStore: () => ({ userInfo: { isLogin: false } }),
  }
})

vi.mock('@/store/temporaryProject', () => ({
  useTemporaryProjectStore: () => ({
    isExportTemporaryProjectFlag: false,
    setIsExportTemporaryProjectFlag: vi.fn(),
    setTemporaryProjectId: vi.fn(),
    delTemporaryProject: mocks.delTemporaryProject,
  }),
}))

vi.mock('@/components/layout/utils', () => ({
  useUploadInfoByEnpriTrace: () => [{ startUpload: mocks.startUpload }],
}))

const { default: ProjectManage } = await import('../ProjectManage')

const makeProject = (overrides: Partial<ProjectDescription>): ProjectDescription => ({
  Id: 0,
  ProjectName: '',
  Description: '',
  DatabasePath: '',
  CreatedAt: 0,
  UpdateAt: 0,
  FolderId: 0,
  FolderName: '',
  ChildFolderId: 0,
  ChildFolderName: '',
  Type: '',
  FileSize: '',
  ExternalModule: '',
  ExternalProjectCode: '',
  OnlineSubTaskID: '',
  ...overrides,
})

/** 一级文件夹 A(Id=5)，二级文件夹 X(Id=12，挂在 A 下) */
const folderA = makeProject({ Id: 5, ProjectName: 'A', Type: 'file', FolderId: 0 })
const folderX = makeProject({ Id: 12, ProjectName: 'X', Type: 'file', FolderId: 5 })

interface GetProjectsRequest {
  Type?: string
  FolderId?: number
  ChildFolderId?: number
  Pagination?: { Page: number }
}

/** 列表数据：key 为 `${FolderId}/${ChildFolderId}`，根目录为 '/' */
let lists: Record<string, ProjectDescription[]> = {}

const listResponse = (Projects: ProjectDescription[]) => ({
  Pagination: { Page: 1, Limit: 20 },
  Projects,
  Total: Projects.length,
  TotalPage: 1,
  ProjectToTal: Projects.length,
})

const mockInvoke = () => {
  ipcRendererMock.invoke.mockImplementation(async (channel: string, req?: GetProjectsRequest) => {
    switch (channel) {
      case 'GetProjects':
        // 弹窗级联选项：Type=file
        if (req?.Type === 'file') return listResponse(req.FolderId ? [] : [folderA])
        return listResponse(lists[`${req?.FolderId ?? ''}/${req?.ChildFolderId ?? ''}`] ?? [])
      case 'NewProject':
        return { Id: '99', ProjectName: 'P1' }
      default:
        return undefined
    }
  })
}

/** 主列表的 GetProjects 请求（排除弹窗级联的 Type=file 请求） */
const listRequests = () =>
  ipcRendererMock.invoke.mock.calls
    .filter(([channel, req]) => channel === 'GetProjects' && (req as GetProjectsRequest).Type !== 'file')
    .map(([, req]) => req as GetProjectsRequest)

const renderPage = () => render(<ProjectManage engineMode="local" onEngineModeChange={vi.fn()} onFinish={vi.fn()} />)

/** 等待出现一次新的主列表请求并返回它 */
const waitNextListRequest = async (countBefore: number) => {
  await waitFor(() => expect(listRequests().length).toBeGreaterThan(countBefore), { timeout: 2000 })
  return listRequests()[listRequests().length - 1]
}

/** 列表外层 YakitSpin 加载中会带 pointer-events: none，列表内的点击直接派发 */
const enterFolder = async (name: string) => {
  const row = await waitFor(() => {
    const el = document.querySelector<HTMLElement>(`[data-testid="project-open"][data-project-name="${name}"]`)
    expect(el).not.toBeNull()
    return el as HTMLElement
  })
  const countBefore = listRequests().length
  fireEvent.click(row)
  // openFile 延迟 300ms 才刷新列表，等这次请求发出再继续
  await waitNextListRequest(countBefore)
}

/** 顶部入口是 div，不是按钮；空状态入口是 YakitButton */
const clickTopEntry = async (user: ReturnType<typeof userEvent.setup>, key: string) => {
  const entry = screen.getAllByText(key).find((node) => !node.closest('button'))
  expect(entry).toBeDefined()
  await user.click(entry as HTMLElement)
}

const getBreadcrumb = () => screen.getByText('ProjectManage.localFiles').parentElement as HTMLElement

const getCascaderText = (dialog: HTMLElement) => dialog.querySelector('.ant-select-selection-item')?.textContent ?? ''

describe('ProjectManage 新建/导入后的目录跳转与当前文件夹回显', () => {
  beforeEach(() => {
    resetIpcMocks()
    mocks.startUpload.mockReset()
    mocks.delTemporaryProject.mockReset().mockResolvedValue(undefined)
    lists = { '/': [folderA], '5/': [], '5/12': [] }
    mockInvoke()
    vi.stubGlobal(
      'ResizeObserver',
      class {
        observe() {}
        disconnect() {}
        unobserve() {}
      },
    )
    vi.stubGlobal('matchMedia', () => ({ matches: false, addListener: () => {}, removeListener: () => {} }))
  })

  it('顶部新建项目：在二级文件夹内打开时回显 A / X，按最后一级预置 ids，提交后停留在 A > X', async () => {
    lists['5/'] = [folderX]
    const user = userEvent.setup()
    renderPage()
    await enterFolder('A')
    await enterFolder('X')

    await clickTopEntry(user, 'ProjectManage.newProject')
    const dialog = await screen.findByRole('dialog')
    expect(getCascaderText(dialog)).toMatch(/A\s*\/\s*X/)

    await user.type(within(dialog).getByPlaceholderText('NewProjectAndFolder.unnamed'), 'P1')
    const countBefore = listRequests().length
    await user.click(within(dialog).getByRole('button', { name: 'NewProjectAndFolder.create' }))

    await waitFor(() =>
      expect(ipcRendererMock.invoke).toHaveBeenCalledWith(
        'NewProject',
        expect.objectContaining({ ProjectName: 'P1', FolderId: 5, ChildFolderId: 12 }),
      ),
    )
    const next = await waitNextListRequest(countBefore)
    expect(next).toMatchObject({ FolderId: 5, ChildFolderId: 12, Pagination: { Page: 1 } })
    expect(within(getBreadcrumb()).getByText('A')).toBeInTheDocument()
    expect(within(getBreadcrumb()).getByText('X')).toBeInTheDocument()
  })

  it('顶部新建项目：在一级文件夹内打开时回显 A，预置 FolderId=5、ChildFolderId=0', async () => {
    const user = userEvent.setup()
    renderPage()
    await enterFolder('A')

    await clickTopEntry(user, 'ProjectManage.newProject')
    const dialog = await screen.findByRole('dialog')
    expect(getCascaderText(dialog)).toBe('A')

    await user.type(within(dialog).getByPlaceholderText('NewProjectAndFolder.unnamed'), 'P1')
    await user.click(within(dialog).getByRole('button', { name: 'NewProjectAndFolder.create' }))

    await waitFor(() =>
      expect(ipcRendererMock.invoke).toHaveBeenCalledWith(
        'NewProject',
        expect.objectContaining({ ProjectName: 'P1', FolderId: 5, ChildFolderId: 0 }),
      ),
    )
  })

  it('顶部导入：在二级文件夹内打开时回显 A / X，导入带上 ids，导入结束后跳到 A > X', async () => {
    lists['5/'] = [folderX]
    const user = userEvent.setup()
    renderPage()
    await enterFolder('A')
    await enterFolder('X')

    await clickTopEntry(user, 'YakitButton.import')
    const dialog = await screen.findByRole('dialog')
    expect(getCascaderText(dialog)).toMatch(/A\s*\/\s*X/)

    await user.type(within(dialog).getByPlaceholderText('NewProjectAndFolder.inputAbsolute'), '/tmp/p.yakitproject')
    await user.type(within(dialog).getByPlaceholderText('NewProjectAndFolder.inputProjectNameImport'), 'P1')
    await user.click(within(dialog).getByRole('button', { name: 'YakitButton.import' }))

    await waitFor(() =>
      expect(ipcRendererMock.invoke).toHaveBeenCalledWith(
        'IsProjectNameValid',
        expect.objectContaining({ ProjectName: 'P1', FolderId: 5, ChildFolderId: 12 }),
      ),
    )
    await waitFor(() =>
      expect(ipcRendererMock.invoke).toHaveBeenCalledWith(
        'ImportProject',
        expect.objectContaining({ FolderId: 5, ChildFolderId: 12 }),
        expect.any(String),
      ),
    )

    // 模拟导入流结束：TransferProject 注册的 `${token}-end` 回调 → onModalSubmit('isImport', { folders })
    const endCall = [...ipcRendererMock.on.mock.calls].reverse().find(([channel]) => String(channel).endsWith('-end'))
    expect(endCall).toBeDefined()
    const onTransferEnd = endCall?.[1] as (e: unknown) => void
    const countBefore = listRequests().length
    act(() => onTransferEnd({}))

    const next = await waitNextListRequest(countBefore)
    expect(next).toMatchObject({ FolderId: 5, ChildFolderId: 12, Pagination: { Page: 1 } })
    expect(within(getBreadcrumb()).getByText('X')).toBeInTheDocument()
  })

  it('空文件夹里的新建项目入口（parentNode）：不显示所属文件夹，folders=undefined，提交后留在 A 并回到第 1 页', async () => {
    const user = userEvent.setup()
    renderPage()
    await enterFolder('A')

    fireEvent.click(await screen.findByRole('button', { name: 'ProjectManage.newProject' }))
    const dialog = await screen.findByRole('dialog')
    expect(within(dialog).queryByText('NewProjectAndFolder.belongToFolder :')).toBeNull()

    await user.type(within(dialog).getByPlaceholderText('NewProjectAndFolder.unnamed'), 'P1')
    const countBefore = listRequests().length
    await user.click(within(dialog).getByRole('button', { name: 'NewProjectAndFolder.create' }))

    await waitFor(() =>
      expect(ipcRendererMock.invoke).toHaveBeenCalledWith(
        'NewProject',
        expect.objectContaining({ ProjectName: 'P1', FolderId: 5, ChildFolderId: 0 }),
      ),
    )
    const next = await waitNextListRequest(countBefore)
    expect(next).toMatchObject({ FolderId: 5, Pagination: { Page: 1 } })
    expect(next.ChildFolderId).toBeUndefined()
    expect(within(getBreadcrumb()).getByText('A')).toBeInTheDocument()
  })

  it('在 A 内从顶部入口清空回显的所属文件夹：folders=[]，提交后回到根目录并清空面包屑', async () => {
    const user = userEvent.setup()
    renderPage()
    await enterFolder('A')

    await clickTopEntry(user, 'ProjectManage.newProject')
    const dialog = await screen.findByRole('dialog')
    const clear = dialog.querySelector('.ant-select-clear')
    expect(clear).not.toBeNull()
    fireEvent.mouseDown(clear as Element)
    await waitFor(() => expect(getCascaderText(dialog)).toBe(''))

    await user.type(within(dialog).getByPlaceholderText('NewProjectAndFolder.unnamed'), 'P1')
    const countBefore = listRequests().length
    await user.click(within(dialog).getByRole('button', { name: 'NewProjectAndFolder.create' }))

    await waitFor(() =>
      expect(ipcRendererMock.invoke).toHaveBeenCalledWith(
        'NewProject',
        expect.objectContaining({ ProjectName: 'P1', FolderId: 0, ChildFolderId: 0 }),
      ),
    )
    const next = await waitNextListRequest(countBefore)
    expect(next.FolderId).toBeUndefined()
    expect(next.ChildFolderId).toBeUndefined()
    await waitFor(() => expect(screen.queryByText('ProjectManage.localFiles')).toBeNull())
  })

  it('根目录顶部入口在级联中选择 A：folders=[A]，提交后跳入 A 并显示面包屑', async () => {
    const user = userEvent.setup()
    renderPage()
    await waitFor(() => expect(listRequests().length).toBeGreaterThan(0))

    await clickTopEntry(user, 'ProjectManage.newProject')
    const dialog = await screen.findByRole('dialog')
    fireEvent.mouseDown(dialog.querySelector('.ant-select-selector') as Element)
    const optionA = await waitFor(() => {
      const el = Array.from(document.querySelectorAll<HTMLElement>('.ant-cascader-menu-item')).find(
        (node) => node.textContent === 'A',
      )
      expect(el).toBeDefined()
      return el as HTMLElement
    })
    fireEvent.click(optionA)
    await waitFor(() => expect(getCascaderText(dialog)).toBe('A'))

    await user.type(within(dialog).getByPlaceholderText('NewProjectAndFolder.unnamed'), 'P1')
    const countBefore = listRequests().length
    await user.click(within(dialog).getByRole('button', { name: 'NewProjectAndFolder.create' }))

    await waitFor(() =>
      expect(ipcRendererMock.invoke).toHaveBeenCalledWith(
        'NewProject',
        expect.objectContaining({ ProjectName: 'P1', FolderId: 5, ChildFolderId: 0 }),
      ),
    )
    const next = await waitNextListRequest(countBefore)
    expect(next).toMatchObject({ FolderId: 5, Pagination: { Page: 1 } })
    expect(next.ChildFolderId).toBeUndefined()
    await waitFor(() => expect(within(getBreadcrumb()).getByText('A')).toBeInTheDocument())
  })
})
