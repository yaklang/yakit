import { describe, expect, it } from 'vitest'
import type { AIAgentGrpcApi } from '@/pages/ai-re-act/hooks/grpcApi'
import type { AIAgentChatData } from '../../../type/aiChat'
import { isConsumptionPerfChanged, isPerfDataChanged, isTierModelConsumptionChanged } from '../utils'

const createConsumption = (): AIAgentGrpcApi.Consumption => ({
  input_consumption: 10,
  output_consumption: 5,
  cache_hit_token: 2,
  consumption_uuid: 'consumption-id',
  tier_consumption: {},
})

it('单独收到模型阈值更新也会刷新详情图，不依赖新的压力采样', () => {
  const previous = {
    modelContext: {
      provider: 'openai',
      model: 'main',
      threshold_tokens: 500 * 1024,
      prompt_tokens: 58000,
      source: 'manual',
      pending: false,
    },
  } as AIAgentChatData['aiPerfData']
  expect(isPerfDataChanged(previous, structuredClone(previous))).toBe(false)
  expect(
    isPerfDataChanged(previous, {
      ...previous,
      modelContext: { ...previous.modelContext!, threshold_tokens: 100 * 1024 },
    }),
  ).toBe(true)
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

describe('isTierModelConsumptionChanged', () => {
  const createItem = (): AIAgentGrpcApi.AIModelConsumptionStats => ({
    provider_type: 'openai',
    model_name: 'gpt-5',
    thinking_level: 'none',
    input_consumption: 10,
    output_consumption: 5,
    cache_hit_token: 2,
  })

  it('空对象与相同数据判定为无变化', () => {
    expect(isTierModelConsumptionChanged(undefined, undefined)).toBe(false)
    expect(isTierModelConsumptionChanged({}, {})).toBe(false)
    expect(
      isTierModelConsumptionChanged({ lightweight: [createItem()] }, structuredClone({ lightweight: [createItem()] })),
    ).toBe(false)
  })

  it('长度相同但字段变化时可识别', () => {
    const previous = { lightweight: [createItem()] }

    const changedFields: (keyof AIAgentGrpcApi.AIModelConsumptionStats)[] = [
      'provider_type',
      'model_name',
      'thinking_level',
      'input_consumption',
      'output_consumption',
      'cache_hit_token',
    ]
    for (const field of changedFields) {
      const next = { lightweight: [{ ...createItem(), [field]: 'changed' }] }
      expect(isTierModelConsumptionChanged(previous, next)).toBe(true)
    }

    // 相同长度但 next 对应位置缺失（空数组 vs 空数组同长度不触发，用 null 断言防御 nextItems 比 prevItems 短的逻辑由长度比较兜底）
    expect(isTierModelConsumptionChanged({ lightweight: [createItem()] }, { lightweight: [] })).toBe(true)
  })

  it('单边 tier 缺失或新增判定为有变化', () => {
    const items = { lightweight: [createItem()] }
    expect(isTierModelConsumptionChanged(undefined, items)).toBe(true)
    expect(isTierModelConsumptionChanged(items, undefined)).toBe(true)
    expect(isTierModelConsumptionChanged({}, items)).toBe(true)
    expect(
      isTierModelConsumptionChanged(
        { lightweight: [createItem()] },
        { lightweight: [createItem()], vision: [createItem()] },
      ),
    ).toBe(true)
  })

  it('多 tier 时仅未变化的 tier 相同、任一 tier 变化即返回 true', () => {
    const previous = {
      lightweight: [createItem()],
      vision: [createItem()],
    }
    expect(isTierModelConsumptionChanged(previous, structuredClone(previous))).toBe(false)
    expect(
      isTierModelConsumptionChanged(previous, {
        ...structuredClone(previous),
        vision: [{ ...createItem(), output_consumption: 999 }],
      }),
    ).toBe(true)
  })
})
