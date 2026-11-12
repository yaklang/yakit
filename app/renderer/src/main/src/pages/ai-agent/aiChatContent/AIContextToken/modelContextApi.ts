import type { AIAgentGrpcApi } from '@/pages/ai-re-act/hooks/grpcApi'

export interface ModelContextIdentity {
  provider: string
  model: string
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
      ...(threshold === undefined ? {} : { ThresholdTokens: threshold }),
      ...(disableAutoAdjust === undefined ? {} : { DisableAutoAdjust: disableAutoAdjust }),
    },
  )
  return {
    provider: result.Provider,
    model: result.Model,
    context_tokens: Number(result.ContextTokens),
    threshold_tokens: Number(result.ThresholdTokens),
    minimum_threshold_tokens: Number(result.MinimumThresholdTokens),
    source: result.Source,
    disable_auto_adjust: !!result.DisableAutoAdjust,
    too_small: result.TooSmall,
    prompt_tokens: 0,
    pending: false,
  }
}
