import { describe, expect, it } from 'vitest'
import type { YakRunnerCasualCodeReplaceReviewPayload } from '@/pages/yakRunner/yakRunnerAiCodeApplyBridge'
import type { AIAgentGrpcApi } from '@/pages/ai-re-act/hooks/grpcApi'
import {
  resolveRuleReviewApplyMerged,
  resolveRuleReviewEnqueue,
  type RuleReviewSessionState,
} from '../auditCodeRuleReviewQueue'

const emptySession = (): RuleReviewSessionState => ({
  sessionId: null,
  baseline: null,
  queueId: 0,
})

function makePayload(
  original: string,
  content: string,
  extras?: Partial<YakRunnerCasualCodeReplaceReviewPayload>,
): YakRunnerCasualCodeReplaceReviewPayload {
  return {
    original,
    change: {
      op: 'full',
      code: { content, version: 1 },
    } as AIAgentGrpcApi.CodeChange,
    ...extras,
  }
}

describe('resolveRuleReviewEnqueue', () => {
  it('starts a session from the live editor baseline and defaults language/fileName', () => {
    const result = resolveRuleReviewEnqueue({
      payload: makePayload('stale-original', 'rule next {}'),
      editorNow: 'rule old {}',
      session: emptySession(),
    })
    expect(result.kind).toBe('enqueue')
    if (result.kind !== 'enqueue') return
    expect(result.session.sessionId).toBe('sf-rule-1')
    expect(result.session.queueId).toBe(1)
    expect(result.session.baseline).toBe('rule old {}')
    expect(result.item.id).toBe('sf-rule-1')
    expect(result.item.payload.original).toBe('rule old {}')
    expect(result.item.payload.change.code.content).toBe('rule next {}')
    expect(result.item.payload.language).toBe('sf')
    expect(result.item.payload.fileName).toBe('rule.sf')
  })

  it('keeps the session baseline on a follow-up enqueue', () => {
    const first = resolveRuleReviewEnqueue({
      payload: makePayload('', 'v1'),
      editorNow: 'v0',
      session: emptySession(),
    })
    expect(first.kind).toBe('enqueue')
    if (first.kind !== 'enqueue') return

    const second = resolveRuleReviewEnqueue({
      payload: makePayload('ignored', 'v2'),
      editorNow: 'editor-changed',
      session: first.session,
    })
    expect(second.kind).toBe('enqueue')
    if (second.kind !== 'enqueue') return
    expect(second.session.sessionId).toBe(first.session.sessionId)
    expect(second.session.queueId).toBe(1)
    expect(second.session.baseline).toBe('v0')
    expect(second.item.payload.original).toBe('v0')
    expect(second.item.payload.change.code.content).toBe('v2')
  })

  it('treats CRLF vs LF as the same content and clears an active session', () => {
    const result = resolveRuleReviewEnqueue({
      payload: makePayload('a\r\nb', 'a\nb'),
      editorNow: 'other',
      session: { sessionId: 'sf-rule-3', baseline: 'a\r\nb', queueId: 3 },
    })
    expect(result).toEqual({
      kind: 'same-content',
      editor: 'a\nb',
      clearSession: true,
    })
  })

  it('same content without a session still writes the editor and does not clear', () => {
    const result = resolveRuleReviewEnqueue({
      payload: makePayload('x', 'x'),
      editorNow: 'x',
      session: emptySession(),
    })
    expect(result).toEqual({
      kind: 'same-content',
      editor: 'x',
      clearSession: false,
    })
  })
})

describe('resolveRuleReviewApplyMerged', () => {
  it('rewrites the queue original to the merged baseline', () => {
    const enqueued = resolveRuleReviewEnqueue({
      payload: makePayload('', 'proposal'),
      editorNow: 'base',
      session: emptySession(),
    })
    expect(enqueued.kind).toBe('enqueue')
    if (enqueued.kind !== 'enqueue') return

    const merged = resolveRuleReviewApplyMerged({
      mergedCode: 'merged-body',
      queue: [enqueued.item],
      session: enqueued.session,
    })
    expect(merged).not.toBeNull()
    expect(merged?.editor).toBe('merged-body')
    expect(merged?.session.baseline).toBe('merged-body')
    expect(merged?.session.sessionId).toBe('sf-rule-1')
    expect(merged?.queue).toHaveLength(1)
    expect(merged?.queue[0].payload.original).toBe('merged-body')
  })

  it('resets the session when the round is done', () => {
    const enqueued = resolveRuleReviewEnqueue({
      payload: makePayload('', 'proposal'),
      editorNow: 'base',
      session: emptySession(),
    })
    expect(enqueued.kind).toBe('enqueue')
    if (enqueued.kind !== 'enqueue') return

    const merged = resolveRuleReviewApplyMerged({
      mergedCode: 'final',
      done: true,
      queue: [enqueued.item],
      session: enqueued.session,
    })
    expect(merged).toEqual({
      editor: 'final',
      queue: [],
      session: { sessionId: null, baseline: null, queueId: 1 },
    })
  })

  it('returns null when the queue is empty', () => {
    expect(
      resolveRuleReviewApplyMerged({
        mergedCode: 'x',
        queue: [],
        session: emptySession(),
      }),
    ).toBeNull()
  })
})
