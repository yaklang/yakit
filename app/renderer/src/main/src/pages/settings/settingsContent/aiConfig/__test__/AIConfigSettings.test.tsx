import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  persistAIAgentChatSetting,
  loadAIAgentChatSetting,
  serializeAIAgentChatSetting,
} from '@/pages/ai-agent/utils/aiAgentChatSettingCache'
import type { LoadAIAgentChatSettingResult } from '@/pages/ai-agent/utils/aiAgentChatSettingCache'
import { AIAgentSettingDefault, defaultAIGlobalConfig } from '@/pages/ai-agent/defaultConstant'
import type { AIAgentSetting } from '@/pages/ai-agent/aiAgentType'
import emiter from '@/utils/eventBus/eventBus'
import { yakitNotify } from '@/utils/notification'
import { RemoteAIAgentGV } from '@/enums/aiAgent'
import { getRemoteValue, setRemoteValue } from '@/utils/kv'
import { AIConfigSettings } from '../AIConfigSettings'
import { grpcGetAIGlobalConfig, grpcSetAIGlobalConfig } from '@/pages/ai-agent/aiModelList/utils'
import { useAIGlobalConfigStore } from '@/store/aiGlobalConfig'

vi.mock('@/utils/notification', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/utils/notification')>()),
  yakitNotify: vi.fn(),
}))

vi.mock('@/pages/ai-agent/aiModelList/utils', () => ({
  grpcGetAIGlobalConfig: vi.fn(),
  grpcSetAIGlobalConfig: vi.fn(),
}))

vi.mock('@/utils/kv', () => ({
  getRemoteValue: vi.fn(async () => ''),
  setRemoteValue: vi.fn(),
}))

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

