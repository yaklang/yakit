/** 单处命中区间（UTF-16 1-based 列号，end_column 不含），与后端 fsSearchMatch 对应 */
export interface FileSearchMatch {
  start_column: number
  end_column: number
}

/** 单条命中行：一行多处命中合并为一条，携带每处命中的列区间 */
export interface FileSearchLine {
  line: number
  text: string
  matches: FileSearchMatch[]
}

/** 后端 Extra.search_result 的 JSON 结构 */
export interface FileSearchResult {
  match_count: number
  results: FileSearchLine[]
}

/** 一个命中文件 */
export interface FileSearchFileItem {
  path: string
  name: string
  searchResult: FileSearchResult
}

export interface SearchFileContentParams {
  /** 搜索根路径（文件或目录，目录递归搜索子目录） */
  path: string
  keyword: string
  /** keyword 是否按正则解析，默认按字面量 */
  regex?: boolean
  ignoreCase?: boolean
}

export interface FileSearchSegment {
  text: string
  hit: boolean
}

/** 预览编辑器高亮区间（与各端编辑器 highlight 结构对齐） */
export interface FileSearchEditorHighlight {
  startLineNumber: number
  startColumn: number
  endLineNumber: number
  endColumn: number
}
