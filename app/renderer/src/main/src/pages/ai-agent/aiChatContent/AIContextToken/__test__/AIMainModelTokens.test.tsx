import type React from 'react'
import { render } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  aitokensProps: [] as Array<Record<string, unknown>>,
  config: {} as Record<string, unknown>,
  consumption: null as Record<string, unknown> | null,
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

const mockPerfStore = vi.hoisted(() => {
  // lazy: createStore imported inside factory after vitest hoist
  return { store: null as any }
})

vi.mock('@/pages/ai-re-act/hooks/useCurrentDataBySession', async () => {
  const { createStore } = await import('zustand/vanilla')
  mockPerfStore.store = createStore(() => ({ execute: true }))
  return {
    useCurrentStore: () => mockPerfStore.store,
  }
})

vi.mock('../useContextPerfStore', () => ({
  CONTEXT_PERF_POLL_INTERVAL: 2000,
  useContextPerfStore: () => ({ consumption: mocks.consumption }),
}))

vi.mock('@/hook/useRafPolling/useRafPolling', () => ({
  useRafPolling: ({ getData }: { getData: () => unknown }) => ({
    renderNumber: 1,
    aiDataRef: getData(),
  }),
}))

vi.mock('../AITokens', () => ({
  default: (props: Record<string, unknown>) => {
    mocks.aitokensProps.push(props)
    return <div data-testid="ai-tokens" />
  },
}))

const AIMainModelTokens = (await import('../AIMainModelTokens')).default

const createModel = (type: string, modelName: string) => ({
  ProviderId: 'provider-id',
  Provider: { Type: type },
  ModelName: modelName,
  ExtraParams: [],
})

const renderAndCollect = (consumption: Record<string, unknown> | null = null) => {
  mocks.aitokensProps = []
  mocks.consumption = consumption
  render(<AIMainModelTokens />)
  return mocks.aitokensProps
}

describe('AIMainModelTokens 用量展示回退', () => {
  it('旧引擎未返回单模型统计时传递类别用量', () => {
    mocks.config = {
      IntelligentModels: [createModel('aibalance', 'standard')],
    }
    const tierConsumption = {
      intelligent: { input_consumption: 30, output_consumption: 8, cache_hit_token: 5 },
    }
    const props = renderAndCollect({ tier_consumption: tierConsumption })
    expect(props).toHaveLength(1)
    expect(props[0].fallbackConsumption).toEqual(tierConsumption.intelligent)
    expect(props[0].modelType).toBe('AiAgengt.intelligentModels')
  })

  it('新引擎返回空模型统计时不回退到类别用量', () => {
    mocks.config = {
      IntelligentModels: [createModel('aibalance', 'standard')],
    }
    const props = renderAndCollect({
      tier_consumption: {
        intelligent: { input_consumption: 30, output_consumption: 8, cache_hit_token: 5 },
      },
      tier_model_consumption: {},
    })
    expect(props[0]).toMatchObject({ aiModel: undefined, fallbackConsumption: undefined })
  })

  it('无 tier_model_consumption 时回退展示全局配置的首个模型', () => {
    mocks.config = {
      IntelligentModels: [createModel('aibalance', 'standard')],
    }
    const props = renderAndCollect()
    expect(props).toHaveLength(1)
    expect(props[0]).toMatchObject({
      aiModel: createModel('aibalance', 'standard'),
      modelConsumption: undefined,
    })
  })

  it('有 tier_model_consumption 时优先展示运行时实际模型', () => {
    mocks.config = {
      IntelligentModels: [createModel('aibalance', 'standard')],
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
    const props = renderAndCollect({
      tier_consumption: {
        intelligent: { input_consumption: 30, output_consumption: 8, cache_hit_token: 5 },
      },
      tier_model_consumption: {
        intelligent: intelligentStats,
      },
    })
    expect(props[0]).toMatchObject({
      aiModel: undefined,
      modelConsumption: intelligentStats,
      fallbackConsumption: undefined,
    })
  })
})
