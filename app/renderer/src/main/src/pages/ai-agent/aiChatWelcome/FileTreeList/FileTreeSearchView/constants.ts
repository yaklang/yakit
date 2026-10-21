export const FileTreeSearchScope = {
  All: 'all',
  AiFolder: 'ai',
  UserFolder: 'user',
} as const

export type FileTreeSearchScopeValue = (typeof FileTreeSearchScope)[keyof typeof FileTreeSearchScope]

/** 搜索范围选项（i18n key → value），UI 用 t(labelKey) 渲染 */
export const FILE_TREE_SEARCH_SCOPE_OPTIONS = [
  { value: FileTreeSearchScope.All, labelKey: 'FileTreeSearch.all' },
  { value: FileTreeSearchScope.AiFolder, labelKey: 'FileTreeSearch.aiFolder' },
  { value: FileTreeSearchScope.UserFolder, labelKey: 'FileTreeSearch.userFolder' },
] as const

export const isSingleFolderSearchScope = (scope: FileTreeSearchScopeValue) =>
  scope === FileTreeSearchScope.AiFolder || scope === FileTreeSearchScope.UserFolder

export type FileTreeSearchEmptyKind = 'hint' | 'searchAll' | 'noResult'

/** 空态文案/CTA 类型：hint 引导输入；searchAll 单范围无结果；noResult 全部范围无命中 */
export const resolveFileTreeSearchEmptyKind = (params: {
  searched: boolean
  hasSearchPath: boolean
  scope: FileTreeSearchScopeValue
}): FileTreeSearchEmptyKind => {
  const { searched, hasSearchPath, scope } = params
  if (!searched) return 'hint'
  if (isSingleFolderSearchScope(scope)) return 'searchAll'
  if (!hasSearchPath) return 'hint'
  return 'noResult'
}
