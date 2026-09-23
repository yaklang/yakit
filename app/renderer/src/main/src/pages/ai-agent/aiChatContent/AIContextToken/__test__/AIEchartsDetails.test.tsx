import type React from 'react'
import { render } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  aitokensProps: [] as Array<Record<string, unknown>>,
  config: {} as Record<string, unknown>,
}))

vi.mock('@/pages/ai-re-act/hooks/useAIGlobalConfig', () => ({
  default: () => [
    { queryLoading: false, updateLoading: false, aiGlobalConfig: mocks.config },
    { onRefresh: vi.fn(), setAIGlobalConfig: vi.fn() },
  ],
}))

vi.mock('@/i18n/useI18nNamespaces', () => ({
  useI18nNamespaces: () => ({ t: (key: string) => key, i18n: { language: 'zh' } }),
}))

vi.mock('../AITokens', () => ({
  default: (props: Record<string, unknown>) => {
    mocks.aitokensProps.push(props)
    return <div data-testid="ai-tokens" />
  },
}))

vi.mock('../../chatTemplate/AIEcharts', () => ({
  AICostDetailsEcharts: () => null,
  AIPressureDetailsEcharts: () => null,
  TokenCountEcharts: () => null,
}))

vi.mock('../ContextTable/ContextTable', () => ({ default: () => null }))
vi.mock('@/pages/ai-agent/utils', () => ({ formatNumberUnits: (value: number) => String(value) }))

const AIEchartsDetails = (await import('../AIEchartsDetails')).default

const createModel = (type: string, modelName: string) => ({
  ProviderId: 'provider-id',
  Provider: { Type: type },
  ModelName: modelName,
  ExtraParams: [],
})

const baseProps = {
  overallToken: [10, 5, 2] as [number | string, number | string, number | string],
  onClose: vi.fn(),
  renderNumber: 0,
}

const renderAndCollect = (consumption?: Record<string, unknown>) => {
  mocks.aitokensProps = []
  render(<AIEchartsDetails {...baseProps} consumption={consumption as never} />)
  return mocks.aitokensProps
}

describe('AIEchartsDetails 用量展示回退', () => {
  it('旧引擎未返回单模型统计时传递类别用量', () => {
    mocks.config = {
      IntelligentModels: [createModel('aibalance', 'standard')],
      LightweightModels: [createModel('openai', 'lite')],
    }
    const tierConsumption = {
      intelligent: { input_consumption: 30, output_consumption: 8, cache_hit_token: 5 },
      lightweight: { input_consumption: 10, output_consumption: 2, cache_hit_token: 1 },
    }
    const props = renderAndCollect({ tier_consumption: tierConsumption })
    expect(props[0].fallbackConsumption).toEqual(tierConsumption.intelligent)
    expect(props[1].fallbackConsumption).toEqual(tierConsumption.lightweight)
  })

  it('新引擎返回空模型统计时不回退到类别用量', () => {
    mocks.config = {
      IntelligentModels: [createModel('aibalance', 'standard')],
      LightweightModels: [createModel('openai', 'lite')],
    }
    const props = renderAndCollect({
      tier_consumption: {
        intelligent: { input_consumption: 30, output_consumption: 8, cache_hit_token: 5 },
      },
      tier_model_consumption: {},
    })
    expect(props[0]).toMatchObject({ aiModel: undefined, fallbackConsumption: undefined })
    expect(props[1]).toMatchObject({ aiModel: undefined, fallbackConsumption: undefined })
  })

  it('无 tier_model_consumption 时回退展示全局配置的首个模型', () => {
    mocks.config = {
      IntelligentModels: [createModel('aibalance', 'standard')],
      LightweightModels: [createModel('openai', 'lite')],
    }

    const props = renderAndCollect()

    expect(props).toHaveLength(2)
    expect(props[0]).toMatchObject({
      aiModel: createModel('aibalance', 'standard'),
      modelConsumption: undefined,
    })
    expect(props[1]).toMatchObject({
      aiModel: createModel('openai', 'lite'),
      modelConsumption: undefined,
    })
  })

  it('有 tier_model_consumption 时优先展示运行时实际模型', () => {
    mocks.config = {
      IntelligentModels: [createModel('aibalance', 'standard')],
      LightweightModels: [createModel('openai', 'lite')],
    }
    const intelligentStats = [
      {
        provider_type: 'openai',
        model_name: 'gpt-5',
        thinking_level: 'high',
        input_consumption: 10,
        output_consumption: 5,
        cache_hit_token: 2,
      },
    ]
    const lightweightStats = [
      {
        provider_type: 'openai',
        model_name: 'gpt-5-mini',
        thinking_level: 'none',
        input_consumption: 3,
        output_consumption: 1,
        cache_hit_token: 0,
      },
    ]

    const props = renderAndCollect({
      tier_consumption: {
        intelligent: { input_consumption: 30, output_consumption: 8, cache_hit_token: 5 },
        lightweight: { input_consumption: 10, output_consumption: 2, cache_hit_token: 1 },
      },
      tier_model_consumption: {
        intelligent: intelligentStats,
        lightweight: lightweightStats,
      },
    })

    expect(props[0]).toMatchObject({
      aiModel: undefined,
      modelConsumption: intelligentStats,
      fallbackConsumption: undefined,
    })
    expect(props[1]).toMatchObject({
      aiModel: undefined,
      modelConsumption: lightweightStats,
      fallbackConsumption: undefined,
    })
  })
})
