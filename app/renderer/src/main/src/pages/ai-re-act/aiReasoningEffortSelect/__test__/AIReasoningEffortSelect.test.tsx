import { useState } from 'react'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { AIChatSelect } from '../../aiReviewRuleSelect/AIReviewRuleSelect'
import { YakitSelect } from '@/components/yakitUI/YakitSelect/YakitSelect'
import { AIReasoningEffortSelect } from '../AIReasoningEffortSelect'
import type { AIModelConfig } from '@/pages/ai-agent/aiModelList/utils'

vi.mock('@/pages/ai-re-act/hooks/useAIGlobalConfig', () => ({
  default: () => [{ aiGlobalConfig: { IntelligentModels: [] } }, {}],
}))
vi.mock('@/pages/ai-agent/aiModelList/utils', () => ({ grpcProbeReasoningEffort: vi.fn() }))
vi.mock('@/i18n/useI18nNamespaces', () => ({
  useI18nNamespaces: () => ({ t: (key: string) => key, i18nRefresh: 0, i18n: { language: 'zh' } }),
}))

const ModelSelect = () => {
  const [open, setOpen] = useState(false)
  const [model, setModel] = useState<AIModelConfig>({
    ProviderId: 'provider-1',
    ModelName: 'model-1',
    Provider: { Type: 'openai', ReasoningEffort: 'low' },
    ExtraParams: [],
    EffortProbed: true,
  })
  return (
    <AIChatSelect
      open={open}
      setOpen={setOpen}
      value="select"
      optionLabelProp="label"
      dropdownRender={() => (
        <div data-testid="model-popup" onClick={(event) => event.stopPropagation()}>
          {open && <AIReasoningEffortSelect model={model} onChange={(mutate) => setModel(mutate)} />}
        </div>
      )}
    >
      <YakitSelect.Option value="select" label={<span data-testid="selected-model">model-1</span>}>
        model-1
      </YakitSelect.Option>
    </AIChatSelect>
  )
}

afterEach(cleanup)

describe('模型列表内的思考强度', () => {
  it('直接显示档位，点击后保持面板打开，点击外部后隐藏档位', async () => {
    render(<ModelSelect />)
    fireEvent.click(screen.getByTestId('selected-model'))
    const popup = await screen.findByTestId('model-popup')
    const group = within(popup).getByRole('group', { name: 'AIReasoningEffort.selectQuality' })
    await waitFor(() => expect(group).toBeVisible())
    expect(within(group).getByRole('button', { name: 'AIReasoningEffort.effortLow' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    const high = within(group).getByRole('button', { name: 'ConfigNetworkPage.effortHigh' })
    fireEvent.mouseDown(high)
    fireEvent.click(high)
    expect(within(group).getByRole('button', { name: 'ConfigNetworkPage.effortHigh' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    expect(group).toBeVisible()
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()

    fireEvent.mouseDown(document.body)
    await waitFor(() =>
      expect(screen.queryByRole('group', { name: 'AIReasoningEffort.selectQuality' })).not.toBeInTheDocument(),
    )
    fireEvent.click(screen.getByTestId('selected-model'))
    expect(await screen.findByRole('button', { name: 'ConfigNetworkPage.effortHigh' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
  })
})
