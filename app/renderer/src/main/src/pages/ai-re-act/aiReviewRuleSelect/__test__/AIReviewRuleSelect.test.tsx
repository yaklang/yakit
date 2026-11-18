import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import AIReviewRuleSelect from '../AIReviewRuleSelect'
import styles from '../AIReviewRuleSelect.module.scss'
import type { AIStartParams } from '../../hooks/grpcApi'

const mocks = vi.hoisted(() => ({
  setting: { ReviewPolicy: 'ai', AIReviewRiskControlScore: 0.5 } as Pick<
    AIStartParams,
    'ReviewPolicy' | 'AIReviewRiskControlScore'
  >,
  execute: false,
  setSetting: vi.fn(),
  onSend: vi.fn(),
}))

// 根测试配置将样式模块替换为空对象，为状态和弹层定位提供稳定类名。
vi.mock('../AIReviewRuleSelect.module.scss', () => ({
  default: {
    'select-icon-wrapper': 'select-icon-wrapper',
    'select-option-ai': 'select-option-ai',
    'select-option-yolo': 'select-option-yolo',
    'ai-chat-select-wrapper': 'ai-chat-select-wrapper',
    'drop-select-wrapper': 'drop-select-wrapper',
  },
}))

vi.mock('@/pages/ai-agent/useContext/useStore', () => ({ default: () => ({ setting: mocks.setting }) }))
vi.mock('@/pages/ai-agent/useContext/useDispatcher', () => ({
  default: () => ({ setSetting: mocks.setSetting, onSend: mocks.onSend }),
}))
vi.mock('../../hooks/useCurrentSessionId', () => ({ default: () => 'session-1' }))
vi.mock('../../hooks/useCurrentDataBySession', () => ({ useCurrentStore: () => ({}) }))
vi.mock('zustand', () => ({
  useStore: (_store: unknown, selector: (state: { execute: boolean }) => unknown) =>
    selector({ execute: mocks.execute }),
}))
vi.mock('@/i18n/useI18nNamespaces', async () => {
  const { default: zh } = await import('@/locales/zh/aiAgent.json')
  return {
    useI18nNamespaces: () => ({
      t: (key: string) => (key === 'AIChatSetting.riskThreshold' ? zh.AIChatSetting.riskThreshold : key),
    }),
  }
})
vi.mock('@/pages/ai-agent/defaultConstant', async () => {
  const { default: zh } = await import('@/locales/zh/aiAgent.json')
  return {
    AIAgentSettingDefault: { ReviewPolicy: 'ai', AIReviewRiskControlScore: 0.5 },
    AIReviewRuleOptions: [
      { value: 'manual', label: '人工', describe: '人工审核操作' },
      { value: 'yolo', label: zh.AIReviewRuleOptions.yoloLabel, describe: '自动执行操作' },
      { value: 'ai', label: zh.AIReviewRuleOptions.aiLabel, describe: 'AI 协同审核' },
    ],
    AIReviewRuleIconMap: {
      manual: {
        get icon() {
          return <svg data-testid="dropdown-manual-icon" />
        },
      },
      yolo: {
        get icon() {
          return <svg data-testid="dropdown-yolo-icon" />
        },
      },
      ai: {
        get icon() {
          return <svg data-testid="dropdown-ai-icon" />
        },
      },
    },
  }
})
vi.mock('@/components/yakitUI/YakitSelect/YakitSelect', async () => {
  const { Select } = await import('antd')
  return { YakitSelect: Select }
})
beforeEach(() => {
  vi.clearAllMocks()
  mocks.setting.ReviewPolicy = 'ai'
  mocks.setting.AIReviewRiskControlScore = 0.5
  mocks.execute = false
})
afterEach(cleanup)

