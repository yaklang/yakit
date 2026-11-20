import type { AIModelConfig } from '../aiModelList/utils'

export interface GetAIModelContextRequest {
  Provider?: string
  Model?: string
  Config?: AIModelConfig
  ContextKey?: string
}

export interface SetAIModelContextRequest extends GetAIModelContextRequest {
  ThresholdTokens: number
  DisableAutoAdjust?: boolean
}

export interface AIModelContextResponse {
  Provider: string
  Model: string
  ContextKey: string
  ThresholdTokens: number | string
  MinimumThresholdTokens: number | string
  Source: 'default' | 'manual' | 'learned'
  DisableAutoAdjust: boolean
}
