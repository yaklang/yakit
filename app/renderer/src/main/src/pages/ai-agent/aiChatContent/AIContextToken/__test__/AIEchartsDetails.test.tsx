import type React from 'react'
import { render } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { AIEchartsDetailsProps } from '../AIEchartsDetails'

const mocks = vi.hoisted(() => ({
  aitokensProps: [] as Array<Record<string, unknown>>,
  config: {} as Record<string, unknown>,
  thresholdTokens: 500000 as number | undefined,
}))

vi.mock('@/pages/ai-agent/useContext/useAIModelContext', () => ({
  default: () => ({ thresholdTokens: mocks.thresholdTokens }),
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

vi.mock('../AIMainModelTokens', () => ({
  default: () => <div data-testid="main-model-tokens" />,
}))

vi.mock('@/pages/ai-agent/chatTemplate/AIEcharts', () => ({
  AICostDetailsEcharts: () => null,
  AIPressureDetailsEcharts: ({ threshold }: { threshold?: number }) => (
    <div data-testid="pressure-threshold">{threshold}</div>
  ),
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

describe('AIEchartsDetails 辅助模型用量展示回退', () => {
  beforeEach(() => {
    mocks.thresholdTokens = 500000
  })

  it('旧引擎未返回单模型统计时传递类别用量', () => {
    mocks.config = {
      LightweightModels: [createModel('openai', 'lite')],
    }
    const tierConsumption = {
      lightweight: { input_consumption: 10, output_consumption: 2, cache_hit_token: 1 },
    }
    const props = renderAndCollect({ tier_consumption: tierConsumption })
    expect(props).toHaveLength(1)
    expect(props[0].fallbackConsumption).toEqual(tierConsumption.lightweight)
    expect(props[0].modelType).toBe('AiAgengt.lightweightModels')
  })

  it('新引擎返回空模型统计时不回退到类别用量', () => {
    mocks.config = {
      LightweightModels: [createModel('openai', 'lite')],
    }
    const props = renderAndCollect({
      tier_consumption: {
        lightweight: { input_consumption: 10, output_consumption: 2, cache_hit_token: 1 },
      },
      tier_model_consumption: {},
    })
    expect(props[0]).toMatchObject({ aiModel: undefined, fallbackConsumption: undefined })
  })

  it('无 tier_model_consumption 时回退展示全局配置的首个模型', () => {
    mocks.config = {
      LightweightModels: [createModel('openai', 'lite')],
    }

    const props = renderAndCollect()

    expect(props).toHaveLength(1)
    expect(props[0]).toMatchObject({
      aiModel: createModel('openai', 'lite'),
      modelConsumption: undefined,
    })
  })

  it('有 tier_model_consumption 时优先展示运行时实际模型', () => {
    mocks.config = {
      LightweightModels: [createModel('openai', 'lite')],
    }
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
        lightweight: { input_consumption: 10, output_consumption: 2, cache_hit_token: 1 },
      },
      tier_model_consumption: {
        lightweight: lightweightStats,
      },
    })

    expect(props[0]).toMatchObject({
      aiModel: undefined,
      modelConsumption: lightweightStats,
      fallbackConsumption: undefined,
    })
  })

  it('渲染主模型共享组件', () => {
    mocks.config = {}
    const { getByTestId } = render(<AIEchartsDetails {...baseProps} />)
    expect(getByTestId('main-model-tokens')).toBeInTheDocument()
  })

  it('收到新的 token 阈值时更新图表，不做字节换算', () => {
    const pressure: NonNullable<AIEchartsDetailsProps['pressure']> = {
      intelligent: [
        {
          current_cost_token_size: 10,
          model_name: 'main',
          model_tier: 'intelligent',
          pressure_token_size: 100,
          timestamp: 1,
        },
      ],
      lightweight: [],
      vision: [],
    }
    const { getByTestId, getByText, rerender } = render(<AIEchartsDetails {...baseProps} pressure={pressure} />)
    expect(getByTestId('pressure-threshold')).toHaveTextContent(/^500000$/)
    expect(getByText('AIContextToken.limit:500K')).toBeVisible()
    mocks.thresholdTokens = 240000
    rerender(<AIEchartsDetails {...baseProps} pressure={pressure} renderNumber={1} />)
    expect(getByTestId('pressure-threshold')).toHaveTextContent(/^240000$/)
    expect(getByText('AIContextToken.limit:240K')).toBeVisible()
  })

  it('阈值缺失时保留图表且不显示默认阈值', () => {
    mocks.thresholdTokens = undefined
    const pressure: NonNullable<AIEchartsDetailsProps['pressure']> = {
      intelligent: [
        {
          current_cost_token_size: 10,
          model_name: 'main',
          model_tier: 'intelligent',
          pressure_token_size: 100,
          timestamp: 1,
        },
      ],
      lightweight: [],
      vision: [],
    }
    const { getByTestId, queryByText } = render(<AIEchartsDetails {...baseProps} pressure={pressure} />)
    expect(getByTestId('pressure-threshold')).toBeEmptyDOMElement()
    expect(queryByText('AIContextToken.limit', { exact: false })).not.toBeInTheDocument()
  })
})
