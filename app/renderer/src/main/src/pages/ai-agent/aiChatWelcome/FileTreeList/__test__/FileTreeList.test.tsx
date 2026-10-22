import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { ReactNode } from 'react'
import type * as ZustandModule from 'zustand'
import type { FileNodeProps } from '@/pages/yakRunner/FileTree/FileTreeType'
import type { FileTreeSystemListProps, HistoryItem } from '../../../components/aiFileSystemList/type'
import FileTreeList from '../FileTreeList'

const { openFileFolder, emit, setDragSource, aiPaths, openedPaths, session } = vi.hoisted(() => ({
  openFileFolder: vi.fn(),
  emit: vi.fn(),
  setDragSource: vi.fn(),
  aiPaths: [{ path: 'ai-output', isFolder: true }],
  openedPaths: [{ path: 'opened-file.txt', isFolder: false }],
  session: { id: 'session-1' },
}))

vi.mock('@/i18n/useI18nNamespaces', () => ({
  useI18nNamespaces: () => ({ t: (key: string) => key }),
}))
vi.mock('../../AIChatWelcomeSideSetting', () => ({
  SideSettingButton: () => null,
}))
vi.mock('../FileTreeSearchView/FileTreeSearchView', () => ({
  default: ({ scopePreset, scopePathPreset }: { scopePreset?: string; scopePathPreset?: string }) => (
    <div data-testid="file-tree-search-view" data-scope={scopePreset ?? ''} data-scope-path={scopePathPreset ?? ''} />
  ),
}))
vi.mock('@/utils/eventBus/eventBus', () => ({ default: { emit } }))
vi.mock('@/utils/notification', () => ({ yakitNotify: vi.fn() }))
vi.mock('@/pages/ai-re-act/hooks/useCurrentDataBySession', () => ({ useCurrentStore: () => ({}) }))
vi.mock('@/pages/ai-re-act/hooks/useCurrentSessionId', () => ({ default: () => session.id }))
vi.mock('zustand', async (importOriginal) => ({
  ...(await importOriginal<typeof ZustandModule>()),
  useStore: (_store: unknown, selector: (state: { grpcFolders: HistoryItem[] }) => unknown) =>
    selector({ grpcFolders: [...aiPaths] }),
}))
vi.mock('../../../components/aiFileSystemList/store/useCustomFolder', () => ({
  useCustomFolder: () => openedPaths,
}))
vi.mock('../../../components/aiFileSystemList/utils', () => ({
  onOpenFileFolder: openFileFolder,
  mergePathArray: async (_current: HistoryItem[], paths: HistoryItem[]) => paths,
  checkPathIncludeRelation: vi.fn(),
}))
vi.mock('../../FileTreeDrop/FileTreeDrop', () => ({
  default: ({ className, children }: { className?: string; children: (props: object) => ReactNode }) => (
    <div className={className}>{children({ setDragSource })}</div>
  ),
}))
vi.mock('../../../components/aiFileSystemList/FileTreeSystemList/FileTreeSystemList', () => ({
  default: ({ path, setSelected, onTreeDragStart, onTreeDragEnd, onRootSearch }: FileTreeSystemListProps) => {
    return (
      <div>
        <button
          draggable
          onDragStart={onTreeDragStart}
          onDragEnd={onTreeDragEnd}
          onClick={() => setSelected({ path, name: path, isFolder: false } as FileNodeProps)}
        >
          {path}
        </button>
        {onRootSearch ? (
          <button data-testid={`file-tree-root-search-${path}`} onClick={() => onRootSearch(path)}>
            root-search
          </button>
        ) : null}
      </div>
    )
  },
}))

