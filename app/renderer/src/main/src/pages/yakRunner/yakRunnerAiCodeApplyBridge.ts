import type { AIAgentGrpcApi, AIInputEvent, AttachedResourceInfo } from '@/pages/ai-re-act/hooks/grpcApi'
import { AttachedResourceKeyEnum, AttachedResourceTypeEnum } from '@/pages/ai-agent/defaultConstant'
import { getFileSuffixFromPath, isYaklangScriptDeliveryPath, normalizeYakRunnerFilePath } from '@/pages/yakRunner/utils'
import { yakitFailed } from '@/utils/notification'

export const YAK_RUNNER_AI_PAGE_ID = 'yak-runner-main'

export type YakRunnerApplyCodeExtras = { path?: string; language?: string; needsSaveAs?: boolean }

export type YakRunnerWorkspaceContext = {
  directoryPath?: string
  filePath?: string
}

const pageApplyHandlers = new Map<string, (content: string, extras?: YakRunnerApplyCodeExtras) => void>()
const pageGetCodeHandlers = new Map<string, () => string>()
const pageGetWorkspaceContextHandlers = new Map<string, () => YakRunnerWorkspaceContext>()
const lastAppliedCodeByPage = new Map<string, { content: string; path?: string }>()

export type YakRunnerCasualCodeReplaceReviewPayload = {
  original: string
  change: AIAgentGrpcApi.YaklangCodeChange
  language?: string
  fileName?: string
  isCreate?: boolean
}

type YakRunnerCasualCodeReplaceReviewHandler = (payload: YakRunnerCasualCodeReplaceReviewPayload) => void

const pageCasualReplaceReviewHandlers = new Map<string, YakRunnerCasualCodeReplaceReviewHandler>()

/** Keys that carry script delivery targets for write_yaklang_code */
const YAKLANG_DELIVERY_FILE_PATH_KEYS = new Set<AttachedResourceKeyEnum>([
  AttachedResourceKeyEnum.CONTEXT_PROVIDER_KEY_FILE_PATH,
  AttachedResourceKeyEnum.CONTEXT_PROVIDER_KEY_CODE_BLOCK_File_ID,
])

function attachedResourcePathValue(item: AttachedResourceInfo): string {
  const value = item.Value
  if (typeof value === 'string') return value.trim()
  if (Array.isArray(value)) return String(value[0] ?? '').trim()
  return ''
}

function upsertAttachedResource(list: AttachedResourceInfo[], entry: AttachedResourceInfo): AttachedResourceInfo[] {
  const idx = list.findIndex((item) => item.Key === entry.Key)
  if (idx >= 0) {
    const next = [...list]
    next[idx] = entry
    return next
  }
  return [...list, entry]
}

export function resolveYaklangCodeChangePath(change: AIAgentGrpcApi.YaklangCodeChange): string | undefined {
  const path = change.code?.path?.trim()
  if (!path) return undefined
  return normalizeYakRunnerFilePath(path)
}

/** 从 AI 返回的 `code.path` 解析文件后缀，原样返回（如 `yak`、`sf`、`txt`） */
export function resolveYaklangCodeChangeLanguage(change: AIAgentGrpcApi.YaklangCodeChange): string | undefined {
  const path = resolveYaklangCodeChangePath(change)
  if (!path) return undefined
  const suffix = getFileSuffixFromPath(path)
  return suffix || undefined
}

export function createYakRunnerGeneratedCodeFileName(date = new Date()): string {
  const pad = (n: number) => `${n}`.padStart(2, '0')
  const y = date.getFullYear()
  const m = pad(date.getMonth() + 1)
  const d = pad(date.getDate())
  const h = pad(date.getHours())
  const mi = pad(date.getMinutes())
  const s = pad(date.getSeconds())
  return `gen_code_${y}${m}${d}_${h}_${mi}_${s}.yak`
}

function getDirectoryPathFromAttachedResourceInfo(attachedResourceInfo?: AttachedResourceInfo[]): string | undefined {
  const attachedResourceInfoValue = attachedResourceInfo?.find(
    (item) => item.Key === AttachedResourceKeyEnum.CONTEXT_PROVIDER_KEY_CODE_BLOCK_Directory_ID,
  )?.Value
  const result =
    typeof attachedResourceInfoValue === 'string'
      ? attachedResourceInfoValue?.trim()
      : attachedResourceInfoValue?.join(',').trim()
  return result
}

function joinDirectoryAndFileName(directoryPath: string, fileName: string): string {
  const separator = directoryPath.includes('\\') ? '\\' : '/'
  return `${directoryPath.replace(/[\\/]+$/, '')}${separator}${fileName}`
}

export function resolveYaklangCreateTargetPath(
  pageId: string,
  attachedResourceInfo?: AttachedResourceInfo[],
  fileName = createYakRunnerGeneratedCodeFileName(),
): string | undefined {
  const directoryPath = getDirectoryPathFromAttachedResourceInfo(attachedResourceInfo)
  if (directoryPath) return joinDirectoryAndFileName(directoryPath, fileName)

  const workspaceDirectory = getYakRunnerPageWorkspaceContext(pageId)?.directoryPath?.trim()
  if (workspaceDirectory) return joinDirectoryAndFileName(workspaceDirectory, fileName)

  return undefined
}

