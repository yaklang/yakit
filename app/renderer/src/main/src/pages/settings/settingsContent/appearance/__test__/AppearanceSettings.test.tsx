import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { YakitModeEnum } from '@/store/softMode'
import { AppearanceSettings } from '../AppearanceSettings'

const setTheme = vi.fn()
const setSoftMode = vi.fn()
const changeLanguage = vi.fn()
const { enpriTrace } = vi.hoisted(() => ({ enpriTrace: { value: false } }))

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
    isEnpriTrace: () => enpriTrace.value,
  }
})

vi.mock('@/auxWindow/utils/messaging', () => ({
  syncAppSettings: vi.fn(),
}))

vi.mock('../../assets/theme-preview-light.png', () => ({ default: 'light.png' }))
vi.mock('../../assets/theme-preview-dark.png', () => ({ default: 'dark.png' }))

describe('AppearanceSettings', () => {
  beforeEach(() => {
    enpriTrace.value = false
  })

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

  it('企业版（EE）隐藏语言设置区块', () => {
    enpriTrace.value = true
    render(<AppearanceSettings />)
    expect(screen.getByText('SettingsPage.appearance.theme')).toBeInTheDocument()
    expect(screen.queryByText('SettingsPage.appearance.language')).not.toBeInTheDocument()
  })
})
