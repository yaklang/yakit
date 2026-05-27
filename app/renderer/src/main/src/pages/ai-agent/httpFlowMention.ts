import { HTTPFlow } from '@/components/HTTPFlowTable/HTTPFlowTable'
import { AIMentionCommandParams } from './components/aiMilkdownInput/aiMilkdownMention/aiMentionPlugin'

export const MAX_HTTP_FLOW_MENTION_COUNT = 10

export const normalizeHttpFlowId = (id: unknown): number | null => {
  const num = typeof id === 'number' ? id : Number(String(id ?? '').trim())
  if (!Number.isFinite(num) || num <= 0) {
    return null
  }
  return num
}

export const buildHttpFlowMentionPayload = (flowIds: number[]) => {
  return JSON.stringify({ ids: flowIds })
}

export const formatHttpFlowMentionLabel = (flows: HTTPFlow[]) => {
  return flows
    .map((flow) => flow.Id)
    .filter((id) => id > 0)
    .map((id) => `#${id}`)
    .join(', ')
}

export const buildHttpFlowMentionFromFlows = (flows: HTTPFlow[]): AIMentionCommandParams | null => {
  if (!flows?.length || flows.length > MAX_HTTP_FLOW_MENTION_COUNT) {
    return null
  }

  const flowIds = flows.map((flow) => normalizeHttpFlowId(flow.Id)).filter((id): id is number => id !== null)
  if (!flowIds.length) {
    return null
  }

  return {
    mentionType: 'httpFlow',
    mentionId: buildHttpFlowMentionPayload(flowIds),
    mentionName: formatHttpFlowMentionLabel(flows),
  }
}
