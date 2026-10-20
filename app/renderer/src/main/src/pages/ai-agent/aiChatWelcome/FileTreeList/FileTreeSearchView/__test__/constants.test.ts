import { describe, expect, it } from 'vitest'
import { FileTreeSearchScope, resolveFileTreeSearchEmptyKind, isSingleFolderSearchScope } from '../constants'

describe('FileTreeSearch constants helpers', () => {
  it('isSingleFolderSearchScope 仅认 ai / user', () => {
    expect(isSingleFolderSearchScope(FileTreeSearchScope.AiFolder)).toBe(true)
    expect(isSingleFolderSearchScope(FileTreeSearchScope.UserFolder)).toBe(true)
    expect(isSingleFolderSearchScope(FileTreeSearchScope.All)).toBe(false)
  })

  it('resolveFileTreeSearchEmptyKind 覆盖未搜 / 单范围 / 全部无结果', () => {
    expect(
      resolveFileTreeSearchEmptyKind({
        searched: false,
        hasSearchPath: true,
        scope: FileTreeSearchScope.UserFolder,
      }),
    ).toBe('hint')

    expect(
      resolveFileTreeSearchEmptyKind({
        searched: true,
        hasSearchPath: false,
        scope: FileTreeSearchScope.UserFolder,
      }),
    ).toBe('searchAll')

    expect(
      resolveFileTreeSearchEmptyKind({
        searched: true,
        hasSearchPath: true,
        scope: FileTreeSearchScope.All,
      }),
    ).toBe('noResult')

    expect(
      resolveFileTreeSearchEmptyKind({
        searched: true,
        hasSearchPath: false,
        scope: FileTreeSearchScope.All,
      }),
    ).toBe('hint')
  })
})
