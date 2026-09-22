import { describe, expect, it } from 'vitest'
import type { AIAgentGrpcApi } from '@/pages/ai-re-act/hooks/grpcApi'
import { isConsumptionPerfChanged } from '../utils'

const createConsumption = (): AIAgentGrpcApi.Consumption => ({
  input_consumption: 10,
  output_consumption: 5,
  cache_hit_token: 2,
  consumption_uuid: 'consumption-id',
  tier_consumption: {},
})

describe('isConsumptionPerfChanged', () => {
  it('总量不变时仍能识别运行模式和模型明细变化', () => {
    const previous = createConsumption()
    const next: AIAgentGrpcApi.Consumption = {
      ...createConsumption(),
      effective_single_model_mode: true,
      tier_model_consumption: {
        lightweight: [
          {
            provider_type: 'openai',
            model_name: 'gpt-5',
            thinking_level: 'none',
            input_consumption: 10,
            output_consumption: 5,
            cache_hit_token: 2,
          },
        ],
      },
    }

    expect(isConsumptionPerfChanged(previous, next)).toBe(true)
    expect(isConsumptionPerfChanged(next, structuredClone(next))).toBe(false)
  })
})
