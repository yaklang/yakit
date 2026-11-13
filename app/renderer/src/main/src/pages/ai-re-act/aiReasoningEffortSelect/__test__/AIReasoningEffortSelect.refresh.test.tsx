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
  ChevronRightOutlined: () => null,
  ExclamationOutlined: () => null,
  CheckOutlined: () => null,
}))
vi.mock('@/components/yakitUI/YakitTag/YakitTag', () => ({
  YakitTag: ({ children }: React.PropsWithChildren) => <span>{children}</span>,
}))
vi.mock('@/components/yakitUI/YakitSolidLoading/YakitSolidLoading', () => ({ default: () => null }))
vi.mock('antd', () => ({ Tooltip: ({ children }: React.PropsWithChildren) => children }))
vi.mock('@/components/yakitUI/YakitPopover/YakitPopover', () => ({
  YakitPopover: ({
    open,
    onOpenChange,
    children,
    content,
    arrow,
    placement,
    trigger,
  }: React.PropsWithChildren<{
    open: boolean
    onOpenChange: (open: boolean) => void
    content: React.ReactNode
    arrow: boolean
    placement: string
    trigger: string | string[]
  }>) => (
    <div data-testid="effort-popover" data-arrow={String(arrow)} data-placement={placement}>
      <div
        onMouseEnter={() => trigger.includes('hover') && onOpenChange(true)}
        onClickCapture={() => trigger.includes('click') && onOpenChange(!open)}
      >
        {children}
      </div>
      {open && content}
    </div>
  ),
}))

const openEffort = () => fireEvent.click(screen.getByRole('button', { name: 'AIReasoningEffort.selectQuality' }))
const chooseEffort = (key: string) => {
  openEffort()
  fireEvent.click(screen.getByRole('menuitemradio', { name: `ConfigNetworkPage.${key}` }))
}

afterEach(cleanup)

describe('AIReasoningEffortSelect', () => {
  it('显示当前档位，打开右侧无箭头子菜单，选择后关闭', () => {
    const onChange = vi.fn()
    const model = { ...baseModel, ProbedExtendedEfforts: ['xhigh', 'max'] }
    render(<AIReasoningEffortSelect model={model} onChange={onChange} />)
    const trigger = screen.getByRole('button', { name: 'AIReasoningEffort.selectQuality' })
    expect(trigger).toHaveTextContent('ConfigNetworkPage.effortLow')
    expect(trigger).toHaveAttribute('aria-expanded', 'false')
    expect(screen.queryByRole('menuitemradio')).not.toBeInTheDocument()
    fireEvent.mouseEnter(trigger)
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
    fireEvent.keyDown(trigger, { key: 'Enter' })
    expect(trigger).not.toHaveAttribute('tabindex')
    expect(trigger).toHaveAttribute('aria-expanded', 'false')
    openEffort()
    expect(trigger).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByTestId('effort-popover')).toHaveAttribute('data-arrow', 'false')
    expect(screen.getByTestId('effort-popover')).toHaveAttribute('data-placement', 'rightTop')
    expect(screen.getAllByRole('menuitemradio').map((item) => item.textContent)).toEqual([
      'ConfigNetworkPage.effortDefault',
      'ConfigNetworkPage.effortOff',
      'ConfigNetworkPage.effortLow',
      'ConfigNetworkPage.effortMedium',
      'ConfigNetworkPage.effortHigh',
      'ConfigNetworkPage.effortXhigh',
      'ConfigNetworkPage.effortMax',
    ])
    expect(screen.getByRole('menuitemradio', { name: 'ConfigNetworkPage.effortLow' })).toHaveAttribute(
      'aria-checked',
      'true',
    )
    const high = screen.getByRole('menuitemradio', { name: 'ConfigNetworkPage.effortHigh' })
    expect(high).not.toHaveAttribute('tabindex')
    fireEvent.keyDown(high, { key: ' ' })
    expect(onChange).not.toHaveBeenCalled()
    fireEvent.click(high)
    expect(trigger).toHaveAttribute('aria-expanded', 'false')
    expect(screen.queryByRole('menuitemradio')).not.toBeInTheDocument()
    expect(onChange).toHaveBeenCalledTimes(1)
  })

  it.each([
    ['effortDefault', undefined],
    ['effortOff', 'off'],
    ['effortHigh', 'high'],
  ])('草稿模式选择 %s 只更新对应字段，保留当前模型和连接配置', (key, expected) => {
    const model = { ...baseModel, ModelName: 'draft-model' }
    const onChange = vi.fn<(mutate: (model: AIModelConfig) => AIModelConfig) => void>()
    render(<AIReasoningEffortSelect model={model} onChange={onChange} />)
    chooseEffort(key as string)
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
    openEffort()
    expect(screen.getByRole('menuitemradio', { name: 'ConfigNetworkPage.effortXhigh' })).toHaveAttribute(
      'aria-checked',
      'true',
    )
    expect(screen.queryByRole('menuitemradio', { name: 'ConfigNetworkPage.effortMax' })).not.toBeInTheDocument()
  })

  it('禁用状态不能打开子菜单', () => {
    render(<AIReasoningEffortSelect model={baseModel} disabled onChange={vi.fn()} />)
    expect(screen.getByRole('button', { name: 'AIReasoningEffort.selectQuality' })).toHaveAttribute(
      'aria-disabled',
      'true',
    )
    openEffort()
    expect(screen.queryByRole('menuitemradio')).not.toBeInTheDocument()
  })
})
