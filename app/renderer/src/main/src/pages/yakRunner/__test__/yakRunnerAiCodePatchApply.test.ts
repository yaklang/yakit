import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { AIAgentGrpcApi } from '@/pages/ai-re-act/hooks/grpcApi'

const getCodeMock = vi.fn<[], string | null>(() => null)

vi.mock('@/utils/notification', () => ({
  yakitFailed: vi.fn(),
}))

vi.mock('../utils', () => ({
  isSameYakRunnerFilePath: (a: string, b: string) => a === b,
}))

vi.mock('../yakRunnerAiCodeApplyBridge', () => ({
  getYakRunnerPageActiveCodeString: () => getCodeMock(),
  resolveYaklangCodeChangePath: (change: AIAgentGrpcApi.YaklangCodeChange) => change.code?.path,
}))

// eslint-disable-next-line import/first
import { yakitFailed } from '@/utils/notification'
// eslint-disable-next-line import/first
import {
  applyYaklangCodePatch,
  normalizeYaklangCodeChangeForReview,
  resetYakRunnerPatchWorkingDraft,
  syncYakRunnerPatchWorkingDraft,
} from '../yakRunnerAiCodePatchApply'

const PAGE_ID = 'test-page'

const baseFile = ['line1', 'line2', 'line3', 'line4'].join('\n')

function patchChange(
  patch: NonNullable<AIAgentGrpcApi.YaklangCodeChange['code']['patch']>,
  content: string,
  version = 1,
): AIAgentGrpcApi.YaklangCodeChange {
  return {
    op: 'patch',
    code: { content, version, patch },
  }
}

describe('applyYaklangCodePatch', () => {
  it('line_range replaces inclusive line span', () => {
    const result = applyYaklangCodePatch(
      baseFile,
      patchChange({ kind: 'line_range', start_line: 2, end_line: 3 }, 'new2\nnew3'),
    )
    expect(result).toEqual({ ok: true, content: 'line1\nnew2\nnew3\nline4' })
  })

  it('line_range validates old_snippet when provided', () => {
    const ok = applyYaklangCodePatch(
      baseFile,
      patchChange({ kind: 'line_range', start_line: 2, end_line: 2, old_snippet: 'line2' }, 'replaced'),
    )
    expect(ok).toEqual({ ok: true, content: 'line1\nreplaced\nline3\nline4' })

    const bad = applyYaklangCodePatch(
      baseFile,
      patchChange({ kind: 'line_range', start_line: 2, end_line: 2, old_snippet: 'wrong' }, 'replaced'),
    )
    expect(bad.ok).toBe(false)
  })

  it('snippet replaces first normalized occurrence', () => {
    const crlfBase = 'line1\r\nold\r\nline3'
    const result = applyYaklangCodePatch(crlfBase, patchChange({ kind: 'snippet', old_snippet: 'old' }, 'new'))
    expect(result).toEqual({ ok: true, content: 'line1\nnew\nline3' })
  })

  it('snippet rejects missing or unmatched old_snippet', () => {
    expect(applyYaklangCodePatch(baseFile, patchChange({ kind: 'snippet' }, 'new'))).toEqual({
      ok: false,
      reason: 'snippet 补丁缺少 old_snippet，已拒绝合并',
    })

    expect(applyYaklangCodePatch(baseFile, patchChange({ kind: 'snippet', old_snippet: 'missing' }, 'new'))).toEqual({
      ok: false,
      reason: '未在文件中找到 old_snippet，补丁已拒绝合并',
    })
  })

  it('insert inserts before insert_line', () => {
    const result = applyYaklangCodePatch(baseFile, patchChange({ kind: 'insert', insert_line: 3 }, 'inserted'))
    expect(result).toEqual({ ok: true, content: 'line1\nline2\ninserted\nline3\nline4' })
  })

  it('delete removes inclusive line span and allows empty result', () => {
    const result = applyYaklangCodePatch(baseFile, patchChange({ kind: 'delete', start_line: 1, end_line: 4 }, ''))
    expect(result).toEqual({ ok: true, content: '' })

    const partial = applyYaklangCodePatch(
      baseFile,
      patchChange({ kind: 'delete', start_line: 2, end_line: 3, old_snippet: 'line2\nline3' }, ''),
    )
    expect(partial).toEqual({ ok: true, content: 'line1\nline4' })
  })

  it('full replaces entire content', () => {
    const result = applyYaklangCodePatch(baseFile, patchChange({ kind: 'full' }, 'whole file'))
    expect(result).toEqual({ ok: true, content: 'whole file' })
  })
})

