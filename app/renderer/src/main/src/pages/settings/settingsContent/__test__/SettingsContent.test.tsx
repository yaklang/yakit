import { act, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { SettingsContent } from '../SettingsContent'

vi.mock('@/i18n/useI18nNamespaces', () => ({
  useI18nNamespaces: () => ({
    t: (key: string, options?: { anchor?: string }) => {
      if (key === 'SettingsPage.placeholder') return `placeholder:${options?.anchor}`
      if (key === 'SettingsPage.item.general') return '通用'
      if (key === 'SettingsPage.item.appearance') return '外观'
      if (key === 'SettingsPage.item.reverse') return '反连'
      return key
    },
  }),
}))

vi.mock('../appearance/AppearanceSettings', () => ({
  AppearanceSettings: () => (
    <div data-testid="panel-appearance">
      <div data-settings-section="theme">theme-block</div>
    </div>
  ),
}))
vi.mock('../general/GeneralSettings', () => ({
  GeneralSettings: () => <div data-testid="panel-general">general-panel</div>,
}))
vi.mock('../systemProxy/SystemProxySettings', () => ({ SystemProxySettings: () => <div>proxy-panel</div> }))
vi.mock('../reverse/ReverseSettings', () => ({
  ReverseSettings: () => <div data-testid="panel-reverse">reverse-panel</div>,
}))
vi.mock('../shortcutKey/ShortcutKeySettings', () => ({ ShortcutKeySettings: () => <div>shortcut-panel</div> }))
vi.mock('../globalConfig/GlobalConfigSettings', () => ({ GlobalConfigSettings: () => <div>global-panel</div> }))
vi.mock('../aiModel/AIModelSettings', () => ({ AIModelSettings: () => <div>model-panel</div> }))
vi.mock('../aiConfig/AIConfigSettings', () => ({ AIConfigSettings: () => <div>ai-config-panel</div> }))
vi.mock('../yakMcp/YakMcpSettings', () => ({ YakMcpSettings: () => <div>mcp-panel</div> }))

describe('SettingsContent', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('已注册面板渲染内容；general 显示外层标题', () => {
    render(<SettingsContent anchor="general" />)
    expect(screen.getByText('通用')).toBeInTheDocument()
    expect(screen.getByTestId('panel-general')).toBeInTheDocument()
  })

  it('hideOuterTitle 的 reverse 不渲染外层标题', () => {
    render(<SettingsContent anchor="reverse" />)
    expect(screen.queryByText('反连')).not.toBeInTheDocument()
    expect(screen.getByTestId('panel-reverse')).toBeInTheDocument()
  })

  it('未注册的 right-click-plugins 走 placeholder', () => {
    render(<SettingsContent anchor="right-click-plugins" />)
    expect(screen.getByText('placeholder:right-click-plugins')).toBeInTheDocument()
  })

  it('section 存在时滚动到对应节点', () => {
    vi.useFakeTimers()
    const scrollIntoView = vi.fn()
    HTMLElement.prototype.scrollIntoView = scrollIntoView
    render(<SettingsContent anchor="appearance" section="theme" sectionTick={1} />)
    expect(screen.getByText('theme-block')).toBeInTheDocument()
    act(() => {
      vi.advanceTimersByTime(80)
    })
    expect(scrollIntoView).toHaveBeenCalled()
  })
})
