import type { BrowserTransformValidatedSuggestion, TransformProfileInput } from './browserTransformTypes'

export const BROWSER_TRANSFORM_AGENT_CONTRACT_VERSION = 1
export const BROWSER_TRANSFORM_VALIDATION_DRAFT_MAX_BYTES = 256 * 1_024

export interface BrowserCryptoValidationDraft {
  contractVersion: typeof BROWSER_TRANSFORM_AGENT_CONTRACT_VERSION
  id: string
  profile: TransformProfileInput
  proofLevel: BrowserTransformValidatedSuggestion['proofLevel']
  comparison?: {
    mode: 'structure' | 'exact'
    equivalent: boolean
    summary: string
  }
  createdAt: number
  expiresAt: number
}

export interface BrowserTransformValidationContext {
  target: { tabId: number; frameId: number; documentId?: string }
  startedAt: number
  now: number
}

export interface BrowserTransformSelectionContract {
  deviceId: string
  profileId: string
  profileName: string
  browserName?: string
  origin?: string
  maxConcurrency?: number
}

export interface BrowserTransformSelectableDevice {
  id: string
  name: string
}

export interface BrowserTransformSelectableProfile {
  id: string
  name: string
  origin: string
  maxConcurrency: number
}

export function browserTransformValidationRejection(
  draft: BrowserCryptoValidationDraft,
  context: BrowserTransformValidationContext,
): string | undefined {
  if (draft.contractVersion !== BROWSER_TRANSFORM_AGENT_CONTRACT_VERSION) {
    return '验证草稿契约版本不受支持'
  }
  if (new TextEncoder().encode(JSON.stringify(draft)).byteLength > BROWSER_TRANSFORM_VALIDATION_DRAFT_MAX_BYTES) {
    return '验证草稿超过大小上限'
  }
  if (!draft.id.trim()) return '验证草稿缺少 ID'
  if (draft.createdAt < context.startedAt) return '验证草稿早于当前 AI 分析任务'
  if (draft.expiresAt <= context.now) return '验证草稿已经过期'
  if (draft.profile.id) return '验证草稿不能引用已持久化 Profile'
  if (draft.profile.failMode !== 'closed') return '验证草稿必须使用失败关闭模式'
  if (draft.comparison && !draft.comparison.equivalent) return '验证草稿的数据包证明未通过'

  const expected = context.target
  const actual = draft.profile.target
  if (actual.tabId !== expected.tabId || actual.frameId !== expected.frameId) {
    return '验证草稿不属于当前分析页面'
  }
  if (expected.documentId && actual.documentId !== expected.documentId) {
    return '验证草稿所属文档已经变化'
  }
  return undefined
}

export function toBrowserTransformValidatedSuggestion(
  draft: BrowserCryptoValidationDraft,
  revision: number,
): BrowserTransformValidatedSuggestion {
  return {
    revision,
    draftId: draft.id,
    profile: draft.profile,
    proofLevel: draft.proofLevel,
    comparisonSummary: draft.comparison?.summary,
  }
}

export function toBrowserTransformSelection(
  device: BrowserTransformSelectableDevice,
  profile: BrowserTransformSelectableProfile,
): BrowserTransformSelectionContract {
  return {
    deviceId: device.id,
    profileId: profile.id,
    profileName: profile.name,
    browserName: device.name,
    origin: profile.origin,
    maxConcurrency: profile.maxConcurrency,
  }
}

export function browserTransformRequestFields(
  selection?: Pick<BrowserTransformSelectionContract, 'deviceId' | 'profileId'>,
): { BrowserExtensionDeviceId?: string; BrowserTransformProfileId?: string } {
  if (!selection) return {}
  return {
    BrowserExtensionDeviceId: selection.deviceId,
    BrowserTransformProfileId: selection.profileId,
  }
}
