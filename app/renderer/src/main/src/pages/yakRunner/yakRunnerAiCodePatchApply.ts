import type { AIAgentGrpcApi } from '@/pages/ai-re-act/hooks/grpcApi'
import { yakitFailed } from '@/utils/notification'

import { getYakRunnerPageActiveCodeString, resolveYaklangCodeChangePath } from './yakRunnerAiCodeApplyBridge'
import { isSameYakRunnerFilePath } from './utils'

type PatchWorkingState = {
  path?: string
  content: string
  lastVersion: number
}

export type YaklangPatchApplyResult = { ok: true; content: string } | { ok: false; reason: string }

const patchWorkingByPage = new Map<string, PatchWorkingState>()

export function resetYakRunnerPatchWorkingDraft(pageId: string): void {
  patchWorkingByPage.delete(pageId)
}

/** 用户在 diff 审阅中部分/全部采纳后，同步链式 patch 的工作草稿基线 */
export function syncYakRunnerPatchWorkingDraft(pageId: string, content: string): void {
  const prev = patchWorkingByPage.get(pageId)
  if (!prev) return
  patchWorkingByPage.set(pageId, { ...prev, content })
}

function normNewlines(s: string): string {
  return s.replace(/\r\n/g, '\n').replace(/\r/g, '\n')
}

function toLines(s: string): string[] {
  const normalized = normNewlines(s)
  if (normalized === '') return []
  return normalized.split('\n')
}

function fromLines(lines: string[]): string {
  return lines.join('\n')
}

function extractLineRangeText(base: string, startLine: number, endLine: number): string {
  const lines = toLines(base)
  const startIdx = Math.max(0, startLine - 1)
  const endIdx = Math.min(lines.length, Math.max(startIdx, endLine))
  return fromLines(lines.slice(startIdx, endIdx))
}

function validateOldSnippet(
  base: string,
  startLine: number,
  endLine: number,
  oldSnippet: string,
): YaklangPatchApplyResult | null {
  const actual = extractLineRangeText(base, startLine, endLine)
  if (normNewlines(actual) !== normNewlines(oldSnippet)) {
    return { ok: false, reason: '补丁 old_snippet 与文件内容不一致，已拒绝合并' }
  }
  return null
}

function applyLineRangePatch(base: string, startLine: number, endLine: number, fragment: string): string {
  const lines = toLines(base)
  const startIdx = Math.max(0, startLine - 1)
  const endIdx = Math.max(startIdx, endLine)
  const nextLines = toLines(fragment)
  return fromLines([...lines.slice(0, startIdx), ...nextLines, ...lines.slice(endIdx)])
}

function applyInsertPatch(base: string, insertLine: number, fragment: string): string {
  const lines = toLines(base)
  const idx = Math.max(0, insertLine - 1)
  return fromLines([...lines.slice(0, idx), ...toLines(fragment), ...lines.slice(idx)])
}

function applyDeletePatch(base: string, startLine: number, endLine: number): string {
  const lines = toLines(base)
  const startIdx = Math.max(0, startLine - 1)
  const endIdx = Math.max(startIdx, endLine)
  return fromLines([...lines.slice(0, startIdx), ...lines.slice(endIdx)])
}

function isSamePatchTargetPath(a?: string, b?: string): boolean {
  if (!a || !b) return true
  return isSameYakRunnerFilePath(a, b)
}

export function applyYaklangCodePatch(base: string, change: AIAgentGrpcApi.YaklangCodeChange): YaklangPatchApplyResult {
  const patch = change.code?.patch
  const fragment = String(change.code?.content ?? '')
  if (!patch) return { ok: true, content: fragment || base }

  const oldSnippet = patch.old_snippet?.trim() ? patch.old_snippet : undefined
  const startLine = patch.start_line || 1
  const endLine = patch.end_line || patch.start_line || 1

  switch (patch.kind) {
    case 'line_range': {
      if (oldSnippet != null) {
        const mismatch = validateOldSnippet(base, startLine, endLine, oldSnippet)
        if (mismatch) return mismatch
      }
      return { ok: true, content: applyLineRangePatch(base, startLine, endLine, fragment) }
    }
    case 'snippet': {
      if (!oldSnippet) {
        return { ok: false, reason: 'snippet 补丁缺少 old_snippet，已拒绝合并' }
      }
      const normBase = normNewlines(base)
      const normOld = normNewlines(oldSnippet)
      const idx = normBase.indexOf(normOld)
      if (idx < 0) {
        return { ok: false, reason: '未在文件中找到 old_snippet，补丁已拒绝合并' }
      }
      const normFragment = normNewlines(fragment)
      return { ok: true, content: normBase.slice(0, idx) + normFragment + normBase.slice(idx + normOld.length) }
    }
    case 'insert':
      return { ok: true, content: applyInsertPatch(base, patch.insert_line || 1, fragment) }
    case 'delete': {
      if (oldSnippet != null) {
        const mismatch = validateOldSnippet(base, startLine, endLine, oldSnippet)
        if (mismatch) return mismatch
      }
      return { ok: true, content: applyDeletePatch(base, startLine, endLine) }
    }
    case 'full':
    default:
      return { ok: true, content: fragment || base }
  }
}

function resolvePatchMergeBase(
  pageId: string,
  sessionOriginal: string,
  prev: PatchWorkingState | undefined,
  path: string | undefined,
): string {
  const editorNow = getYakRunnerPageActiveCodeString(pageId) ?? ''
  if (prev && isSamePatchTargetPath(prev.path, path)) {
    if (editorNow.trim() !== '' && normNewlines(editorNow) !== normNewlines(prev.content)) {
      return editorNow
    }
    return prev.content
  }
  if (editorNow.trim() !== '') return editorNow
  return sessionOriginal
}

/**
 * Collapse backend patch events into full-file replace/create payloads for the existing diff UI.
 * Returns null when the event is a duplicate patch (same or older version) or merge is rejected.
 */
export function normalizeYaklangCodeChangeForReview(
  pageId: string,
  data: AIAgentGrpcApi.YaklangCodeChange,
  sessionOriginal: string,
): AIAgentGrpcApi.YaklangCodeChange | null {
  if (data.op === 'create') {
    patchWorkingByPage.set(pageId, {
      path: resolveYaklangCodeChangePath(data),
      content: String(data.code?.content ?? ''),
      lastVersion: data.code?.version ?? 0,
    })
    return data
  }

  if (data.op !== 'patch') {
    const full = String(data.code?.content ?? '')
    patchWorkingByPage.set(pageId, {
      path: resolveYaklangCodeChangePath(data),
      content: full,
      lastVersion: data.code?.version ?? 0,
    })
    return data
  }

  const version = data.code?.version ?? 0
  const path = resolveYaklangCodeChangePath(data)
  const prev = patchWorkingByPage.get(pageId)
  if (prev && version > 0 && version <= prev.lastVersion && isSamePatchTargetPath(prev.path, path)) {
    return null
  }

  const base = resolvePatchMergeBase(pageId, sessionOriginal, prev, path)
  const result = applyYaklangCodePatch(base, data)
  if (!result.ok) {
    yakitFailed(result.reason)
    return null
  }

  const merged = result.content
  patchWorkingByPage.set(pageId, { path, content: merged, lastVersion: version })

  return {
    ...data,
    op: 'replace',
    code: {
      ...data.code,
      content: merged,
    },
  }
}
