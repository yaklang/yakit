import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { ComponentType, ReactNode } from 'react'

const mocks = vi.hoisted(() => ({
  selectedModes: [] as Array<{
    key: string
    label: string
    icon: ComponentType<{ className?: string; color?: string }>
  }>,
}))

vi.mock('../AIRunModeSelect.module.scss', () => ({
  default: {
    'run-mode-select': 'run-mode-select',
    'select-option': 'select-option',
    'select-option-text': 'select-option-text',
    'icon-wrapper': 'icon-wrapper',
    'mode-dropdown': 'mode-dropdown',
  },
}))

vi.mock('../useAIRunMode', () => ({
  useAIRunMode: () => ({ selectedModes: mocks.selectedModes }),
}))

vi.mock('@/i18n/useI18nNamespaces', () => ({
  useI18nNamespaces: () => ({
    t: (key: string) => key,
    i18nRefresh: 0,
  }),
}))

vi.mock('../AIRunModeMenu', () => ({
  AIRunModeMenu: () => <div data-testid="run-mode-menu" />,
}))

vi.mock('@/pages/ai-re-act/aiReviewRuleSelect/AIReviewRuleSelect', () => ({
  AIChatSelect: ({
    children,
    open,
    setOpen,
    dropdownRender,
  }: {
    children?: ReactNode
    open?: boolean
    setOpen?: (open: boolean) => void
    dropdownRender?: () => ReactNode
  }) => (
    <div data-testid="ai-chat-select" data-open={String(!!open)}>
      <button type="button" data-testid="mode-trigger" onClick={() => setOpen?.(!open)}>
        {children}
      </button>
      {open ? <div data-testid="mode-dropdown">{dropdownRender?.()}</div> : null}
    </div>
  ),
}))

vi.mock('@/components/yakitUI/YakitSelect/YakitSelect', () => {
  const Option = ({ label, children }: { label?: ReactNode; children?: ReactNode }) => (
    <div data-testid="mode-pill">{label ?? children}</div>
  )
  const Select = ({ children }: { children?: ReactNode }) => <>{children}</>
  Select.Option = Option
  return { YakitSelect: Select }
})

import AIRunModeSelect from '../AIRunModeSelect'

const DummyIcon: ComponentType<{ className?: string; color?: string }> = (props) => (
  <span data-testid="mode-icon" {...props} />
)

describe('AIRunModeSelect', () => {
  beforeEach(() => {
    mocks.selectedModes = []
  })

  it('未选模式时 pill 显示「模式」文案', () => {
    render(<AIRunModeSelect />)
    expect(screen.getByTestId('mode-pill')).toHaveTextContent('AIRunModeSelect.mode')
    expect(screen.getByTitle('AIRunModeSelect.mode')).toBeInTheDocument()
  })

  it('选中单个模式时 pill 显示该模式文案', () => {
    mocks.selectedModes = [{ key: 'plan', label: 'Plan', icon: DummyIcon }]
    render(<AIRunModeSelect />)
    expect(screen.getByTestId('mode-pill')).toHaveTextContent('AIMilkdownModeSlash.plan')
  })

  it('选中多个模式时 pill 显示多模式文案', () => {
    mocks.selectedModes = [
      { key: 'plan', label: 'Plan', icon: DummyIcon },
      { key: 'goal', label: 'Goal', icon: DummyIcon },
    ]
    render(<AIRunModeSelect />)
    expect(screen.getByTestId('mode-pill')).toHaveTextContent('AIRunModeSelect.multiMode')
  })

  it('点击触发展开并渲染 AIRunModeMenu，再次点击收起', () => {
    render(<AIRunModeSelect />)
    expect(screen.getByTestId('ai-chat-select')).toHaveAttribute('data-open', 'false')
    expect(screen.queryByTestId('run-mode-menu')).not.toBeInTheDocument()

    fireEvent.click(screen.getByTestId('mode-trigger'))
    expect(screen.getByTestId('ai-chat-select')).toHaveAttribute('data-open', 'true')
    expect(screen.getByTestId('run-mode-menu')).toBeInTheDocument()

    fireEvent.click(screen.getByTestId('mode-trigger'))
    expect(screen.getByTestId('ai-chat-select')).toHaveAttribute('data-open', 'false')
    expect(screen.queryByTestId('run-mode-menu')).not.toBeInTheDocument()
  })

  it('pill 含 select-option-text，供窄容器（@container <300px）隐藏文案', () => {
    render(<AIRunModeSelect />)
    const text = screen.getByTestId('mode-pill').querySelector('.select-option-text')
    expect(text).toBeTruthy()
    expect(text).toHaveTextContent('AIRunModeSelect.mode')
  })
})
