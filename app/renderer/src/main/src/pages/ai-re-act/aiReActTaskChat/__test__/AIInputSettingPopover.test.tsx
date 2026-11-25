import type React from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createStore } from 'zustand/vanilla'
import emiter from '@/utils/eventBus/eventBus'
import { AIInputEventHotPatchTypeEnum } from '../../hooks/grpcApi'
import type { AIModelContextSource } from '../../hooks/aiRender'
import { useRefreshModelContext } from '@/pages/ai-agent/useContext/useRefreshModelContext'

const mocks = vi.hoisted(() => ({
  setting: { SingleModelMode: false, SyncPerceptionTrigger: false, EnablePlan: false } as Record<string, unknown>,
  activeChat: undefined as
    | { SessionID?: string; isDraftSession?: boolean; StartParams?: Record<string, unknown> }
    | undefined,
  globalSingleModelMode: false,
  globalPresetPrompt: '',
  globalPlanPrompt: '',
  setAIGlobalConfig: vi.fn(),
  sessionId: 'session-id',
  setSetting: vi.fn(),
  setActiveChat: vi.fn(),
  onSend: vi.fn(),
  emit: vi.fn(),
  modelContext: {
    enabled: false,
    thresholdTokens: 500000,
    editorThresholdTokens: 500000,
    minimumThresholdTokens: 100000,
    editorDisableAutoAdjust: false,
    waitingForContext: false,

    loading: false,

    retry: vi.fn(),
    save: vi.fn(),
  },
}))

const createSessionStore = () => createStore(() => ({ execute: false, updateStateCount: vi.fn() }))
let sessionStore = createSessionStore()

Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
})

vi.mock('@/pages/ai-agent/useContext/useStore', () => ({
  default: () => ({ setting: mocks.setting, activeChat: mocks.activeChat }),
}))

vi.mock('@/pages/ai-agent/useContext/useAIModelContext', () => {
  const useMockModelContext = (source: AIModelContextSource, open?: boolean) => {
    useRefreshModelContext(source, open)
    return mocks.modelContext
  }
  return { default: useMockModelContext }
})
vi.mock('@/pages/ai-agent/grpc', () => ({ grpcGetAIModelContext: vi.fn() }))
vi.mock('@/store/aiGlobalConfig', () => ({
  useAIGlobalConfigStore: Object.assign(() => undefined, {
    getState: () => ({ persistedAiGlobalConfig: { IntelligentModels: [] }, configSavePending: false }),
  }),
}))
const rawData = { modelContext: { status: 'idle', generation: 0 } }
const sessionMeta = { lifecycle: { current: true, closing: false } }

vi.mock('@/pages/ai-agent/useContext/useDispatcher', () => ({
  default: () => ({ setSetting: mocks.setSetting, setActiveChat: mocks.setActiveChat, onSend: mocks.onSend }),
}))

vi.mock('../../hooks/useCurrentDataBySession', () => ({
  useCurrentStore: () => sessionStore,
  useCurrentRawData: () => rawData,
  useCurrentMeta: () => sessionMeta,
}))

vi.mock('../../hooks/useCurrentSessionId', () => ({ default: () => mocks.sessionId }))

vi.mock('../../hooks/useAIGlobalConfig', () => ({
  default: () => [
    {
      aiGlobalConfig: {
        SingleModelMode: mocks.globalSingleModelMode,
        AIPresetPrompt: mocks.globalPresetPrompt,
        AIPlanPrompt: mocks.globalPlanPrompt,
      },
    },
    { setAIGlobalConfig: mocks.setAIGlobalConfig },
  ],
}))

vi.mock('@/components/yakitUI/YakitPopover/YakitPopover', () => ({
  YakitPopover: ({
    children,
    content,
    onOpenChange,
    arrow,
    open,
    destroyOnHidden,
  }: {
    children?: React.ReactNode
    content?: React.ReactNode
    onOpenChange?: (open: boolean) => void
    arrow?: boolean
    open?: boolean
    destroyOnHidden?: boolean
  }) => (
    <div data-testid="settings-popover" data-arrow={String(arrow)} data-destroy-on-hidden={String(destroyOnHidden)}>
      {children}
      {(open || !destroyOnHidden) && content}
      <button type="button" onClick={() => onOpenChange?.(true)}>
        打开设置
      </button>
      <button type="button" onClick={() => onOpenChange?.(false)}>
        关闭设置
      </button>
    </div>
  ),
}))

