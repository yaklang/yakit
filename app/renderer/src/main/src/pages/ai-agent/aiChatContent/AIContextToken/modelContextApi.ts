import type { AIModelConfig } from '@/pages/ai-agent/aiModelList/utils'
import type { AIAgentGrpcApi } from '@/pages/ai-re-act/hooks/grpcApi'

export interface ModelContextIdentity {
  provider: string
  model: string
  context_key?: string
  config?: AIModelConfig
}

const { ipcRenderer } = window.require('electron')

export async function requestModelContext(
  identity: ModelContextIdentity,
  threshold?: number,
  disableAutoAdjust?: boolean,
): Promise<AIAgentGrpcApi.ModelContext> {
  const result = await ipcRenderer.invoke(
    threshold === undefined && disableAutoAdjust === undefined ? 'GetAIModelContext' : 'SetAIModelContext',
    {
      Provider: identity.provider,
      Model: identity.model,
      ...(identity.context_key ? { ContextKey: identity.context_key } : {}),
      ...(identity.config ? { Config: identity.config } : {}),
      ...(threshold === undefined ? {} : { ThresholdTokens: threshold }),
      ...(disableAutoAdjust === undefined ? {} : { DisableAutoAdjust: disableAutoAdjust }),
    },
  )
  return {
    provider: result.Provider,
    model: result.Model,
    context_key: result.ContextKey,
    threshold_tokens: Number(result.ThresholdTokens),
    minimum_threshold_tokens: Number(result.MinimumThresholdTokens),
    source: result.Source,
    disable_auto_adjust: !!result.DisableAutoAdjust,
    prompt_tokens: 0,
    pending: false,
  }
}