describe('normalizeYaklangCodeChangeForReview', () => {
  beforeEach(() => {
    resetYakRunnerPatchWorkingDraft(PAGE_ID)
    getCodeMock.mockReturnValue(null)
    vi.mocked(yakitFailed).mockClear()
  })

  it('converts patch into replace with merged full content', () => {
    const normalized = normalizeYaklangCodeChangeForReview(
      PAGE_ID,
      patchChange({ kind: 'snippet', old_snippet: 'line2' }, 'changed'),
      baseFile,
    )
    expect(normalized?.op).toBe('replace')
    expect(normalized?.code.content).toBe('line1\nchanged\nline3\nline4')
  })

  it('deduplicates same or older version on same path', () => {
    normalizeYaklangCodeChangeForReview(
      PAGE_ID,
      patchChange({ kind: 'snippet', old_snippet: 'line2' }, 'v1', 1),
      baseFile,
    )
    expect(
      normalizeYaklangCodeChangeForReview(
        PAGE_ID,
        patchChange({ kind: 'snippet', old_snippet: 'line2' }, 'dup', 1),
        baseFile,
      ),
    ).toBeNull()
  })

  it('chains multiple patches on working draft', () => {
    normalizeYaklangCodeChangeForReview(
      PAGE_ID,
      patchChange({ kind: 'snippet', old_snippet: 'line2' }, 'mid', 1),
      baseFile,
    )
    const second = normalizeYaklangCodeChangeForReview(
      PAGE_ID,
      patchChange({ kind: 'snippet', old_snippet: 'line4' }, 'tail', 2),
      baseFile,
    )
    expect(second?.code.content).toBe('line1\nmid\nline3\ntail')
  })

  it('rejects invalid patch and surfaces failure', () => {
    const normalized = normalizeYaklangCodeChangeForReview(
      PAGE_ID,
      patchChange({ kind: 'snippet', old_snippet: 'missing' }, 'new', 1),
      baseFile,
    )
    expect(normalized).toBeNull()
    expect(yakitFailed).toHaveBeenCalledWith('未在文件中找到 old_snippet，补丁已拒绝合并')
  })

  it('prefers editor content when user partially accepted changes', () => {
    normalizeYaklangCodeChangeForReview(
      PAGE_ID,
      patchChange({ kind: 'snippet', old_snippet: 'line2' }, 'ai-line2', 1),
      baseFile,
    )
    getCodeMock.mockReturnValue('line1\nuser-line2\nline3\nline4')
    const next = normalizeYaklangCodeChangeForReview(
      PAGE_ID,
      patchChange({ kind: 'snippet', old_snippet: 'line4' }, 'user-tail', 2),
      baseFile,
    )
    expect(next?.code.content).toBe('line1\nuser-line2\nline3\nuser-tail')
  })

  it('syncYakRunnerPatchWorkingDraft keeps chained merge aligned with review baseline', () => {
    normalizeYaklangCodeChangeForReview(
      PAGE_ID,
      patchChange({ kind: 'snippet', old_snippet: 'line2' }, 'ai-line2', 1),
      baseFile,
    )
    syncYakRunnerPatchWorkingDraft(PAGE_ID, 'line1\nkept\nline3\nline4')
    getCodeMock.mockReturnValue('line1\nkept\nline3\nline4')
    const next = normalizeYaklangCodeChangeForReview(
      PAGE_ID,
      patchChange({ kind: 'snippet', old_snippet: 'line4' }, 'tail', 2),
      baseFile,
    )
    expect(next?.code.content).toBe('line1\nkept\nline3\ntail')
  })
})
