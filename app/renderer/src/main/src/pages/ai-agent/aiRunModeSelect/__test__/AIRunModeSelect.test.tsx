import { cleanup, fireEvent, render as renderComponent, screen, within } from '@testing-library/react'
import type { ButtonHTMLAttributes, ReactElement, ReactNode } from 'react'
import type { IconProps } from '@yakit-libs/yakit-ui-icons/outline'
import { I18nextProvider } from 'react-i18next'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { ModeOptionKey } from '../aiRunModeConstants'
import { ModeOptionList } from '../aiRunModeConstants'
import type { AIExecutionStrategy } from '@/pages/ai-re-act/hooks/grpcApi'
import i18n from '@/i18n/i18n'

const modeState = vi.hoisted(() => ({
  modes: [] as ModeOptionKey[],
  strategy: undefined as AIExecutionStrategy | undefined,
}))
vi.mock('../useAIRunMode', () => ({
  useAIRunMode: () => ({
    selectedModes: ModeOptionList.filter(({ key }) => modeState.modes.includes(key)),
    strategy: modeState.strategy,
    goalMinIterations: modeState.strategy?.GoalMinIterations ?? 0,
  }),
}))

vi.mock('@/i18n/i18n', async () => {
  const [{ createInstance }, { initReactI18next }, zh, en, zhTW] = await Promise.all([
    import('i18next'),
    import('react-i18next'),
    import('@/locales/zh/aiAgent.json'),
    import('@/locales/en/aiAgent.json'),
    import('@/locales/zh-TW/aiAgent.json'),
  ])
  const instance = createInstance()
  await instance.use(initReactI18next).init({
    lng: 'zh',
    fallbackLng: false,
    ns: ['aiAgent'],
    resources: { zh: { aiAgent: zh.default }, en: { aiAgent: en.default }, 'zh-TW': { aiAgent: zhTW.default } },
  })
  return { default: instance }
})

vi.mock('@yakit-libs/yakit-ui-icons/outline', () => ({
  AtomOutlined: () => <svg data-testid="atom-icon" />,
  BoxesOutlined: () => <svg data-testid="multi-agent-icon" />,
  BrainCircuitOutlined: () => <svg data-testid="brain-icon" />,
  ChevronDownOutlined: ({ svgProps }: IconProps) => <svg data-testid="chevron-icon" {...svgProps} />,
  Goal2Outlined: () => <svg data-testid="goal-icon" />,
  ListTodoOutlined: () => <svg data-testid="plan-icon" />,
}))

vi.mock('../AIRunModeMenu', () => ({
  AIRunModeMenu: () => <div data-testid="run-mode-menu" />,
}))

vi.mock('@/components/yakitUI/YakitButton/YakitButton', () => ({
  YakitButton: ({
    icon,
    children,
    type: _type,
    isActive,
    ...props
  }: Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'type'> & {
    icon?: ReactNode
    type?: string
    isActive?: boolean
  }) => (
    <button {...props} data-active={String(isActive)}>
      {icon}
      {children}
    </button>
  ),
}))

vi.mock('@/components/yakitUI/YakitPopover/YakitPopover', () => ({
  YakitPopover: ({
    children,
    content,
    open,
    onOpenChange,
    arrow,
    trigger,
  }: {
    children: ReactNode
    content: ReactNode
    open: boolean
    onOpenChange: (open: boolean) => void
    arrow: boolean
    trigger: string
  }) => (
    <div data-testid="mode-popover" data-arrow={String(arrow)} data-trigger={trigger}>
      <div onClickCapture={() => onOpenChange(!open)}>{children}</div>
      {open && <div>{content}</div>}
    </div>
  ),
}))

import AIRunModeSelect from '../AIRunModeSelect'

const render = (component: ReactElement) =>
  renderComponent(component, {
    wrapper: ({ children }) => <I18nextProvider i18n={i18n}>{children}</I18nextProvider>,
  })

afterEach(cleanup)
beforeEach(async () => {
  modeState.modes = []
  modeState.strategy = undefined
  await i18n.changeLanguage('zh')
})

