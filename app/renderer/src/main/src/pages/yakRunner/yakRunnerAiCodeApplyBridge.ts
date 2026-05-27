import type { FileDetailInfo } from './RunnerTabs/RunnerTabsType'
import { yakitFailed } from '@/utils/notification'

export type YakRunnerCreateFilePayload = {
  name?: string
  content: string
  language?: string
}

type GetActiveFileHandler = () => FileDetailInfo | undefined
type ApplyToActiveFileHandler = (content: string) => void
type CreateFileHandler = (payload: YakRunnerCreateFilePayload) => void

const getActiveFileHandlers = new Map<string, GetActiveFileHandler>()
const applyToActiveFileHandlers = new Map<string, ApplyToActiveFileHandler>()
const createFileHandlers = new Map<string, CreateFileHandler>()

export function registerYakRunnerGetActiveFile(pageId: string, handler: GetActiveFileHandler): () => void {
  getActiveFileHandlers.set(pageId, handler)
  return () => {
    if (getActiveFileHandlers.get(pageId) === handler) {
      getActiveFileHandlers.delete(pageId)
    }
  }
}

export function registerYakRunnerApplyToActiveFile(pageId: string, handler: ApplyToActiveFileHandler): () => void {
  applyToActiveFileHandlers.set(pageId, handler)
  return () => {
    if (applyToActiveFileHandlers.get(pageId) === handler) {
      applyToActiveFileHandlers.delete(pageId)
    }
  }
}

export function registerYakRunnerCreateFile(pageId: string, handler: CreateFileHandler): () => void {
  createFileHandlers.set(pageId, handler)
  return () => {
    if (createFileHandlers.get(pageId) === handler) {
      createFileHandlers.delete(pageId)
    }
  }
}

export function getYakRunnerActiveFile(pageId: string): FileDetailInfo | undefined {
  return getActiveFileHandlers.get(pageId)?.()
}

export function applyContentToYakRunnerActiveFile(pageId: string, content: string): void {
  const fn = applyToActiveFileHandlers.get(pageId)
  if (!fn) {
    yakitFailed('未找到对应的 YakRunner 编辑器，请保持该页已打开。')
    return
  }
  fn(content)
}

export function createYakRunnerFile(pageId: string, payload: YakRunnerCreateFilePayload): void {
  const fn = createFileHandlers.get(pageId)
  if (!fn) {
    yakitFailed('未找到对应的 YakRunner 编辑器，请保持该页已打开。')
    return
  }
  fn(payload)
}
