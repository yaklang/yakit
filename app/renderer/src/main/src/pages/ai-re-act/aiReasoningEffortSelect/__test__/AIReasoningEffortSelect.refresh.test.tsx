import type React from 'react'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { AIReasoningEffortSelect } from '../AIReasoningEffortSelect'
import type { AIModelConfig } from '@/pages/ai-agent/aiModelList/utils'

const baseModel: AIModelConfig = {
  ProviderId: 'provider-1',
  ModelName: 'model-1',
  Provider: { Type: 'openai', ReasoningEffort: 'low' },
  ExtraParams: [],
}

vi.mock('@/i18n/useI18nNamespaces', () => ({
  useI18nNamespaces: () => ({ t: (key: string) => key, i18nRefresh: 0 }),
}))
vi.mock('@yakit-libs/yakit-ui-icons/outline', () => ({
  InformationCircleOutlined: () => null,
  ExclamationOutlined: () => null,
}))
vi.mock('@/components/yakitUI/YakitTag/YakitTag', () => ({
  YakitTag: ({ children }: React.PropsWithChildren) => <span>{children}</span>,
}))
vi.mock('@/components/yakitUI/YakitSolidLoading/YakitSolidLoading', () => ({ default: () => null }))

afterEach(cleanup)

describe('AIReasoningEffortSelect', () => {
  it('按顺序直接展示基础档位和已探测支持的扩展档位', () => {
    const model = { ...baseModel, ProbedExtendedEfforts: ['xhigh', 'max'] }
    render(<AIReasoningEffortSelect model={model} onChange={vi.fn()} />)
    const labels = [
      'AIReasoningEffort.effortDefault',
      'ConfigNetworkPage.effortOff',
      'AIReasoningEffort.effortLow',
      'ConfigNetworkPage.effortMedium',
      'ConfigNetworkPage.effortHigh',
      'ConfigNetworkPage.effortXhigh',
      'AIReasoningEffort.effortMax',
    ]
    expect(screen.getAllByRole('button')).toEqual(labels.map((name) => screen.getByRole('button', { name })))
    expect(screen.getByRole('button', { name: 'AIReasoningEffort.effortLow' })).toHaveAttribute('aria-pressed', 'true')
  })

  it.each([
    ['AIReasoningEffort.effortDefault', undefined],
    ['ConfigNetworkPage.effortOff', 'off'],
    ['ConfigNetworkPage.effortHigh', 'high'],
  ])('草稿模式选择 %s 只更新对应字段，保留当前模型和连接配置', (name, expected) => {
    const model = { ...baseModel, ModelName: 'draft-model' }
    const onChange = vi.fn<(mutate: (model: AIModelConfig) => AIModelConfig) => void>()
    render(<AIReasoningEffortSelect model={model} onChange={onChange} />)
    fireEvent.click(screen.getByRole('button', { name }))
    expect(onChange).toHaveBeenCalledTimes(1)
    expect(onChange.mock.calls[0][0](model)).toEqual({
      ...model,
      Provider: { ...model.Provider, ReasoningEffort: expected },
    })
    expect(model.Provider.ReasoningEffort).toBe('low')
  })

  it('未探测到扩展档位时仍显示当前扩展值，且不会增加其他扩展项', () => {
    const model = {
      ...baseModel,
      Provider: { ...baseModel.Provider, ReasoningEffort: 'xhigh' },
    }
    render(<AIReasoningEffortSelect model={model} onChange={vi.fn()} />)
    expect(screen.getByRole('button', { name: 'ConfigNetworkPage.effortXhigh' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    expect(screen.queryByRole('button', { name: 'AIReasoningEffort.effortMax' })).not.toBeInTheDocument()
  })

  it('禁用时仍显示档位，但不能更改选择', () => {
    const onChange = vi.fn()
    render(<AIReasoningEffortSelect model={baseModel} disabled onChange={onChange} />)
    const high = screen.getByRole('button', { name: 'ConfigNetworkPage.effortHigh' })
    expect(high).toBeDisabled()
    fireEvent.click(high)
    expect(high).toHaveAttribute('aria-pressed', 'false')
    expect(onChange).not.toHaveBeenCalled()
  })
})
