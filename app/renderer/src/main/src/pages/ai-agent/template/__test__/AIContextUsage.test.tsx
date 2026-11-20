import type { ReactNode } from 'react'
import { fireEvent, render, screen, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import AIContextUsage from '../AIContextUsage/AIContextUsage'
import en from '@/locales/en/aiAgent.json'

const mocks = vi.hoisted(() => ({
  context: {
    enabled: true,
    editorThresholdTokens: 500000,
    minimumThresholdTokens: 100000,
    editorDisableAutoAdjust: false,
    waitingForContext: false,
    thresholdTokens: 500000 as number | undefined,
    promptTokens: 125000 as number | undefined,
    disableAutoAdjust: false,
    loading: false,
    saving: false,
    identityRetryAvailable: false,
    error: undefined as string | undefined,
  },
  save: vi.fn(),
  retry: vi.fn(),
  getModel: vi.fn(),
  session: { rawData: { modelContext: {} } },
}))
vi.mock('@/pages/ai-agent/useContext/useAIModelContext', () => ({
  default: () => ({ ...mocks.context, save: mocks.save, retry: mocks.retry }),
}))
vi.mock('@/pages/ai-re-act/hooks/useCurrentDataBySession', () => ({ useCurrentRawData: () => mocks.session.rawData }))
vi.mock('../../grpc', () => ({ grpcGetAIModelContext: mocks.getModel }))
vi.mock('@/pages/ai-re-act/hooks/useAIGlobalConfig', () => ({ getCanonicalAIGlobalConfig: vi.fn() }))
vi.mock('@/i18n/useI18nNamespaces', () => ({
  useI18nNamespaces: () => ({
    t: (key: string, values: Record<string, unknown> = {}) =>
      (en.AIContextUsage[key.split('.')[1] as keyof typeof en.AIContextUsage] ?? key).replace(
        /\{\{(\w+)\}\}/g,
        (_, name: string) => String(values[name] ?? ''),
      ),
  }),
}))
vi.mock('@/components/yakitUI/YakitPopover/YakitPopover', () => ({
  YakitPopover: ({
    children,
    content,
    open,
    arrow,
    onOpenChange,
  }: {
    children: ReactNode
    content: ReactNode
    open: boolean
    arrow: boolean
    onOpenChange: (open: boolean) => void
  }) => (
    <div data-testid="popover" data-arrow={String(arrow)}>
      <div onClick={() => onOpenChange(!open)}>{children}</div>
      {open && <div data-testid="popover-content">{content}</div>}
      <button onClick={() => onOpenChange(!open)}>Toggle popover</button>
    </div>
  ),
}))

describe('AIContextUsage', () => {
  beforeEach(() => {
    mocks.context.enabled = true
    mocks.context.promptTokens = 125000
    mocks.context.thresholdTokens = 500000
    mocks.context.identityRetryAvailable = false
    mocks.context.error = undefined
    mocks.save.mockClear()
    mocks.retry.mockClear()
    mocks.getModel.mockClear()
  })

  it('无箭头弹层显示实际用量、剩余、上限及共享设置', () => {
    render(<AIContextUsage />)
    expect(screen.getByRole('button', { name: 'Context 25%' })).toHaveClass('ant-btn')
    expect(screen.getByRole('button', { name: 'Context 25%' })).toHaveAttribute('data-ai-context-usage')
    expect(screen.getByRole('button', { name: 'Context 25%' })).toHaveAttribute('aria-expanded', 'false')
    fireEvent.click(screen.getByRole('button', { name: 'Toggle popover' }))
    expect(mocks.getModel).not.toHaveBeenCalled()
    expect(screen.getByTestId('popover')).toHaveAttribute('data-arrow', 'false')
    const panel = within(screen.getByTestId('popover-content'))
    expect(panel.getByText('Used 125K, remaining 375K')).toBeInTheDocument()
    expect(panel.getByText('(limit 500K)')).toBeInTheDocument()
    expect(panel.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '25')
    expect(panel.getByRole('spinbutton', { name: 'Context compression threshold' })).toHaveValue('500')
    expect(mocks.save).not.toHaveBeenCalled()
  })

  it.each(['Escape', '外部关闭'])('用量弹窗中保留草稿，%s 时一次提交组合修改', (method) => {
    render(<AIContextUsage />)
    const toggle = screen.getByRole('button', { name: 'Toggle popover' })
    fireEvent.click(toggle)
    const input = screen.getByRole('spinbutton')
    fireEvent.change(input, { target: { value: '650' } })
    fireEvent.blur(input)
    fireEvent.click(screen.getByRole('switch'))
    expect(screen.getByRole('button', { name: 'Context 25%' })).toBeInTheDocument()
    expect(mocks.save).not.toHaveBeenCalled()
    if (method === 'Escape') fireEvent.keyDown(input, { key: 'Escape' })
    else fireEvent.click(toggle)
    expect(screen.queryByTestId('popover-content')).not.toBeInTheDocument()
    expect(mocks.save).toHaveBeenCalledExactlyOnceWith({ threshold_tokens: 650000, disable_auto_adjust: true })
  })

  it.each([
    [79999, 'Main'],
    [80000, 'Warning'],
    [99999, 'Warning'],
    [100000, 'Error'],
    [125000, 'Error'],
  ] as const)('阈值为 100K、用量为 %i 时检查圆环和文字的 %s 配色', (tokens, color) => {
    mocks.context.thresholdTokens = 100000
    mocks.context.promptTokens = tokens
    render(<AIContextUsage />)
    const strokes = screen.getByRole('progressbar').querySelectorAll<SVGCircleElement>('circle')
    const themeColor = `var(--Colors-Use-${color}-Primary)`
    expect(Array.from(strokes, (circle) => circle.style.stroke)).toContain(themeColor)
    expect(screen.getByText(/^Context \d+%$/).style.color).toBe(color === 'Main' ? '' : themeColor)
  })

  it('超限显示实际比例，图形封顶且剩余为零', () => {
    mocks.context.promptTokens = 625000
    render(<AIContextUsage />)
    fireEvent.click(screen.getByRole('button', { name: 'Toggle popover' }))
    expect(screen.getByRole('button', { name: 'Context 125%' })).toBeInTheDocument()
    const panel = within(screen.getByTestId('popover-content'))
    expect(panel.getByText('Used 625K, remaining 0')).toBeInTheDocument()
    expect(panel.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '100')
    expect(panel.getByRole('progressbar')).toHaveAttribute('aria-valuetext', '125%')
  })

  it('缺少实时用量时隐藏入口，收到有效用量后显示', () => {
    mocks.context.promptTokens = undefined
    const { container, rerender } = render(<AIContextUsage />)
    expect(container).toBeEmptyDOMElement()
    mocks.context.promptTokens = 125000
    rerender(<AIContextUsage />)
    expect(screen.getByRole('button', { name: 'Context 25%' })).toBeInTheDocument()
  })

  it('身份查询失败且无实测用量时提供重试入口，恢复后显示用量', () => {
    mocks.context.enabled = false
    mocks.context.promptTokens = undefined
    mocks.context.thresholdTokens = undefined
    mocks.context.identityRetryAvailable = true
    mocks.context.error = 'identity lookup failed'
    const { rerender } = render(<AIContextUsage />)
    const retry = screen.getByRole('button', { name: en.AIContextUsage.retryUsage })
    expect(retry).toHaveAttribute('data-ai-context-usage')
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument()
    fireEvent.click(retry)
    expect(mocks.retry).toHaveBeenCalledOnce()
    expect(mocks.save).not.toHaveBeenCalled()
    mocks.context.identityRetryAvailable = false
    mocks.context.enabled = true
    mocks.context.promptTokens = 125000
    mocks.context.thresholdTokens = 500000
    rerender(<AIContextUsage />)
    expect(screen.queryByRole('button', { name: en.AIContextUsage.retryUsage })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Context 25%' })).toBeInTheDocument()
  })

  it('数据清空后隐藏入口，恢复数据时弹层保持关闭', () => {
    const { container, rerender } = render(<AIContextUsage />)
    fireEvent.click(screen.getByRole('button', { name: 'Toggle popover' }))
    expect(screen.getByTestId('popover-content')).toBeInTheDocument()
    mocks.context.promptTokens = undefined
    mocks.context.thresholdTokens = undefined
    rerender(<AIContextUsage />)
    expect(container).toBeEmptyDOMElement()
    mocks.context.promptTokens = 125000
    mocks.context.thresholdTokens = 500000
    rerender(<AIContextUsage />)
    expect(screen.getByRole('button', { name: 'Context 25%' })).toHaveClass('ant-btn')
    expect(screen.getByRole('button', { name: 'Context 25%' })).toHaveAttribute('data-ai-context-usage')
    expect(screen.getByRole('button', { name: 'Context 25%' })).toHaveAttribute('aria-expanded', 'false')
    expect(screen.queryByTestId('popover-content')).not.toBeInTheDocument()
  })

  it('切换会话后新会话的弹层默认关闭', () => {
    const { rerender } = render(<AIContextUsage key="session-a" />)
    fireEvent.click(screen.getByRole('button', { name: 'Toggle popover' }))
    rerender(<AIContextUsage key="session-b" />)
    expect(screen.getByRole('button', { name: 'Context 25%' })).toHaveClass('ant-btn')
    expect(screen.getByRole('button', { name: 'Context 25%' })).toHaveAttribute('data-ai-context-usage')
    expect(screen.getByRole('button', { name: 'Context 25%' })).toHaveAttribute('aria-expanded', 'false')
    expect(screen.queryByTestId('popover-content')).not.toBeInTheDocument()
  })

  it('模型不支持上下文设置时隐藏入口', () => {
    mocks.context.enabled = false
    const { container } = render(<AIContextUsage />)
    expect(container).toBeEmptyDOMElement()
  })

  it('缺少有效阈值时隐藏入口', () => {
    mocks.context.thresholdTokens = undefined
    const { container } = render(<AIContextUsage />)
    expect(container).toBeEmptyDOMElement()
  })

  it('有效零用量显示百分之零', () => {
    mocks.context.promptTokens = 0
    render(<AIContextUsage />)
    expect(screen.getByRole('button', { name: 'Context 0%' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Toggle popover' }))
    const panel = within(screen.getByTestId('popover-content'))
    expect(panel.getByText('Used 0, remaining 500K')).toBeInTheDocument()
    expect(panel.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '0')
  })
})
