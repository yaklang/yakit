import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { persistAIAgentChatSetting, loadAIAgentChatSetting } from '@/pages/ai-agent/utils/aiAgentChatSettingCache'
import { AIAgentSettingDefault } from '@/pages/ai-agent/defaultConstant'
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

const waitReady = async () => {
  await waitFor(() => {
    expect(document.querySelector('[data-ai-config-ready="1"]')).toBeTruthy()
  })
}

describe('AIConfigSettings', () => {
  beforeEach(() => {
    vi.mocked(persistAIAgentChatSetting).mockClear()
  })

  it('加载缓存后展示权限分区，重置会写回默认配置', async () => {
    const user = userEvent.setup()
    render(<AIConfigSettings />)
    expect(document.querySelector('[data-settings-section="permissions"]')).toBeTruthy()
    expect(document.querySelector('[data-settings-section="planning"]')).toBeTruthy()
    await waitReady()
    await user.click(screen.getByText('YakitButton.reset'))
    await waitFor(() => {
      expect(persistAIAgentChatSetting).toHaveBeenCalled()
    })
  })

  it('没有改动时卸载不会保存', async () => {
    const { unmount } = render(<AIConfigSettings />)
    await waitReady()
    vi.mocked(persistAIAgentChatSetting).mockClear()
    unmount()
    expect(persistAIAgentChatSetting).not.toHaveBeenCalled()
  })

  it('修改后马上保存，离开页面也不会丢', async () => {
    const { unmount } = render(<AIConfigSettings />)
    await waitReady()
    vi.mocked(persistAIAgentChatSetting).mockClear()
    const switchBtn = document.querySelector('button.ant-switch') as HTMLElement
    expect(switchBtn).toBeTruthy()
    fireEvent.click(switchBtn)
    expect(persistAIAgentChatSetting).toHaveBeenCalled()
    unmount()
  })

  it('远端未返回前改开关不会把默认配置写盘，过期读取也不会覆盖后续修改', async () => {
    let resolveLoad: (value: typeof AIAgentSettingDefault) => void = () => undefined
    vi.mocked(loadAIAgentChatSetting).mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveLoad = resolve
        }),
    )
    render(<AIConfigSettings />)
    const switchBtn = document.querySelector('button.ant-switch') as HTMLButtonElement
    expect(switchBtn).toBeTruthy()
    fireEvent.click(switchBtn)
    expect(persistAIAgentChatSetting).not.toHaveBeenCalled()
    await act(async () => {
      resolveLoad({
        ...AIAgentSettingDefault,
        DisallowRequireForUserPrompt: false,
        DisableMemoryTriage: true,
      })
    })
    await waitReady()
    expect(persistAIAgentChatSetting).not.toHaveBeenCalled()
    fireEvent.click(document.querySelector('button.ant-switch') as HTMLElement)
    expect(persistAIAgentChatSetting).toHaveBeenCalled()
    const saved = vi.mocked(persistAIAgentChatSetting).mock.calls[0][0]
    expect(saved.DisableMemoryTriage).toBe(true)
  })

  it('加载后改其他项，不会把记忆处理开关写回默认值', async () => {
    vi.mocked(loadAIAgentChatSetting).mockResolvedValueOnce({
      ...AIAgentSettingDefault,
      DisallowRequireForUserPrompt: false,
      DisableMemoryTriage: true,
      Strategy: {
        ...AIAgentSettingDefault.Strategy,
        GoalMinIterations: 9,
        MaxSubAgents: 4,
      },
    })
    render(<AIConfigSettings />)
    await waitReady()
    vi.mocked(persistAIAgentChatSetting).mockClear()
    const switchBtn = document.querySelector('button.ant-switch') as HTMLElement
    fireEvent.click(switchBtn)
    expect(persistAIAgentChatSetting).toHaveBeenCalled()
    const saved = vi.mocked(persistAIAgentChatSetting).mock.calls[0][0]
    expect(saved.DisableMemoryTriage).toBe(true)
    expect(saved.Strategy?.GoalMinIterations).toBe(9)
    expect(saved.Strategy?.MaxSubAgents).toBe(4)
  })
})
