import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  persistAIAgentChatSetting,
  loadAIAgentChatSetting,
  serializeAIAgentChatSetting,
  type LoadAIAgentChatSettingResult,
} from '@/pages/ai-agent/utils/aiAgentChatSettingCache'
import { AIAgentSettingDefault } from '@/pages/ai-agent/defaultConstant'
import type { AIAgentSetting } from '@/pages/ai-agent/aiAgentType'
import emiter from '@/utils/eventBus/eventBus'
import { AIConfigSettings } from '../AIConfigSettings'

vi.mock('@/i18n/useI18nNamespaces', () => ({
  useI18nNamespaces: () => ({ t: (key: string) => key }),
}))

vi.mock('@/pages/ai-agent/utils/aiAgentChatSettingCache', async (importOriginal) => {
  const actual = (await importOriginal()) as Record<string, unknown>
  return {
    ...actual,
    loadAIAgentChatSetting: vi.fn(),
    persistAIAgentChatSetting: vi.fn(),
  }
})

const successLoad = (patch: Partial<AIAgentSetting> = {}): LoadAIAgentChatSettingResult => ({
  status: 'success',
  setting: {
    ...AIAgentSettingDefault,
    DisallowRequireForUserPrompt: false,
    ...patch,
  },
})

const waitReady = async () => {
  await waitFor(() => {
    expect(document.querySelector('[data-ai-config-ready="1"]')).toBeTruthy()
  })
}

const waitLocked = async () => {
  await waitFor(() => {
    expect(loadAIAgentChatSetting).toHaveBeenCalled()
  })
  await act(async () => {
    await Promise.resolve()
  })
  expect(document.querySelector('[data-ai-config-ready="1"]')).toBeFalsy()
}

