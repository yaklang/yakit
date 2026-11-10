import { act, cleanup, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { ReactNode } from 'react'
import { createStore } from 'zustand/vanilla'
import type * as SplitPanelsModule from '../FileTreeSplitPanels/FileTreeSplitPanels'
import { compileReactModule } from '@/utils/__test__/helpers/compileReactModule'

const context = vi.hoisted(() => ({
  sessionId: 'session-1',
  rawData: { draftMaterials: { files: [] as { path: string }[] } },
}))
const store = createStore(() => ({ grpcFolders: [], draftMaterialsUpdate: 0 }))

vi.mock('@/pages/ai-re-act/hooks/useCurrentDataBySession', () => ({
  useCurrentStore: () => store,
  useCurrentRawData: () => context.rawData,
}))
vi.mock('@/pages/ai-re-act/hooks/useCurrentSessionId', () => ({ default: () => context.sessionId }))
vi.mock('@/i18n/useI18nNamespaces', () => ({ useI18nNamespaces: () => ({ t: (key: string) => key }) }))
vi.mock('../../../components/aiFileSystemList/store/useCustomFolder', () => ({ useCustomFolder: () => [] }))
vi.mock('../../../components/aiFileSystemList/FileTreeSystemListWrapper/FileTreeSystemListWrapper', () => ({
  default: ({ addedFilePaths }: { addedFilePaths: string[] }) => (
    <span data-testid="added-file-paths">{JSON.stringify(addedFilePaths)}</span>
  ),
}))
vi.mock('../../FileTreeDrop/FileTreeDrop', () => ({
  default: ({ children }: { children: (value: { setDragSource: () => void }) => ReactNode }) =>
    children({ setDragSource: vi.fn() }),
}))
vi.mock('@/utils/eventBus/eventBus', () => ({ default: { emit: vi.fn() } }))
vi.mock('@/pages/yakRunner/SplitView/SplitView', () => ({ SplitView: () => null }))

const { default: FileTreeSplitPanels } = await compileReactModule<typeof SplitPanelsModule>(
  import.meta.url,
  '../FileTreeSplitPanels/FileTreeSplitPanels.tsx',
)

beforeEach(() => {
  context.sessionId = 'session-1'
  context.rawData = { draftMaterials: { files: [] } }
  store.setState({ draftMaterialsUpdate: 0 })
})
afterEach(cleanup)

describe('文件资料回显（启用 React Compiler）', () => {
  it('资料计数更新后重新计算路径，包括原数组中的添加和移除', () => {
    render(<FileTreeSplitPanels setSelected={vi.fn()} />)
    expect(screen.getByTestId('added-file-paths')).toHaveTextContent('[]')

    act(() => {
      context.rawData.draftMaterials.files.push({ path: 'first.txt' })
      store.setState({ draftMaterialsUpdate: 1 })
    })
    expect(screen.getByTestId('added-file-paths')).toHaveTextContent('["first.txt"]')

    act(() => {
      context.rawData.draftMaterials.files.splice(0)
      store.setState({ draftMaterialsUpdate: 2 })
    })
    expect(screen.getByTestId('added-file-paths')).toHaveTextContent('[]')
  })

  it('切换会话时，即使计数相同也读取新会话的路径', () => {
    context.rawData.draftMaterials.files.push({ path: 'first.txt' })
    const view = render(<FileTreeSplitPanels setSelected={vi.fn()} />)
    expect(screen.getByTestId('added-file-paths')).toHaveTextContent('["first.txt"]')

    context.sessionId = 'session-2'
    context.rawData = { draftMaterials: { files: [{ path: 'second.txt' }] } }
    view.rerender(<FileTreeSplitPanels setSelected={vi.fn()} />)

    expect(screen.getByTestId('added-file-paths')).toHaveTextContent('["second.txt"]')
  })
})
