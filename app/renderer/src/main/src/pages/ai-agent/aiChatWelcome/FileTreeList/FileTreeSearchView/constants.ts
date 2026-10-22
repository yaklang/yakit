export const FileTreeSearchScope = {
  All: 'all',
  AiFolder: 'ai',
  UserFolder: 'user',
  /** 工作区文件预览 tab 中当前打开的文件 */
  CurrentOpen: 'current',
} as const

export type FileTreeSearchScopeValue = (typeof FileTreeSearchScope)[keyof typeof FileTreeSearchScope]

/** 「我打开的文件」二级菜单 key 前缀 */
export const USER_SCOPE_PATH_PREFIX = 'user-path:'

export const toUserScopeMenuKey = (path: string) => `${USER_SCOPE_PATH_PREFIX}${path}`

export const parseUserScopeMenuKey = (key: string): string | undefined =>
  key.startsWith(USER_SCOPE_PATH_PREFIX) ? key.slice(USER_SCOPE_PATH_PREFIX.length) : undefined

/** 「当前打开」二级菜单 key 前缀 */
export const CURRENT_OPEN_PATH_PREFIX = 'current-path:'

export const toCurrentOpenMenuKey = (path: string) => `${CURRENT_OPEN_PATH_PREFIX}${path}`

export const parseCurrentOpenMenuKey = (key: string): string | undefined =>
  key.startsWith(CURRENT_OPEN_PATH_PREFIX) ? key.slice(CURRENT_OPEN_PATH_PREFIX.length) : undefined

/** 搜索范围选项（i18n key → value）；「当前打开」有预览 tab 时才展示 */
export const FILE_TREE_SEARCH_SCOPE_OPTIONS = [
  { value: FileTreeSearchScope.All, labelKey: 'FileTreeSearch.all' },
  { value: FileTreeSearchScope.AiFolder, labelKey: 'FileTreeSystem.aiArtifacts' },
  { value: FileTreeSearchScope.UserFolder, labelKey: 'FileTreeSystem.myOpenedFiles' },
  { value: FileTreeSearchScope.CurrentOpen, labelKey: 'FileTreeSearch.currentOpen' },
] as const

export const isSingleFolderSearchScope = (scope: FileTreeSearchScopeValue) =>
  scope === FileTreeSearchScope.AiFolder ||
  scope === FileTreeSearchScope.UserFolder ||
  scope === FileTreeSearchScope.CurrentOpen

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
