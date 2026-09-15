import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { YakitModeEnum } from '@/store/softMode'
import { AppearanceSettings } from '../AppearanceSettings'

const setTheme = vi.fn()
const setSoftMode = vi.fn()
const changeLanguage = vi.fn()

vi.mock('@/i18n/useI18nNamespaces', () => ({
  useI18nNamespaces: () => ({
    t: (key: string) => key,
    i18n: { language: 'zh', changeLanguage },
  }),
}))

vi.mock('@/hook/useTheme', () => ({
  useTheme: () => ({ themeMode: 'light', setTheme }),
}))

vi.mock('@/store/softMode', async (importOriginal) => {
  const actual = (await importOriginal()) as Record<string, unknown>
  return {
    ...actual,
    useSoftMode: () => ({ softMode: YakitModeEnum.Classic, setSoftMode }),
  }
})

vi.mock('@/utils/envfile', async (importOriginal) => {
  const actual = (await importOriginal()) as Record<string, unknown>
  return {
    ...actual,
    isCommunityYakit: () => true,
  }
})

vi.mock('@/auxWindow/utils/messaging', () => ({
  syncAppSettings: vi.fn(),
}))

vi.mock('../../assets/theme-preview-light.png', () => ({ default: 'light.png' }))
vi.mock('../../assets/theme-preview-dark.png', () => ({ default: 'dark.png' }))

describe('AppearanceSettings', () => {
  it('展示主题 / 模式 / 语言区块，点击主题会 setTheme', async () => {
    const user = userEvent.setup()
    render(<AppearanceSettings />)
    expect(screen.getByText('SettingsPage.appearance.theme')).toBeInTheDocument()
    expect(screen.getByText('SettingsPage.appearance.mode')).toBeInTheDocument()
    expect(screen.getByText('SettingsPage.appearance.language')).toBeInTheDocument()

    await user.click(screen.getByText('SettingsPage.appearance.dark'))
    expect(setTheme).toHaveBeenCalledWith('dark')

    await user.click(screen.getByText('SettingsPage.appearance.securityExpert'))
    expect(setSoftMode).toHaveBeenCalledWith(YakitModeEnum.SecurityExpert)
  })
})
