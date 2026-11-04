export const FileTreeSearchType = {
  Keyword: 'keyword',
  Regexp: 'regexp',
} as const

export type FileTreeSearchTypeValue = (typeof FileTreeSearchType)[keyof typeof FileTreeSearchType]

/** 进入搜索面板后聚焦输入框的延迟（对齐左右滑动画） */
export const SEARCH_INPUT_FOCUS_DELAY_MS = 260

/** loading 超过该时长后展示「取消搜索」 */
export const SEARCH_CANCEL_VISIBLE_MS = 3000
