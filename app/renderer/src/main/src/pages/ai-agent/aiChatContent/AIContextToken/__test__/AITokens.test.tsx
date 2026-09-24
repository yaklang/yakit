import { fireEvent, render, screen, within } from '@testing-library/react'
import type { SelectProps } from 'antd'
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

vi.mock('@/pages/ai-re-act/aiReviewRuleSelect/AIReviewRuleSelect', async () => {
  const { Select } = await import('antd')
  return {
    AIChatSelect: ({ setOpen, dropdownRender, ...props }: SelectProps & { setOpen: (open: boolean) => void }) => (
      <div onClick={() => setOpen(!props.open)}>
        <Select {...props} popupRender={dropdownRender} />
      </div>
    ),
  }
})

vi.mock('@/pages/ai-agent/utils', () => ({
  formatNumberUnits: (value: number) => String(value),
}))

const modelConsumption = [
  {
    provider_type: 'openai',
    model_name: 'gpt-5',
    thinking_level: 'high',
    input_consumption: 20,
    output_consumption: 8,
    cache_hit_token: 5,
  },
  {
    provider_type: 'openai',
    model_name: 'gpt-5',
    thinking_level: 'none',
    input_consumption: 12,
    output_consumption: 3,
    cache_hit_token: 4,
  },
]

const expectTokens = (input: number, output: number, cache: number) => {
  for (const [label, value] of [
    ['输入', input],
    ['输出', output],
    ['缓存', cache],
  ] as const) {
    const item = screen.getByText(label).parentElement!
    expect(within(item).getByText(String(value))).toBeInTheDocument()
  }
}

const selectNoThinking = async () => {
  fireEvent.click(screen.getByRole('combobox'))
  fireEvent.click(await screen.findByText('无思考'))
}

