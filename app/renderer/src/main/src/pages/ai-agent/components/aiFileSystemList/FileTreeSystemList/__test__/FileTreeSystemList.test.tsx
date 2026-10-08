import type * as Ahooks from 'ahooks'
import type * as Antd from 'antd'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { useState, type ComponentProps } from 'react'
import type { FileNodeProps } from '@/pages/yakRunner/FileTree/FileTreeType'
import FileTreeSystemList from '../FileTreeSystemList'

type MeasuredSize = { width: number; height: number }
type DirectoryTreeCapture = { height?: number }

const { fetchTree, measuredSize, directoryTreeProps } = vi.hoisted(() => {
  Object.defineProperty(window, 'require', {
    configurable: true,
    value: () => ({ ipcRenderer: { invoke: vi.fn() } }),
  })
  const measuredSize: { current: MeasuredSize | undefined } = {
    current: { width: 240, height: 320 },
  }
  const directoryTreeProps: { current: DirectoryTreeCapture | null } = {
    current: null,
  }
  return {
    fetchTree: vi.fn(),
    measuredSize,
    directoryTreeProps,
  }
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
vi.mock('ahooks', async (importOriginal) => {
  const actual = await importOriginal<typeof Ahooks>()
  return {
    ...actual,
    useSize: () => measuredSize.current,
  }
})
vi.mock('antd', async (importOriginal) => {
  const antd = await importOriginal<typeof Antd>()
  const OriginalDirectoryTree = antd.Tree.DirectoryTree
  type DirectoryTreeProps = ComponentProps<typeof OriginalDirectoryTree>
  const DirectoryTree = (props: DirectoryTreeProps) => {
    directoryTreeProps.current = { height: typeof props.height === 'number' ? props.height : undefined }
    return <OriginalDirectoryTree {...props} />
  }
  const Tree = Object.assign((...args: Parameters<typeof antd.Tree>) => antd.Tree(...args), antd.Tree, {
    DirectoryTree,
  })
  return { ...antd, Tree }
})

const FileTree = () => {
  const [selected, setSelected] = useState<FileNodeProps>()
  return <FileTreeSystemList path="opened" isFolder isOpen selected={selected} setSelected={setSelected} />
}

/** 经函数读取，避免 `current = null` 后控制流收窄导致 `?.height` 变成 never */
const getDirectoryTreeHeight = (): number | undefined => directoryTreeProps.current?.height

const resetDirectoryTreeCapture = () => {
  directoryTreeProps.current = null
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

describe('fillHeight 虚拟滚动', () => {
  it('开启 fillHeight 时把测量高度传给 DirectoryTree', async () => {
    measuredSize.current = { width: 240, height: 320 }
    resetDirectoryTreeCapture()
    fetchTree.mockResolvedValue([])

    render(<FileTreeSystemList path="opened" isFolder fillHeight selected={undefined} setSelected={vi.fn()} />)
    await screen.findByText('opened')

    expect(getDirectoryTreeHeight()).toBe(320)
  })

  it('未开启 fillHeight 时 DirectoryTree 不设置 height', async () => {
    measuredSize.current = { width: 240, height: 320 }
    resetDirectoryTreeCapture()
    fetchTree.mockResolvedValue([])

    render(<FileTreeSystemList path="opened" isFolder fillHeight={false} selected={undefined} setSelected={vi.fn()} />)
    await screen.findByText('opened')

    expect(getDirectoryTreeHeight()).toBeUndefined()
  })

  it('开启 fillHeight 但尚未测到高度时 DirectoryTree 不设置 height', async () => {
    measuredSize.current = undefined
    resetDirectoryTreeCapture()
    fetchTree.mockResolvedValue([])

    render(<FileTreeSystemList path="opened" isFolder fillHeight selected={undefined} setSelected={vi.fn()} />)
    await screen.findByText('opened')

    expect(getDirectoryTreeHeight()).toBeUndefined()
  })
})
