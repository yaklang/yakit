import { bindExternalStoreHook, createExternalStore } from '@/utils/createExternalStore'

export interface PreviewOpenFile {
  path: string
  name: string
}

/** 工作区文件预览 tab 中当前打开的文件（供搜索范围「当前打开」使用） */
const store = createExternalStore<PreviewOpenFile[]>([])

export const previewOpenFilesStore = {
  subscribe: store.subscribe,
  getSnapshot: store.getSnapshot,
  setPreviewOpenFiles(files: PreviewOpenFile[]) {
    store.setSnapshot(() => files)
  },
  clear() {
    store.setSnapshot(() => [])
  },
}

export const usePreviewOpenFiles = bindExternalStoreHook(store)
