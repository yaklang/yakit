import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { FileSearchFileItem } from '../type'

const { mockSearch, mockCancel, mockNotify } = vi.hoisted(() => ({
  mockSearch: vi.fn(),
  mockCancel: vi.fn(),
  mockNotify: vi.fn(),
}))

vi.mock('@/utils/notification', () => ({ yakitNotify: mockNotify }))
vi.mock('@/i18n/i18n', () => ({
  default: { getFixedT: () => (key: string) => key, on: vi.fn(), off: vi.fn() },
}))
vi.mock('../utils', async (importOriginal) => {
  const actual = (await importOriginal()) as Record<string, unknown>
  return {
    ...actual,
    grpcSearchFileContent: (...args: unknown[]) => mockSearch(...args),
    cancelGrpcSearchFileContent: (...args: unknown[]) => mockCancel(...args),
  }
})

import { useFileContentSearch } from '../useFileContentSearch'

const sampleItem = (name: string): FileSearchFileItem => ({
  path: `ai-output/${name}`,
  name,
  searchResult: {
    match_count: 1,
    results: [{ line: 1, text: 'hello', matches: [{ start_column: 1, end_column: 6 }] }],
  },
})

beforeEach(() => {
  mockSearch.mockReset()
  mockCancel.mockReset()
  mockNotify.mockReset()
})

