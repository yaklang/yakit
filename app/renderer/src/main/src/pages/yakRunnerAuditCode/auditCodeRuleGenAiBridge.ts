import type { AIAgentGrpcApi, AIInputEvent, AttachedResourceInfo } from '@/pages/ai-re-act/hooks/grpcApi'
import { AttachedResourceKeyEnum, AttachedResourceTypeEnum } from '@/pages/ai-agent/defaultConstant'
import emiter from '@/utils/eventBus/eventBus'
import { AUDIT_CODE_RULE_GEN_AI_PAGE_ID } from '@/constants/focusMode'

export { AUDIT_CODE_RULE_GEN_AI_PAGE_ID }

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

export function registerAuditCodeRuleEditorGetter(pageId: string, getter: GetRuleEditor): () => void {
  ruleEditorGetters.set(pageId, getter)
  return () => {
    if (ruleEditorGetters.get(pageId) === getter) {
      ruleEditorGetters.delete(pageId)
    }
  }
}

export function getAuditCodeRuleEditorString(pageId: string): string {
  return ruleEditorGetters.get(pageId)?.()?.trim() ?? ''
}

export function registerAuditCodeEditorSelectionGetter(pageId: string, getter: GetEditorSelection): () => void {
  selectionGetters.set(pageId, getter)
  return () => {
    if (selectionGetters.get(pageId) === getter) {
      selectionGetters.delete(pageId)
    }
  }
}

export function getAuditCodeEditorSelection(pageId: string) {
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

  const draft = getAuditCodeRuleEditorString(pageId)
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
    (item) =>
      item.Type === AttachedResourceTypeEnum.CONTEXT_PROVIDER_TYPE_CODE_BLOCK_Content &&
      item.Key === AttachedResourceKeyEnum.CONTEXT_PROVIDER_TYPE_CODE_BLOCK_Content,
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

/** 将 AI 生成的完整规则直接写入底部「规则编写」并打开面板 */
export function applySyntaxFlowRuleChangeToAuditCode(data: AIAgentGrpcApi.YaklangCodeChange): void {
  // 规则生成不走 patch：优先用全文 content；patch 场景也用 content（已是片段时仍覆盖草稿）
  const content = data?.code?.content
  if (content == null || String(content).trim() === '') return

  emiter.emit('onResetAuditRule', String(content))
  emiter.emit('onCodeAuditOpenBottomDetail', JSON.stringify({ type: 'ruleEditor' }))
}
