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
 * 2. 仍多条且可提取的 aispace/<session> 唯一时，收敛到该 session；
 *    无法提取 session 的外部 pin 路径一并保留（避免漏搜）
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

  const sessionByPath = merged.map((item) => ({
    path: item.path,
    sessionRoot: extractAiSessionRoot(item.path),
  }))
  const sessionRoots = [
    ...new Set(sessionByPath.map((item) => item.sessionRoot).filter((path): path is string => !!path)),
  ]
  if (sessionRoots.length === 1) {
    const sessionRoot = sessionRoots[0]
    const externalPaths = sessionByPath.filter((item) => !item.sessionRoot).map(({ path }) => ({ path }))
    return [{ path: sessionRoot }, ...externalPaths]
  }

  return merged.map(({ path }) => ({ path }))
}

export interface ResolveSearchPathsOptions {
  /** UserFolder 二级菜单选中的单个路径 */
  userScopePath?: string
  /** 工作区预览 tab 打开的文件 */
  previewOpenFiles?: { path: string }[]
  /** CurrentOpen 二级菜单选中的单个路径 */
  currentOpenPath?: string
}

/** 按范围收集可搜索根路径并去重 */
export const resolveSearchPaths = async (
  scope: FileTreeSearchScopeValue,
  grpcFolders: { path: string; isFolder?: boolean }[],
  customFolder: { path: string }[],
  options: ResolveSearchPathsOptions = {},
): Promise<{ path: string }[]> => {
  const { userScopePath, previewOpenFiles = [], currentOpenPath } = options

  if (scope === FileTreeSearchScope.CurrentOpen) {
    if (currentOpenPath?.trim()) return [{ path: currentOpenPath.trim() }]
    return dedupePaths(previewOpenFiles)
  }

  // 二级菜单选中的单路径：只搜该路径，不再回落到全部用户文件夹
  if (scope === FileTreeSearchScope.UserFolder && userScopePath?.trim()) {
    return [{ path: userScopePath.trim() }]
  }

  // CurrentOpen 已在上方 return；此处仅剩 All / AiFolder / UserFolder
  const aiRoots = scope === FileTreeSearchScope.UserFolder ? [] : await resolveAiArtifactSearchRoots(grpcFolders)
  const list =
    scope === FileTreeSearchScope.AiFolder
      ? aiRoots
      : scope === FileTreeSearchScope.UserFolder
        ? customFolder
        : [...aiRoots, ...customFolder]

  return dedupePaths(list)
}

const dedupePaths = (list: { path: string }[]): { path: string }[] => {
  const seen = new Set<string>()
  return list.filter((item) => {
    const path = item.path?.trim()
    if (!path || seen.has(path)) return false
    seen.add(path)
    return true
  })
}

export const getPathBaseName = (path: string) => path.split(/[\\/]/).pop() || path