const successLoad = (
  patch: Partial<AIAgentSetting> = {},
): Extract<LoadAIAgentChatSettingResult, { status: 'success' }> => ({
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
    expect(useAIGlobalConfigStore.getState().queryLoading).toBe(false)
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
    vi.mocked(grpcGetAIGlobalConfig)
      .mockReset()
      .mockImplementation(async () => ({ ...useAIGlobalConfigStore.getState().aiGlobalConfig }))
    vi.mocked(grpcSetAIGlobalConfig).mockReset().mockResolvedValue(null)
    useAIGlobalConfigStore.setState({
      aiGlobalConfig: { ...defaultAIGlobalConfig },
      isInit: true,
      queryLoading: false,
    })
    vi.mocked(getRemoteValue).mockReset().mockResolvedValue('')
    vi.mocked(setRemoteValue).mockReset().mockResolvedValue(undefined)
    vi.mocked(loadAIAgentChatSetting).mockReset()
    vi.mocked(loadAIAgentChatSetting).mockResolvedValue(successLoad())
    vi.mocked(persistAIAgentChatSetting)
      .mockReset()
      .mockImplementation(async (patch) => {
        if (!patch) return { ...AIAgentSettingDefault }
        const loaded = await vi.mocked(loadAIAgentChatSetting).mock.results.at(-1)?.value
        return { ...AIAgentSettingDefault, ...(loaded?.status === 'success' ? loaded.setting : {}), ...patch }
      })
  })

  it('并发会话写入后审核补丁保留共享字段，并显示实际提交的合并结果', async () => {
    const actual = await vi.importActual<typeof import('@/pages/ai-agent/utils/aiAgentChatSettingCache')>(
      '@/pages/ai-agent/utils/aiAgentChatSettingCache',
    )
    const initial = successLoad({ AICallTokenLimit: 20, ReviewPolicy: 'manual' }).setting
    let stored = serializeAIAgentChatSetting(initial)
    let releaseWrite!: () => void
    const writeGate = new Promise<void>((resolve) => {
      releaseWrite = resolve
    })
    vi.mocked(getRemoteValue).mockImplementation(async (key) =>
      key === RemoteAIAgentGV.AIAgentChatSetting ? stored : '',
    )
    vi.mocked(setRemoteValue).mockImplementation(async (key, value) => {
      if (key !== RemoteAIAgentGV.AIAgentChatSetting) return
      await writeGate
      stored = value
    })
    vi.mocked(loadAIAgentChatSetting).mockImplementation(actual.loadAIAgentChatSetting)
    vi.mocked(persistAIAgentChatSetting).mockImplementation(actual.persistAIAgentChatSetting)
    const broadcasts: string[] = []
    const onBroadcast = (payload?: string) => {
      if (payload) broadcasts.push(payload)
    }
    emiter.on('onAIAgentChatSettingChange', onBroadcast)
    try {
      render(<AIConfigSettings />)
      await waitReady()
      expect(screen.getByDisplayValue('20')).toBeInTheDocument()
      const sessionWrite = actual.persistAIAgentChatSetting({ AICallTokenLimit: 600 })
      await waitFor(() => expect(setRemoteValue).toHaveBeenCalledOnce())
      fireEvent.click(screen.getByRole('radio', { name: 'yolo' }))
      expect(persistAIAgentChatSetting).toHaveBeenCalledExactlyOnceWith({ ReviewPolicy: 'yolo' })
      await act(async () => {
        releaseWrite()
        await sessionWrite
      })
      await waitFor(() => {
        expect(JSON.parse(stored)).toMatchObject({ AICallTokenLimit: 600, ReviewPolicy: 'yolo' })
        expect(screen.getByDisplayValue('600')).toBeInTheDocument()
        expect(screen.getByRole('radio', { name: 'yolo' })).toBeChecked()
      })
      expect(setRemoteValue).toHaveBeenCalledTimes(2)
      expect(broadcasts).toHaveLength(2)
      expect(JSON.parse(broadcasts[1])).toEqual({ ReviewPolicy: 'yolo' })
      expect(JSON.parse(broadcasts[0])).toMatchObject({ AICallTokenLimit: 600 })
      expect(JSON.parse(broadcasts[0])).not.toHaveProperty('ReviewPolicy')
      expect(JSON.parse(broadcasts[0])).not.toHaveProperty('AIReviewRiskControlScore')
    } finally {
      releaseWrite()
      emiter.off('onAIAgentChatSettingChange', onBroadcast)
    }
  })

  it('连续修改审核策略时，较早提交的广播不会覆盖尚未提交的新选择', async () => {
    const actual = await vi.importActual<typeof import('@/pages/ai-agent/utils/aiAgentChatSettingCache')>(
      '@/pages/ai-agent/utils/aiAgentChatSettingCache',
    )
    let stored = serializeAIAgentChatSetting(successLoad({ ReviewPolicy: 'manual' }).setting)
    const releases: (() => void)[] = []
    const gates = [0, 1].map(() => new Promise<void>((resolve) => releases.push(resolve)))
    let writes = 0
    vi.mocked(getRemoteValue).mockImplementation(async () => stored)
    vi.mocked(setRemoteValue).mockImplementation(async (_, value) => {
      await gates[writes++]
      stored = value
    })
    vi.mocked(loadAIAgentChatSetting).mockImplementation(actual.loadAIAgentChatSetting)
    vi.mocked(persistAIAgentChatSetting).mockImplementation(actual.persistAIAgentChatSetting)
    try {
      render(<AIConfigSettings />)
      await waitReady()
      fireEvent.click(screen.getByRole('radio', { name: 'ai' }))
      await waitFor(() => expect(setRemoteValue).toHaveBeenCalledOnce())
      fireEvent.click(screen.getByRole('radio', { name: 'yolo' }))
      await act(async () => releases[0]())
      await waitFor(() => expect(setRemoteValue).toHaveBeenCalledTimes(2))
      expect(JSON.parse(stored).ReviewPolicy).toBe('ai')
      expect(screen.getByRole('radio', { name: 'yolo' })).toBeChecked()
      await act(async () => releases[1]())
      await waitFor(() => expect(JSON.parse(stored).ReviewPolicy).toBe('yolo'))
      expect(screen.getByRole('radio', { name: 'yolo' })).toBeChecked()
    } finally {
      releases.forEach((release) => release())
    }
  })

  it('会话保存审核默认值后，已打开的设置页通过真实广播同步', async () => {
    const actual = await vi.importActual<typeof import('@/pages/ai-agent/utils/aiAgentChatSettingCache')>(
      '@/pages/ai-agent/utils/aiAgentChatSettingCache',
    )
    const initial = successLoad({ ReviewPolicy: 'manual', AIReviewRiskControlScore: 0.5 }).setting
    vi.mocked(loadAIAgentChatSetting).mockResolvedValueOnce({ status: 'success', setting: initial })
    vi.mocked(getRemoteValue).mockResolvedValue(serializeAIAgentChatSetting(initial))
    render(<AIConfigSettings />)
    await waitReady()

    await act(async () => {
      await actual.persistAIAgentChatSetting({ ReviewPolicy: 'yolo', AIReviewRiskControlScore: 0 })
    })

    expect(screen.getByRole('radio', { name: 'yolo' })).toBeChecked()
    expect(screen.getByRole('slider')).toHaveAttribute('aria-valuenow', '0')
    expect(persistAIAgentChatSetting).not.toHaveBeenCalled()
  })

  it('本地保存等待期间立即显示已提交的审核广播，失败后仍保留广播值', async () => {
    let rejectWrite!: (error: Error) => void
    vi.mocked(persistAIAgentChatSetting).mockReturnValueOnce(
      new Promise((_, reject) => {
        rejectWrite = reject
      }),
    )
    render(<AIConfigSettings />)
    await waitReady()
    const permission = document.querySelector('button.ant-switch') as HTMLElement
    fireEvent.click(permission)
    expect(permission).toBeChecked()

    act(() => {
      emiter.emit('onAIAgentChatSettingChange', JSON.stringify({ ReviewPolicy: 'yolo', AIReviewRiskControlScore: 0 }))
    })
    expect(screen.getByRole('radio', { name: 'yolo' })).toBeChecked()
    expect(screen.getByRole('slider')).toHaveAttribute('aria-valuenow', '0')
    expect(permission).toBeChecked()

    await act(async () => rejectWrite(new Error('fixture-save-failed')))
    expect(permission).not.toBeChecked()
    expect(screen.getByRole('radio', { name: 'yolo' })).toBeChecked()
    expect(screen.getByRole('slider')).toHaveAttribute('aria-valuenow', '0')
  })

  it('全局审核策略保存为新会话默认值', async () => {
    render(<AIConfigSettings />)
    await waitReady()
    fireEvent.click(screen.getByRole('radio', { name: 'yolo' }))
    expect(vi.mocked(persistAIAgentChatSetting).mock.calls.at(-1)?.[0]).toEqual({ ReviewPolicy: 'yolo' })
    fireEvent.click(screen.getByRole('radio', { name: 'yolo' }))
    fireEvent.click(document.querySelector('[data-settings-section="permissions"] button.ant-switch') as HTMLElement)
    expect(persistAIAgentChatSetting).toHaveBeenLastCalledWith({ DisallowRequireForUserPrompt: true })
  })

  it('连续保存失败时恢复最后已保存的审核策略，并提示失败', async () => {
    vi.mocked(loadAIAgentChatSetting).mockResolvedValue(successLoad({ ReviewPolicy: 'manual' }))
    vi.mocked(persistAIAgentChatSetting).mockRejectedValue(new Error('SetKey failed'))
    render(<AIConfigSettings />)
    await waitReady()
    fireEvent.click(screen.getByRole('radio', { name: 'ai' }))
    fireEvent.click(screen.getByRole('radio', { name: 'yolo' }))
    await waitFor(() => expect(screen.getByRole('radio', { name: 'manual' })).toBeChecked())
    expect(yakitNotify).toHaveBeenCalledWith('error', 'AIChatSetting.saveFailed')
  })

  it.each(['all', 'planning'])('重置 %s 配置时保存默认审核策略', async (scope) => {
    vi.mocked(loadAIAgentChatSetting).mockResolvedValue(successLoad({ ReviewPolicy: 'yolo' }))
    render(<AIConfigSettings />)
    await waitReady()
    const reset =
      scope === 'all'
        ? screen.getByRole('button', { name: 'YakitButton.reset' })
        : within(screen.getByText('AIChatSetting.planningAndExecution').parentElement!).getByRole('button')
    await act(async () => fireEvent.click(reset))
    if (scope === 'all') {
      expect(persistAIAgentChatSetting).toHaveBeenLastCalledWith(undefined)
    } else {
      expect(vi.mocked(persistAIAgentChatSetting).mock.calls.at(-1)?.[0]).toMatchObject({
        ReviewPolicy: AIAgentSettingDefault.ReviewPolicy,
      })
    }
    await act(async () => fireEvent.click(reset))
  })

  it('风险阈值修改和归零只保存全局默认值', async () => {
    vi.mocked(loadAIAgentChatSetting).mockResolvedValue(successLoad({ AIReviewRiskControlScore: 0.5 }))
    render(<AIConfigSettings />)
    await waitReady()
    const slider = screen.getByRole('slider')
    fireEvent.keyDown(slider, { key: 'ArrowRight', keyCode: 39, which: 39 })
    expect(vi.mocked(persistAIAgentChatSetting).mock.calls.at(-1)?.[0]).toEqual({
      AIReviewRiskControlScore: 0.51,
    })
    fireEvent.keyDown(slider, { key: 'Home', keyCode: 36, which: 36 })
    expect(vi.mocked(persistAIAgentChatSetting).mock.calls.at(-1)?.[0]).toEqual({ AIReviewRiskControlScore: 0 })
    fireEvent.keyDown(slider, { key: 'Home', keyCode: 36, which: 36 })
  })

  it.each(['all', 'permissions'])('重置 %s 配置时保存默认风险阈值与审核模式', async (scope) => {
    vi.mocked(loadAIAgentChatSetting).mockResolvedValue(
      successLoad({ ReviewPolicy: 'yolo', AIReviewRiskControlScore: 0 }),
    )
    render(<AIConfigSettings />)
    await waitReady()
    const reset =
      scope === 'all'
        ? screen.getByRole('button', { name: 'YakitButton.reset' })
        : within(document.querySelector('[data-settings-section="permissions"]') as HTMLElement).getByRole('button')
    await act(async () => fireEvent.click(reset))
    if (scope === 'all') {
      expect(persistAIAgentChatSetting).toHaveBeenLastCalledWith(undefined)
    } else {
      expect(vi.mocked(persistAIAgentChatSetting).mock.calls.at(-1)?.[0]).toMatchObject({
        AIReviewRiskControlScore: AIAgentSettingDefault.AIReviewRiskControlScore,
      })
    }
    await act(async () => fireEvent.click(reset))
  })

  it('首页动画开关使用独立缓存，不写入 AI 配置，重置配置不改变动画偏好', async () => {
    render(<AIConfigSettings />)
    await waitReady()
    const animationSwitch = screen.getByRole('switch', { name: 'AIChatSetting.disableWelcomeAnimation' })
    expect(animationSwitch).toHaveAttribute('aria-checked', 'false')
    fireEvent.click(animationSwitch)
    expect(animationSwitch).toHaveAttribute('aria-checked', 'true')
    expect(setRemoteValue).toHaveBeenCalledWith(RemoteAIAgentGV.WelcomeAnimationDisabled, 'true')
    expect(persistAIAgentChatSetting).not.toHaveBeenCalled()
    vi.mocked(setRemoteValue).mockClear()
    fireEvent.click(screen.getByText('YakitButton.reset'))
    expect(animationSwitch).toHaveAttribute('aria-checked', 'true')
    expect(setRemoteValue).not.toHaveBeenCalled()
    expect(persistAIAgentChatSetting).toHaveBeenCalledWith(undefined)
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

  it('运行时上下文已移至输入设置，AI 配置页不再展示', async () => {
    render(<AIConfigSettings />)
    await waitReady()
    expect(screen.queryByText('AIChatSetting.runtimeContextSize')).not.toBeInTheDocument()
  })

  it('资源分区重置保留已移出的运行时上下文及其他分区配置', async () => {
    const user = userEvent.setup()
    const loaded = successLoad({
      RuntimeContextSizeLimit: 300,
      AICallTokenLimit: 99,
      UserInteractLimit: 99,
      EnableSystemFileSystemOperator: !AIAgentSettingDefault.EnableSystemFileSystemOperator,
      ReviewPolicy: 'yolo',
      DisableMemoryTriage: !AIAgentSettingDefault.DisableMemoryTriage,
    })
    vi.mocked(loadAIAgentChatSetting).mockResolvedValueOnce(loaded)
    render(<AIConfigSettings />)
    await waitReady()
    const header = screen.getByText('AIChatSetting.resourcesLimits').parentElement!

    await user.click(within(header).getByRole('button'))

    expect(vi.mocked(persistAIAgentChatSetting).mock.calls.at(-1)?.[0]).toEqual({
      AICallTokenLimit: AIAgentSettingDefault.AICallTokenLimit,
      UserInteractLimit: AIAgentSettingDefault.UserInteractLimit,
    })
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
    expect(saved).toEqual({ DisallowRequireForUserPrompt: true })
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
    expect(saved).toEqual({ DisallowRequireForUserPrompt: true })
    expect(saved).not.toHaveProperty('Strategy')
    expect(
      within(screen.getByText('AIChatSetting.disableMemoryTriage').parentElement!.parentElement!).getByRole('switch'),
    ).toBeChecked()
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
    expect(saved).toEqual({ DisallowRequireForUserPrompt: true })
  })

  it('无缓存时按默认配置解锁，不会在加载阶段写盘', async () => {
    vi.mocked(loadAIAgentChatSetting).mockResolvedValueOnce({ status: 'empty' })
    render(<AIConfigSettings />)
    await waitReady()
    expect(persistAIAgentChatSetting).not.toHaveBeenCalled()
    fireEvent.click(document.querySelector('button.ant-switch') as HTMLElement)
    expect(persistAIAgentChatSetting).toHaveBeenCalled()
  })

  it('迟到的读取补齐部分广播未携带的审核设置', async () => {
    let resolveLoad: (value: LoadAIAgentChatSettingResult) => void = () => undefined
    vi.mocked(loadAIAgentChatSetting).mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveLoad = resolve
        }),
    )
    render(<AIConfigSettings />)
    act(() => {
      emiter.emit('onAIAgentChatSettingChange', JSON.stringify({ AICallTokenLimit: 88 }))
    })
    await act(async () => {
      resolveLoad(successLoad({ ReviewPolicy: 'yolo', AIReviewRiskControlScore: 0.8, AICallTokenLimit: 20 }))
    })
    await waitReady()
    fireEvent.click(document.querySelector('button.ant-switch') as HTMLElement)
    expect(vi.mocked(persistAIAgentChatSetting).mock.calls.at(-1)?.[0]).toEqual({ DisallowRequireForUserPrompt: true })
    expect(screen.getByRole('radio', { name: 'yolo' })).toBeChecked()
    expect(screen.getByRole('slider')).toHaveAttribute('aria-valuenow', '0.8')
    expect(screen.getByDisplayValue('88')).toBeInTheDocument()
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
    expect(saved).toEqual({ DisallowRequireForUserPrompt: !AIAgentSettingDefault.DisallowRequireForUserPrompt })
    expect(screen.getByRole('radio', { name: 'yolo' })).toBeChecked()
    expect(
      within(screen.getByText('AIChatSetting.disableMemoryTriage').parentElement!.parentElement!).getByRole('switch'),
    ).toBeChecked()
  })

  it('迟到的读取不会覆盖等于初始默认值的广播', async () => {
    let resolveLoad: (value: LoadAIAgentChatSettingResult) => void = () => undefined
    vi.mocked(loadAIAgentChatSetting).mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveLoad = resolve
        }),
    )
    render(<AIConfigSettings />)
    act(() => {
      emiter.emit('onAIAgentChatSettingChange', serializeAIAgentChatSetting(AIAgentSettingDefault))
    })
    expect(document.querySelector('[data-ai-config-ready="1"]')).toBeFalsy()
    await act(async () => {
      resolveLoad(
        successLoad({
          DisableMemoryTriage: true,
          ReviewPolicy: 'yolo',
        }),
      )
    })
    await waitReady()
    fireEvent.click(document.querySelector('button.ant-switch') as HTMLElement)
    const saved = vi.mocked(persistAIAgentChatSetting).mock.calls[0][0]
    expect(saved).toEqual({ DisallowRequireForUserPrompt: !AIAgentSettingDefault.DisallowRequireForUserPrompt })
    expect(screen.getByRole('radio', { name: AIAgentSettingDefault.ReviewPolicy })).toBeChecked()
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
  it('全局限频在确认输入后保存，响应配置与模型列表一起保留', async () => {
    const original = {
      ...defaultAIGlobalConfig,
      RetryForever: true,
      NetworkDebug: true,
      ModelRequestsPerMinute: 3,
    }
    useAIGlobalConfigStore.setState({ aiGlobalConfig: original })
    render(<AIConfigSettings />)
    await waitReady()
    const rpm = screen.getByRole('spinbutton', { name: 'AIChatSetting.modelRPM' })
    expect(rpm).toHaveValue('3')
    fireEvent.change(rpm, { target: { value: '12' } })
    expect(grpcSetAIGlobalConfig).not.toHaveBeenCalled()
    fireEvent.blur(rpm)
    await waitFor(() =>
      expect(grpcSetAIGlobalConfig).toHaveBeenCalledWith({
        ...original,
        ModelRequestsPerMinute: 12,
      }),
    )
    expect(persistAIAgentChatSetting).not.toHaveBeenCalled()
  })

  it('无限重试和网络诊断写入全局配置而非会话设置，失败回滚', async () => {
    render(<AIConfigSettings />)
    await waitReady()
    const retry = screen.getByRole('switch', { name: 'AIChatSetting.retryForever' })
    const debug = screen.getByRole('switch', { name: 'AIChatSetting.networkDebug' })
    fireEvent.click(retry)
    await waitFor(() =>
      expect(grpcSetAIGlobalConfig).toHaveBeenCalledWith(expect.objectContaining({ RetryForever: true })),
    )
    await waitFor(() => expect(debug).not.toBeDisabled())
    vi.mocked(grpcGetAIGlobalConfig).mockResolvedValue({ ...defaultAIGlobalConfig, RetryForever: true })
    vi.mocked(grpcSetAIGlobalConfig).mockRejectedValueOnce(new Error('fixture-save-failed'))
    fireEvent.click(debug)
    await waitFor(() =>
      expect(grpcSetAIGlobalConfig).toHaveBeenLastCalledWith(
        expect.objectContaining({ RetryForever: true, NetworkDebug: true }),
      ),
    )
    await waitFor(() => expect(debug).toHaveAttribute('aria-checked', 'false'))
    expect(retry).toHaveAttribute('aria-checked', 'true')
    expect(persistAIAgentChatSetting).not.toHaveBeenCalled()
  })

  it('自动化分区重置会显式关闭三项全局控制', async () => {
    useAIGlobalConfigStore.setState({
      aiGlobalConfig: {
        ...defaultAIGlobalConfig,
        RetryForever: true,
        NetworkDebug: true,
        ModelRequestsPerMinute: 3,
      },
    })
    render(<AIConfigSettings />)
    await waitReady()
    const header = screen.getByText('AIChatSetting.automation').parentElement!
    fireEvent.click(within(header).getByRole('button'))
    await waitFor(() =>
      expect(grpcSetAIGlobalConfig).toHaveBeenCalledWith(
        expect.objectContaining({
          RetryForever: false,
          NetworkDebug: false,
          ModelRequestsPerMinute: 0,
        }),
      ),
    )
  })

  const savedGlobalConfig: typeof defaultAIGlobalConfig = {
    ...defaultAIGlobalConfig,
    IntelligentModels: [{ ProviderId: '', ModelName: 'saved-main', Provider: { Type: 'custom' }, ExtraParams: [] }],
    LightweightModels: [{ ProviderId: '', ModelName: 'saved-light', Provider: { Type: 'custom' }, ExtraParams: [] }],
    VisionModels: [{ ProviderId: '', ModelName: 'saved-vision', Provider: { Type: 'custom' }, ExtraParams: [] }],
    AIPresetPrompt: 'saved prompt',
    RetryForever: true,
    NetworkDebug: true,
    ModelRequestsPerMinute: 20,
  }
  const getResetButton = (scope: string) =>
    scope === '页面'
      ? screen.getByRole('button', { name: 'YakitButton.reset' })
      : within(screen.getByText('AIChatSetting.automation').parentElement!).getByRole('button')

  it.each(['页面', '自动化分区'])('全局读取未完成时禁止%s重置，加载后重置保留模型列表', async (scope) => {
    let resolveGlobal!: (config: typeof defaultAIGlobalConfig) => void
    vi.mocked(grpcGetAIGlobalConfig).mockReturnValueOnce(
      new Promise((resolve) => {
        resolveGlobal = resolve
      }),
    )
    render(<AIConfigSettings />)
    await waitFor(() => expect(document.querySelector('[data-ai-config-ready="1"]')).toBeTruthy())
    expect(grpcGetAIGlobalConfig).toHaveBeenCalledOnce()
    const reset = getResetButton(scope)
    expect(reset).toBeDisabled()
    fireEvent.click(reset)
    const rpm = screen.getByRole('spinbutton', { name: 'AIChatSetting.modelRPM' })
    expect(rpm).toBeDisabled()
    fireEvent.change(rpm, { target: { value: '10' } })
    fireEvent.blur(rpm)
    expect(grpcSetAIGlobalConfig).not.toHaveBeenCalled()
    expect(persistAIAgentChatSetting).not.toHaveBeenCalled()

    await act(async () => resolveGlobal(savedGlobalConfig))
    await waitFor(() => expect(reset).not.toBeDisabled())
    expect(useAIGlobalConfigStore.getState().aiGlobalConfig).toEqual(savedGlobalConfig)
    fireEvent.click(reset)
    await waitFor(() =>
      expect(grpcSetAIGlobalConfig).toHaveBeenCalledExactlyOnceWith({
        ...savedGlobalConfig,
        IntelligentModels: savedGlobalConfig.IntelligentModels.map((model) => ({ ...model, ProviderId: '0' })),
        LightweightModels: savedGlobalConfig.LightweightModels.map((model) => ({ ...model, ProviderId: '0' })),
        VisionModels: savedGlobalConfig.VisionModels.map((model) => ({ ...model, ProviderId: '0' })),
        RetryForever: false,
        NetworkDebug: false,
        ModelRequestsPerMinute: 0,
      }),
    )
  })

  it.each(['页面', '自动化分区'])('全局读取失败且 loading 结束后仍禁止%s重置和全局写入', async (scope) => {
    useAIGlobalConfigStore.setState({ aiGlobalConfig: savedGlobalConfig })
    vi.mocked(grpcGetAIGlobalConfig).mockRejectedValueOnce(new Error('fixture-read-failed'))
    render(<AIConfigSettings />)
    await waitReady()
    const reset = getResetButton(scope)
    expect(reset).toBeDisabled()
    fireEvent.click(reset)
    for (const name of ['AIChatSetting.retryForever', 'AIChatSetting.networkDebug']) {
      const control = screen.getByRole('switch', { name })
      expect(control).toBeDisabled()
      fireEvent.click(control)
    }
    const rpm = screen.getByRole('spinbutton', { name: 'AIChatSetting.modelRPM' })
    expect(rpm).toBeDisabled()
    fireEvent.change(rpm, { target: { value: '10' } })
    fireEvent.blur(rpm)
    expect(grpcSetAIGlobalConfig).not.toHaveBeenCalled()
    expect(persistAIAgentChatSetting).not.toHaveBeenCalled()
    expect(useAIGlobalConfigStore.getState().aiGlobalConfig).toEqual(savedGlobalConfig)
  })

  it.each(['pending', 'error'])('会话设置未就绪时也禁止重置和全局写入（%s）', async (status) => {
    if (status === 'pending') {
      vi.mocked(loadAIAgentChatSetting).mockReturnValueOnce(new Promise(() => {}))
    } else {
      vi.mocked(loadAIAgentChatSetting).mockResolvedValueOnce({ status: 'error' })
    }
    render(<AIConfigSettings />)
    await waitFor(() => {
      expect(grpcGetAIGlobalConfig).toHaveBeenCalledOnce()
      expect(useAIGlobalConfigStore.getState().queryLoading).toBe(false)
    })
    for (const scope of ['页面', '自动化分区']) {
      const reset = getResetButton(scope)
      expect(reset).toBeDisabled()
      fireEvent.click(reset)
    }
    const rpm = screen.getByRole('spinbutton', { name: 'AIChatSetting.modelRPM' })
    expect(rpm).toBeDisabled()
    fireEvent.change(rpm, { target: { value: '10' } })
    fireEvent.blur(rpm)
    expect(grpcSetAIGlobalConfig).not.toHaveBeenCalled()
    expect(persistAIAgentChatSetting).not.toHaveBeenCalled()
  })
})
