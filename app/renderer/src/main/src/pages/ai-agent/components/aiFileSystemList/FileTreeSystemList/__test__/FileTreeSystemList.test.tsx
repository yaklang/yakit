import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { useState } from 'react'
import type { FileNodeProps } from '@/pages/yakRunner/FileTree/FileTreeType'
import FileTreeSystemList from '../FileTreeSystemList'

const { fetchTree } = vi.hoisted(() => {
  Object.defineProperty(window, 'require', {
    configurable: true,
    value: () => ({ ipcRenderer: { invoke: vi.fn() } }),
  })
  return { fetchTree: vi.fn() }
})

vi.mock('@/pages/yakRunner/utils', () => ({
  getNameByPath: async (path: string) => path.split('/').pop(),
  getPathParent: async (path: string) => path.slice(0, path.lastIndexOf('/')),
  grpcFetchFileTree: fetchTree,
}))
vi.mock('@/utils/duplex/duplex', () => ({ sendDuplexConn: vi.fn() }))
vi.mock('@/utils/eventBus/eventBus', () => ({ default: { on: vi.fn(), off: vi.fn() } }))
vi.mock('@/pages/ai-agent/aiChatWelcome/hooks/useAIChatDrop', () => ({ TREE_DRAG_KEY: 'tree' }))
vi.mock('../../FileTreeSystemItem/FileTreeSystemIem', () => ({
  default: ({ data }: { data: FileNodeProps }) => <span>{data.name}</span>,
}))

const FileTree = () => {
  const [selected, setSelected] = useState<FileNodeProps>()
  return <FileTreeSystemList path="opened" isFolder isOpen selected={selected} setSelected={setSelected} />
}

describe('我打开的文件：文件夹展开', () => {
  it('展开根目录及子目录后显示异步加载的子文件', async () => {
    const user = userEvent.setup()
    fetchTree.mockImplementation(async (path: string) => {
      if (path === 'opened') {
        return [{ path: 'opened/nested', name: 'nested', parent: 'opened', isFolder: true }]
      }
      return [{ path: 'opened/nested/file.txt', name: 'file.txt', parent: path, isFolder: false }]
    })
    render(<FileTree />)
    const root = await screen.findByText('opened')
    await user.click(root)
    await waitFor(() => expect(screen.getByText('nested').closest('.ant-tree-treenode-motion')).toBeNull())
    await user.click(screen.getByText('nested'))
    await waitFor(() =>
      expect(screen.getByText('nested').closest('[role="treeitem"]')).toHaveAttribute('aria-expanded', 'true'),
    )
    await waitFor(() => expect(screen.getByText('file.txt')).toBeVisible())
    expect(fetchTree).toHaveBeenCalledWith('opened/nested')
  })
})
