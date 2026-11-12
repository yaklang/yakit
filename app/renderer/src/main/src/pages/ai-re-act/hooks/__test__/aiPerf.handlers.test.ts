import { describe, it, expect, vi, beforeEach } from 'vitest'
import { yakitNotify } from '@/utils/notification'
vi.mock('@/utils/notification', () => ({ yakitNotify: vi.fn() }))
vi.mock('@/i18n/i18n', () => ({
  default: {
    getFixedT: () => (key: string, args?: Record<string, string>) =>
      args ? `${key} ${args.previous}→${args.threshold}` : key,
  },
}))
import { aiPerfDataHandlers } from '../grpcStreamHandler/aiPerf'
import { AIModelTypeEnum } from '@/pages/ai-agent/defaultConstant'
import { makeGrpcJsonRes, makeHandlerRequest } from './fixtures'

describe('aiPerf handlers', () => {
  beforeEach(() => vi.mocked(yakitNotify).mockClear())
  it('keeps all retries quiet, announces the complete adjustment once after success and silently restores replay', () => {
    const data = {
      provider: 'test',
      model: 'main',
      context_tokens: 250 * 1024,
      threshold_tokens: 300 * 1024,
      prompt_tokens: 350 * 1024,
      source: 'learned',
      pending: true,
      too_small: false,
      change: {
        id: 'retry-1',
        reason: 'overflow',
        previous_threshold_tokens: 500 * 1024,
        threshold_tokens: 300 * 1024,
      },
    }
    const req = makeHandlerRequest({ res: makeGrpcJsonRes('model_context', data) })
    aiPerfDataHandlers.model_context(req)
    aiPerfDataHandlers.model_context(req)
    req.res = makeGrpcJsonRes('model_context', {
      ...data,
      threshold_tokens: 200 * 1024,
      change: { ...data.change, id: 'retry-2', previous_threshold_tokens: 300 * 1024, threshold_tokens: 200 * 1024 },
    })
    aiPerfDataHandlers.model_context(req)
    expect(yakitNotify).not.toHaveBeenCalled()
    expect(req.rawData.aiPerfData.modelContext?.threshold_tokens).toBe(200 * 1024)
    req.res = makeGrpcJsonRes('model_context', {
      ...data,
      threshold_tokens: 200 * 1024,
      pending: false,
      change: {
        id: 'confirmed-1',
        reason: 'confirmed',
        previous_threshold_tokens: 500 * 1024,
        threshold_tokens: 200 * 1024,
      },
    })
    aiPerfDataHandlers.model_context(req)
    aiPerfDataHandlers.model_context(req)
    expect(yakitNotify).toHaveBeenCalledExactlyOnceWith('info', 'AIContextToken.contextChange.confirmed 500K→200K')
    const replay = makeHandlerRequest({ res: { ...req.res, IsSync: true } })
    aiPerfDataHandlers.model_context(replay)
    replay.res = { ...replay.res, IsSync: false }
    aiPerfDataHandlers.model_context(replay)
    expect(replay.rawData.aiPerfData.modelContext?.pending).toBe(false)
    expect(yakitNotify).toHaveBeenCalledTimes(1)
  })

  it('keeps manual edits silent and announces a new successful recovery independently', () => {
    const data = {
      provider: 'test',
      model: 'main',
      context_tokens: 250 * 1024,
      threshold_tokens: 500 * 1024,
      prompt_tokens: 0,
      source: 'manual',
      pending: false,
      too_small: false,
      change: { id: 'manual-1', reason: 'manual', previous_threshold_tokens: 200 * 1024, threshold_tokens: 500 * 1024 },
    }
    const req = makeHandlerRequest({ res: makeGrpcJsonRes('model_context', data) })
    aiPerfDataHandlers.model_context(req)
    expect(yakitNotify).not.toHaveBeenCalled()
    for (const [provider, id] of [
      ['test', 'confirmed-2'],
      ['other', 'confirmed-3'],
    ]) {
      req.res = makeGrpcJsonRes('model_context', {
        ...data,
        provider,
        source: 'learned',
        threshold_tokens: 200 * 1024,
        change: { id, reason: 'confirmed', previous_threshold_tokens: 1000 * 1024, threshold_tokens: 200 * 1024 },
      })
      aiPerfDataHandlers.model_context(req)
      aiPerfDataHandlers.model_context(req)
    }
    expect(yakitNotify).toHaveBeenCalledTimes(2)
    expect(yakitNotify).toHaveBeenLastCalledWith('info', 'AIContextToken.contextChange.confirmed 1M→200K')
  })

  it('still warns once when an automatically discovered model is smaller than the global floor', () => {
    const req = makeHandlerRequest({
      res: makeGrpcJsonRes('model_context', {
        provider: 'test',
        model: 'small',
        context_tokens: 64 * 1024,
        threshold_tokens: 51 * 1024,
        prompt_tokens: 60000,
        source: 'learned',
        pending: true,
        too_small: true,
        change: {
          id: 'small-overflow',
          reason: 'overflow',
          previous_threshold_tokens: 500 * 1024,
          threshold_tokens: 51 * 1024,
        },
      }),
    })
    aiPerfDataHandlers.model_context(req)
    aiPerfDataHandlers.model_context(req)
    expect(yakitNotify).toHaveBeenCalledExactlyOnceWith('warning', 'AIContextToken.contextTooSmall')
  })

  it('updates learned context and preserves usage only for the same model on a hotpatch', () => {
    const data = {
      provider: 'openai',
      model: 'main',
      context_tokens: 128000,
      threshold_tokens: 102400,
      prompt_tokens: 90000,
      source: 'learned',
      pending: false,
      too_small: false,
    }
    const req = makeHandlerRequest({ res: makeGrpcJsonRes('model_context', data) })
    aiPerfDataHandlers.model_context(req)
    expect(req.rawData.aiPerfData.modelContext).toEqual(data)
    req.res = makeGrpcJsonRes('model_context', {
      ...data,
      threshold_tokens: 110000,
      prompt_tokens: 0,
      source: 'manual',
    })
    aiPerfDataHandlers.model_context(req)
    expect(req.rawData.aiPerfData.modelContext?.prompt_tokens).toBe(90000)
    req.res = makeGrpcJsonRes('model_context', { ...data, model: 'other', prompt_tokens: 0 })
    aiPerfDataHandlers.model_context(req)
    expect(req.rawData.aiPerfData.modelContext?.prompt_tokens).toBe(0)
  })
  it('D9: consumption updates rawData', () => {
    const req = makeHandlerRequest({
      res: {
        ...makeGrpcJsonRes('consumption', {
          input_consumption: 10,
          output_consumption: 20,
          cache_hit_token: 1,
          consumption_uuid: 'consumption-id',
          effective_single_model_mode: true,
          tier_consumption: {},
          tier_model_consumption: {
            lightweight: [
              {
                provider_type: 'openai',
                model_name: 'gpt-5',
                thinking_level: 'none',
                input_consumption: 10,
                output_consumption: 20,
                cache_hit_token: 1,
              },
            ],
          },
        }),
        IsSync: true,
        SyncID: 'sync-consumption',
      },
    })
    aiPerfDataHandlers.consumption(req)
    expect(req.rawData.aiPerfData.consumption.input_consumption).toBe(10)
    expect(req.rawData.aiPerfData.consumption.output_consumption).toBe(20)
    expect(req.rawData.aiPerfData.consumption.consumption_uuid).toBe('consumption-id')
    expect(req.rawData.aiPerfData.consumption.effective_single_model_mode).toBe(true)
    expect(req.rawData.aiPerfData.consumption.tier_model_consumption?.lightweight?.[0]).toMatchObject({
      model_name: 'gpt-5',
      thinking_level: 'none',
    })
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
