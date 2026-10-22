export const FileTreeSearchScope = {
  All: 'all',
  AiFolder: 'ai',
  UserFolder: 'user',
  /** 工作区文件预览 tab 中当前打开的文件 */
  CurrentOpen: 'current',
} as const

export type FileTreeSearchScopeValue = (typeof FileTreeSearchScope)[keyof typeof FileTreeSearchScope]

/** 带前缀的菜单 key 编解码（二级菜单 path 项） */
const createPrefixedKeyCodec = (prefix: string) => ({
  toKey: (path: string) => `${prefix}${path}`,
  parseKey: (key: string): string | undefined => (key.startsWith(prefix) ? key.slice(prefix.length) : undefined),
})

/** 「我打开的文件」二级菜单 key */
export const USER_SCOPE_PATH_PREFIX = 'user-path:'
const userScopePathKey = createPrefixedKeyCodec(USER_SCOPE_PATH_PREFIX)
export const toUserScopeMenuKey = userScopePathKey.toKey
export const parseUserScopeMenuKey = userScopePathKey.parseKey

/** 「当前打开」二级菜单 key */
export const CURRENT_OPEN_PATH_PREFIX = 'current-path:'
const currentOpenPathKey = createPrefixedKeyCodec(CURRENT_OPEN_PATH_PREFIX)
export const toCurrentOpenMenuKey = currentOpenPathKey.toKey
export const parseCurrentOpenMenuKey = currentOpenPathKey.parseKey

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