describe('AIRunModeSelect', () => {
  it.each([
    ['zh', '2种模式', '3种模式', '3种'],
    ['zh-TW', '2種模式', '3種模式', '3種'],
    ['en', '2 modes', '3 modes', '3'],
  ])(
    'renders mode names and counts from the %s translation resources',
    async (language, twoModes, threeModes, short) => {
      await i18n.changeLanguage(language)
      modeState.modes = ['plan']
      const { rerender } = render(<AIRunModeSelect />)
      expect(screen.getByRole('button', { name: 'Plan' })).toHaveTextContent('Plan')
      modeState.modes = ['plan', 'goal']
      rerender(<AIRunModeSelect />)
      expect(within(screen.getByRole('button')).getByText(twoModes)).toBeInTheDocument()
      modeState.modes = ['plan', 'multiAgent', 'goal']
      rerender(<AIRunModeSelect />)
      const button = screen.getByRole('button')
      expect(within(button).getByText(threeModes)).toBeInTheDocument()
      expect(within(button).getByText(short)).toBeInTheDocument()
    },
  )

  it.each<[ModeOptionKey, string]>([
    ['plan', 'Plan'],
    ['multiAgent', 'Multi-Agent'],
    ['goal', 'Goal'],
  ])('shows the name of %s with the menu closed or open', (key, label) => {
    modeState.modes = [key]
    render(<AIRunModeSelect />)
    const button = screen.getByRole('button', { name: label })
    expect(button).toHaveTextContent(label)
    expect(button).toHaveAttribute('data-active', 'true')
    fireEvent.click(button)
    expect(button).toHaveAttribute('data-active', 'true')
    fireEvent.click(button)
    expect(button).toHaveAttribute('data-active', 'true')
  })

  it('stays inactive when all modes are disabled even with the menu open', () => {
    render(<AIRunModeSelect />)
    const button = screen.getByRole('button')
    expect(button).toHaveAttribute('data-active', 'false')
    fireEvent.click(button)
    expect(button).toHaveAttribute('data-active', 'false')
  })

  it('updates when external mode settings change and clears only after the last mode is disabled', () => {
    const { rerender } = render(<AIRunModeSelect />)
    modeState.modes = ['plan', 'goal']
    rerender(<AIRunModeSelect />)
    expect(screen.getByRole('button')).toHaveAttribute('data-active', 'true')
    expect(screen.getByRole('button')).toHaveTextContent('2种模式')
    expect(screen.getByTestId('plan-icon')).toBeInTheDocument()
    expect(screen.getByTestId('goal-icon')).toBeInTheDocument()
    expect(screen.queryByTestId('multi-agent-icon')).not.toBeInTheDocument()
    modeState.modes = ['goal']
    rerender(<AIRunModeSelect />)
    expect(screen.getByRole('button')).toHaveAttribute('data-active', 'true')
    expect(screen.getByRole('button')).toHaveTextContent('Goal')
    expect(screen.queryByTestId('plan-icon')).not.toBeInTheDocument()
    modeState.modes = []
    rerender(<AIRunModeSelect />)
    expect(screen.getByRole('button')).toHaveAttribute('data-active', 'false')
  })

  it('renders the default icon, label and chevron with a click popover and no popover arrow', () => {
    render(<AIRunModeSelect />)
    const button = screen.getByRole('button')
    expect(button).toHaveAccessibleName('执行模式')
    expect(button).not.toHaveAttribute('aria-label')
    expect(within(button).getByTestId('atom-icon')).toBeInTheDocument()
    expect(within(button).getByTestId('chevron-icon')).toBeInTheDocument()
    expect(screen.getByTestId('mode-popover')).toHaveAttribute('data-arrow', 'false')
    expect(screen.getByTestId('mode-popover')).toHaveAttribute('data-trigger', 'click')
    expect(screen.queryByTestId('run-mode-menu')).not.toBeInTheDocument()
  })

  it('shows the three mode icons in design order and the configured Goal duration', () => {
    modeState.modes = ['plan', 'multiAgent', 'goal']
    modeState.strategy = { EnableGoalMode: true, GoalDurationSeconds: 10800 }
    render(<AIRunModeSelect />)

    const button = screen.getByRole('button')
    expect(within(button).getByText('3种模式')).toBeInTheDocument()
    expect(button.closest('[data-goal-kind]')).toHaveAttribute('data-goal-kind', 'duration')
    expect(Array.from(button.querySelectorAll('svg'), (icon) => icon.dataset.testid)).toEqual([
      'plan-icon',
      'multi-agent-icon',
      'goal-icon',
      'chevron-icon',
    ])
    const chevron = within(button).getByTestId('chevron-icon')
    expect(chevron.style.color).toBe('var(--Colors-Use-Neutral-Text-3-Secondary)')
    expect(chevron.parentElement).toHaveAttribute('aria-hidden', 'true')
    expect(within(button).getByText('3h')).toBeInTheDocument()
  })

  it('reveals the complete Goal acceptance criteria on hover and hides it when Goal turns off', async () => {
    const criteria = '核对所有测试的输出，并汇总验收结果和未完成事项。'
    modeState.modes = ['goal']
    modeState.strategy = { EnableGoalMode: true, GoalAcceptanceCriteria: criteria }
    const { rerender } = render(<AIRunModeSelect />)
    const button = screen.getByRole('button')

    fireEvent.mouseOver(within(button).getByText(criteria))
    expect(await screen.findByRole('tooltip')).toHaveTextContent(criteria)

    modeState.modes = ['plan']
    modeState.strategy = { ...modeState.strategy, EnableGoalMode: false }
    rerender(<AIRunModeSelect />)
    expect(screen.getByRole('button', { name: 'Plan' })).not.toHaveTextContent(criteria)
  })

  it.each([
    ['zh', '3种模式', '1次', '2次'],
    ['zh-TW', '3種模式', '1次', '2次'],
    ['en', '3 modes', '1×', '2×'],
  ])('shows and updates the minimum Goal iterations in %s', async (language, label, single, multiple) => {
    await i18n.changeLanguage(language)
    modeState.modes = ['plan', 'multiAgent', 'goal']
    modeState.strategy = { EnableGoalMode: true, GoalMinIterations: 1 }
    const { rerender } = render(<AIRunModeSelect />)
    const button = within(screen.getByRole('button'))
    expect(button.getByText(label)).toBeInTheDocument()
    expect(button.getByText(single)).toBeInTheDocument()

    modeState.strategy = { ...modeState.strategy, GoalMinIterations: 2 }
    rerender(<AIRunModeSelect />)
    expect(button.getByText(multiple)).toBeInTheDocument()

    modeState.modes = ['plan', 'multiAgent']
    modeState.strategy = { ...modeState.strategy, EnableGoalMode: false }
    rerender(<AIRunModeSelect />)
    expect(screen.getByRole('button')).not.toHaveTextContent(multiple)
  })

  it('opens and closes the mode menu through the trigger', () => {
    render(<AIRunModeSelect />)
    fireEvent.click(screen.getByRole('button'))
    expect(screen.getByTestId('run-mode-menu')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button'))
    expect(screen.queryByTestId('run-mode-menu')).not.toBeInTheDocument()
  })

  it('keeps the trigger Enter key from reaching the surrounding composer', () => {
    const onKeyDown = vi.fn()
    render(
      <div onKeyDown={onKeyDown}>
        <AIRunModeSelect />
      </div>,
    )
    expect(fireEvent.keyDown(screen.getByRole('button'), { key: 'Enter' })).toBe(true)
    expect(onKeyDown).not.toHaveBeenCalled()
  })

  it('opens from the input callback and reports manual closing to the input', () => {
    const onOpenChange = vi.fn()
    const { rerender } = render(<AIRunModeSelect open={false} onOpenChange={onOpenChange} />)
    expect(screen.queryByTestId('run-mode-menu')).not.toBeInTheDocument()

    rerender(<AIRunModeSelect open onOpenChange={onOpenChange} />)
    expect(screen.getByTestId('run-mode-menu')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button'))
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })
})
