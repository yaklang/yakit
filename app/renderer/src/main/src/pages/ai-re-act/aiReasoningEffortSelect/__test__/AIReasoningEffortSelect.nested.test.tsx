import { useState } from 'react'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
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

const NestedModelSelect = () => {
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
      closestClassName="[data-ai-reasoning-effort-menu]"
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

describe('思考质量嵌套模型弹层', () => {
  it('子菜单挂载到父下拉层外，选项可点击，关闭父菜单后不残留或自动重开', async () => {
    render(<NestedModelSelect />)
    fireEvent.click(screen.getByTestId('selected-model'))
    const trigger = await screen.findByRole('button', { name: 'AIReasoningEffort.selectQuality' })
    fireEvent.click(trigger)
    const menu = await screen.findByRole('menu')
    expect(menu.closest('.ant-select-dropdown')).toBeNull()
    const high = screen.getByRole('menuitemradio', { name: 'ConfigNetworkPage.effortHigh' })
    fireEvent.mouseDown(high)
    fireEvent.click(high)
    await waitFor(() => {
      expect(trigger).toHaveTextContent('ConfigNetworkPage.effortHigh')
      expect(trigger).toBeVisible()
    })
    expect(trigger).toHaveAttribute('aria-expanded', 'false')

    fireEvent.click(trigger)
    await waitFor(() => expect(screen.getByRole('menu')).toBeVisible())
    fireEvent.mouseDown(document.body)
    await waitFor(() => expect(screen.queryByRole('menu')).not.toBeInTheDocument())
    fireEvent.click(screen.getByTestId('selected-model'))
    expect(await screen.findByRole('button', { name: 'AIReasoningEffort.selectQuality' })).toHaveAttribute(
      'aria-expanded',
      'false',
    )
  })
})
