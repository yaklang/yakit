import { describe, expect, it } from 'vitest'
import type { TransformProfileInput } from '../browserTransformTypes'
import {
  BROWSER_TRANSFORM_AGENT_CONTRACT_VERSION,
  BROWSER_TRANSFORM_VALIDATION_DRAFT_MAX_BYTES,
  browserTransformRequestFields,
  browserTransformValidationRejection,
  toBrowserTransformSelection,
  toBrowserTransformValidatedSuggestion,
  type BrowserCryptoValidationDraft,
} from '../browserTransformContract'

const profile: TransformProfileInput = {
  name: 'AES + RSA gateway',
  enabled: true,
  target: { tabId: 7, frameId: 0, documentId: 'document-1' },
  origin: 'https://example.test',
  match: { methods: ['POST'], urlPattern: '*/encrypt/aesrsa.php' },
  request: {
    enabled: true,
    nodes: [
      { id: 'input', name: 'Plain body', kind: 'context.read', path: 'body' },
      {
        id: 'call',
        name: 'Captured transaction',
        kind: 'page.call',
        callableId: 'callable-1',
        arguments: [{ nodeId: 'input' }],
      },
      {
        id: 'output',
        name: 'Wire body',
        kind: 'output.write',
        destination: 'body',
        source: { nodeId: 'call' },
        encoding: 'json',
      },
    ],
  },
  response: { enabled: false, nodes: [] },
  failMode: 'closed',
  maxConcurrency: 1,
}

function validationDraft(overrides: Partial<BrowserCryptoValidationDraft> = {}): BrowserCryptoValidationDraft {
  return {
    contractVersion: BROWSER_TRANSFORM_AGENT_CONTRACT_VERSION,
    id: 'validation-1',
    profile,
    proofLevel: 'structure',
    comparison: { mode: 'structure', equivalent: true, summary: 'request structure matched' },
    createdAt: 2_000,
    expiresAt: 20_000,
    ...overrides,
  }
}

describe('browser transform Agent contract', () => {
  it('accepts only the current unpersisted document-bound validation draft', () => {
    const context = {
      target: { tabId: 7, frameId: 0, documentId: 'document-1' },
      startedAt: 1_000,
      now: 3_000,
    }
    expect(BROWSER_TRANSFORM_AGENT_CONTRACT_VERSION).toBe(1)
    expect(browserTransformValidationRejection(validationDraft(), context)).toBeUndefined()
    expect(
      browserTransformValidationRejection(
        validationDraft({
          contractVersion: 2 as 1,
        }),
        context,
      ),
    ).toBe('验证草稿契约版本不受支持')
    expect(browserTransformValidationRejection(validationDraft({ createdAt: 999 }), context)).toBe(
      '验证草稿早于当前 AI 分析任务',
    )
    expect(browserTransformValidationRejection(validationDraft({ expiresAt: 3_000 }), context)).toBe('验证草稿已经过期')
    expect(
      browserTransformValidationRejection(
        validationDraft({
          profile: { ...profile, id: 'saved-profile' },
        }),
        context,
      ),
    ).toBe('验证草稿不能引用已持久化 Profile')
    expect(
      browserTransformValidationRejection(
        validationDraft({
          profile: { ...profile, target: { ...profile.target, documentId: 'document-2' } },
        }),
        context,
      ),
    ).toBe('验证草稿所属文档已经变化')
    expect(
      browserTransformValidationRejection(
        validationDraft({
          comparison: { mode: 'structure', equivalent: false, summary: 'mismatch' },
        }),
        context,
      ),
    ).toBe('验证草稿的数据包证明未通过')
    expect(
      browserTransformValidationRejection(
        validationDraft({
          profile: {
            ...profile,
            name: 'x'.repeat(BROWSER_TRANSFORM_VALIDATION_DRAFT_MAX_BYTES),
          },
        }),
        context,
      ),
    ).toBe('验证草稿超过大小上限')
  })

  it('preserves the proof when Yakit hands a validated draft to the confirmation workspace', () => {
    expect(toBrowserTransformValidatedSuggestion(validationDraft(), 4)).toEqual({
      revision: 4,
      draftId: 'validation-1',
      profile,
      proofLevel: 'structure',
      comparisonSummary: 'request structure matched',
    })
  })

  it('maps the confirmed profile to the exact Web Fuzzer request identifiers', () => {
    const selection = toBrowserTransformSelection(
      { id: 'browser-1', name: 'Chrome Browser' },
      { id: 'profile-1', name: profile.name, origin: profile.origin, maxConcurrency: 1 },
    )
    expect(selection).toMatchObject({
      deviceId: 'browser-1',
      profileId: 'profile-1',
      profileName: profile.name,
    })
    expect(browserTransformRequestFields(selection)).toEqual({
      BrowserExtensionDeviceId: 'browser-1',
      BrowserTransformProfileId: 'profile-1',
    })
    expect(browserTransformRequestFields()).toEqual({})
  })
})
