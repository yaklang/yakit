import type { RequestYakURLResponse, YakURLResource } from '@/pages/yakURLTree/data'
import type {
  FileSearchEditorHighlight,
  FileSearchFileItem,
  FileSearchLine,
  FileSearchMatch,
  FileSearchResult,
  FileSearchSegment,
  SearchFileContentParams,
} from './type'

const { ipcRenderer } = window.require('electron')

const SEARCH_RESULT_EXTRA_KEY = 'search_result'

/** 引擎未支持 op=search 时抛出，供 UI 做 i18n 提示 */
export const FILE_SEARCH_UNSUPPORTED_ENGINE = 'FILE_SEARCH_UNSUPPORTED_ENGINE'

const getExtraValue = (extra: YakURLResource['Extra'] | undefined, key: string): string => {
  const item = (extra || []).find((entry) => entry.Key === key) as
    | { Key: string; Value?: string; MarshalValue?: string }
    | undefined
  if (!item) return ''
  return item.Value || item.MarshalValue || ''
}

/** 引擎未实现 op=search 时会走 default：把搜索根路径原样返回（多为 dir，Extra 只有 Directory-Name） */
const isUnsupportedSearchResponse = (resources: YakURLResource[]): boolean => {
  if (!resources.length) return false
  return resources.every(
    (resource) => resource.ResourceType === 'dir' && !getExtraValue(resource.Extra, SEARCH_RESULT_EXTRA_KEY),
  )
}

const resourceToFileItem = (resource: YakURLResource): FileSearchFileItem | null => {
  const raw = getExtraValue(resource.Extra, SEARCH_RESULT_EXTRA_KEY)
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw) as Partial<FileSearchResult>
    const results = Array.isArray(parsed.results) ? parsed.results : []
    const matchCount =
      typeof parsed.match_count === 'number'
        ? parsed.match_count
        : results.reduce((sum, line) => sum + (line.matches?.length || 0), 0)
    if (results.length === 0 && matchCount <= 0) return null
    return {
      path: resource.Path,
      name: resource.ResourceName,
      searchResult: { match_count: matchCount, results },
    }
  } catch {
    return null
  }
}

/**
 * @name 按关键字/正则搜索文件内容
 * @description RequestYakURL file schema op=search；global=true 递归子目录，命中行与列区间见 Extra.search_result
 */
export const grpcSearchFileContent = async (params: SearchFileContentParams): Promise<FileSearchFileItem[]> => {
  const query: { Key: string; Value: string }[] = [
    { Key: 'op', Value: 'search' },
    { Key: 'keyword', Value: params.keyword },
    { Key: 'global', Value: 'true' },
  ]
  if (params.regex) query.push({ Key: 'regex', Value: 'true' })
  if (params.ignoreCase) query.push({ Key: 'ignoreCase', Value: 'true' })

  const requestParams = {
    Method: 'GET',
    Url: { Schema: 'file', Path: params.path, Query: query },
  }
  const res: RequestYakURLResponse = await ipcRenderer.invoke('RequestYakURL', requestParams, params.token)

  const resources = res.Resources || []
  if (isUnsupportedSearchResponse(resources)) {
    throw new Error(FILE_SEARCH_UNSUPPORTED_ENGINE)
  }

  return resources.map(resourceToFileItem).filter((item): item is FileSearchFileItem => item !== null)
}

/** 取消进行中的文件内容搜索（RequestYakURL） */
export const cancelGrpcSearchFileContent = async (token?: string) => {
  if (!token) return
  try {
    await ipcRenderer.invoke('cancel-RequestYakURL', token)
  } catch {
    // ignore
  }
}

/** 多个搜索根路径的结果按文件路径去重合并 */
export const mergeFileSearchItems = (items: FileSearchFileItem[]): FileSearchFileItem[] => {
  const map = new Map<string, FileSearchFileItem>()
  items.forEach((item) => {
    if (!map.has(item.path)) map.set(item.path, item)
  })
  return [...map.values()]
}

/** 搜索命中 → 预览编辑器 highLightFind 区间 */
export const toEditorHighlights = (lines: FileSearchLine[]): FileSearchEditorHighlight[] => {
  return lines.flatMap((line) =>
    (line.matches || []).map((match) => ({
      startLineNumber: line.line,
      startColumn: match.start_column,
      endLineNumber: line.line,
      endColumn: match.end_column,
    })),
  )
}

/**
 * 打开搜索结果时的高亮列表：点命中行用该行，点文件头用全部命中行。
 * AI 预览 / yakRunner 编辑器共用，避免两端各自拼区间。
 */
export const resolveOpenHighlights = (
  line?: FileSearchLine,
  fileItem?: FileSearchFileItem,
): FileSearchEditorHighlight[] => toEditorHighlights(line ? [line] : fileItem?.searchResult.results || [])

/** 将命中行按 matches 切分为普通/高亮片段（列号 UTF-16 1-based、end 不含） */
export const splitLineByMatches = (line: FileSearchLine): FileSearchSegment[] => {
  const segments: FileSearchSegment[] = []
  let cursor = 0
  for (const match of line.matches || []) {
    const start = Math.max(cursor, match.start_column - 1)
    const end = Math.max(start, Math.min(match.end_column - 1, line.text.length))
    if (start > cursor) segments.push({ text: line.text.slice(cursor, start), hit: false })
    if (end > start) {
      segments.push({ text: line.text.slice(start, end), hit: true })
      cursor = end
    }
  }
  if (cursor < line.text.length) segments.push({ text: line.text.slice(cursor), hit: false })
  return segments.filter((segment) => segment.text.length > 0)
}

/**
 * 侧栏宽度有限时，把长行裁到首个命中附近，避免 overflow ellipsis 把高亮裁掉看不见
 * @param contextChars 命中前后各保留的字符数
 */
export const clipLineAroundMatches = (line: FileSearchLine, contextChars = 28): FileSearchLine => {
  const matches = [...(line.matches || [])].sort((a, b) => a.start_column - b.start_column)
  if (!matches.length) return line

  const firstStart = Math.max(0, matches[0].start_column - 1)
  if (firstStart <= contextChars && line.text.length <= contextChars * 3) return line

  let lastEnd = matches[0].end_column - 1
  for (const match of matches) {
    lastEnd = Math.max(lastEnd, match.end_column - 1)
  }

  let start = Math.max(0, firstStart - contextChars)
  let end = Math.min(line.text.length, lastEnd + contextChars)
  const maxWindow = contextChars * 2 + 48
  if (end - start > maxWindow) {
    end = Math.min(
      line.text.length,
      firstStart + contextChars + Math.max(8, matches[0].end_column - matches[0].start_column),
    )
  }

  const prefix = start > 0 ? '…' : ''
  const suffix = end < line.text.length ? '…' : ''
  const sliced = line.text.slice(start, end)
  const prefixLen = prefix.length

  const nextMatches = matches
    .map((match) => {
      const matchStart = match.start_column - 1
      const matchEnd = match.end_column - 1
      if (matchEnd <= start || matchStart >= end) return null
      return {
        start_column: Math.max(matchStart, start) - start + prefixLen + 1,
        end_column: Math.min(matchEnd, end) - start + prefixLen + 1,
      }
    })
    .filter((item): item is FileSearchMatch => item !== null)

  return {
    line: line.line,
    text: `${prefix}${sliced}${suffix}`,
    matches: nextMatches,
  }
}