export function registerYakRunnerPageCasualCodeReplaceReview(
  pageId: string,
  handler: YakRunnerCasualCodeReplaceReviewHandler,
): () => void {
  pageCasualReplaceReviewHandlers.set(pageId, handler)
  return () => {
    if (pageCasualReplaceReviewHandlers.get(pageId) === handler) {
      pageCasualReplaceReviewHandlers.delete(pageId)
    }
  }
}

export function enqueueYakRunnerCasualCodeReplaceReview(
  pageId: string,
  payload: YakRunnerCasualCodeReplaceReviewPayload,
): void {
  pageCasualReplaceReviewHandlers.get(pageId)?.(payload)
}

export function registerYakRunnerPageApplyCodeFromAI(
  pageId: string,
  handler: (content: string, extras?: YakRunnerApplyCodeExtras) => void,
): () => void {
  pageApplyHandlers.set(pageId, handler)
  return () => {
    if (pageApplyHandlers.get(pageId) === handler) {
      pageApplyHandlers.delete(pageId)
      lastAppliedCodeByPage.delete(pageId)
    }
  }
}

export function registerYakRunnerPageGetActiveCodeString(pageId: string, getCode: () => string): () => void {
  pageGetCodeHandlers.set(pageId, getCode)
  return () => {
    if (pageGetCodeHandlers.get(pageId) === getCode) {
      pageGetCodeHandlers.delete(pageId)
    }
  }
}

export function getYakRunnerPageActiveCodeString(pageId: string): string | null {
  return pageGetCodeHandlers.get(pageId)?.() ?? null
}

export function registerYakRunnerPageGetWorkspaceContext(
  pageId: string,
  getContext: () => YakRunnerWorkspaceContext,
): () => void {
  pageGetWorkspaceContextHandlers.set(pageId, getContext)
  return () => {
    if (pageGetWorkspaceContextHandlers.get(pageId) === getContext) {
      pageGetWorkspaceContextHandlers.delete(pageId)
    }
  }
}

export function getYakRunnerPageWorkspaceContext(pageId: string): YakRunnerWorkspaceContext | null {
  return pageGetWorkspaceContextHandlers.get(pageId)?.() ?? null
}

/**
 * yaklang writer loop：规范化 AttachedResourceInfo 并附带工作区上下文
 * - @mention / 选区参考文件（.md 等）不得占用 delivery file_path
 * - 当前打开的 .yak tab 始终作为交付目标（覆盖 mention 先占坑的情况）
 * - 已打开文件夹 → directory_path
 * - 选中代码块由 codeBlockList 附带 selected/content，此处不重复写入
 */
export function appendYakRunnerWorkspaceContextToEvent(pageId: string, event: AIInputEvent): AIInputEvent {
  const ctx = getYakRunnerPageWorkspaceContext(pageId)
  const directoryPath = ctx?.directoryPath?.trim()
  const activeFilePath = ctx?.filePath?.trim()
  const editorDeliveryPath = activeFilePath && isYaklangScriptDeliveryPath(activeFilePath) ? activeFilePath : undefined

  const existing = event.AttachedResourceInfo || []

  // Drop non-.yak delivery paths (@mention reports, code blocks from .md tabs, etc.)
  let next = existing.filter((item) => {
    if (!YAKLANG_DELIVERY_FILE_PATH_KEYS.has(item.Key as AttachedResourceKeyEnum)) {
      return true
    }
    const path = attachedResourcePathValue(item)
    if (!path) return true
    return isYaklangScriptDeliveryPath(path)
  })

  if (directoryPath) {
    next = upsertAttachedResource(next, {
      Type: AttachedResourceTypeEnum.CONTEXT_PROVIDER_TYPE_CODE_BLOCK_File,
      Key: AttachedResourceKeyEnum.CONTEXT_PROVIDER_KEY_CODE_BLOCK_Directory_ID,
      Value: directoryPath,
    })
  }

  if (editorDeliveryPath) {
    next = upsertAttachedResource(next, {
      Type: AttachedResourceTypeEnum.CONTEXT_PROVIDER_TYPE_CODE_BLOCK_File,
      Key: AttachedResourceKeyEnum.CONTEXT_PROVIDER_KEY_CODE_BLOCK_File_ID,
      Value: editorDeliveryPath,
    })
  }

  if (next.length === existing.length && !directoryPath && !editorDeliveryPath) {
    return event
  }
  return { ...event, AttachedResourceInfo: next }
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
    yakitFailed('未找到 Yak Runner 工作区，请保持该页已打开。')
    return
  }
  const content = String(data.code?.content ?? '')
  if (data.op === 'create' && content.trim() === '') return
  const path = resolveYaklangCodeChangePath(data)
  const lastApplied = lastAppliedCodeByPage.get(pageId)
  if (!options?.skipReplaceDedup && lastApplied && lastApplied.content === content && lastApplied.path === path) {
    return
  }
  lastAppliedCodeByPage.set(pageId, { content, path })
  fn(content, {
    path,
    language: resolveYaklangCodeChangeLanguage(data),
    needsSaveAs: data.op === 'create',
  })
}
