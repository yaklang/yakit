export const FileTreeSearchType = {
  Keyword: 'keyword',
  Regexp: 'regexp',
} as const

export type FileTreeSearchTypeValue = (typeof FileTreeSearchType)[keyof typeof FileTreeSearchType]

export const FileTreeSearchScope = {
  All: 'all',
  AiFolder: 'ai',
  UserFolder: 'user',
} as const

export type FileTreeSearchScopeValue = (typeof FileTreeSearchScope)[keyof typeof FileTreeSearchScope]

/** 进入搜索面板后聚焦输入框的延迟（对齐左右滑动画） */
export const SEARCH_INPUT_FOCUS_DELAY_MS = 260
