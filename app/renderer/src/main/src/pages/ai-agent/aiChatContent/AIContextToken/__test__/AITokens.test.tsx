import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import AITokens, { getThinkingLevelLabel } from '../AITokens'

const translations: Record<string, string> = {
  'AIContextToken.input': '输入',
  'AIContextToken.output': '输出',
  'AIContextToken.cache': '缓存',
  'AIContextToken.cacheTooltip': '缓存占输入百分比',
  'AIContextToken.thinkingLevel': '思考强度',
  'AIContextToken.noCallRecords': '暂无调用记录',
  'AIContextToken.unknownModel': '未知模型',
  'AIContextToken.thinkingLevels.auto': '默认',
  'AIContextToken.thinkingLevels.none': '无思考',
  'AIContextToken.thinkingLevels.low': '低',
  'AIContextToken.thinkingLevels.medium': '中',
  'AIContextToken.thinkingLevels.high': '高',
  'AIContextToken.thinkingLevels.xhigh': '极高',
  'AIContextToken.thinkingLevels.max': '最高',
}

vi.mock('@/i18n/useI18nNamespaces', () => ({
  useI18nNamespaces: () => ({ t: (key: string) => translations[key] || key }),
}))

vi.mock('@/pages/ai-agent/aiModelList/aiModelSelect/AIModelSelect', () => ({
  getIconByAI: (provider: string) => <span data-testid={`provider-${provider}`} />,
}))

vi.mock('@/pages/ai-agent/utils', () => ({
  formatNumberUnits: (value: number) => String(value),
}))

describe('AITokens', () => {
  it('按 Tier 展示总量，并列出同一模型的不同思考强度', () => {
    render(
      <AITokens
        modelType="辅助模型"
        consumption={{ input_consumption: 30, output_consumption: 10, cache_hit_token: 5 }}
        modelConsumption={[
          {
            provider_type: 'openai',
            model_name: 'gpt-5',
            thinking_level: 'high',
            input_consumption: 20,
            output_consumption: 8,
            cache_hit_token: 3,
          },
          {
            provider_type: 'openai',
            model_name: 'gpt-5',
            thinking_level: 'none',
            input_consumption: 10,
            output_consumption: 2,
            cache_hit_token: 2,
          },
        ]}
      />,
    )

    expect(screen.getByText('辅助模型')).toBeInTheDocument()
    expect(screen.getAllByText('gpt-5')).toHaveLength(2)
    expect(screen.getByText('高')).toBeInTheDocument()
    expect(screen.getByText('无思考')).toBeInTheDocument()
    expect(screen.getAllByTestId('provider-openai')).toHaveLength(2)
    expect(screen.getByText('30')).toBeInTheDocument()
    expect(screen.getByText('10')).toBeInTheDocument()
    expect(screen.getByText('5')).toBeInTheDocument()
  })

  it('保留未知思考强度原值', () => {
    expect(getThinkingLevelLabel(((key: string) => translations[key] || key) as any, 'custom')).toBe('custom')
  })
})
