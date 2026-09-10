import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { persistAIAgentChatSetting } from '@/pages/ai-agent/utils/aiAgentChatSettingCache'
import { AIConfigSettings } from '../AIConfigSettings'

vi.mock('@/i18n/useI18nNamespaces', () => ({
  useI18nNamespaces: () => ({ t: (key: string) => key }),
}))

vi.mock('@/pages/ai-agent/utils/aiAgentChatSettingCache', async (importOriginal) => {
  const actual = (await importOriginal()) as Record<string, unknown>
  return {
    ...actual,
    loadAIAgentChatSetting: vi.fn().mockResolvedValue({
      DisallowRequireForUserPrompt: false,
    }),
    persistAIAgentChatSetting: vi.fn(),
  }
})

describe('AIConfigSettings', () => {
  beforeEach(() => {
    vi.mocked(persistAIAgentChatSetting).mockClear()
  })

  it('加载缓存后展示权限分区，重置会写回默认配置', async () => {
    const user = userEvent.setup()
    render(<AIConfigSettings />)
    expect(document.querySelector('[data-settings-section="permissions"]')).toBeTruthy()
    expect(document.querySelector('[data-settings-section="planning"]')).toBeTruthy()
    await waitFor(() => {
      expect(screen.getByText('SettingsPage.item.ai-config')).toBeInTheDocument()
    })
    await user.click(screen.getByText('YakitButton.reset'))
    await waitFor(() => {
      expect(persistAIAgentChatSetting).toHaveBeenCalled()
    })
  })

  it('没有改动时卸载不会保存', async () => {
    const { unmount } = render(<AIConfigSettings />)
    await waitFor(() => {
      expect(screen.getByText('SettingsPage.item.ai-config')).toBeInTheDocument()
    })
    vi.mocked(persistAIAgentChatSetting).mockClear()
    unmount()
    expect(persistAIAgentChatSetting).not.toHaveBeenCalled()
  })

  it('修改后马上保存，离开页面也不会丢', async () => {
    const { unmount } = render(<AIConfigSettings />)
    await waitFor(() => {
      expect(screen.getByText('SettingsPage.item.ai-config')).toBeInTheDocument()
    })
    vi.mocked(persistAIAgentChatSetting).mockClear()
    const switchBtn = document.querySelector('button.ant-switch') as HTMLElement
    expect(switchBtn).toBeTruthy()
    fireEvent.click(switchBtn)
    expect(persistAIAgentChatSetting).toHaveBeenCalled()
    unmount()
  })
})
