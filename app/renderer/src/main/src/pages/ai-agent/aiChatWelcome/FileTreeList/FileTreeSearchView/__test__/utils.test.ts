import { describe, expect, it } from 'vitest'
import { FileTreeSearchScope } from '../constants'
import { resolveSearchPaths } from '../utils'

describe('resolveSearchPaths', () => {
  const grpcFolders = [{ path: 'ai-output' }, { path: 'ai-output' }, { path: '  ' }]
  const customFolder = [{ path: 'opened.txt' }, { path: 'ai-output' }]

  it('All 合并两端并去重、过滤空路径', () => {
    expect(resolveSearchPaths(FileTreeSearchScope.All, grpcFolders, customFolder)).toEqual([
      { path: 'ai-output' },
      { path: 'opened.txt' },
    ])
  })

  it('AiFolder 仅 grpcFolders', () => {
    expect(resolveSearchPaths(FileTreeSearchScope.AiFolder, grpcFolders, customFolder)).toEqual([{ path: 'ai-output' }])
  })

  it('UserFolder 仅 customFolder', () => {
    expect(resolveSearchPaths(FileTreeSearchScope.UserFolder, grpcFolders, customFolder)).toEqual([
      { path: 'opened.txt' },
      { path: 'ai-output' },
    ])
  })
})
