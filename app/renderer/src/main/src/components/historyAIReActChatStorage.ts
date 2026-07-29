import { AIAgentSettingDefault } from '@/pages/ai-agent/defaultConstant'
import { RemoteAIAgentGV } from '@/enums/aiAgent'
import { AIStartParams } from '@/pages/ai-re-act/hooks/grpcApi'
import { getRemoteValue, setRemoteValue } from '@/utils/kv'

const DEFAULT_HISTORY_AI_REVIEW_POLICY: NonNullable<AIStartParams['ReviewPolicy']> =
  AIAgentSettingDefault.ReviewPolicy ?? 'manual'

const VALID_REVIEW_POLICIES: NonNullable<AIStartParams['ReviewPolicy']>[] = ['manual', 'yolo', 'ai']

function isValidReviewPolicy(value: string): value is NonNullable<AIStartParams['ReviewPolicy']> {
  return VALID_REVIEW_POLICIES.includes(value as NonNullable<AIStartParams['ReviewPolicy']>)
}

export async function getHistoryAIReviewPolicy(): Promise<NonNullable<AIStartParams['ReviewPolicy']>> {
  try {
    const res = await getRemoteValue(RemoteAIAgentGV.HistoryAIReviewPolicy)
    if (!res) return DEFAULT_HISTORY_AI_REVIEW_POLICY
    if (!isValidReviewPolicy(res)) return DEFAULT_HISTORY_AI_REVIEW_POLICY
    return res
  } catch {
    return DEFAULT_HISTORY_AI_REVIEW_POLICY
  }
}

export function setHistoryAIReviewPolicy(policy: NonNullable<AIStartParams['ReviewPolicy']>) {
  return setRemoteValue(RemoteAIAgentGV.HistoryAIReviewPolicy, policy)
}

export async function loadHistoryAIEmbeddedReviewPolicy(): Promise<NonNullable<AIStartParams['ReviewPolicy']>> {
  return getHistoryAIReviewPolicy()
}
