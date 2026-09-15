import React from 'react'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { compileReactModule } from '@/utils/__test__/helpers/compileReactModule'
import type * as FileTreeSystemItemModule from '../FileTreeSystemIem'
import type { FileNodeProps } from '@/pages/yakRunner/FileTree/FileTreeType'
import emiter from '@/utils/eventBus/eventBus'
import { yakitNotify } from '@/utils/notification'
import {
  getPathJoin,
  grpcFetchCreateFile,
  grpcFetchCreateFolder,
  grpcFetchRenameFileTree,
} from '@/pages/yakRunner/utils'

vi.mock('@/pages/yakRunner/FileTree/icon', () => ({ KeyToIcon: { file: { iconPath: 'file.svg' } } }))
vi.mock('@/components/yakitUI/YakitDropdownMenu/YakitDropdownMenu', () => ({
  YakitDropdownMenu: ({ children }: React.PropsWithChildren) => children,
}))
vi.mock('@/components/yakitUI/YakitInput/YakitInput', () => ({
  YakitInput: React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
    ({ value, onChange, onBlur }, ref) => <input ref={ref} value={value} onChange={onChange} onBlur={onBlur} />,
  ),
}))
vi.mock('@/components/TableVirtualResize/YakitProtoCheckbox/YakitProtoCheckbox', () => ({
  YakitProtoCheckbox: () => null,
}))
vi.mock('@/pages/notepadManage/notepadManage/utils', () => ({ onOpenLocalFileByPath: vi.fn() }))
vi.mock('@/utils/clipboard', () => ({ setClipboardText: vi.fn() }))
vi.mock('@/utils/eventBus/eventBus', () => ({ default: { emit: vi.fn() } }))
vi.mock('../../store/useCustomFolder', () => ({ customFolderStore: { removeCustomFolderItem: vi.fn() } }))
vi.mock('@/utils/notification', () => ({ yakitNotify: vi.fn() }))
vi.mock('@/i18n/useI18nNamespaces', () => ({ useI18nNamespaces: () => ({ t: (key: string) => key, i18nRefresh: 0 }) }))
vi.mock('@/pages/yakRunner/utils', () => ({
  getPathJoin: vi.fn(async (parent: string, name: string) => `${parent}/${name}`),
  getPathParent: vi.fn(async () => '/root'),
  grpcFetchCreateFile: vi.fn(async () => [base]),
  grpcFetchCreateFolder: vi.fn(async () => [base]),
  grpcFetchRenameFileTree: vi.fn(async () => [base]),
}))

const { default: FileTreeSystemItem } = await compileReactModule<typeof FileTreeSystemItemModule>(
  import.meta.url,
  '../FileTreeSystemIem.tsx',
)
const base: FileNodeProps = {
  name: 'old.txt',
  path: '/root/old.txt',
  parent: '/root',
  isFolder: false,
  icon: 'file',
  depth: 1,
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.useFakeTimers()
})
afterEach(() => {
  cleanup()
  vi.clearAllTimers()
  vi.useRealTimers()
})

const submit = async (name: string) => {
  fireEvent.change(screen.getByRole('textbox'), { target: { value: name } })
  await act(async () => {
    fireEvent.blur(screen.getByRole('textbox'))
  })
  await act(async () => {
    await vi.advanceTimersByTimeAsync(300)
  })
}

