import { useSyncExternalStore } from 'react'
import { createExternalStore } from '@/utils/createExternalStore'

export interface PreviewOpenFile {
  path: string
  name: string
}

/** 无 pageId 时的回退键（嵌入单页 / 测试） */
export const PREVIEW_OPEN_FILES_DEFAULT_PAGE_KEY = '__default__'

export const resolvePreviewOpenFilesPageKey = (pageId?: string) =>
  pageId?.trim() ? pageId.trim() : PREVIEW_OPEN_FILES_DEFAULT_PAGE_KEY

type PageFilesMap = Record<string, PreviewOpenFile[]>

const EMPTY_FILES: PreviewOpenFile[] = []

const isSamePreviewOpenFiles = (prev: PreviewOpenFile[], next: PreviewOpenFile[]) => {
  if (prev === next) return true
  if (prev.length !== next.length) return false
  return prev.every((item, index) => item.path === next[index]?.path && item.name === next[index]?.name)
}

/** 按 pageId 隔离的工作区预览文件（供搜索范围「当前打开」） */
const store = createExternalStore<PageFilesMap>({})

export const previewOpenFilesStore = {
  subscribe: store.subscribe,
  getSnapshot(pageId?: string): PreviewOpenFile[] {
    const key = resolvePreviewOpenFilesPageKey(pageId)
    return store.getSnapshot()[key] ?? EMPTY_FILES
  },
  setPreviewOpenFiles(pageId: string | undefined, files: PreviewOpenFile[]) {
    const key = resolvePreviewOpenFilesPageKey(pageId)
    const prev = store.getSnapshot()[key] ?? EMPTY_FILES
    if (isSamePreviewOpenFiles(prev, files)) return
    store.setSnapshot((map) => ({ ...map, [key]: files }))
  },
  clear(pageId?: string) {
    const key = resolvePreviewOpenFilesPageKey(pageId)
    if (!(key in store.getSnapshot())) return
    store.setSnapshot(({ [key]: _removed, ...rest }) => rest)
  },
  /** 测试用：清空全部 page */
  clearAll() {
    if (Object.keys(store.getSnapshot()).length === 0) return
    store.setSnapshot(() => ({}))
  },
}

export function usePreviewOpenFiles(pageId?: string) {
  const key = resolvePreviewOpenFilesPageKey(pageId)
  return useSyncExternalStore(store.subscribe, () => store.getSnapshot()[key] ?? EMPTY_FILES)
}
