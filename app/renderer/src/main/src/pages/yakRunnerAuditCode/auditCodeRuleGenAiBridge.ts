import type { AIAgentGrpcApi, AIInputEvent, AttachedResourceInfo } from '@/pages/ai-re-act/hooks/grpcApi'
import { AttachedResourceKeyEnum, AttachedResourceTypeEnum } from '@/pages/ai-agent/defaultConstant'
import emiter from '@/utils/eventBus/eventBus'
import { AUDIT_CODE_RULE_GEN_AI_PAGE_ID } from '@/constants/focusMode'
import { unescapeLikelyJsonEscapedText } from '@/utils/unescapeLikelyJsonEscapedText'
import {
  enqueueYakRunnerCasualCodeReplaceReview,
  type YakRunnerCasualCodeReplaceReviewPayload,
} from '@/pages/yakRunner/yakRunnerAiCodeApplyBridge'

export { AUDIT_CODE_RULE_GEN_AI_PAGE_ID }
export { unescapeLikelyJsonEscapedText }

type GetRuleEditor = () => string
type GetEditorSelection = () => {
  path?: string
  language?: string
  startLine?: number
  endLine?: number
  content: string
} | null

const ruleEditorGetters = new Map<string, GetRuleEditor>()
const selectionGetters = new Map<string, GetEditorSelection>()
let liveEditorSelection: ReturnType<GetEditorSelection> = null

export function registerAuditCodeRuleEditorGetter(pageId: string, getter: GetRuleEditor): () => void {
  ruleEditorGetters.set(pageId, getter)
  return () => {
    if (ruleEditorGetters.get(pageId) === getter) {
      ruleEditorGetters.delete(pageId)
    }
  }
}

export function getAuditCodeRuleEditorString(pageId: string): string {
  return ruleEditorGetters.get(pageId)?.() ?? ''
}

export function registerAuditCodeEditorSelectionGetter(pageId: string, getter: GetEditorSelection): () => void {
  selectionGetters.set(pageId, getter)
  return () => {
    if (selectionGetters.get(pageId) === getter) {
      selectionGetters.delete(pageId)
    }
  }
}

export function setAuditCodeLiveEditorSelection(sel: ReturnType<GetEditorSelection>): void {
  liveEditorSelection = sel
}

export function getAuditCodeEditorSelection(pageId: string) {
  if (liveEditorSelection?.content?.trim()) return liveEditorSelection
  return selectionGetters.get(pageId)?.() ?? null
}

/**
 * 将「规则编写」草稿与当前编辑器选区附到 AIInputEvent.AttachedResourceInfo
 */
export function appendAuditCodeRuleGenContextToEvent(pageId: string, event: AIInputEvent): AIInputEvent {
  const existing = event.AttachedResourceInfo || []
  let next: AttachedResourceInfo[] = existing.filter(
    (item) => item.Key !== AttachedResourceKeyEnum.CONTEXT_PROVIDER_KEY_SYNTAXFLOW_RULE,
  )

  const draft = getAuditCodeRuleEditorString(pageId).trim()
  if (draft) {
    next = [
      ...next,
      {
        Type: AttachedResourceTypeEnum.CONTEXT_PROVIDER_TYPE_CODE_BLOCK_Content,
        Key: AttachedResourceKeyEnum.CONTEXT_PROVIDER_KEY_SYNTAXFLOW_RULE,
        Value: draft,
      },
    ]
  }

  const hasSelectedContent = next.some(
    (item) => item.Key === AttachedResourceKeyEnum.CONTEXT_PROVIDER_TYPE_CODE_BLOCK_Content,
  )
  if (!hasSelectedContent) {
    const sel = getAuditCodeEditorSelection(pageId)
    if (sel?.content?.trim()) {
      next = [
        ...next,
        {
          Type: AttachedResourceTypeEnum.CONTEXT_PROVIDER_TYPE_CODE_BLOCK_Content,
          Key: AttachedResourceKeyEnum.CONTEXT_PROVIDER_TYPE_CODE_BLOCK_Content,
          Value: JSON.stringify({
            path: sel.path,
            startLine: sel.startLine,
            endLine: sel.endLine,
            language: sel.language,
            content: sel.content,
          }),
        },
      ]
    }
  }

  return { ...event, AttachedResourceInfo: next }
}

export function normalizeSyntaxFlowCodeChangeContent(
  data: AIAgentGrpcApi.CodeChange,
): AIAgentGrpcApi.CodeChange {
  const content = unescapeLikelyJsonEscapedText(String(data?.code?.content ?? ''))
  const patch = data?.code?.patch
  if (!patch) {
    return {
      ...data,
      code: {
        ...data.code,
        content,
      },
    }
  }
  const oldSnippet =
    patch.old_snippet != null ? unescapeLikelyJsonEscapedText(String(patch.old_snippet)) : patch.old_snippet
  return {
    ...data,
    code: {
      ...data.code,
      content,
      patch: {
        ...patch,
        old_snippet: oldSnippet,
      },
    },
  }
}

/** 打开底部「规则编写」面板（不直接改内容；内容经 diff 审阅确认后写入） */
export function openAuditCodeRuleEditorPanel(): void {
  emiter.emit('onCodeAuditOpenBottomDetail', JSON.stringify({ type: 'ruleEditor' }))
}

/**
 * 将确认后的规则写入底部「规则编写」
 */
export function applyAcceptedSyntaxFlowRuleToAuditCode(content: string): void {
  const next = unescapeLikelyJsonEscapedText(String(content ?? ''))
  emiter.emit('onResetAuditRule', next)
  openAuditCodeRuleEditorPanel()
}

/** @deprecated 保留兼容：直接覆盖（无 diff）。新路径请走审阅队列。 */
export function applySyntaxFlowRuleChangeToAuditCode(data: AIAgentGrpcApi.CodeChange): void {
  const normalized = normalizeSyntaxFlowCodeChangeContent(data)
  const content = normalized?.code?.content
  if (content == null || String(content).trim() === '') return
  applyAcceptedSyntaxFlowRuleToAuditCode(String(content))
}

/** 入队规则编写 diff 审阅（复用 Yak Runner overlay 协议） */
export function enqueueAuditCodeRuleReplaceReview(payload: YakRunnerCasualCodeReplaceReviewPayload): void {
  openAuditCodeRuleEditorPanel()
  enqueueYakRunnerCasualCodeReplaceReview(AUDIT_CODE_RULE_GEN_AI_PAGE_ID, {
    ...payload,
    language: payload.language || 'sf',
    fileName: payload.fileName || 'rule.sf',
  })
}