vi.mock('@/components/yakitUI/YakitSwitch/YakitSwitch', () => ({
  YakitSwitch: ({
    checked,
    disabled,
    onChange,
    id,
    'aria-label': ariaLabel,
  }: {
    checked?: boolean
    disabled?: boolean
    onChange?: (v: boolean) => void
    id?: string
    'aria-label'?: string
  }) => (
    <input
      type="checkbox"
      role="switch"
      id={id}
      aria-label={ariaLabel}
      checked={!!checked}
      disabled={disabled}
      onChange={(event) => onChange?.(event.target.checked)}
    />
  ),
}))

vi.mock('@/components/yakitUI/YakitInput/YakitInput', () => ({
  YakitInput: Object.assign(
    ({ suffix, ...props }: React.InputHTMLAttributes<HTMLInputElement> & { suffix?: React.ReactNode }) => (
      <div>
        <input {...props} />
        {suffix}
      </div>
    ),
    {
      TextArea: ({
        isShowResize: _isShowResize,
        ...props
      }: React.TextareaHTMLAttributes<HTMLTextAreaElement> & {
        isShowResize?: boolean
      }) => <textarea {...props} />,
    },
  ),
}))

vi.mock('@/components/yakitUI/YakitResizeBox/YakitResizeBox', () => ({ YakitResizeBox: () => null }))
vi.mock('@/pages/ai-agent/chatTemplate/AIAgentChatTemplate', () => ({ AIChatLeftSide: () => null }))
vi.mock('../../aiTaskContent/AITaskContent', () => ({ AITaskContent: () => null }))
vi.mock('../../aiReActChat/AIReActComponent', () => ({ ChevrondownButton: () => null }))
vi.mock('@/utils/eventBus/eventBus', () => ({ default: { emit: mocks.emit } }))
vi.mock('@/i18n/useI18nNamespaces', () => ({
  useI18nNamespaces: () => ({ t: (key: string) => key }),
}))

const { AIInputSettingPopover } = await import('../AIReActTaskChat')

