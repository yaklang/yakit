import type { AIAgentGrpcApi } from '@/pages/ai-re-act/hooks/grpcApi'
import { yakitFailed } from '@/utils/notification'

export type YakRunnerCasualCodeReviewPayload = {
  original: string
  change: AIAgentGrpcApi.YaklangCodeChange
}

type YakRunnerCasualCodeReviewHandler = (payload: YakRunnerCasualCodeReviewPayload) => void

const pageApplyHandlers = new Map<string, (content: string) => void>()
const pageGetEditorCodeHandlers = new Map<string, () => string>()
const pageCasualCodeReviewHandlers = new Map<string, YakRunnerCasualCodeReviewHandler>()
const lastAppliedCodeByPage = new Map<string, { content: string; version?: number }>()

export function registerYakRunnerPageCasualCodeReview(
  pageId: string,
  handler: YakRunnerCasualCodeReviewHandler,
): () => void {
  pageCasualCodeReviewHandlers.set(pageId, handler)
  return () => {
    if (pageCasualCodeReviewHandlers.get(pageId) === handler) {
      pageCasualCodeReviewHandlers.delete(pageId)
    }
  }
}

export function enqueueYakRunnerCasualCodeReview(pageId: string, payload: YakRunnerCasualCodeReviewPayload): void {
  const fn = pageCasualCodeReviewHandlers.get(pageId)
  if (fn) fn(payload)
}

export function registerYakRunnerPageApplyCodeFromAI(pageId: string, handler: (content: string) => void): () => void {
  pageApplyHandlers.set(pageId, handler)
  return () => {
    if (pageApplyHandlers.get(pageId) === handler) {
      pageApplyHandlers.delete(pageId)
      lastAppliedCodeByPage.delete(pageId)
    }
  }
}

export function registerYakRunnerPageGetEditorCode(pageId: string, getCode: () => string): () => void {
  pageGetEditorCodeHandlers.set(pageId, getCode)
  return () => {
    if (pageGetEditorCodeHandlers.get(pageId) === getCode) {
      pageGetEditorCodeHandlers.delete(pageId)
    }
  }
}

export function getYakRunnerPageEditorCode(pageId: string): string | null {
  const fn = pageGetEditorCodeHandlers.get(pageId)
  if (!fn) return null
  return fn()
}

export type ApplyYaklangCodeChangeOptions = {
  skipReplaceDedup?: boolean
}

export function applyYaklangCodeChangeToYakRunnerPage(
  pageId: string,
  data: AIAgentGrpcApi.YaklangCodeChange,
  options?: ApplyYaklangCodeChangeOptions,
): void {
  const fn = pageApplyHandlers.get(pageId)
  if (!fn) {
    yakitFailed('未找到对应的 Yak Runner 页，请保持该页已打开。')
    return
  }
  const content = data?.code?.content
  if (content == null || String(content).trim() === '') return
  const normalized = String(content)
  const version = data.code?.version
  const lastApplied = lastAppliedCodeByPage.get(pageId)
  if (
    !options?.skipReplaceDedup &&
    lastApplied &&
    lastApplied.content === normalized &&
    (version == null || lastApplied.version === version)
  ) {
    return
  }
  lastAppliedCodeByPage.set(pageId, { content: normalized, version })
  fn(normalized)
}