describe('AIConfigSettings', () => {
  beforeEach(() => {
    cleanup()
    vi.mocked(loadAIAgentChatSetting).mockReset()
    vi.mocked(loadAIAgentChatSetting).mockResolvedValue(successLoad())
    vi.mocked(persistAIAgentChatSetting).mockReset()
  })

  it('加载缓存后展示权限分区，重置会写回默认配置', async () => {
    const user = userEvent.setup()
    render(<AIConfigSettings />)
    await waitReady()
    expect(document.querySelector('[data-settings-section="permissions"]')).toBeTruthy()
    expect(document.querySelector('[data-settings-section="planning"]')).toBeTruthy()
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
    let resolveLoad: (value: LoadAIAgentChatSettingResult) => void = () => undefined
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
      resolveLoad(
        successLoad({
          DisallowRequireForUserPrompt: false,
          DisableMemoryTriage: true,
        }),
      )
    })
    await waitReady()
    expect(persistAIAgentChatSetting).not.toHaveBeenCalled()
    fireEvent.click(document.querySelector('button.ant-switch') as HTMLElement)
    expect(persistAIAgentChatSetting).toHaveBeenCalled()
    const saved = vi.mocked(persistAIAgentChatSetting).mock.calls[0][0]
    expect(saved.DisableMemoryTriage).toBe(true)
  })

  it('加载后改其他项，不会把记忆处理开关写回默认值', async () => {
    vi.mocked(loadAIAgentChatSetting).mockResolvedValueOnce(
      successLoad({
        DisableMemoryTriage: true,
        Strategy: {
          ...AIAgentSettingDefault.Strategy,
          GoalMinIterations: 9,
          MaxSubAgents: 4,
        },
      }),
    )
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

  it('读取失败保持锁定，改开关不会把默认配置写盘', async () => {
    vi.mocked(loadAIAgentChatSetting).mockResolvedValueOnce({ status: 'error' })
    render(<AIConfigSettings />)
    await waitLocked()
    fireEvent.click(document.querySelector('button.ant-switch') as HTMLElement)
    expect(persistAIAgentChatSetting).not.toHaveBeenCalled()
  })

  it('读取失败后重新进入页面才解锁并允许保存', async () => {
    vi.mocked(loadAIAgentChatSetting)
      .mockResolvedValueOnce({ status: 'error' })
      .mockResolvedValueOnce(
        successLoad({
          DisableMemoryTriage: true,
        }),
      )
    const { unmount } = render(<AIConfigSettings />)
    await waitLocked()
    unmount()
    render(<AIConfigSettings />)
    await waitReady()
    fireEvent.click(document.querySelector('button.ant-switch') as HTMLElement)
    const saved = vi.mocked(persistAIAgentChatSetting).mock.calls[0][0]
    expect(saved.DisableMemoryTriage).toBe(true)
  })

  it('无缓存时按默认配置解锁，不会在加载阶段写盘', async () => {
    vi.mocked(loadAIAgentChatSetting).mockResolvedValueOnce({ status: 'empty' })
    render(<AIConfigSettings />)
    await waitReady()
    expect(persistAIAgentChatSetting).not.toHaveBeenCalled()
    fireEvent.click(document.querySelector('button.ant-switch') as HTMLElement)
    expect(persistAIAgentChatSetting).toHaveBeenCalled()
  })

  it('迟到的初次读取不会覆盖更新的广播配置', async () => {
    let resolveLoad: (value: LoadAIAgentChatSettingResult) => void = () => undefined
    vi.mocked(loadAIAgentChatSetting).mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveLoad = resolve
        }),
    )
    render(<AIConfigSettings />)
    const payload = serializeAIAgentChatSetting({
      ...AIAgentSettingDefault,
      DisableMemoryTriage: true,
      ReviewPolicy: 'yolo',
    })
    act(() => {
      emiter.emit('onAIAgentChatSettingChange', payload)
    })
    expect(document.querySelector('[data-ai-config-ready="1"]')).toBeFalsy()
    fireEvent.click(document.querySelector('button.ant-switch') as HTMLElement)
    expect(persistAIAgentChatSetting).not.toHaveBeenCalled()
    await act(async () => {
      resolveLoad(
        successLoad({
          DisableMemoryTriage: false,
          ReviewPolicy: 'manual',
        }),
      )
    })
    await waitReady()
    fireEvent.click(document.querySelector('button.ant-switch') as HTMLElement)
    const saved = vi.mocked(persistAIAgentChatSetting).mock.calls[0][0]
    expect(saved.DisableMemoryTriage).toBe(true)
    expect(saved.ReviewPolicy).toBe('yolo')
  })

  it('读取失败后即使收到广播也不解锁写盘', async () => {
    vi.mocked(loadAIAgentChatSetting).mockResolvedValueOnce({ status: 'error' })
    render(<AIConfigSettings />)
    await waitLocked()
    act(() => {
      emiter.emit(
        'onAIAgentChatSettingChange',
        serializeAIAgentChatSetting({
          ...AIAgentSettingDefault,
          DisableMemoryTriage: true,
          ReviewPolicy: 'yolo',
        }),
      )
    })
    fireEvent.click(document.querySelector('button.ant-switch') as HTMLElement)
    expect(persistAIAgentChatSetting).not.toHaveBeenCalled()
    expect(document.querySelector('[data-ai-config-ready="1"]')).toBeFalsy()
  })

  it('卸载后过期读取不会解锁或写盘', async () => {
    let resolveLoad: (value: LoadAIAgentChatSettingResult) => void = () => undefined
    vi.mocked(loadAIAgentChatSetting).mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveLoad = resolve
        }),
    )
    const { unmount } = render(<AIConfigSettings />)
    unmount()
    await act(async () => {
      resolveLoad(successLoad({ DisableMemoryTriage: true }))
    })
    expect(persistAIAgentChatSetting).not.toHaveBeenCalled()
    expect(document.querySelector('[data-ai-config-ready="1"]')).toBeFalsy()
  })
})