describe('useFileContentSearch 竞态', () => {
  it('空搜作废进行中请求：延迟响应不得写回旧结果，且 loading 复位', async () => {
    let resolveFirst!: (value: FileSearchFileItem[]) => void
    mockSearch.mockImplementationOnce(
      () =>
        new Promise<FileSearchFileItem[]>((resolve) => {
          resolveFirst = resolve
        }),
    )

    const { result } = renderHook(() => useFileContentSearch({ roots: [{ path: 'ai-output' }] }))
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

  it('roots 变化不打断进行中请求；完成仍按原请求写回', async () => {
    let resolveFirst!: (value: FileSearchFileItem[]) => void
    mockSearch.mockImplementationOnce(
      () =>
        new Promise<FileSearchFileItem[]>((resolve) => {
          resolveFirst = resolve
        }),
    )

    const { result, rerender } = renderHook(({ roots }) => useFileContentSearch({ roots }), {
      initialProps: { roots: [{ path: 'ai-output' }] },
    })
    act(() => result.current.setKeyword('hello'))
    act(() => result.current.onSearch('hello'))
    expect(result.current.loading).toBe(true)

    rerender({ roots: [] })
    expect(result.current.loading).toBe(true)

    await act(async () => {
      resolveFirst([sampleItem('ok.txt')])
    })
    expect(result.current.results).toHaveLength(1)
    expect(result.current.results[0].name).toBe('ok.txt')
    expect(result.current.loading).toBe(false)
  })

  it('Enter 清理旧结果后按当前 roots 重搜；roots 变化不自动重搜', async () => {
    mockSearch.mockResolvedValueOnce([sampleItem('old.txt')])
    mockSearch.mockResolvedValueOnce([sampleItem('new-session.txt')])

    const { result, rerender } = renderHook(({ roots }) => useFileContentSearch({ roots }), {
      initialProps: { roots: [{ path: 'ai-output' }] },
    })
    act(() => result.current.setKeyword('hello'))
    act(() => result.current.onSearch('hello'))
    await waitFor(() => {
      expect(result.current.results).toHaveLength(1)
      expect(result.current.results[0].name).toBe('old.txt')
    })

    rerender({ roots: [{ path: 'new-ai-root' }] })
    expect(result.current.results[0].name).toBe('old.txt')
    expect(mockSearch).toHaveBeenCalledTimes(1)

    act(() => result.current.onSearch('hello'))
    expect(result.current.results).toEqual([])
    await waitFor(() => {
      expect(result.current.loading).toBe(false)
      expect(result.current.results).toHaveLength(1)
      expect(result.current.results[0].name).toBe('new-session.txt')
    })
    expect(mockSearch).toHaveBeenCalledTimes(2)
  })

  it('resolveRoots 优先于静态 roots，Enter 时用解析结果搜索', async () => {
    mockSearch.mockResolvedValue([sampleItem('resolved.txt')])
    const resolveRoots = vi.fn(async () => [{ path: 'resolved-root' }])
    const { result } = renderHook(() => useFileContentSearch({ roots: [{ path: 'stale-root' }], resolveRoots }))
    act(() => result.current.setKeyword('hello'))
    act(() => result.current.onSearch('hello'))
    await waitFor(() => {
      expect(result.current.loading).toBe(false)
      expect(result.current.results[0].name).toBe('resolved.txt')
    })
    expect(resolveRoots).toHaveBeenCalled()
    expect(mockSearch).toHaveBeenCalledWith(expect.objectContaining({ path: 'resolved-root', keyword: 'hello' }))
  })

  it('显式传入 roots 时跳过 resolveRoots 与静态 roots', async () => {
    mockSearch.mockResolvedValue([sampleItem('explicit.txt')])
    const resolveRoots = vi.fn(async () => [{ path: 'resolved-root' }])
    const { result } = renderHook(() => useFileContentSearch({ roots: [{ path: 'stale-root' }], resolveRoots }))
    act(() => result.current.setKeyword('hello'))
    act(() => result.current.onSearch('hello', { roots: [{ path: 'explicit-root' }] }))
    await waitFor(() => {
      expect(result.current.loading).toBe(false)
      expect(result.current.results[0].name).toBe('explicit.txt')
    })
    expect(resolveRoots).not.toHaveBeenCalled()
    expect(mockSearch).toHaveBeenCalledWith(expect.objectContaining({ path: 'explicit-root', keyword: 'hello' }))
  })

  it('切换搜索类型后保留上次结果且不自动重搜', async () => {
    mockSearch.mockResolvedValue([sampleItem('demo.txt')])
    const { result } = renderHook(() => useFileContentSearch({ roots: [{ path: 'ai-output' }] }))
    act(() => result.current.setKeyword('hello'))
    act(() => result.current.onSearch('hello'))
    await waitFor(() => {
      expect(result.current.results).toHaveLength(1)
    })
    expect(mockSearch).toHaveBeenCalledTimes(1)

    act(() => result.current.setSearchType('regexp' as never))
    expect(result.current.results).toHaveLength(1)
    expect(result.current.results[0].name).toBe('demo.txt')
    expect(result.current.searched).toBe(true)
    expect(mockSearch).toHaveBeenCalledTimes(1)
  })

  it('正常搜索成功仍写回最新结果', async () => {
    mockSearch.mockResolvedValue([sampleItem('demo.txt')])
    const { result } = renderHook(() => useFileContentSearch({ roots: [{ path: 'ai-output' }] }))
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
    const { result } = renderHook(() =>
      useFileContentSearch({
        roots: [{ path: 'ai-output' }, { path: 'opened-file.txt' }],
      }),
    )
    act(() => result.current.setKeyword('hello'))
    act(() => result.current.onSearch('hello'))
    await waitFor(() => {
      expect(result.current.loading).toBe(false)
      expect(result.current.results).toHaveLength(1)
      expect(result.current.results[0].name).toBe('ok.txt')
    })
    expect(mockNotify).toHaveBeenCalledWith('error', 'FileTreeSearch.searchFailed: permission denied')
  })

  it('取消搜索：作废进行中请求并停止 loading，延迟响应不得写回', async () => {
    let resolveFirst!: (value: FileSearchFileItem[]) => void
    mockSearch.mockImplementationOnce(
      (args: { token?: string }) =>
        new Promise<FileSearchFileItem[]>((resolve) => {
          resolveFirst = resolve
          expect(args.token).toBeTruthy()
        }),
    )

    const { result } = renderHook(() => useFileContentSearch({ roots: [{ path: 'ai-output' }] }))
    act(() => result.current.setKeyword('hello'))
    act(() => result.current.onSearch('hello'))
    expect(result.current.loading).toBe(true)

    act(() => result.current.onCancelSearch())
    expect(result.current.loading).toBe(false)
    expect(mockCancel).toHaveBeenCalled()

    await act(async () => {
      resolveFirst([sampleItem('stale.txt')])
    })
    expect(result.current.results).toEqual([])
    expect(result.current.loading).toBe(false)
    expect(mockNotify).not.toHaveBeenCalled()
  })
})
