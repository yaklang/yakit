import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useEffect } from 'react'
import type { FileTreeSystemListProps, HistoryItem } from '../../type'
import FileTreeSystemListWrapper from '../FileTreeSystemListWrapper'

const { treeProps, openFileFolder, mergePaths } = vi.hoisted(() => ({
  treeProps: new Map<string, FileTreeSystemListProps>(),
  openFileFolder: vi.fn(),
  mergePaths: vi.fn(),
}))

vi.mock('@/i18n/useI18nNamespaces', () => ({
  useI18nNamespaces: () => ({ t: (key: string) => key }),
}))
vi.mock('@/utils/notification', () => ({ yakitNotify: vi.fn() }))
vi.mock('../../utils', () => ({
  onOpenFileFolder: openFileFolder,
  checkPathIncludeRelation: vi.fn(),
  mergePathArray: mergePaths,
}))
vi.mock('../../FileTreeSystemList/FileTreeSystemList', () => ({
  default: function MockFileTreeSystemList(props: FileTreeSystemListProps) {
    useEffect(() => {
      treeProps.set(props.path, props)
      return () => {
        treeProps.delete(props.path)
      }
    }, [props.path])
    return <div data-testid={props.path}>{props.path}</div>
  },
}))

beforeEach(() => {
  vi.clearAllMocks()
  treeProps.clear()
  mergePaths.mockReset().mockImplementation(async (_current: HistoryItem[], incoming: HistoryItem[]) => incoming)
})

const paths: HistoryItem[] = [
  { path: 'artifacts', isFolder: true },
  { path: 'report.txt', isFolder: false },
]

describe('FileTreeSystemListWrapper', () => {
  it('只统计合并后的 uniquePaths 中的文件，排除目录及被合并的文件路径', async () => {
    mergePaths.mockResolvedValueOnce(paths)
    render(
      <FileTreeSystemListWrapper
        variant="sidebar"
        title="AI Artifacts"
        path={[...paths, { path: 'artifacts/nested.txt', isFolder: false }, paths[1]]}
        setSelected={vi.fn()}
      />,
    )
    const title = screen.getByText('AI Artifacts').parentElement!
    await screen.findByTestId('report.txt')
    expect(within(title).getByText('1')).toBeInTheDocument()
    expect(screen.queryByTestId('artifacts/nested.txt')).not.toBeInTheDocument()
  })

  it('新增和移除独立文件后更新计数，仅剩目录或清空列表时归零', async () => {
    const props = { variant: 'sidebar' as const, title: 'AI Artifacts', setSelected: vi.fn() }
    const { rerender } = render(<FileTreeSystemListWrapper {...props} path={paths} />)
    await screen.findByTestId('report.txt')
    const title = screen.getByText('AI Artifacts').parentElement!
    expect(within(title).getByText('1')).toBeInTheDocument()
    rerender(<FileTreeSystemListWrapper {...props} path={[...paths, { path: 'new.txt', isFolder: false }]} />)
    await screen.findByTestId('new.txt')
    expect(within(title).getByText('2')).toBeInTheDocument()
    rerender(<FileTreeSystemListWrapper {...props} path={[paths[1]]} />)
    await waitFor(() => expect(screen.queryByTestId('artifacts')).not.toBeInTheDocument())
    expect(within(title).getByText('1')).toBeInTheDocument()
    rerender(<FileTreeSystemListWrapper {...props} path={[paths[0]]} />)
    await screen.findByTestId('artifacts')
    expect(within(title).getByText('0')).toBeInTheDocument()
    rerender(<FileTreeSystemListWrapper {...props} path={[]} />)
    await waitFor(() => expect(screen.queryByTestId('artifacts')).not.toBeInTheDocument())
    await waitFor(() => expect(within(title).getByText('0')).toBeInTheDocument())
  })

  it('折叠侧栏产物列表时卸载树并保留文件数，展开后重新渲染', async () => {
    render(<FileTreeSystemListWrapper variant="sidebar" title="AI Artifacts" path={paths} setSelected={vi.fn()} />)
    await screen.findByTestId('artifacts')
    fireEvent.click(screen.getByText('AI Artifacts'))
    expect(screen.queryByTestId('artifacts')).not.toBeInTheDocument()
    expect(treeProps.size).toBe(0)
    expect(within(screen.getByText('AI Artifacts').parentElement!).getByText('1')).toBeInTheDocument()
    fireEvent.click(screen.getByText('AI Artifacts'))
    expect(await screen.findByTestId('artifacts')).toBeVisible()
  })

  it.each([
    { variant: undefined, isOpen: false },
    { variant: 'sidebar' as const, isOpen: true },
  ])('普通列表或我打开的文件不统计数量，折叠时卸载树（$variant/$isOpen）', async (props) => {
    const { container } = render(
      <FileTreeSystemListWrapper {...props} title="文件列表" path={paths} setSelected={vi.fn()} />,
    )
    await screen.findByTestId('artifacts')
    expect(container.querySelector('.ant-tag')).toBeNull()
    fireEvent.click(screen.getByText('文件列表'))
    expect(screen.queryByTestId('artifacts')).not.toBeInTheDocument()
    expect(treeProps.size).toBe(0)
  })

  it('切换 showFileCount 对应模式时隐藏计数，重新显示时使用最新路径', async () => {
    const props = { title: '文件列表', setSelected: vi.fn() }
    const { container, rerender } = render(<FileTreeSystemListWrapper {...props} path={paths} />)
    await screen.findByTestId('report.txt')
    expect(container.querySelector('.ant-tag')).toBeNull()

    rerender(<FileTreeSystemListWrapper {...props} variant="sidebar" path={paths} />)
    const title = screen.getByText('文件列表').parentElement!
    expect(within(title).getByText('1')).toBeInTheDocument()

    const updatedPaths = [...paths, { path: 'new.txt', isFolder: false }]
    rerender(<FileTreeSystemListWrapper {...props} variant="sidebar" isOpen path={updatedPaths} />)
    await screen.findByTestId('new.txt')
    expect(container.querySelector('.ant-tag')).toBeNull()

    rerender(<FileTreeSystemListWrapper {...props} variant="sidebar" path={updatedPaths} />)
    expect(within(title).getByText('2')).toBeInTheDocument()
  })

  it('打开操作保持文件和文件夹参数，showTitleActions 可以隐藏标题操作', async () => {
    const props = {
      variant: 'sidebar' as const,
      isOpen: true,
      title: '我打开的文件',
      path: paths,
      setSelected: vi.fn(),
    }
    const { rerender } = render(<FileTreeSystemListWrapper {...props} />)
    await screen.findByTestId('report.txt')
    fireEvent.click(screen.getByRole('button', { name: 'YakitButton.openFile' }))
    expect(openFileFolder).toHaveBeenLastCalledWith(false)
    fireEvent.click(screen.getByRole('button', { name: 'YakitButton.openFolder' }))
    expect(openFileFolder).toHaveBeenLastCalledWith(true)
    rerender(<FileTreeSystemListWrapper {...props} showTitleActions={false} />)
    expect(screen.queryByRole('button', { name: 'YakitButton.openFile' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'YakitButton.openFolder' })).not.toBeInTheDocument()
  })
})
