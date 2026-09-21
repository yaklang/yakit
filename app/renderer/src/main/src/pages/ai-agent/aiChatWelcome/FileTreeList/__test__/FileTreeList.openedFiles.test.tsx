import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createStore } from 'zustand/vanilla'
import type { HistoryItem } from '../../../components/aiFileSystemList/type'
import type { FileNodeProps } from '@/pages/yakRunner/FileTree/FileTreeType'
import { customFolderStore } from '../../../components/aiFileSystemList/store/useCustomFolder'
import { historyStore } from '../../../components/aiFileSystemList/store/useHistoryFolder'
import { compileReactModule } from '@/utils/__test__/helpers/compileReactModule'
import type * as FileTreeListModule from '../FileTreeList'

const { openDialog, invoke, translate, dragState } = vi.hoisted(() => {
  const invoke = vi.fn(async (_channel: string, { pathA, pathB }: { pathA: string; pathB: string }) =>
    pathA === pathB ? 0 : 3,
  )
  Object.defineProperty(window, 'require', {
    configurable: true,
    value: () => ({ ipcRenderer: { invoke } }),
  })
  return {
    openDialog: vi.fn(),
    invoke,
    translate: (key: string) => key,
    dragState: { dropRef: { current: null }, dragging: false, dragSource: null, setDragSource: vi.fn() },
  }
})
const taskStore = createStore(() => ({ grpcFolders: [] as HistoryItem[] }))
vi.mock('@/pages/ai-re-act/hooks/useCurrentDataBySession', () => ({ useCurrentStore: () => taskStore }))
vi.mock('@/pages/ai-re-act/hooks/useCurrentSessionId', () => ({ default: () => 'session-1' }))
vi.mock('@/i18n/useI18nNamespaces', () => ({ useI18nNamespaces: () => ({ t: translate }) }))
vi.mock('@/utils/fileSystemDialog', () => ({ handleOpenFileSystemDialog: openDialog }))
vi.mock('@/utils/notification', () => ({ yakitNotify: vi.fn() }))
vi.mock('../../AIChatWelcomeSideSetting', () => ({
  SideSettingButton: () => null,
}))
vi.mock('@/utils/kv', () => ({ getRemoteValue: vi.fn(), setRemoteValue: vi.fn(async () => undefined) }))
vi.mock('@/utils/eventBus/eventBus', () => ({ default: { emit: vi.fn(), on: vi.fn(), off: vi.fn() } }))
vi.mock('@/utils/duplex/duplex', () => ({ sendDuplexConn: vi.fn() }))
vi.mock('@/pages/yakRunner/utils', () => ({
  getNameByPath: async (path: string) => path,
  getPathParent: async () => '',
  grpcFetchFileTree: vi.fn(async () => []),
}))
vi.mock('../../hooks/useAIChatDrop', () => ({ TREE_DRAG_KEY: 'tree' }))
vi.mock('../../hooks/useFileTreeDrop', () => ({
  useFileTreeDrop: () => dragState,
}))
vi.mock('../../../components/aiFileSystemList/FileTreeSystemItem/FileTreeSystemIem', () => ({
  default: ({ data }: { data: FileNodeProps }) => <span>{data.name}</span>,
}))
vi.mock('@/pages/ai-re-act/hooks/useFileTree', async () => {
  const { compileReactModule } = await import('@/utils/__test__/helpers/compileReactModule')
  return compileReactModule(import.meta.url, '../../../../ai-re-act/hooks/useFileTree.ts')
})
vi.mock('../../FileTreeDrop/FileTreeDrop', async () => {
  const { compileReactModule } = await import('@/utils/__test__/helpers/compileReactModule')
  return compileReactModule(import.meta.url, '../../FileTreeDrop/FileTreeDrop.tsx')
})

vi.doMock('../../../components/aiFileSystemList/FileTreeSystemListWrapper/FileTreeSystemListWrapper', () =>
  compileReactModule(
    import.meta.url,
    '../../../components/aiFileSystemList/FileTreeSystemListWrapper/FileTreeSystemListWrapper.tsx',
  ),
)
vi.doMock('@/pages/yakRunner/SplitView/SplitView', () =>
  compileReactModule(import.meta.url, '../../../../yakRunner/SplitView/SplitView.tsx'),
)
const { default: FileTreeList } = await compileReactModule<typeof FileTreeListModule>(
  import.meta.url,
  '../FileTreeList.tsx',
)

beforeEach(() => {
  vi.clearAllMocks()
  historyStore.clearHistory()
  customFolderStore.updateCustomFolderItem([{ path: 'existing.txt', isFolder: false }])
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  )
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue(new DOMRect(0, 0, 300, 500))
})
afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('文件系统添加路径（启用 React Compiler）', () => {
  it.each([
    { isFolder: true, path: 'new-folder', button: 'YakitButton.openFolder', property: 'openDirectory' },
    { isFolder: false, path: 'new-file.txt', button: 'YakitButton.openFile', property: 'openFile' },
  ])('通过标题操作添加 $path 后立即显示', async ({ isFolder, path, button, property }) => {
    openDialog.mockResolvedValue({ filePaths: [path], canceled: false })
    render(<FileTreeList setSelected={vi.fn()} onClose={vi.fn()} />)
    await screen.findByText('existing.txt')
    fireEvent.click(screen.getByRole('button', { name: button }))
    await waitFor(() => expect(customFolderStore.getSnapshot()).toContainEqual({ path, isFolder }))
    expect(openDialog).toHaveBeenCalledWith(expect.objectContaining({ properties: [property] }))
    expect(invoke).toHaveBeenCalledWith('fetch-path-contains-relation', expect.any(Object))
    expect(await screen.findByText(path)).toBeVisible()
    expect(screen.getByText('existing.txt')).toBeVisible()
  })
})
