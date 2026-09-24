import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
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
  default: ({ path, setSelected, onTreeDragStart, onTreeDragEnd }: FileTreeSystemListProps) => {
    return (
      <button
        draggable
        onDragStart={onTreeDragStart}
        onDragEnd={onTreeDragEnd}
        onClick={() => setSelected({ path, name: path, isFolder: false } as FileNodeProps)}
      >
        {path}
      </button>
    )
  },
}))

beforeEach(() => {
  vi.clearAllMocks()
  session.id = 'session-1'
  aiPaths.splice(0, aiPaths.length, { path: 'ai-output', isFolder: true })
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
