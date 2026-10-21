import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { FileTreeSearchScope } from '../constants'
import type { FileSearchFileItem } from '../type'

const { mockSearch, mockNotify, folderState } = vi.hoisted(() => ({
  mockSearch: vi.fn(),
  mockNotify: vi.fn(),
  folderState: {
    store: { id: 'session-1' } as { id: string },
    grpcFolders: [{ path: 'ai-output', isFolder: true }] as { path: string; isFolder: boolean }[],
    customFolders: [{ path: 'opened-file.txt', isFolder: false }] as { path: string; isFolder: boolean }[],
  },
}))

vi.mock('@/utils/notification', () => ({ yakitNotify: mockNotify }))
vi.mock('@/i18n/i18n', () => ({
  default: { getFixedT: () => (key: string) => key },
}))
vi.mock('@/pages/ai-re-act/hooks/useCurrentDataBySession', () => ({
  useCurrentStore: () => folderState.store,
}))
vi.mock('zustand', async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>()
  return {
    ...actual,
    useStore: (_store: unknown, selector: (state: { grpcFolders: unknown }) => unknown) =>
      selector({ grpcFolders: folderState.grpcFolders }),
  }
})
vi.mock('../../../../components/aiFileSystemList/store/useCustomFolder', () => ({
  useCustomFolder: () => folderState.customFolders,
}))
vi.mock('../utils', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../utils')>()
  return {
    ...actual,
    grpcSearchFileContent: (...args: unknown[]) => mockSearch(...args),
  }
})

import { useFileSearch } from '../useFileSearch'

const sampleItem = (name: string): FileSearchFileItem => ({
  path: `ai-output/${name}`,
  name,
  searchResult: {
    match_count: 1,
    results: [{ line: 1, text: 'hello', matches: [{ start_column: 1, end_column: 6 }] }],
  },
})

const resetFolders = () => {
  folderState.store = { id: 'session-1' }
  folderState.grpcFolders = [{ path: 'ai-output', isFolder: true }]
  folderState.customFolders = [{ path: 'opened-file.txt', isFolder: false }]
}

beforeEach(() => {
  mockSearch.mockReset()
  mockNotify.mockReset()
  resetFolders()
})

describe('useFileSearch 竞态', () => {
  it('空搜作废进行中请求：延迟响应不得写回旧结果，且 loading 复位', async () => {
    let resolveFirst!: (value: FileSearchFileItem[]) => void
    mockSearch.mockImplementationOnce(
      () =>
        new Promise<FileSearchFileItem[]>((resolve) => {
          resolveFirst = resolve
        }),
    )

    const { result } = renderHook(() => useFileSearch())
    act(() => result.current.setKeyword('hello'))
    act(() => result.current.onSearch('hello'))
    expect(result.current.loading).toBe(true)

    act(() => result.current.onSearch(''))
    expect(result.current.results).toEqual([])
    expect(result.current.loading).toBe(false)
    expect(result.current.searched).toBe(false)

    await act(async () => {
      resolveFirst([sampleItem('stale.txt')])
    })
    expect(result.current.results).toEqual([])
    expect(result.current.loading).toBe(false)
  })

  it('切到无根路径范围作废进行中请求：延迟响应不得写回旧结果', async () => {
    let resolveFirst!: (value: FileSearchFileItem[]) => void
    mockSearch.mockImplementationOnce(
      () =>
        new Promise<FileSearchFileItem[]>((resolve) => {
          resolveFirst = resolve
        }),
    )

    const { result } = renderHook(() => useFileSearch())
    act(() => result.current.setKeyword('hello'))
    act(() => result.current.onSearch('hello'))
    expect(result.current.loading).toBe(true)

    folderState.grpcFolders = []
    folderState.customFolders = []
    act(() => result.current.setScope(FileTreeSearchScope.UserFolder))

    expect(result.current.results).toEqual([])
    expect(result.current.searched).toBe(true)
    expect(result.current.loading).toBe(false)

    await act(async () => {
      resolveFirst([sampleItem('stale.txt')])
    })
    expect(result.current.results).toEqual([])
    expect(result.current.loading).toBe(false)
  })

  it('移除根路径后清空旧结果，延迟响应不得写回', async () => {
    let resolveFirst!: (value: FileSearchFileItem[]) => void
    mockSearch.mockImplementationOnce(
      () =>
        new Promise<FileSearchFileItem[]>((resolve) => {
          resolveFirst = resolve
        }),
    )
    // 清空根后 effect 会重搜；无路径则不再请求
    mockSearch.mockResolvedValue([])

    const { result, rerender } = renderHook(() => useFileSearch())
    act(() => result.current.setKeyword('hello'))
    act(() => result.current.onSearch('hello'))
    expect(result.current.loading).toBe(true)
    expect(mockSearch).toHaveBeenCalled()

    folderState.grpcFolders = []
    folderState.customFolders = []
    rerender()

    expect(result.current.results).toEqual([])
    expect(result.current.loading).toBe(false)

    await act(async () => {
      resolveFirst([sampleItem('stale.txt')])
    })
    expect(result.current.results).toEqual([])
  })

  it('切换会话后清空旧结果，延迟响应不得写回，并按新根重搜', async () => {
    let resolveFirst!: (value: FileSearchFileItem[]) => void
    mockSearch.mockImplementation((args: { path: string }) => {
      if (args.path === 'new-ai-root') {
        return Promise.resolve([sampleItem('new-session.txt')])
      }
      return new Promise<FileSearchFileItem[]>((resolve) => {
        resolveFirst = resolve
      })
    })

    const { result, rerender } = renderHook(() => useFileSearch())
    act(() => result.current.setKeyword('hello'))
    act(() => result.current.onSearch('hello'))
    expect(result.current.loading).toBe(true)

    folderState.store = { id: 'session-2' }
    folderState.grpcFolders = [{ path: 'new-ai-root', isFolder: true }]
    folderState.customFolders = []
    rerender()

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
      expect(result.current.results).toHaveLength(1)
      expect(result.current.results[0].name).toBe('new-session.txt')
    })

    await act(async () => {
      resolveFirst([sampleItem('stale.txt')])
    })
    expect(result.current.results).toHaveLength(1)
    expect(result.current.results[0].name).toBe('new-session.txt')
  })

  it('正常搜索成功仍写回最新结果', async () => {
    mockSearch.mockResolvedValue([sampleItem('demo.txt')])
    const { result } = renderHook(() => useFileSearch())
    act(() => result.current.setKeyword('hello'))
    act(() => result.current.onSearch('hello'))
    await waitFor(() => {
      expect(result.current.loading).toBe(false)
      expect(result.current.results).toHaveLength(1)
      expect(result.current.results[0].name).toBe('demo.txt')
    })
    expect(mockNotify).not.toHaveBeenCalled()
  })

  it('部分根成功时仍提示失败根错误，并保留成功结果', async () => {
    mockSearch.mockResolvedValueOnce([sampleItem('ok.txt')]).mockRejectedValueOnce(new Error('permission denied'))
    const { result } = renderHook(() => useFileSearch())
    act(() => result.current.setKeyword('hello'))
    act(() => result.current.onSearch('hello'))
    await waitFor(() => {
      expect(result.current.loading).toBe(false)
      expect(result.current.results).toHaveLength(1)
      expect(result.current.results[0].name).toBe('ok.txt')
    })
    expect(mockNotify).toHaveBeenCalledWith('error', 'FileTreeSearch.searchFailed: permission denied')
  })
})
