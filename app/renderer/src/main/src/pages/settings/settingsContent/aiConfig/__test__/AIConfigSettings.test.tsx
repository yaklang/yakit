import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  persistAIAgentChatSetting,
  loadAIAgentChatSetting,
  serializeAIAgentChatSetting,
  type LoadAIAgentChatSettingResult,
} from '@/pages/ai-agent/utils/aiAgentChatSettingCache'
import { AIAgentSettingDefault, defaultAIGlobalConfig } from '@/pages/ai-agent/defaultConstant'
import type { AIAgentSetting } from '@/pages/ai-agent/aiAgentType'
import emiter from '@/utils/eventBus/eventBus'
import { RemoteAIAgentGV } from '@/enums/aiAgent'
import { setRemoteValue } from '@/utils/kv'
import { AIConfigSettings } from '../AIConfigSettings'
import { grpcGetAIGlobalConfig, grpcSetAIGlobalConfig } from '@/pages/ai-agent/aiModelList/utils'
import { useAIGlobalConfigStore } from '@/store/aiGlobalConfig'

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
    vi.mocked(setRemoteValue).mockClear()
    vi.mocked(loadAIAgentChatSetting).mockReset()
    vi.mocked(loadAIAgentChatSetting).mockResolvedValue(successLoad())
    vi.mocked(persistAIAgentChatSetting).mockReset()
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
    expect(persistAIAgentChatSetting).toHaveBeenCalledWith(AIAgentSettingDefault)
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

    expect(persistAIAgentChatSetting).toHaveBeenLastCalledWith({
      ...loaded.setting,
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
    expect(saved.DisableMemoryTriage).toBe(AIAgentSettingDefault.DisableMemoryTriage)
    expect(saved.ReviewPolicy).toBe(AIAgentSettingDefault.ReviewPolicy)
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
