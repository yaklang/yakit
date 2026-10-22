import { beforeEach, describe, expect, it, vi } from 'vitest'
import { FileTreeSearchScope } from '../constants'

const { mockMergePathArray } = vi.hoisted(() => ({
  mockMergePathArray: vi.fn(),
}))

vi.mock('../../../../components/aiFileSystemList/utils', () => ({
  mergePathArray: (...args: unknown[]) => mockMergePathArray(...args),
}))

import { extractAiSessionRoot, getPathBaseName, resolveAiArtifactSearchRoots, resolveSearchPaths } from '../utils'

beforeEach(() => {
  mockMergePathArray.mockReset()
  mockMergePathArray.mockImplementation(async (_origin: unknown, incoming: { path: string }[]) => incoming)
})

describe('extractAiSessionRoot', () => {
  it('从 pin 路径提取 aispace 会话根（Windows）', () => {
    expect(
      extractAiSessionRoot(
        'C:\\bo\\software\\Yakit\\yakit-projects\\aispace\\38_session_20261021_f957a\\task_x\\report.md',
      ),
    ).toBe('C:\\bo\\software\\Yakit\\yakit-projects\\aispace\\38_session_20261021_f957a')
  })

  it('从 pin 路径提取 aispace 会话根（POSIX）', () => {
    expect(extractAiSessionRoot('/home/u/yakit-projects/aispace/38_session_abc/task/a.md')).toBe(
      '/home/u/yakit-projects/aispace/38_session_abc',
    )
  })
})

describe('resolveAiArtifactSearchRoots', () => {
  const session = 'C:\\yakit-projects\\aispace\\38_session_x'

  it('merge 后已是单条则不再二次收敛', async () => {
    mockMergePathArray.mockResolvedValueOnce([{ path: session, isFolder: true }])
    await expect(
      resolveAiArtifactSearchRoots([
        { path: `${session}\\a.md`, isFolder: false },
        { path: session, isFolder: true },
      ]),
    ).resolves.toEqual([{ path: session }])
  })

  it('merge 后仍多条且同属一个 session 时收敛到该 session', async () => {
    mockMergePathArray.mockResolvedValueOnce([
      { path: `${session}\\task_a\\a.md`, isFolder: false },
      { path: `${session}\\task_b\\b.md`, isFolder: false },
      { path: `${session}\\tool_calls\\report.md`, isFolder: false },
    ])
    await expect(
      resolveAiArtifactSearchRoots([
        { path: `${session}\\task_a\\a.md`, isFolder: false },
        { path: `${session}\\task_b\\b.md`, isFolder: false },
        { path: `${session}\\tool_calls\\report.md`, isFolder: false },
      ]),
    ).resolves.toEqual([{ path: session }])
  })

  it('merge 后属于多个 session 时不硬收', async () => {
    const sessionA = 'C:\\yakit-projects\\aispace\\38_session_a'
    const sessionB = 'C:\\yakit-projects\\aispace\\38_session_b'
    mockMergePathArray.mockResolvedValueOnce([
      { path: `${sessionA}\\a.md`, isFolder: false },
      { path: `${sessionB}\\b.md`, isFolder: false },
    ])
    await expect(
      resolveAiArtifactSearchRoots([
        { path: `${sessionA}\\a.md`, isFolder: false },
        { path: `${sessionB}\\b.md`, isFolder: false },
      ]),
    ).resolves.toEqual([{ path: `${sessionA}\\a.md` }, { path: `${sessionB}\\b.md` }])
  })
})

describe('resolveSearchPaths', () => {
  const session = 'C:\\yakit-projects\\aispace\\38_session_x'
  const grpcFolders = [
    { path: `${session}\\task\\a.md`, isFolder: false },
    { path: session, isFolder: true },
  ]
  const customFolder = [{ path: 'opened.txt' }, { path: 'ai-output' }]

  beforeEach(() => {
    mockMergePathArray.mockResolvedValue([{ path: session, isFolder: true }])
  })

  it('All：合并后的 AI 根 + 用户路径', async () => {
    await expect(resolveSearchPaths(FileTreeSearchScope.All, grpcFolders, customFolder)).resolves.toEqual([
      { path: session },
      { path: 'opened.txt' },
      { path: 'ai-output' },
    ])
  })

  it('AiFolder 仅合并后的 AI 根', async () => {
    await expect(resolveSearchPaths(FileTreeSearchScope.AiFolder, grpcFolders, customFolder)).resolves.toEqual([
      { path: session },
    ])
  })

  it('UserFolder 仅 customFolder，不调用 AI 合并', async () => {
    mockMergePathArray.mockClear()
    await expect(resolveSearchPaths(FileTreeSearchScope.UserFolder, grpcFolders, customFolder)).resolves.toEqual([
      { path: 'opened.txt' },
      { path: 'ai-output' },
    ])
    expect(mockMergePathArray).not.toHaveBeenCalled()
  })

  it('UserFolder + userScopePath 仅该路径', async () => {
    await expect(
      resolveSearchPaths(FileTreeSearchScope.UserFolder, grpcFolders, customFolder, 'opened.txt'),
    ).resolves.toEqual([{ path: 'opened.txt' }])
  })
})

describe('getPathBaseName', () => {
  it('兼容 / 与 \\', () => {
    expect(getPathBaseName('a/b/c.txt')).toBe('c.txt')
    expect(getPathBaseName('a\\b\\c.txt')).toBe('c.txt')
  })
})
