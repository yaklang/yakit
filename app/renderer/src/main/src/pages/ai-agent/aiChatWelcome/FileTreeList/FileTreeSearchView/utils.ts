import { mergePathArray } from '../../../components/aiFileSystemList/utils'
import type { HistoryItem } from '../../../components/aiFileSystemList/type'
import type { FileTreeSearchScopeValue } from './constants'
import { FileTreeSearchScope } from './constants'

/**
 * 从路径提取 AI 会话根：.../aispace/<session_dir>
 * 例：...\aispace\38_session_xxx\task\a.md → ...\aispace\38_session_xxx
 */
export const extractAiSessionRoot = (path: string): string | undefined => {
  const trimmed = path?.trim()
  if (!trimmed) return undefined
  const normalized = trimmed.replace(/\\/g, '/')
  const match = normalized.match(/^(.*?\/aispace\/[^/]+)/i)
  if (!match) return undefined
  return trimmed.includes('\\') ? match[1].replace(/\//g, '\\') : match[1]
}

/**
 * AI Artifacts 搜索根：
 * 1. mergePathArray 父吞子（列表里有父目录时）
 * 2. 仍多条且同属一个 aispace/<session> 时，再收敛到该 session（只有子 pin 时）
 */
export const resolveAiArtifactSearchRoots = async (
  grpcFolders: { path: string; isFolder?: boolean }[],
): Promise<{ path: string }[]> => {
  if (grpcFolders.length === 0) return []
  const items: HistoryItem[] = grpcFolders.map((item) => ({
    path: item.path,
    isFolder: item.isFolder ?? true,
  }))
  const merged = await mergePathArray([], items)
  if (merged.length <= 1) {
    return merged.map(({ path }) => ({ path }))
  }

  const sessionRoots = [
    ...new Set(merged.map((item) => extractAiSessionRoot(item.path)).filter((path): path is string => !!path)),
  ]
  if (sessionRoots.length === 1) {
    return [{ path: sessionRoots[0] }]
  }

  return merged.map(({ path }) => ({ path }))
}

/** 按范围收集可搜索根路径并去重（AI 业务：ai 文件夹 / 用户文件夹 / 单个已打开路径） */
export const resolveSearchPaths = async (
  scope: FileTreeSearchScopeValue,
  grpcFolders: { path: string; isFolder?: boolean }[],
  customFolder: { path: string }[],
  /** UserFolder 下指定单个已打开路径；未传则搜全部用户路径 */
  userScopePath?: string,
): Promise<{ path: string }[]> => {
  // 二级菜单选中的单路径：只搜该路径，不再回落到全部用户文件夹
  if (scope === FileTreeSearchScope.UserFolder && userScopePath?.trim()) {
    return [{ path: userScopePath.trim() }]
  }

  const aiRoots = scope === FileTreeSearchScope.UserFolder ? [] : await resolveAiArtifactSearchRoots(grpcFolders)
  const list =
    scope === FileTreeSearchScope.AiFolder
      ? aiRoots
      : scope === FileTreeSearchScope.UserFolder
        ? customFolder
        : [...aiRoots, ...customFolder]

  const seen = new Set<string>()
  return list.filter((item) => {
    const path = item.path?.trim()
    if (!path || seen.has(path)) return false
    seen.add(path)
    return true
  })
}

export const getPathBaseName = (path: string) => path.split(/[\\/]/).pop() || path
