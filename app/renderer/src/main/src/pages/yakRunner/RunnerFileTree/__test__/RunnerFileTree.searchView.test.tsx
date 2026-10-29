vi.hoisted(() => {
  ;(window as any).require = () => ({ ipcRenderer: { invoke: vi.fn(), on: vi.fn(), off: vi.fn(), send: vi.fn() } })
})

import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

vi.mock('lottie-web', () => ({ default: { loadAnimation: vi.fn(), destroy: vi.fn() } }))

import { RunnerFileTree } from '../RunnerFileTree'

const store = {
  fileTree: [{ path: '/proj' }],
  areaInfo: [] as unknown[],
  activeFile: undefined,
}

vi.mock('../../hooks/useStore', () => ({ default: () => store }))
vi.mock('../../hooks/useDispatcher', () => ({
  default: () => ({
    handleFileLoadData: vi.fn(),
    setAreaInfo: vi.fn(),
    setActiveFile: vi.fn(),
    setFileTree: vi.fn(),
  }),
}))
vi.mock('../../hooks/useYakRunnerStoreRefs', () => ({
  default: () => ({ current: store }),
}))
vi.mock('../../FileTree/FileTree', () => ({ FileTree: () => <div data-testid="file-tree" /> }))
vi.mock('../RunnerFileTreeSearchView', () => ({
  RunnerFileTreeSearchView: ({ active }: { active?: boolean }) => (
    <div data-testid="search-view" data-active={String(!!active)} />
  ),
}))
vi.mock('../openFolder', () => ({ openFolder: vi.fn() }))
vi.mock('../../FileTreeMap/FileMap', () => ({
  clearMapFileDetail: vi.fn(),
  getMapAllFileKey: () => [],
  getMapFileDetail: () => ({ parent: null, name: 'proj', path: '/proj', isFolder: true, icon: '' }),
  removeMapFileDetail: vi.fn(),
  setMapFileDetail: vi.fn(),
}))
vi.mock('../../FileTreeMap/ChildMap', () => ({
  clearMapFolderDetail: vi.fn(),
  getMapAllFolderKey: () => [],
  getMapFolderDetail: () => [],
  hasMapFolderDetail: () => false,
  removeMapFolderDetail: vi.fn(),
  setMapFolderDetail: vi.fn(),
}))
vi.mock('../../FileTreeMap/watchFolderID', () => ({ WatchFolderID: 'watch' }))
vi.mock('../../utils', () => ({
  getDefaultActiveFile: vi.fn(),
  getNameByPath: vi.fn(),
  getOpenFileInfo: vi.fn(),
  getPathJoin: vi.fn(),
  getPathParent: vi.fn(),
  getYakRunnerHistory: vi.fn().mockResolvedValue([]),
  grpcFetchDeleteFile: vi.fn(),
  judgeAreaExistFilePath: vi.fn(),
  judgeAreaExistFilesPath: vi.fn(),
  loadFolderDetail: vi.fn(),
  removeYakRunnerAreaFileInfo: vi.fn(),
  removeAreaFilesInfo: vi.fn(),
  setAreaFileActive: vi.fn(),
  updateAreaFileInfo: vi.fn(),
  updateAreaFileInfoToDelete: vi.fn(),
}))
vi.mock('../CollapseList/CollapseList', () => ({
  CollapseList: ({ title }: { title: unknown }) => <div data-testid="opened-file">{title as string}</div>,
}))
vi.mock('@/components/yakitUI/YakitDropdownMenu/YakitDropdownMenu', () => ({
  YakitDropdownMenu: ({ children }: { children: unknown }) => children,
}))
vi.mock('@/utils/eventBus/eventBus', () => ({ default: { on: vi.fn(), off: vi.fn(), emit: vi.fn() } }))
vi.mock('@/utils/notification', () => ({ failed: vi.fn(), success: vi.fn(), warn: vi.fn() }))
vi.mock('@/i18n/useI18nNamespaces', () => ({
  useI18nNamespaces: () => ({ t: (key: string) => key, i18nRefresh: 0 }),
}))

describe('YakRunner RunnerFileTree 搜索视图切换', () => {
  it('点搜索进入搜索面板，关闭后回到文件树', () => {
    render(<RunnerFileTree addFileTab={vi.fn()} />)

    const track = screen.getByTestId('runner-file-tree-view-track')
    expect(track).toHaveAttribute('data-show-second', 'false')
    expect(screen.getByText('RunnerFileTree.fileList')).toBeInTheDocument()
    expect(screen.getByTestId('search-view')).toHaveAttribute('data-active', 'false')

    fireEvent.click(screen.getByTestId('runner-file-tree-header-search'))
    expect(track).toHaveAttribute('data-show-second', 'true')
    expect(screen.getByText('YakitInput.search')).toBeInTheDocument()
    expect(screen.queryByTestId('runner-file-tree-header-search')).not.toBeInTheDocument()
    expect(screen.getByTestId('search-view')).toHaveAttribute('data-active', 'true')

    fireEvent.click(screen.getByRole('button', { name: 'YakitButton.close' }))
    expect(track).toHaveAttribute('data-show-second', 'false')
    expect(screen.getByText('RunnerFileTree.fileList')).toBeInTheDocument()
    expect(screen.getByTestId('runner-file-tree-header-search')).toBeInTheDocument()
    expect(screen.getByTestId('search-view')).toHaveAttribute('data-active', 'false')
  })
})