beforeEach(() => {
  vi.clearAllMocks()
  session.id = 'session-1'
  aiPaths.splice(0, aiPaths.length, { path: 'ai-output', isFolder: true })
  openedPaths.splice(0, openedPaths.length, { path: 'opened-file.txt', isFolder: false })
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe() {}
      disconnect() {}
    },
  )
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(() => ({
    width: 300,
    height: 500,
    x: 0,
    y: 0,
    top: 0,
    left: 0,
    right: 300,
    bottom: 500,
    toJSON: () => ({}),
  }))
})

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('文件系统侧栏', () => {
  it('仅 AI Artifacts 统计独立文件，排除目录，移除文件后归零', async () => {
    aiPaths.push({ path: 'report.txt', isFolder: false })
    const result = render(<FileTreeList setSelected={vi.fn()} />)
    const aiTitle = screen.getByText('FileTreeSystem.aiArtifacts').parentElement!
    const openedTitle = screen.getByText('FileTreeSystem.myOpenedFiles').parentElement!
    await waitFor(() => expect(within(aiTitle).getByText('1')).toBeInTheDocument())
    expect(openedTitle.querySelector('.ant-tag')).toBeNull()

    aiPaths.splice(1, 1)
    result.rerender(<FileTreeList setSelected={vi.fn()} />)
    await waitFor(() =>
      expect(within(screen.getByText('FileTreeSystem.aiArtifacts').parentElement!).getByText('0')).toBeInTheDocument(),
    )
    expect(screen.queryByRole('button', { name: 'report.txt' })).not.toBeInTheDocument()
  })

  it('折叠 AI Artifacts 后文件统计仍随路径列表更新', async () => {
    const result = render(<FileTreeList setSelected={vi.fn()} />)
    const aiTitle = screen.getByText('FileTreeSystem.aiArtifacts').parentElement!
    await screen.findByText('ai-output')
    expect(within(aiTitle).getByText('0')).toBeInTheDocument()
    fireEvent.click(screen.getByText('FileTreeSystem.aiArtifacts'))
    expect(screen.queryByText('ai-output')).not.toBeInTheDocument()

    aiPaths.push({ path: 'report.txt', isFolder: false })
    result.rerender(<FileTreeList setSelected={vi.fn()} />)
    await waitFor(() => expect(within(aiTitle).getByText('1')).toBeInTheDocument())
  })

  it('切换到没有文件的新会话后总数归零', async () => {
    aiPaths.push({ path: 'report.txt', isFolder: false })
    const result = render(<FileTreeList setSelected={vi.fn()} />)
    await waitFor(() =>
      expect(within(screen.getByText('FileTreeSystem.aiArtifacts').parentElement!).getByText('1')).toBeInTheDocument(),
    )
    session.id = 'empty-session'
    aiPaths.splice(0)
    result.rerender(<FileTreeList setSelected={vi.fn()} />)
    await waitFor(() =>
      expect(within(screen.getByText('FileTreeSystem.aiArtifacts').parentElement!).getByText('0')).toBeInTheDocument(),
    )
    expect(screen.queryByRole('button', { name: 'ai-output' })).not.toBeInTheDocument()
  })

  it('头部独立于分屏，两个打开操作位于我打开的文件标题栏', async () => {
    const { container } = render(<FileTreeList setSelected={vi.fn()} />)
    await screen.findByRole('button', { name: 'opened-file.txt' })
    const split = container.querySelector('[data-split-view-id]')!
    expect(split).not.toContainElement(screen.getByText('AITabs.fileSystem'))
    expect(split).toContainElement(screen.getByText('FileTreeSystem.aiArtifacts'))
    expect(split).toContainElement(screen.getByText('FileTreeSystem.myOpenedFiles'))
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'YakitButton.close' })).not.toBeInTheDocument()
    const openedHeader = screen.getByText('FileTreeSystem.myOpenedFiles').parentElement!.parentElement!
    fireEvent.click(within(openedHeader).getByRole('button', { name: 'YakitButton.openFile' }))
    expect(openFileFolder).toHaveBeenLastCalledWith(false)
    fireEvent.click(within(openedHeader).getByRole('button', { name: 'YakitButton.openFolder' }))
    expect(openFileFolder).toHaveBeenLastCalledWith(true)
  })

  it('标题栏展示搜索 icon', () => {
    render(<FileTreeList setSelected={vi.fn()} />)
    expect(screen.getByTestId('file-tree-header-search')).toBeInTheDocument()
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
  })

  it('分区标题搜索进入对应范围：AI→ai文件夹，打开的文件→用户文件夹', async () => {
    render(<FileTreeList setSelected={vi.fn()} />)
    await screen.findByRole('button', { name: 'opened-file.txt' })

    const aiHeader = screen.getByText('FileTreeSystem.aiArtifacts').parentElement!.parentElement!
    fireEvent.click(within(aiHeader).getByTestId('file-tree-title-search'))
    const searchView = screen.getByTestId('file-tree-search-view')
    expect(screen.getByTestId('file-tree-view-track')).toHaveAttribute('data-search-view', 'true')
    expect(searchView).toHaveAttribute('data-scope', 'ai')

    fireEvent.click(screen.getByRole('button', { name: 'YakitButton.close' }))
    expect(screen.getByTestId('file-tree-view-track')).toHaveAttribute('data-search-view', 'false')

    const openedHeader = screen.getByText('FileTreeSystem.myOpenedFiles').parentElement!.parentElement!
    fireEvent.click(within(openedHeader).getByTestId('file-tree-title-search'))
    expect(screen.getByTestId('file-tree-view-track')).toHaveAttribute('data-search-view', 'true')
    expect(screen.getByTestId('file-tree-search-view')).toHaveAttribute('data-scope', 'user')
  })

  it('我打开的文件根节点搜索进入用户范围并带上该路径', async () => {
    openedPaths.splice(0, openedPaths.length, { path: 'qweq', isFolder: true })
    render(<FileTreeList setSelected={vi.fn()} />)
    await screen.findByRole('button', { name: 'qweq' })

    // AI Artifacts 根不展示根搜索
    expect(screen.queryByTestId('file-tree-root-search-ai-output')).not.toBeInTheDocument()
    fireEvent.click(screen.getByTestId('file-tree-root-search-qweq'))

    const searchView = screen.getByTestId('file-tree-search-view')
    expect(screen.getByTestId('file-tree-view-track')).toHaveAttribute('data-search-view', 'true')
    expect(searchView).toHaveAttribute('data-scope', 'user')
    expect(searchView).toHaveAttribute('data-scope-path', 'qweq')
  })

  it('点击搜索切换到空白搜索界面，关闭后回到文件树且保留分屏', async () => {
    const { container } = render(<FileTreeList setSelected={vi.fn()} />)
    await screen.findByRole('button', { name: 'opened-file.txt' })
    const searchView = screen.getByTestId('file-tree-search-view')
    const split = container.querySelector<HTMLElement>('[data-split-view-id]')!
    const sash = split.firstElementChild!.firstElementChild as HTMLElement
    await waitFor(() => expect(sash.style.top).toBe('160px'))

    expect(searchView.closest('[aria-hidden="true"]')).toBeTruthy()
    expect(split.closest('[aria-hidden="false"]')).toBeTruthy()

    fireEvent.mouseDown(sash, { clientX: 150, clientY: 160 })
    fireEvent.mouseMove(split, { clientX: 150, clientY: 220 })
    await waitFor(() => expect(sash.style.top).toBe('220px'))
    fireEvent.mouseUp(document)

    const track = screen.getByTestId('file-tree-view-track')
    expect(track).toHaveAttribute('data-search-view', 'false')

    // 切换搜索会触发父级重渲；越过 useThrottleEffect(200ms) trailing，
    // 旧依赖 [elements] 会把 sash 重置为 defaultSizes(160px)，新依赖 [elements.length] 应保持 220px
    fireEvent.click(screen.getByTestId('file-tree-header-search'))
    expect(track).toHaveAttribute('data-search-view', 'true')
    expect(searchView.closest('[aria-hidden="false"]')).toBeTruthy()
    expect(split.closest('[aria-hidden="true"]')).toBeTruthy()
    expect(searchView).toHaveAttribute('data-scope', 'all')
    expect(screen.getByText('YakitInput.search')).toBeInTheDocument()
    expect(screen.queryByText('AITabs.fileSystem')).not.toBeInTheDocument()
    expect(screen.queryByTestId('file-tree-header-search')).not.toBeInTheDocument()
    // 左右滑动切换，文件树不卸载
    expect(screen.getByText('FileTreeSystem.aiArtifacts')).toBeInTheDocument()
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 250))
    })
    expect(sash.style.top).toBe('220px')

    fireEvent.click(screen.getByRole('button', { name: 'YakitButton.close' }))
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 250))
    })
    expect(track).toHaveAttribute('data-search-view', 'false')
    expect(searchView.closest('[aria-hidden="true"]')).toBeTruthy()
    expect(split.closest('[aria-hidden="false"]')).toBeTruthy()
    expect(screen.getByText('AITabs.fileSystem')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'opened-file.txt' })).toBeInTheDocument()
    expect(sash.style.top).toBe('220px')
  })

  it('拖动真实 SplitView 分隔线调整两块高度，文件选择和拖拽回调仍生效', async () => {
    const setSelected = vi.fn()
    const { container } = render(<FileTreeList setSelected={setSelected} />)
    const file = await screen.findByRole('button', { name: 'opened-file.txt' })
    const split = container.querySelector<HTMLElement>('[data-split-view-id]')!
    const sash = split.firstElementChild!.firstElementChild as HTMLElement
    await waitFor(() => expect(sash.style.top).toBe('160px'))
    const upper = split.lastElementChild!.firstElementChild!.firstElementChild as HTMLElement
    const lower = upper.nextElementSibling as HTMLElement
    const previousUpperHeight = Number.parseFloat(upper.style.height)
    const previousLowerHeight = Number.parseFloat(lower.style.height)
    fireEvent.mouseDown(sash, { clientX: 150, clientY: 160 })
    fireEvent.mouseMove(split, { clientX: 150, clientY: 220 })
    await waitFor(() => expect(Number.parseFloat(upper.style.height)).toBe(previousUpperHeight + 60))
    expect(Number.parseFloat(lower.style.height)).toBe(previousLowerHeight - 60)
    fireEvent.mouseUp(document)
    fireEvent.click(file)
    expect(setSelected).toHaveBeenCalledWith(expect.objectContaining({ path: 'opened-file.txt' }))
    expect(emit).toHaveBeenCalledWith(
      'switchAIActTab',
      JSON.stringify({ key: 'file-preview', value: 'opened-file.txt' }),
    )
    fireEvent.dragStart(file)
    expect(setDragSource).toHaveBeenLastCalledWith('AIRreeToChat')
    fireEvent.dragEnd(file)
    expect(setDragSource).toHaveBeenLastCalledWith(null)
  })
})
