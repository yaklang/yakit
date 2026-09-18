import { unescapeLikelyJsonEscapedText } from '@/utils/unescapeLikelyJsonEscapedText'
import type { YakRunnerCasualCodeReplaceReviewPayload } from '@/pages/yakRunner/yakRunnerAiCodeApplyBridge'

export type RuleReviewQueueItem = {
  id: string
  payload: YakRunnerCasualCodeReplaceReviewPayload
}

export type RuleReviewSessionState = {
  sessionId: string | null
  baseline: string | null
  queueId: number
}

export type RuleReviewEnqueueResult =
  | { kind: 'same-content'; editor: string; clearSession: boolean }
  | { kind: 'enqueue'; session: RuleReviewSessionState; item: RuleReviewQueueItem }

export type RuleReviewApplyMergedResult = {
  editor: string
  queue: RuleReviewQueueItem[]
  session: RuleReviewSessionState
}

export function normalizeRuleReviewNewlines(value: string): string {
  return String(value).replace(/\r\n/g, '\n').replace(/\r/g, '\n')
}

function emptySession(queueId: number): RuleReviewSessionState {
  return { sessionId: null, baseline: null, queueId }
}

/**
 * 审阅入队：内容去重、基线延续、会话 id 分配。
 * 有进行中会话时沿用基线；否则以当前编辑器内容为基线。
 */
export function resolveRuleReviewEnqueue(params: {
  payload: YakRunnerCasualCodeReplaceReviewPayload
  editorNow: string
  session: RuleReviewSessionState
}): RuleReviewEnqueueResult {
  const incoming = unescapeLikelyJsonEscapedText(params.payload.change.code?.content ?? '')
  let baseline = unescapeLikelyJsonEscapedText(params.payload.original ?? '')
  if (params.session.sessionId != null && params.session.baseline != null) {
    baseline = params.session.baseline
  } else {
    baseline = params.editorNow
  }

  const normIncoming = normalizeRuleReviewNewlines(incoming)
  const normOriginal = normalizeRuleReviewNewlines(baseline)
  if (normOriginal === normIncoming) {
    return {
      kind: 'same-content',
      editor: normIncoming,
      clearSession: params.session.sessionId != null,
    }
  }

  let { sessionId, queueId } = params.session
  if (sessionId == null) {
    queueId += 1
    sessionId = `sf-rule-${queueId}`
  }

  const item: RuleReviewQueueItem = {
    id: sessionId,
    payload: {
      ...params.payload,
      original: baseline,
      change: {
        ...params.payload.change,
        code: {
          ...params.payload.change.code,
          content: incoming,
        },
      },
      language: params.payload.language || 'sf',
      fileName: params.payload.fileName || 'rule.sf',
    },
  }

  return {
    kind: 'enqueue',
    session: { sessionId, baseline, queueId },
    item,
  }
}

/** 审阅确认合入：回写基线；done 时重置会话 */
export function resolveRuleReviewApplyMerged(params: {
  mergedCode: string
  done?: boolean
  queue: RuleReviewQueueItem[]
  session: RuleReviewSessionState
}): RuleReviewApplyMergedResult | null {
  const head = params.queue[0]
  if (!head) return null

  const next = unescapeLikelyJsonEscapedText(params.mergedCode)
  if (params.done) {
    return {
      editor: next,
      queue: [],
      session: emptySession(params.session.queueId),
    }
  }

  return {
    editor: next,
    queue: [{ ...head, payload: { ...head.payload, original: next } }],
    session: {
      sessionId: params.session.sessionId,
      baseline: next,
      queueId: params.session.queueId,
    },
  }
}
