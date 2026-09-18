import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/pages/ai-agent/defaultConstant', () => ({
  AttachedResourceKeyEnum: {
    CONTEXT_PROVIDER_KEY_SYNTAXFLOW_RULE: 'syntaxflow_rule',
    CONTEXT_PROVIDER_TYPE_CODE_BLOCK_Content: 'content',
  },
  AttachedResourceTypeEnum: {
    CONTEXT_PROVIDER_TYPE_CODE_BLOCK_Content: 'selected',
  },
}))

vi.mock('@/utils/eventBus/eventBus', () => ({
  default: { emit: vi.fn(), on: vi.fn(), off: vi.fn() },
}))

vi.mock('@/pages/yakRunner/yakRunnerAiCodeApplyBridge', () => ({
  enqueueYakRunnerCasualCodeReplaceReview: vi.fn(),
}))

vi.mock('@/constants/focusMode', () => ({
  AUDIT_CODE_RULE_GEN_AI_PAGE_ID: 'audit-code-rule-gen-test',
}))

import { AttachedResourceKeyEnum, AttachedResourceTypeEnum } from '@/pages/ai-agent/defaultConstant'
import type { AIAgentGrpcApi, AIInputEvent } from '@/pages/ai-re-act/hooks/grpcApi'
import emiter from '@/utils/eventBus/eventBus'
import {
  appendAuditCodeRuleGenContextToEvent,
  emitAuditCodeRuleGenSendCodeBlock,
  getAuditCodeEditorSelection,
  normalizeSyntaxFlowCodeChangeContent,
  registerAuditCodeEditorSelectionGetter,
  registerAuditCodeRuleEditorGetter,
  setAuditCodeLiveEditorSelection,
  takePendingAuditCodeRuleGenSendCodeBlock,
} from '../auditCodeRuleGenAiBridge'

const pageId = 'audit-code-rule-gen-test'

afterEach(() => {
  setAuditCodeLiveEditorSelection(null)
  takePendingAuditCodeRuleGenSendCodeBlock()
  vi.clearAllMocks()
})

describe('appendAuditCodeRuleGenContextToEvent', () => {
  it('replaces syntaxflow_rule draft and keeps an existing selected-code attachment', () => {
    const unregDraft = registerAuditCodeRuleEditorGetter(pageId, () => 'rule next {}')
    const event = {
      AttachedResourceInfo: [
        {
          Type: AttachedResourceTypeEnum.CONTEXT_PROVIDER_TYPE_CODE_BLOCK_Content,
          Key: AttachedResourceKeyEnum.CONTEXT_PROVIDER_KEY_SYNTAXFLOW_RULE,
          Value: 'rule old {}',
        },
        {
          Type: AttachedResourceTypeEnum.CONTEXT_PROVIDER_TYPE_CODE_BLOCK_Content,
          Key: AttachedResourceKeyEnum.CONTEXT_PROVIDER_TYPE_CODE_BLOCK_Content,
          Value: 'already-selected',
        },
      ],
    } as AIInputEvent

    const next = appendAuditCodeRuleGenContextToEvent(pageId, event)
    const rules = next.AttachedResourceInfo?.filter(
      (item) => item.Key === AttachedResourceKeyEnum.CONTEXT_PROVIDER_KEY_SYNTAXFLOW_RULE,
    )
    const selected = next.AttachedResourceInfo?.filter(
      (item) => item.Key === AttachedResourceKeyEnum.CONTEXT_PROVIDER_TYPE_CODE_BLOCK_Content,
    )
    expect(rules).toHaveLength(1)
    expect(rules?.[0].Value).toBe('rule next {}')
    expect(selected).toHaveLength(1)
    expect(selected?.[0].Value).toBe('already-selected')
    unregDraft()
  })

  it('appends live selection when none is attached', () => {
    setAuditCodeLiveEditorSelection({
      path: '/a.php',
      language: 'php',
      startLine: 2,
      endLine: 3,
      content: 'echo 1;',
    })
    const next = appendAuditCodeRuleGenContextToEvent(pageId, { AttachedResourceInfo: [] } as AIInputEvent)
    const selected = next.AttachedResourceInfo?.find(
      (item) => item.Key === AttachedResourceKeyEnum.CONTEXT_PROVIDER_TYPE_CODE_BLOCK_Content,
    )
    expect(selected?.Value).toContain('echo 1;')
    expect(getAuditCodeEditorSelection(pageId)?.content).toBe('echo 1;')
  })
})

describe('normalizeSyntaxFlowCodeChangeContent', () => {
  it('unescapes content and patch old_snippet', () => {
    const data = {
      op: 'patch',
      code: {
        content: 'rule x {\\n  a\\n}',
        version: 1,
        patch: {
          kind: 'snippet',
          old_snippet: 'old {\\n  b\\n}',
        },
      },
    } as AIAgentGrpcApi.SyntaxFlowRuleChange
    const normalized = normalizeSyntaxFlowCodeChangeContent(data)
    expect(normalized.code.content).toBe('rule x {\n  a\n}')
    expect(normalized.code.patch?.old_snippet).toBe('old {\n  b\n}')
  })
})

describe('getAuditCodeEditorSelection', () => {
  it('prefers live monaco selection over the registered getter', () => {
    const unreg = registerAuditCodeEditorSelectionGetter(pageId, () => ({ content: 'stale' }))
    setAuditCodeLiveEditorSelection({ content: 'live-sel' })
    expect(getAuditCodeEditorSelection(pageId)?.content).toBe('live-sel')
    unreg()
  })
})

describe('emitAuditCodeRuleGenSendCodeBlock', () => {
  it('stashes payload then opens the rule-generate tab before emitting the send event', () => {
    const payload = '{"type":"codeBlockTag"}'
    emitAuditCodeRuleGenSendCodeBlock(payload)
    const events = vi.mocked(emiter.emit).mock.calls.map((call) => call[0])
    expect(events).toContain('onCodeAuditOpenRuleGenerateTab')
    expect(emiter.emit).toHaveBeenCalledWith('onAuditCodeRuleGenSendCodeBlock', payload)
    expect(events.indexOf('onCodeAuditOpenRuleGenerateTab')).toBeLessThan(
      events.indexOf('onAuditCodeRuleGenSendCodeBlock'),
    )
    expect(takePendingAuditCodeRuleGenSendCodeBlock()).toBe(payload)
    expect(takePendingAuditCodeRuleGenSendCodeBlock()).toBeNull()
  })
})