describe('AITokens', () => {
  it.each(['高', '无思考'])('重复点击当前选中的%s模型也会关闭下拉框', async (thinkingLevel) => {
    render(<AITokens modelType="辅助模型" modelConsumption={modelConsumption} />)
    if (thinkingLevel === '无思考') await selectNoThinking()

    const select = screen.getByRole('combobox')
    fireEvent.click(select)
    expect(select).toHaveAttribute('aria-expanded', 'true')
    const option = screen.getAllByText(thinkingLevel).find((element) => element.closest('.ant-select-item-option'))!
    fireEvent.click(option)

    expect(select).toHaveAttribute('aria-expanded', 'false')
    if (thinkingLevel === '高') expectTokens(20, 8, 5)
    else expectTokens(12, 3, 4)
  })

  it('旧引擎使用类别用量，并随类别统计更新', async () => {
    const aiModel = { ProviderId: 'openai', Provider: { Type: 'openai' }, ModelName: 'gpt-5', ExtraParams: [] }
    const { rerender } = render(
      <AITokens
        modelType="辅助模型"
        aiModel={aiModel}
        fallbackConsumption={{ input_consumption: 20, output_consumption: 8, cache_hit_token: 5 }}
      />,
    )
    expectTokens(20, 8, 5)
    fireEvent.mouseEnter(screen.getByRole('img', { name: 'question-circle' }))
    expect(await screen.findByRole('tooltip')).toHaveTextContent('缓存占输入百分比：20%')

    rerender(
      <AITokens
        modelType="辅助模型"
        aiModel={aiModel}
        fallbackConsumption={{ input_consumption: 40, output_consumption: 16, cache_hit_token: 10 }}
      />,
    )
    expectTokens(40, 16, 10)
  })

  it('旧引擎没有模型配置时仍展示类别用量', () => {
    render(
      <AITokens
        modelType="辅助模型"
        fallbackConsumption={{ input_consumption: 20, output_consumption: 8, cache_hit_token: 5 }}
      />,
    )
    expectTokens(20, 8, 5)
  })

  it('有单模型统计时优先使用所选模型用量', () => {
    render(
      <AITokens
        modelType="辅助模型"
        modelConsumption={modelConsumption}
        fallbackConsumption={{ input_consumption: 100, output_consumption: 50, cache_hit_token: 20 }}
      />,
    )
    expectTokens(20, 8, 5)
  })

  it('默认选中第一项，即使用量不是最多', () => {
    render(<AITokens modelType="辅助模型" modelConsumption={[modelConsumption[1], modelConsumption[0]]} />)

    expect(screen.getByText('辅助模型')).toBeInTheDocument()
    expect(screen.getByRole('combobox')).toBeInTheDocument()
    expect(screen.getByText('gpt-5')).toBeInTheDocument()
    expect(screen.getByText('无思考')).toBeInTheDocument()
    expect(screen.queryByText('高')).not.toBeInTheDocument()
    expect(screen.getByTestId('provider-openai')).toBeInTheDocument()
    expectTokens(12, 3, 4)
  })

  it('可切换同名模型的不同思考强度，并更新用量及缓存占比', async () => {
    render(<AITokens modelType="辅助模型" modelConsumption={modelConsumption} />)

    fireEvent.mouseEnter(screen.getByRole('img', { name: 'question-circle' }))
    expect(await screen.findByRole('tooltip')).toHaveTextContent('缓存占输入百分比：20%')
    fireEvent.mouseLeave(screen.getByRole('img', { name: 'question-circle' }))

    await selectNoThinking()
    expectTokens(12, 3, 4)

    fireEvent.mouseEnter(screen.getByRole('img', { name: 'question-circle' }))
    expect(await screen.findByRole('tooltip')).toHaveTextContent('缓存占输入百分比：25%')
  })

  it('数据刷新和重排保留用户选择，选中项失效时展示当前首项', async () => {
    const { rerender } = render(<AITokens modelType="辅助模型" modelConsumption={modelConsumption} />)
    await selectNoThinking()

    const updatedModel = { ...modelConsumption[1], input_consumption: 42, output_consumption: 7, cache_hit_token: 6 }
    rerender(<AITokens modelType="辅助模型" modelConsumption={[updatedModel, modelConsumption[0]]} />)
    expectTokens(42, 7, 6)

    rerender(<AITokens modelType="辅助模型" modelConsumption={[modelConsumption[0], updatedModel]} />)
    expectTokens(42, 7, 6)

    const smallerModel = { ...modelConsumption[0], model_name: 'gpt-5-mini', input_consumption: 1 }
    rerender(<AITokens modelType="辅助模型" modelConsumption={[smallerModel, modelConsumption[0]]} />)
    expect(screen.getByText('gpt-5-mini')).toBeInTheDocument()
    expectTokens(1, 8, 5)

    rerender(<AITokens modelType="辅助模型" modelConsumption={[modelConsumption[0], updatedModel]} />)
    expectTokens(42, 7, 6)

    rerender(<AITokens modelType="辅助模型" modelConsumption={[]} />)
    expect(screen.getByText('暂无调用记录')).toBeInTheDocument()
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument()
    expectTokens(0, 0, 0)
    expect(screen.queryByRole('img', { name: 'question-circle' })).not.toBeInTheDocument()
  })

  it('配置模型切换为空列表再收到实际模型时，不展示过期 key 并同步用量', () => {
    const aiModel = {
      ProviderId: 'aibalance',
      Provider: { Type: 'aibalance' },
      ModelName: 'memfit-light-free',
      ExtraParams: [],
    }
    const { rerender } = render(<AITokens modelType="主模型" aiModel={aiModel} />)
    expect(screen.getByText('light-free')).toBeInTheDocument()

    rerender(<AITokens modelType="主模型" modelConsumption={[]} />)
    expect(screen.getByText('暂无调用记录')).toBeInTheDocument()

    rerender(
      <AITokens
        modelType="主模型"
        modelConsumption={[
          {
            provider_type: 'aibalance',
            model_name: 'memfit-light-free',
            thinking_level: 'none',
            input_consumption: 120,
            output_consumption: 30,
            cache_hit_token: 10,
          },
        ]}
      />,
    )
    expect(screen.getByText('light-free')).toBeInTheDocument()
    expect(screen.getByText('无思考')).toBeInTheDocument()
    expect(screen.queryByText('["aibalance","memfit-light-free",""]')).not.toBeInTheDocument()
    expectTokens(120, 30, 10)
  })

  it('首次为空时后续数据到达自动选中首项，用户仍可切换选择', async () => {
    const { rerender } = render(<AITokens modelType="辅助模型" modelConsumption={[]} />)
    rerender(<AITokens modelType="辅助模型" modelConsumption={[modelConsumption[0]]} />)
    expect(screen.getByText('gpt-5')).toBeInTheDocument()
    expect(screen.getByText('高')).toBeInTheDocument()
    expectTokens(20, 8, 5)

    rerender(<AITokens modelType="辅助模型" modelConsumption={modelConsumption} />)
    await selectNoThinking()
    const increasedModel = { ...modelConsumption[0], input_consumption: 100 }
    rerender(<AITokens modelType="辅助模型" modelConsumption={[increasedModel, modelConsumption[1]]} />)
    expectTokens(12, 3, 4)
  })

  it('空列表显示暂无调用记录和零用量', () => {
    render(<AITokens modelType="辅助模型" modelConsumption={[]} />)

    expect(screen.getByText('暂无调用记录')).toBeInTheDocument()
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument()
    expectTokens(0, 0, 0)
  })

  it('保留未知思考强度原值', () => {
    expect(getThinkingLevelLabel(((key: string) => translations[key] || key) as any, 'custom')).toBe('custom')
  })
})
