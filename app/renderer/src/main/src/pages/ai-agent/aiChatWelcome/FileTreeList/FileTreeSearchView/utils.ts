import type { FileTreeSearchScopeValue } from './constants'
import { FileTreeSearchScope } from './constants'

/** 按范围收集可搜索根路径并去重（AI 业务：ai 文件夹 / 用户文件夹） */
export const resolveSearchPaths = (
  scope: FileTreeSearchScopeValue,
  grpcFolders: { path: string }[],
  customFolder: { path: string }[],
): { path: string }[] => {
  const list =
    scope === FileTreeSearchScope.AiFolder
      ? grpcFolders
      : scope === FileTreeSearchScope.UserFolder
        ? customFolder
        : [...grpcFolders, ...customFolder]
  const seen = new Set<string>()
  return list.filter((item) => {
    const path = item.path?.trim()
    if (!path || seen.has(path)) return false
    seen.add(path)
    return true
  })
}
