import type { AIAgentGrpcApi } from '@/pages/ai-re-act/hooks/grpcApi'

import { getYakRunnerPageActiveCodeString, resolveYaklangCodeChangePath } from './yakRunnerAiCodeApplyBridge'
import { isSameYakRunnerFilePath } from './utils'

type PatchWorkingState = {
  path?: string
  content: string
  lastVersion: number
}

const patchWorkingByPage = new Map<string, PatchWorkingState>()

export function resetYakRunnerPatchWorkingDraft(pageId: string): void {
  patchWorkingByPage.delete(pageId)
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

function applyLineRangePatch(base: string, startLine: number, endLine: number, fragment: string): string {
  const lines = toLines(base)
  const startIdx = Math.max(0, startLine - 1)
  const endIdx = Math.max(startIdx, endLine)
  const nextLines = toLines(fragment)
  return fromLines([...lines.slice(0, startIdx), ...nextLines, ...lines.slice(endIdx)])
}

function applySnippetPatch(base: string, oldSnippet: string, fragment: string): string {
  if (!oldSnippet) return fragment || base
  const idx = base.indexOf(oldSnippet)
  if (idx < 0) return base
  return base.slice(0, idx) + fragment + base.slice(idx + oldSnippet.length)
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

function applyYaklangCodePatch(base: string, change: AIAgentGrpcApi.YaklangCodeChange): string {
  const patch = change.code?.patch
  const fragment = String(change.code?.content ?? '')
  if (!patch) return fragment || base

  switch (patch.kind) {
    case 'line_range':
      return applyLineRangePatch(base, patch.start_line || 1, patch.end_line || patch.start_line || 1, fragment)
    case 'snippet':
      return applySnippetPatch(base, patch.old_snippet || '', fragment)
    case 'insert':
      return applyInsertPatch(base, patch.insert_line || 1, fragment)
    case 'delete':
      return applyDeletePatch(base, patch.start_line || 1, patch.end_line || patch.start_line || 1)
    case 'full':
    default:
      return fragment || base
  }
}

/**
 * Collapse backend patch events into full-file replace/create payloads for the existing diff UI.
 * Returns null when the event is a duplicate patch (same or older version).
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

  const editorNow = getYakRunnerPageActiveCodeString(pageId) ?? ''
  let base = sessionOriginal
  if (prev && isSamePatchTargetPath(prev.path, path)) {
    base = prev.content
  } else if (editorNow.trim() !== '') {
    base = editorNow
  }

  const merged = applyYaklangCodePatch(base, data)
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
