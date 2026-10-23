export { default as FileTreeContentSearchView } from './FileTreeContentSearchView/FileTreeContentSearchView'
export type {
  FileTreeContentSearchViewProps,
  FileTreeSearchEmptyContext,
} from './FileTreeContentSearchView/FileTreeContentSearchView'
export { default as FileSearchResultItem } from './FileSearchResultItem/FileSearchResultItem'
export { useFileContentSearch } from './hooks/useFileContentSearch'
export type { UseFileContentSearchOptions } from './hooks/useFileContentSearch'
export { useClearFileSearchHighlights } from './hooks/useClearFileSearchHighlights'
export { FileTreeSearchType, SEARCH_INPUT_FOCUS_DELAY_MS, SEARCH_CANCEL_VISIBLE_MS } from './constants'
export type { FileTreeSearchTypeValue } from './constants'
export {
  FILE_SEARCH_UNSUPPORTED_ENGINE,
  grpcSearchFileContent,
  cancelGrpcSearchFileContent,
  mergeFileSearchItems,
  toEditorHighlights,
  resolveOpenHighlights,
  splitLineByMatches,
  clipLineAroundMatches,
} from './utils'
export type {
  FileSearchMatch,
  FileSearchLine,
  FileSearchResult,
  FileSearchFileItem,
  SearchFileContentParams,
  FileSearchSegment,
  FileSearchEditorHighlight,
} from './type'