describe('FileTreeSystemItem（启用 React Compiler）', () => {
  it('收到新的重命名请求时重置输入，普通重渲染保留正在编辑的内容', () => {
    const props = { watchToken: 'watch', setSelected: vi.fn() }
    const { rerender } = render(<FileTreeSystemItem {...props} data={base} />)
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
    const data = { ...base, isRename: true }
    rerender(<FileTreeSystemItem {...props} data={data} />)
    expect(screen.getByRole('textbox')).toHaveValue('old.txt')
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'draft.txt' } })
    rerender(<FileTreeSystemItem {...props} data={{ ...data }} />)
    expect(screen.getByRole('textbox')).toHaveValue('draft.txt')
    rerender(<FileTreeSystemItem {...props} data={{ ...data, name: 'another.txt' }} />)
    expect(screen.getByRole('textbox')).toHaveValue('another.txt')
  })

  it.each([true, false])('创建成功时广播新增事件并清空输入（文件夹 %s）', async (isFolder) => {
    render(
      <FileTreeSystemItem
        watchToken="watch"
        data={{ ...base, name: '', isCreate: true, isFolder }}
        setSelected={vi.fn()}
      />,
    )
    await submit('new')
    const name = isFolder ? 'new' : 'new.yak'
    expect(isFolder ? grpcFetchCreateFolder : grpcFetchCreateFile).toHaveBeenCalled()
    expect(emiter.emit).toHaveBeenCalledWith(
      'onRefreshYakRunnerFileTree',
      expect.stringContaining(`"Path":"/root/${name}"`),
    )
    expect(yakitNotify).toHaveBeenCalledWith('success', 'YakitNotification.createSuccess')
    expect(screen.getByRole('textbox')).toHaveValue('')
  })

  it.each(['join', 'empty', 'reject'])('创建失败提示错误、清空输入且不广播新增事件（%s）', async (failure) => {
    if (failure === 'join') vi.mocked(getPathJoin).mockResolvedValueOnce('')
    if (failure === 'empty') vi.mocked(grpcFetchCreateFile).mockResolvedValueOnce([])
    if (failure === 'reject') vi.mocked(grpcFetchCreateFile).mockRejectedValueOnce(new Error('创建失败'))
    render(<FileTreeSystemItem watchToken="watch" data={{ ...base, name: '', isCreate: true }} setSelected={vi.fn()} />)
    await submit('new')
    expect(yakitNotify).toHaveBeenCalledWith('error', expect.any(String))
    expect(emiter.emit).toHaveBeenCalledTimes(1)
    expect(screen.getByRole('textbox')).toHaveValue('')
  })

  it('重命名文件夹时同步选中子文件的路径并结束编辑', async () => {
    const setSelected = vi.fn()
    render(
      <FileTreeSystemItem
        watchToken="watch"
        data={{ ...base, name: 'old', path: '/root/old', isFolder: true, isRename: true }}
        selected={{ ...base, path: '/root/old/child.txt', name: 'child.txt' }}
        setSelected={setSelected}
      />,
    )
    await submit('new')
    expect(grpcFetchRenameFileTree).toHaveBeenCalledWith('/root/old', 'new', '/root')
    expect(setSelected).toHaveBeenCalledWith(
      expect.objectContaining({ path: '/root/new/child.txt', name: 'child.txt' }),
    )
    expect(emiter.emit).toHaveBeenCalledWith('onRefreshYakRunnerFileTree', expect.stringContaining('"Op":"rename"'))
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
  })

  it.each(['same', 'join', 'empty', 'reject'])('重命名失败回滚节点并结束编辑（%s）', async (failure) => {
    if (failure === 'join') vi.mocked(getPathJoin).mockResolvedValueOnce('')
    if (failure === 'empty') vi.mocked(grpcFetchRenameFileTree).mockResolvedValueOnce([])
    if (failure === 'reject') vi.mocked(grpcFetchRenameFileTree).mockRejectedValueOnce(new Error('重命名失败'))
    const setSelected = vi.fn()
    render(
      <FileTreeSystemItem
        watchToken="watch"
        data={{ ...base, isRename: true }}
        selected={base}
        setSelected={setSelected}
      />,
    )
    await submit(failure === 'same' ? base.name : 'new.txt')
    expect(emiter.emit).toHaveBeenCalledWith(
      'onRefreshYakRunnerFileTree',
      expect.stringContaining('"Op":"renameRollback"'),
    )
    expect(yakitNotify).toHaveBeenCalledWith('error', expect.any(String))
    expect(setSelected).not.toHaveBeenCalled()
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
  })
})
