import { useEffect, useState } from 'react'
import type { FileNodeProps } from '@/pages/yakRunner/FileTree/FileTreeType'
import type { FileSearchEditorHighlight } from '@/components/FileTreeContentSearch/type'
export interface FilePreviewTabsState {
  scope: string
  files: FileNodeProps[]
  active: string
  highlights: Record<string, FileSearchEditorHighlight[]>
}
export const emptyFileTabs = (scope: string): FilePreviewTabsState => ({ scope, files: [], active: '', highlights: {} })
export function openFileTab(
  state: FilePreviewTabsState,
  file: FileNodeProps,
  highlights: FileSearchEditorHighlight[] = [],
): FilePreviewTabsState {
  if (file.isFolder || !file.path) return state
  return {
    ...state,
    active: file.path,
    files: state.files.some((item) => item.path === file.path)
      ? state.files.map((item) => (item.path === file.path ? file : item))
      : [...state.files, file],
    highlights: { ...state.highlights, [file.path]: highlights },
  }
}
export function closeFileTab(state: FilePreviewTabsState, path: string): FilePreviewTabsState {
  const index = state.files.findIndex((file) => file.path === path)
  if (index < 0) return state
  const files = state.files.filter((file) => file.path !== path),
    highlights = { ...state.highlights }
  delete highlights[path]
  return {
    ...state,
    files,
    highlights,
    active: state.active === path ? files[Math.max(0, index - 1)]?.path || '' : state.active,
  }
}
export const useFilePreviewTabs = (scope: string) => {
  const [state, setState] = useState(() => emptyFileTabs(scope))
  const current = state.scope === scope ? state : emptyFileTabs(scope)
  useEffect(() => {
    setState(emptyFileTabs(scope))
  }, [scope])
  return {
    state: current,
    open: (file: FileNodeProps, highlights?: FileSearchEditorHighlight[]) =>
      setState((prev) => openFileTab(prev.scope === scope ? prev : emptyFileTabs(scope), file, highlights)),
    close: (path: string) =>
      setState((prev) => (prev.scope === scope ? closeFileTab(prev, path) : emptyFileTabs(scope))),
    activate: (path: string) =>
      setState((prev) =>
        prev.scope === scope && prev.files.some((file) => file.path === path) ? { ...prev, active: path } : prev,
      ),
  }
}
