import { bindExternalStoreHook, createExternalStore } from '@/utils/createExternalStore'

export interface PreviewOpenFile {
  path: string
  name: string
}

const isSamePreviewOpenFiles = (prev: PreviewOpenFile[], next: PreviewOpenFile[]) => {
  if (prev === next) return true
  if (prev.length !== next.length) return false
  return prev.every((item, index) => item.path === next[index]?.path && item.name === next[index]?.name)
}

/** 工作区文件预览 tab 中当前打开的文件（供搜索范围「当前打开」使用） */
const store = createExternalStore<PreviewOpenFile[]>([])

export const previewOpenFilesStore = {
  subscribe: store.subscribe,
  getSnapshot: store.getSnapshot,
  setPreviewOpenFiles(files: PreviewOpenFile[]) {
    if (isSamePreviewOpenFiles(store.getSnapshot(), files)) return
    store.setSnapshot(() => files)
  },
  clear() {
    if (store.getSnapshot().length === 0) return
    store.setSnapshot(() => [])
  },
}

export const usePreviewOpenFiles = bindExternalStoreHook(store)
