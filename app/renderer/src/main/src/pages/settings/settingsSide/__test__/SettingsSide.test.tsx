import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { SettingsSide } from '../SettingsSide'

vi.mock('@/i18n/useI18nNamespaces', () => ({
  useI18nNamespaces: () => ({
    t: (key: string) => {
      const map: Record<string, string> = {
        'SettingsPage.group.preference': '偏好',
        'SettingsPage.group.system': '系统',
        'SettingsPage.group.ai': 'AI',
        'SettingsPage.item.general': '通用',
        'SettingsPage.item.appearance': '外观',
        'SettingsPage.item.shortcut-key': '快捷键',
        'SettingsPage.item.reverse': '反连',
        'SettingsPage.item.system-proxy': '系统代理',
        'SettingsPage.item.global-config': '全局配置',
        'SettingsPage.item.right-click-plugins': '右键插件',
        'SettingsPage.item.ai-config': 'AI 配置',
        'SettingsPage.item.ai-model': 'AI 模型',
        'SettingsPage.item.yak-mcp': 'Yak MCP',
        'SettingsPage.searchPlaceholder': '搜索',
      }
      return map[key] || key
    },
    i18n: { language: 'zh' },
  }),
}))

describe('SettingsSide', () => {
  it('点击菜单项回调对应锚点', async () => {
    const user = userEvent.setup()
    const onSelect = vi.fn()
    render(<SettingsSide activeAnchor="general" onSelect={onSelect} />)
    await user.click(screen.getByText('外观'))
    expect(onSelect).toHaveBeenCalledWith('appearance')
  })

  it('按标题或菜单名过滤；分组名命中时保留整组', async () => {
    const user = userEvent.setup()
    render(<SettingsSide activeAnchor="general" onSelect={vi.fn()} />)
    const search = screen.getByPlaceholderText('搜索')

    await user.type(search, '外观')
    expect(screen.getByText('外观')).toBeInTheDocument()
    expect(screen.queryByText('通用')).not.toBeInTheDocument()
    expect(screen.queryByText('AI 模型')).not.toBeInTheDocument()

    await user.clear(search)
    await user.type(search, 'ai')
    expect(screen.getByText('AI 配置')).toBeInTheDocument()
    expect(screen.getByText('AI 模型')).toBeInTheDocument()
    expect(screen.queryByText('通用')).not.toBeInTheDocument()
  })
})
