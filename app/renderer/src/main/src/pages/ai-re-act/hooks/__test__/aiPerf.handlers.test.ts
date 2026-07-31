import { describe, it, expect } from 'vitest'
import { aiPerfDataHandlers } from '../grpcStreamHandler/aiPerf'
import { AIModelTypeEnum } from '@/pages/ai-agent/defaultConstant'
import { makeGrpcJsonRes, makeHandlerRequest } from './fixtures'

describe('aiPerf handlers', () => {
  it('D9: consumption updates rawData', () => {
    const req = makeHandlerRequest({
      res: makeGrpcJsonRes('consumption', {
        input_consumption: 10,
        output_consumption: 20,
        cache_hit_token: 1,
        tier_consumption: {},
      }),
    })
    aiPerfDataHandlers.consumption(req)
    expect(req.rawData.aiPerfData.consumption.input_consumption).toBe(10)
    expect(req.rawData.aiPerfData.consumption.output_consumption).toBe(20)
  })

  it('D9: pressure / first / total cost append', () => {
    const pressureReq = makeHandlerRequest({
      res: makeGrpcJsonRes('pressure', {
        model_tier: AIModelTypeEnum.TierLightweight,
        current_pressure: 1,
      }),
    })
    aiPerfDataHandlers.pressure(pressureReq)
    expect(pressureReq.rawData.aiPerfData.pressure[AIModelTypeEnum.TierLightweight].length).toBe(1)

    const firstReq = makeHandlerRequest({
      res: makeGrpcJsonRes('ai_first_byte_cost_ms', {
        model_tier: AIModelTypeEnum.TierLightweight,
        cost_ms: 5,
      }),
    })
    aiPerfDataHandlers.ai_first_byte_cost_ms(firstReq)
    expect(firstReq.rawData.aiPerfData.firstCost[AIModelTypeEnum.TierLightweight].length).toBe(1)

    const totalReq = makeHandlerRequest({
      res: makeGrpcJsonRes('ai_total_cost_ms', {
        model_tier: AIModelTypeEnum.TierLightweight,
        cost_ms: 9,
      }),
    })
    aiPerfDataHandlers.ai_total_cost_ms(totalReq)
    expect(totalReq.rawData.aiPerfData.totalCost[AIModelTypeEnum.TierLightweight].length).toBe(1)

    expect(typeof aiPerfDataHandlers.prompt_profile).toBe('function')
  })
})
