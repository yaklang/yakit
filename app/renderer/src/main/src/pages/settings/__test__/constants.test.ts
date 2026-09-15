import { describe, expect, it } from 'vitest'
import {
  SettingsMenu,
  SettingsSections,
  getSettingsGroupLabel,
  getSettingsLabel,
  type SettingsAnchor,
  type SettingsGroupKey,
} from '../constants'

const t = (key: string) => (key === 'SettingsPage.item.general' ? '通用' : key)

describe('getSettingsLabel', () => {
  it('命中文案时返回翻译结果', () => {
    expect(getSettingsLabel('general', t)).toBe('通用')
  })

  it('缺文案时回退到锚点本身', () => {
    expect(getSettingsLabel('missing-anchor', t)).toBe('missing-anchor')
  })
})

describe('getSettingsGroupLabel', () => {
  it('拼出分组 i18n key', () => {
    const groupT = (key: string) => key
    expect(getSettingsGroupLabel('preference' as SettingsGroupKey, groupT)).toBe('SettingsPage.group.preference')
  })
})

describe('SettingsMenu', () => {
  it('侧边菜单覆盖全部锚点分组', () => {
    const keys = SettingsMenu.flatMap((group) => group.items.map((item) => item.key))
    const expected: SettingsAnchor[] = [
      'general',
      'appearance',
      'shortcut-key',
      'reverse',
      'system-proxy',
      'global-config',
      'right-click-plugins',
      'ai-config',
      'ai-model',
      'yak-mcp',
    ]
    expect(keys).toEqual(expected)
  })
})

describe('SettingsSections', () => {
  it('section id 与设置页 data-settings-section 对齐', () => {
    expect(SettingsSections.appearance.theme).toBe('theme')
    expect(SettingsSections['ai-config'].permissions).toBe('permissions')
    expect(SettingsSections['yak-mcp'].toolConfig).toBe('tool-config')
    expect(SettingsSections['right-click-plugins'].historySingle).toBe('plugin-extension-single')
    expect(SettingsSections['right-click-plugins'].packet).toBe('packet-context-menu')
  })
})