describe('AIInputSettingPopover', () => {
  beforeEach(() => {
    mocks.modelContext.enabled = false
    mocks.modelContext.save.mockReset()
    mocks.modelContext.editorThresholdTokens = 500000
    mocks.modelContext.editorDisableAutoAdjust = false
    mocks.setting = { SingleModelMode: false, SyncPerceptionTrigger: false, EnablePlan: false }
    mocks.activeChat = undefined
    mocks.globalSingleModelMode = false
    mocks.globalPresetPrompt = ''
    mocks.globalPlanPrompt = ''
    mocks.setAIGlobalConfig.mockReset()
    mocks.sessionId = 'session-id'
    mocks.setSetting.mockReset()
    mocks.setActiveChat.mockReset()
    mocks.setActiveChat.mockImplementation((update) => {
      mocks.activeChat = update(mocks.activeChat)
    })
    mocks.onSend.mockReset().mockReturnValue(true)
    mocks.emit.mockClear()
    sessionStore = createSessionStore()
  })

  it('打开刷新，阈值与自动调整在整个弹窗关闭后合并提交', () => {
    mocks.modelContext.enabled = true
    render(<AIInputSettingPopover />)
    fireEvent.click(screen.getByRole('button', { name: '打开设置' }))
    expect(rawData.modelContext.status).toBe('unbound')
    const input = screen.getByRole('spinbutton', { name: 'AIContextUsage.threshold' })
    fireEvent.change(input, { target: { value: '600' } })
    fireEvent.blur(input)
    fireEvent.click(screen.getByRole('switch', { name: 'AIContextUsage.autoAdjust' }))
    expect(mocks.modelContext.save).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: '关闭设置' }))
    expect(mocks.modelContext.save).toHaveBeenCalledExactlyOnceWith({
      threshold_tokens: 600000,
      disable_auto_adjust: true,
    })
  })

  it('高级配置面板显示标题和内联说明，弹窗不显示箭头', () => {
    render(<AIInputSettingPopover visible />)

    expect(screen.getByText('AIReActTaskChatContent.advancedConfiguration')).toBeInTheDocument()
    expect(screen.getByTestId('settings-popover')).toHaveAttribute('data-arrow', 'false')
    expect(screen.getByRole('button', { name: 'YakitButton.reset' })).toBeInTheDocument()
    for (const description of [
      'AIReActTaskChatContent.singleModelModeDescription',
      'AIReActTaskChatContent.syncPerceptionTriggerTip',
    ]) {
      expect(screen.getByText(description)).toBeVisible()
    }
  })

  it('欢迎页草稿重置开关与 token 阈值草稿，保留其他设置', () => {
    mocks.activeChat = { SessionID: 'draft-id', isDraftSession: true }
    mocks.setting = {
      SingleModelMode: true,
      SyncPerceptionTrigger: true,
      EnablePlan: true,
    }
    mocks.setSetting.mockImplementation((update) => {
      mocks.setting = update(mocks.setting)
    })
    render(<AIInputSettingPopover visible />)

    fireEvent.click(screen.getByRole('button', { name: 'YakitButton.reset' }))

    expect(screen.getAllByRole('switch')[0]).not.toBeChecked()
    expect(screen.getByRole('switch', { name: 'AIReActTaskChatContent.syncPerceptionTrigger' })).not.toBeChecked()
    expect(screen.getByRole('spinbutton', { name: 'AIContextUsage.threshold' })).toHaveValue('500')
    expect(mocks.setting).toEqual({
      SingleModelMode: false,
      SyncPerceptionTrigger: false,
      EnablePlan: true,
      DisableBuiltinSyntaxFlowRules: true,
    })
    expect(mocks.setSetting).toHaveBeenCalledTimes(3)
    expect(mocks.onSend).not.toHaveBeenCalled()
  })

  it.each(['global', 'session'] as const)('%s 锁定单模型时重置不会修改单模型设置', (lock) => {
    mocks.globalSingleModelMode = lock === 'global'
    mocks.setting.SingleModelMode = lock === 'session'
    if (lock === 'session') mocks.activeChat = { SessionID: 'session-id', isDraftSession: false }
    mocks.setSetting.mockImplementation((update) => {
      mocks.setting = update(mocks.setting)
    })
    render(<AIInputSettingPopover visible />)

    fireEvent.click(screen.getByRole('button', { name: 'YakitButton.reset' }))

    expect(screen.getAllByRole('switch')[0]).toBeChecked()
    expect(screen.getAllByRole('switch')[0]).toBeDisabled()
    expect(mocks.setting.SingleModelMode).toBe(lock === 'session')
    expect(mocks.setSetting).toHaveBeenCalledTimes(2)
  })

  it('运行中重置 token 草稿并立即关闭同步意图识别', () => {
    mocks.setting.SingleModelMode = true
    mocks.activeChat = {
      SessionID: 'session-id',
      StartParams: { SyncPerceptionTrigger: true, EnablePlan: true },
    }
    sessionStore.setState({ execute: true })
    render(<AIInputSettingPopover visible />)

    fireEvent.click(screen.getByRole('button', { name: 'YakitButton.reset' }))

    expect(mocks.onSend).toHaveBeenCalledTimes(2)
    for (const [HotpatchType, Params] of [
      ['SyncPerceptionTrigger', { SyncPerceptionTrigger: false }],
      [AIInputEventHotPatchTypeEnum.HotPatchType_SyntaxFlowRules, { DisableBuiltinSyntaxFlowRules: true }],
    ]) {
      expect(mocks.onSend).toHaveBeenCalledWith({
        token: 'session-id',
        type: 'casual',
        params: { IsConfigHotpatch: true, HotpatchType, Params },
      })
    }
    expect(mocks.activeChat?.StartParams).toEqual({
      SyncPerceptionTrigger: false,
      EnablePlan: true,
      DisableBuiltinSyntaxFlowRules: true,
    })
    expect(screen.getAllByRole('switch')[0]).toBeChecked()
    expect(mocks.setSetting).toHaveBeenCalledTimes(2)
  })

  it('重置清空全局提示词，直到关闭弹窗才保存', () => {
    mocks.globalPresetPrompt = '已有全局指令'
    mocks.globalPlanPrompt = '已有 Plan 提示词'
    render(<AIInputSettingPopover visible />)
    fireEvent.click(screen.getByText('打开设置'))

    fireEvent.click(screen.getByRole('button', { name: 'YakitButton.reset' }))

    expect(screen.getByLabelText('AIReActTaskChatContent.globalDirective')).toHaveValue('')
    expect(screen.getByLabelText('AIReActTaskChatContent.planPrompt')).toHaveValue('')
    expect(mocks.setAIGlobalConfig).toHaveBeenCalledExactlyOnceWith({
      DisableBuiltinSyntaxFlowRules: true,
    })
    fireEvent.click(screen.getByText('关闭设置'))
    expect(mocks.setAIGlobalConfig).toHaveBeenCalledTimes(2)
    expect(mocks.setAIGlobalConfig).toHaveBeenLastCalledWith({ AIPresetPrompt: '', AIPlanPrompt: '' })
  })

  it('提示词未编辑时关闭弹窗不保存全局配置', () => {
    mocks.globalPresetPrompt = '已有全局指令'
    mocks.globalPlanPrompt = '已有 Plan 提示词'
    render(<AIInputSettingPopover visible />)

    fireEvent.click(screen.getByText('打开设置'))
    fireEvent.click(screen.getByText('关闭设置'))

    expect(mocks.setAIGlobalConfig).not.toHaveBeenCalled()
  })

  it('欢迎页草稿可开启会话级单模型模式且不发送 Hotpatch', () => {
    mocks.activeChat = { SessionID: 'draft-id', isDraftSession: true }
    render(
      <AIInputSettingPopover visible>
        <button type="button">设置</button>
      </AIInputSettingPopover>,
    )

    const singleModelSwitch = screen.getAllByRole('switch')[0]
    expect(singleModelSwitch).not.toBeDisabled()
    fireEvent.click(singleModelSwitch)

    expect(mocks.setSetting).toHaveBeenCalledTimes(1)
    const updater = mocks.setSetting.mock.calls[0][0]
    expect(updater(mocks.setting)).toMatchObject({ SingleModelMode: true })
    expect(mocks.onSend).not.toHaveBeenCalled()
  })

  it('全局开启时强制显示开启并禁用会话开关', () => {
    mocks.globalSingleModelMode = true
    render(<AIInputSettingPopover visible />)

    expect(screen.getByText('AIReActTaskChatContent.singleModelMode')).toBeInTheDocument()
    expect(screen.getAllByRole('switch')[0]).toBeChecked()
    expect(screen.getAllByRole('switch')[0]).toBeDisabled()
  })

  it.each([false, undefined])('已有会话禁用单模型开关（isDraftSession=%s）', (isDraftSession) => {
    mocks.activeChat = { SessionID: 'existing-session', isDraftSession }
    render(<AIInputSettingPopover visible />)

    expect(screen.getAllByRole('switch')[0]).toBeDisabled()
  })

  it('运行中切换同步意图识别，会话更新只携带本次变更字段', () => {
    mocks.activeChat = { SessionID: 'existing-session', StartParams: {} }
    sessionStore.setState({ execute: true })
    render(<AIInputSettingPopover visible />)

    fireEvent.click(screen.getByRole('switch', { name: 'AIReActTaskChatContent.syncPerceptionTrigger' }))

    expect(mocks.onSend).toHaveBeenCalledExactlyOnceWith({
      token: 'session-id',
      type: 'casual',
      params: {
        IsConfigHotpatch: true,
        HotpatchType: 'SyncPerceptionTrigger',
        Params: { SyncPerceptionTrigger: true },
      },
    })
    expect(emiter.emit).toHaveBeenCalledExactlyOnceWith(
      'sessionData',
      JSON.stringify({
        type: 'updateSession',
        sessionId: 'existing-session',
        updates: { StartParams: { SyncPerceptionTrigger: true } },
      }),
    )
  })

  it('同步意图识别热更新被拒绝时不记录会话参数', () => {
    mocks.activeChat = { SessionID: 'session-id', StartParams: { SyncPerceptionTrigger: false } }
    sessionStore.setState({ execute: true })
    mocks.onSend.mockReturnValue(false)
    render(<AIInputSettingPopover visible />)

    fireEvent.click(screen.getByRole('switch', { name: 'AIReActTaskChatContent.syncPerceptionTrigger' }))

    expect(mocks.onSend).toHaveBeenCalledTimes(1)
    expect(mocks.setActiveChat).not.toHaveBeenCalled()
    expect(emiter.emit).not.toHaveBeenCalled()
    expect(mocks.activeChat?.StartParams?.SyncPerceptionTrigger).toBe(false)
  })

  it('查询未就绪时仍使用 token 设置，外部关闭提交一次并销毁', () => {
    mocks.modelContext.enabled = false
    const view = render(<AIInputSettingPopover visible />)
    const input = screen.getByRole('spinbutton', { name: 'AIContextUsage.threshold' })
    expect(screen.getByTestId('settings-popover')).toHaveAttribute('data-destroy-on-hidden', 'true')
    fireEvent.change(input, { target: { value: '650' } })
    expect(mocks.modelContext.save).not.toHaveBeenCalled()
    view.rerender(<AIInputSettingPopover visible={false} />)
    expect(mocks.modelContext.save).toHaveBeenCalledExactlyOnceWith({ threshold_tokens: 650000 })
    expect(screen.queryByRole('spinbutton')).not.toBeInTheDocument()
    view.rerender(<AIInputSettingPopover visible={false} />)
    expect(mocks.modelContext.save).toHaveBeenCalledTimes(1)
    mocks.modelContext.editorThresholdTokens = 650000
    view.rerender(<AIInputSettingPopover visible />)
    expect(screen.getByRole('spinbutton', { name: 'AIContextUsage.threshold' })).toHaveValue('650')
  })

  it('token 草稿和同步意图识别分别通过会话设置与热更新保存', () => {
    mocks.activeChat = { SessionID: 'session-id', StartParams: { SyncPerceptionTrigger: false } }
    sessionStore.setState({ execute: true })
    render(<AIInputSettingPopover visible />)
    fireEvent.change(screen.getByRole('spinbutton', { name: 'AIContextUsage.threshold' }), {
      target: { value: '600' },
    })
    fireEvent.click(screen.getByRole('switch', { name: 'AIReActTaskChatContent.syncPerceptionTrigger' }))
    expect(mocks.onSend).toHaveBeenCalledExactlyOnceWith({
      token: 'session-id',
      type: 'casual',
      params: {
        IsConfigHotpatch: true,
        HotpatchType: 'SyncPerceptionTrigger',
        Params: { SyncPerceptionTrigger: true },
      },
    })
    expect(mocks.modelContext.save).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: '关闭设置' }))
    expect(mocks.modelContext.save).toHaveBeenCalledExactlyOnceWith({ threshold_tokens: 600000 })
  })

  it('聊天齿轮显示已禁用的追问设置，开启后发送 false 而不是反转语义', () => {
    mocks.setting.DisallowRequireForUserPrompt = true
    render(<AIInputSettingPopover visible />)
    const control = screen.getByRole('switch', { name: 'AIReActTaskChatContent.allowUserPrompt' })
    expect(control).not.toBeChecked()
    fireEvent.click(control)
    expect(mocks.setSetting.mock.calls[0][0](mocks.setting)).toMatchObject({
      DisallowRequireForUserPrompt: false,
    })
    expect(mocks.onSend).not.toHaveBeenCalled()
  })

  it('追问热更新被拒绝时恢复开关且不保存会话参数', () => {
    mocks.setting.DisallowRequireForUserPrompt = false
    mocks.activeChat = { SessionID: 'session-id', StartParams: { DisallowRequireForUserPrompt: false } }
    mocks.setSetting.mockImplementation((update) => {
      mocks.setting = update(mocks.setting)
    })
    sessionStore.setState({ execute: true })
    mocks.onSend.mockReturnValue(false)
    render(<AIInputSettingPopover visible />)
    const control = screen.getByRole('switch', { name: 'AIReActTaskChatContent.allowUserPrompt' })
    expect(control).toBeChecked()
    fireEvent.click(control)
    expect(mocks.onSend).toHaveBeenCalledTimes(1)
    expect(mocks.setSetting).not.toHaveBeenCalled()
    expect(emiter.emit).not.toHaveBeenCalled()
    expect(mocks.setting.DisallowRequireForUserPrompt).toBe(false)
    expect(control).toBeChecked()
    fireEvent.click(control)
    expect(mocks.onSend).toHaveBeenCalledTimes(2)
    expect(mocks.onSend).toHaveBeenLastCalledWith({
      token: 'session-id',
      type: 'casual',
      params: {
        IsConfigHotpatch: true,
        HotpatchType: AIInputEventHotPatchTypeEnum.HotPatchType_AllowRequireForUserInteract,
        Params: { DisallowRequireForUserPrompt: true },
      },
    })
    expect(mocks.setSetting).not.toHaveBeenCalled()
    expect(control).toBeChecked()
  })

  it('已连接会话启用与禁用都发送热更新，并同步恢复时使用的启动参数', () => {
    mocks.setting.DisallowRequireForUserPrompt = true
    mocks.activeChat = { SessionID: 'session-id', StartParams: { ReviewPolicy: 'manual' } }
    sessionStore.setState({ execute: true })
    render(<AIInputSettingPopover visible />)
    const control = screen.getByRole('switch', { name: 'AIReActTaskChatContent.allowUserPrompt' })
    for (const disallow of [false, true]) {
      fireEvent.click(control)
      expect(mocks.onSend).toHaveBeenLastCalledWith({
        token: 'session-id',
        type: 'casual',
        params: {
          IsConfigHotpatch: true,
          HotpatchType: AIInputEventHotPatchTypeEnum.HotPatchType_AllowRequireForUserInteract,
          Params: { DisallowRequireForUserPrompt: disallow },
        },
      })
      const [event, payload] = mocks.emit.mock.calls.at(-1)!
      expect(event).toBe('sessionData')
      expect(JSON.parse(payload as string)).toMatchObject({
        sessionId: 'session-id',
        updates: { StartParams: { ReviewPolicy: 'manual', DisallowRequireForUserPrompt: disallow } },
      })
    }
  })

  it('设置广播或切换会话后重新显示实际开关值', () => {
    mocks.setting.DisallowRequireForUserPrompt = true
    const view = render(<AIInputSettingPopover visible />)
    expect(screen.getByRole('switch', { name: 'AIReActTaskChatContent.allowUserPrompt' })).not.toBeChecked()
    mocks.setting = { ...mocks.setting, DisallowRequireForUserPrompt: false }
    view.rerender(<AIInputSettingPopover visible setVisible={() => {}} />)
    expect(screen.getByRole('switch', { name: 'AIReActTaskChatContent.allowUserPrompt' })).toBeChecked()
  })

  it('正式会话尚未建立时禁用开关，避免丢失配置更新', () => {
    sessionStore.setState({ execute: true })
    mocks.sessionId = ''
    render(<AIInputSettingPopover visible />)
    expect(screen.getByRole('switch', { name: 'AIReActTaskChatContent.allowUserPrompt' })).toBeDisabled()
  })

  it('默认关闭命令执行安全规则，自定义规则只显示配置入口', () => {
    render(<AIInputSettingPopover visible />)

    const builtin = screen.getByRole('switch', { name: 'AIReActTaskChatContent.enableCommandSecurityRules' })
    expect(builtin).not.toBeChecked()
    expect(
      screen.queryByRole('switch', { name: 'AIReActTaskChatContent.enableCustomSyntaxFlowRules' }),
    ).not.toBeInTheDocument()
    expect(screen.getByText('AIReActTaskChatContent.customBashRulesTitle')).toBeInTheDocument()
    expect(screen.getByText('AIReActTaskChatContent.configureCustomSyntaxFlowRules')).toBeInTheDocument()
  })

  it('点击自定义规则入口打开规则配置页', () => {
    render(<AIInputSettingPopover visible />)

    fireEvent.click(screen.getByText('AIReActTaskChatContent.configureCustomSyntaxFlowRules'))

    expect(mocks.emit).toHaveBeenCalledWith('openPage', JSON.stringify({ route: 'ai-bash-guard-rules' }))
  })

  it('切换命令执行安全规则后立即热更新会话，并写入全局配置', () => {
    mocks.setSetting.mockImplementation((update) => {
      mocks.setting = update(mocks.setting)
    })
    sessionStore.setState({ execute: true })
    render(<AIInputSettingPopover visible />)

    const builtin = screen.getByRole('switch', { name: 'AIReActTaskChatContent.enableCommandSecurityRules' })
    fireEvent.click(builtin)

    expect(mocks.setting).toMatchObject({
      DisableBuiltinSyntaxFlowRules: false,
    })
    expect(mocks.setAIGlobalConfig).toHaveBeenCalledExactlyOnceWith({
      DisableBuiltinSyntaxFlowRules: false,
    })
    expect(mocks.onSend).toHaveBeenCalledTimes(1)
    expect(mocks.onSend.mock.calls[0][0].params).toMatchObject({
      IsConfigHotpatch: true,
      HotpatchType: AIInputEventHotPatchTypeEnum.HotPatchType_SyntaxFlowRules,
      Params: {
        DisableBuiltinSyntaxFlowRules: false,
      },
    })
  })
})
