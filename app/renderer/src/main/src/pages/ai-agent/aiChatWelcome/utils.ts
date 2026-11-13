import { yakitNotify } from '@/utils/notification'
import type { HistoryItem } from '../components/aiFileSystemList/type'
import { MAX_ATTACHMENTS_PER_BATCH } from '../template/type'

const { ipcRenderer } = window.require('electron')

const guessIsFolderByPath = (path: string): boolean => {
  const normalized = path.replace(/\\/g, '/')

  // 1. 以 / 结尾
  if (normalized.endsWith('/')) return true

  const lastSegment = normalized.split('/').pop()
  if (!lastSegment) return false

  // 2. 没有扩展名（没有 .）
  if (!lastSegment.includes('.')) return true

  return false
}

export const fetchIsFolderByPath = async (path: string): Promise<boolean | null> => {
  try {
    const isExists = await ipcRenderer.invoke('is-file-exists', path)
    if (!isExists) return null
    return await ipcRenderer.invoke('fetch-file-is-dir-by-path', path)
  } catch (err) {
    return guessIsFolderByPath(path)
  }
}

export const handleOnFiles = async (files: File[]): Promise<HistoryItem[]> => {
  if (files.length === 0) return []
  if (files.length > MAX_ATTACHMENTS_PER_BATCH) {
    yakitNotify('error', `已选择 ${files.length} 个附件，单次最多添加 ${MAX_ATTACHMENTS_PER_BATCH} 个`)
    return []
  }

  const results: HistoryItem[] = []

  for (const file of files) {
    if (!('path' in file)) continue

    const fileWithPath = file as File & { path: string }
    const fullPath: string = fileWithPath.path

    const isFolder = await fetchIsFolderByPath(fullPath)
    if (isFolder !== null) {
      results.push({
        path: fullPath,
        isFolder,
      })
    }
  }

  return results
}