describe('AIReviewRuleSelect selected display', () => {
  it.each([
    ['ai', '协同'],
    ['yolo', 'YOLO'],
    ['manual', '人工'],
  ] as const)('shows the %s policy without a dropdown arrow or icon background', (policy, label) => {
    mocks.setting.ReviewPolicy = policy
    const { container } = render(<AIReviewRuleSelect />)

    const selected = container.querySelector('.ant-select-selection-item')!
    expect(selected).toHaveTextContent(label)
    expect(container.querySelector('.ant-select-arrow')).toBeNull()
    expect(container.querySelector('.ant-select')).toHaveClass('ant-select-borderless')
    const icon = selected.querySelector(`.${styles['select-icon-wrapper']}`)!
    expect(icon.classList).toHaveLength(1)
    expect(icon.querySelector('svg')).not.toBeNull()

    if (policy === 'ai') {
      expect(selected.firstElementChild).toHaveClass(styles['select-option-ai'])
      expect(icon.querySelectorAll('linearGradient')).toHaveLength(3)
    }
    expect(screen.queryByRole('button', { name: '风险阈值' })).not.toBeInTheDocument()
    expect(screen.queryByRole('slider')).not.toBeInTheDocument()
    if (policy === 'yolo') expect(selected.firstElementChild).toHaveClass(styles['select-option-yolo'])
    if (policy === 'manual') expect(icon.querySelector('path')?.getAttribute('d')).toMatch(/^M7 11\.5V14/)
  })

  it('preserves dropdown entries and immediately closes and commits the clicked policy', () => {
    mocks.execute = true
    const { container } = render(<AIReviewRuleSelect />)
    const trigger = container.querySelector(`.${styles['ai-chat-select-wrapper']}`)!
    fireEvent.click(trigger)

    const dropdown = document.querySelector(`.${styles['drop-select-wrapper']}`) as HTMLElement
    expect(dropdown).not.toBeNull()
    expect(within(dropdown).getByText('回答模式')).toBeInTheDocument()
    for (const policy of ['manual', 'yolo', 'ai']) {
      expect(within(dropdown).getByTestId(`dropdown-${policy}-icon`)).toBeInTheDocument()
    }
    expect(within(dropdown).getByText('人工审核操作')).toBeInTheDocument()
    expect(within(dropdown).getByText('自动执行操作')).toBeInTheDocument()
    expect(within(dropdown).getByText('AI 协同审核')).toBeInTheDocument()

    fireEvent.click(within(dropdown).getByText('YOLO'))
    expect(screen.getByRole('combobox')).toHaveAttribute('aria-expanded', 'false')
    expect(mocks.setSetting).toHaveBeenCalledOnce()
    expect(mocks.setSetting.mock.calls[0][0](mocks.setting)).toEqual({ ...mocks.setting, ReviewPolicy: 'yolo' })
    expect(mocks.onSend).toHaveBeenCalledWith(
      expect.objectContaining({
        token: 'session-1',
        params: expect.objectContaining({ IsConfigHotpatch: true, Params: { ReviewPolicy: 'yolo' } }),
      }),
    )
  })

  it('closes when clicking the current policy without hotpatching it', () => {
    mocks.execute = true
    const { container } = render(<AIReviewRuleSelect />)
    fireEvent.click(container.querySelector(`.${styles['ai-chat-select-wrapper']}`)!)
    const dropdown = document.querySelector(`.${styles['drop-select-wrapper']}`) as HTMLElement

    fireEvent.click(within(dropdown).getByText('协同'))

    expect(screen.getByRole('combobox')).toHaveAttribute('aria-expanded', 'false')
    expect(mocks.setSetting).not.toHaveBeenCalled()
    expect(mocks.onSend).not.toHaveBeenCalled()
  })

  it('keeps the current policy when dismissing the dropdown without selecting', () => {
    const { container } = render(<AIReviewRuleSelect />)
    fireEvent.click(container.querySelector(`.${styles['ai-chat-select-wrapper']}`)!)
    fireEvent.mouseDown(document.body)

    expect(screen.getByRole('combobox')).toHaveAttribute('aria-expanded', 'false')
    expect(mocks.setSetting).not.toHaveBeenCalled()
  })

  it('keeps the dropdown open and reveals the inline threshold when switching to AI collaboration', () => {
    mocks.setting.ReviewPolicy = 'manual'
    const { container } = render(<AIReviewRuleSelect />)
    fireEvent.click(container.querySelector(`.${styles['ai-chat-select-wrapper']}`)!)
    expect(screen.queryByRole('slider')).not.toBeInTheDocument()

    const dropdown = document.querySelector(`.${styles['drop-select-wrapper']}`) as HTMLElement
    fireEvent.click(within(dropdown).getByText('协同'))

    expect(screen.getByRole('combobox')).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByRole('slider', { name: '风险阈值' })).toHaveAttribute('aria-valuenow', '0.5')
    expect(mocks.setSetting.mock.calls[0][0](mocks.setting)).toEqual({ ...mocks.setting, ReviewPolicy: 'ai' })
  })

  it('saves the edited threshold and hot-updates a running session when the dropdown closes', () => {
    mocks.execute = true
    const { container, rerender } = render(<AIReviewRuleSelect />)
    const trigger = container.querySelector(`.${styles['ai-chat-select-wrapper']}`)!
    fireEvent.click(trigger)
    const slider = screen.getByRole('slider', { name: '风险阈值' })
    fireEvent.keyDown(slider, { key: 'Home', keyCode: 36, which: 36 })

    expect(slider).toHaveAttribute('aria-valuenow', '0')
    expect(mocks.setSetting).not.toHaveBeenCalled()
    expect(mocks.onSend).not.toHaveBeenCalled()

    fireEvent.mouseDown(document.body)

    expect(mocks.setSetting.mock.calls[0][0](mocks.setting)).toEqual({ ...mocks.setting, AIReviewRiskControlScore: 0 })
    expect(mocks.onSend).toHaveBeenCalledWith(
      expect.objectContaining({
        token: 'session-1',
        params: expect.objectContaining({ IsConfigHotpatch: true, Params: { AIReviewRiskControlScore: 0 } }),
      }),
    )
    mocks.setting = { ...mocks.setting, AIReviewRiskControlScore: 0 }
    rerender(<AIReviewRuleSelect />)
    fireEvent.click(trigger)
    expect(screen.getByRole('slider', { name: '风险阈值' })).toHaveAttribute('aria-valuenow', '0')
    expect(mocks.onSend).toHaveBeenCalledOnce()
  })
})
