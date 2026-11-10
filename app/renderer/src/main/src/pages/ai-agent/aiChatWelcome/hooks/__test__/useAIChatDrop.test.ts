import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { DragEvent } from 'react'
import useAIChatDrop, { TREE_DRAG_KEY } from '../useAIChatDrop'
import { handleOnFiles } from '../../utils'

const drop = vi.hoisted(() => ({ onDrop: undefined as undefined | ((event: DragEvent) => Promise<void>) }))
vi.mock('ahooks', async () => ({
  ...(await vi.importActual('ahooks')),
  useDrop: (_target: unknown, options: { onDrop: typeof drop.onDrop }) => {
    drop.onDrop = options.onDrop
  },
}))
vi.mock('../../utils', () => ({ handleOnFiles: vi.fn() }))

beforeEach(() => vi.clearAllMocks())

describe('useAIChatDrop 资料来源', () => {
  it('桌面或 Yakit 窗口外拖入文件标记为附件', async () => {
    const file = new File(['context'], 'context.txt')
    vi.mocked(handleOnFiles).mockResolvedValue([{ path: '/tmp/context.txt', isFolder: false }])
    const onFilesChange = vi.fn()
    renderHook(() => useAIChatDrop({ onFilesChange }))
    await act(async () => drop.onDrop!({ dataTransfer: { getData: () => '', files: [file] } } as unknown as DragEvent))
    expect(handleOnFiles).toHaveBeenCalledWith([file])
    expect(onFilesChange).toHaveBeenCalledWith([
      { path: '/tmp/context.txt', isFolder: false, mentionSource: 'attachment' },
    ])
  })

  it.each([false, true])('文件系统树拖入文件或目录归为文件系统资料（isFolder=%s）', async (isFolder) => {
    const item = { path: '/project/context', isFolder, mentionSource: 'attachment' as const }
    const onFilesChange = vi.fn()
    renderHook(() => useAIChatDrop({ onFilesChange }))
    await act(async () =>
      drop.onDrop!({
        dataTransfer: { getData: (key: string) => (key === TREE_DRAG_KEY ? JSON.stringify(item) : ''), files: [] },
      } as unknown as DragEvent),
    )
    expect(onFilesChange).toHaveBeenCalledWith([{ ...item, mentionSource: undefined }])
    expect(handleOnFiles).not.toHaveBeenCalled()
  })
})
