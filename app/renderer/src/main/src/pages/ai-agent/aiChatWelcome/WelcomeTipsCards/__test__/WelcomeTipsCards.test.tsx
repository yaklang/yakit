import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import emiter from '@/utils/eventBus/eventBus'
import { AIAgentTabListEnum, AITabsEnum, SwitchAIAgentTabEventEnum } from '../../../defaultConstant'
import WelcomeTipsCards from '../WelcomeTipsCards'

vi.mock('ahooks', async () => ({
  ...(await vi.importActual('ahooks')),
  useInViewport: () => [true],
}))
vi.mock('@/i18n/useI18nNamespaces', () => ({
  useI18nNamespaces: () => ({ t: (key: string) => key }),
}))
vi.mock('../../hooks/useWelcomePanelStats', () => ({
  useWelcomePanelStats: () => ({ riskTotal: 12, trafficTotal: 34, riskCounts: undefined }),
}))
vi.mock('../../../components/aiFileSystemList/store/useCustomFolder', () => ({
  useCustomFolder: () => [{ path: '/a' }, { path: '/b' }],
}))
vi.mock('react-countup', () => ({
  default: ({ end }: { end: number }) => <span data-testid="count-up">{end}</span>,
}))
vi.mock('../../icon', () => ({
  ColorsRiskIcon: () => <span>risk-icon</span>,
  ColorsFlowIcon: () => <span>flow-icon</span>,
  ColorsFileSystemIcon: () => <span>file-icon</span>,
}))
vi.mock('../WelcomeTipsCards.module.scss', () => ({
  default: {
    'welcome-tips-list': 'welcome-tips-list',
    'welcome-tips-list-compact': 'welcome-tips-list-compact',
    'welcome-tip-card': 'welcome-tip-card',
    'welcome-tip-card-compact': 'welcome-tip-card-compact',
    'welcome-tip-footer': 'welcome-tip-footer',
    'welcome-tip-number': 'welcome-tip-number',
    'welcome-tip-title': 'welcome-tip-title',
    'welcome-tip-title-text': 'welcome-tip-title-text',
    'welcome-tip-compact-title': 'welcome-tip-compact-title',
  },
}))

beforeEach(() => {
  vi.clearAllMocks()
})

afterEach(() => {
  cleanup()
})

describe('WelcomeTipsCards', () => {
  it('渲染三张卡片及统计数字', () => {
    render(<WelcomeTipsCards />)
    expect(screen.getByText('AIChatWelcome.tipRiskTitle')).toBeInTheDocument()
    expect(screen.getByText('AIChatWelcome.tipTrafficTitle')).toBeInTheDocument()
    expect(screen.getByText('AIChatWelcome.tipFileSystemTitle')).toBeInTheDocument()
    expect(screen.getAllByTestId('count-up').map((node) => node.textContent)).toEqual(['12', '34', '2'])
  })

  it('三列标题可截断，完整文案放在 title 上', () => {
    const { container } = render(<WelcomeTipsCards />)
    const titles = [...container.querySelectorAll('.welcome-tip-title-text')]
    expect(titles).toHaveLength(3)
    expect(titles.map((node) => node.getAttribute('title'))).toEqual([
      'AIChatWelcome.tipRiskTitle',
      'AIChatWelcome.tipTrafficTitle',
      'AIChatWelcome.tipFileSystemTitle',
    ])
    expect(titles.every((node) => node.classList.contains('yakit-content-single-ellipsis'))).toBe(true)
  })

  it('点击漏洞卡片切换 Risk tab', () => {
    const emitSpy = vi.spyOn(emiter, 'emit')
    render(<WelcomeTipsCards />)
    fireEvent.click(screen.getAllByRole('button')[0])
    expect(emitSpy).toHaveBeenCalledWith('switchAIActTab', JSON.stringify({ key: AITabsEnum.Risk }))
  })

  it('点击流量卡片切换 HTTP tab', () => {
    const emitSpy = vi.spyOn(emiter, 'emit')
    render(<WelcomeTipsCards />)
    const footers = screen.getAllByRole('button')
    fireEvent.click(footers[1])
    expect(emitSpy).toHaveBeenCalledWith('switchAIActTab', JSON.stringify({ key: AITabsEnum.HTTP }))
  })

  it('点击文件系统卡片展开左侧文件树', () => {
    const emitSpy = vi.spyOn(emiter, 'emit')
    render(<WelcomeTipsCards />)
    fireEvent.click(screen.getByText('AIChatWelcome.tipOpenFileTree'))
    expect(emitSpy).toHaveBeenCalledWith(
      'switchAIAgentTab',
      JSON.stringify({
        type: SwitchAIAgentTabEventEnum.SET_TAB_ACTIVE,
        params: { active: AIAgentTabListEnum.File, show: true, toggle: true },
      }),
    )
  })

  it('卡片入口是可聚焦的原生按钮，Enter 可激活', async () => {
    const emitSpy = vi.spyOn(emiter, 'emit')
    render(<WelcomeTipsCards />)
    const footers = screen.getAllByRole('button')
    expect(footers).toHaveLength(3)
    expect(footers.every((node) => node.tagName === 'BUTTON' && node.getAttribute('tabIndex') !== '-1')).toBe(true)
    footers[0].focus()
    await userEvent.keyboard('{Enter}')
    expect(emitSpy).toHaveBeenCalledWith('switchAIActTab', JSON.stringify({ key: AITabsEnum.Risk }))
  })

  it('compact 模式下整卡可点且使用 compact 样式', () => {
    const emitSpy = vi.spyOn(emiter, 'emit')
    const { container } = render(<WelcomeTipsCards compact />)
    expect(container.querySelector('.welcome-tips-list-compact')).toBeTruthy()
    expect(container.querySelectorAll('.welcome-tip-card-compact')).toHaveLength(3)
    const compactCards = screen.getAllByRole('button')
    expect(compactCards).toHaveLength(3)
    expect(compactCards[0].tagName).toBe('BUTTON')
    fireEvent.click(compactCards[0])
    expect(emitSpy).toHaveBeenCalledWith('switchAIActTab', JSON.stringify({ key: AITabsEnum.Risk }))
  })
})
