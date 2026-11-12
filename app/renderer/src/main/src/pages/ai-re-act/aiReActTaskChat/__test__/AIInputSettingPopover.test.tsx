import type React from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createStore } from 'zustand/vanilla'
import emiter from '@/utils/eventBus/eventBus'
import { AIInputEventHotPatchTypeEnum } from '../../hooks/grpcApi'

const mocks = vi.hoisted(() => ({
  setting: { SingleModelMode: false, SyncPerceptionTrigger: false, EnablePlan: false } as Record<string, unknown>,
  activeChat: undefined as { SessionID?: string; StartParams?: Record<string, unknown> } | undefined,
  globalSingleModelMode: false,
  sessionId: 'session-id',
  setSetting: vi.fn(),
  setActiveChat: vi.fn(),
  onSend: vi.fn(),
  emit: vi.fn(),
}))

let sessionStore = createStore(() => ({ execute: false }))

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

vi.mock('@/pages/ai-agent/useContext/useDispatcher', () => ({
  default: () => ({ setSetting: mocks.setSetting, setActiveChat: mocks.setActiveChat, onSend: mocks.onSend }),
}))

vi.mock('../../hooks/useCurrentDataBySession', () => ({
  useCurrentStore: () => sessionStore,
}))

vi.mock('../../hooks/useCurrentSessionId', () => ({ default: () => mocks.sessionId }))

vi.mock('../../hooks/useAIGlobalConfig', () => ({
  default: () => [
    {
      aiGlobalConfig: {
        SingleModelMode: mocks.globalSingleModelMode,
        AIPresetPrompt: '',
        AIPlanPrompt: '',
      },
    },
    { setAIGlobalConfig: vi.fn() },
  ],
}))

vi.mock('@/components/yakitUI/YakitPopover/YakitPopover', () => ({
  YakitPopover: ({
    children,
    content,
    onOpenChange,
  }: {
    children?: React.ReactNode
    content?: React.ReactNode
    onOpenChange?: (open: boolean) => void
  }) => (
    <div>
      {children}
      {content}
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
    'aria-label': ariaLabel,
  }: {
    checked?: boolean
    disabled?: boolean
    onChange?: (v: boolean) => void
    'aria-label'?: string
  }) => (
    <input
      type="checkbox"
      role="switch"
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
    mocks.setting = { SingleModelMode: false, SyncPerceptionTrigger: false, EnablePlan: false }
    mocks.activeChat = undefined
    mocks.sessionId = 'session-id'
    mocks.globalSingleModelMode = false
    mocks.setSetting.mockReset()
    mocks.setActiveChat.mockReset()
    mocks.setActiveChat.mockImplementation((update) => {
      mocks.activeChat = update(mocks.activeChat)
    })
    mocks.onSend.mockReset().mockReturnValue(true)
    mocks.emit.mockClear()
    sessionStore = createStore(() => ({ execute: false }))
  })

  it('聊天设置中不再显示上下文设置行或说明文案', () => {
    render(
      <AIInputSettingPopover visible>
        <button>trigger</button>
      </AIInputSettingPopover>,
    )
    expect(screen.queryByText('AIChatSetting.runtimeContextSize')).not.toBeInTheDocument()
    expect(screen.queryByText('AIContextToken.modelContextSettingsHint')).not.toBeInTheDocument()
    expect(screen.queryByRole('spinbutton')).not.toBeInTheDocument()
    expect(mocks.onSend).not.toHaveBeenCalled()
    expect(mocks.setSetting).not.toHaveBeenCalled()
  })

  it('新会话可开启会话级单模型模式且不发送 Hotpatch', () => {
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

  it('已有会话不允许运行中切换', () => {
    mocks.activeChat = { SessionID: 'existing-session' }
    render(<AIInputSettingPopover visible />)

    expect(screen.getAllByRole('switch')[0]).toBeDisabled()
  })

  it('运行中切换同步意图识别，会话更新只携带本次变更字段', () => {
    mocks.activeChat = { SessionID: 'existing-session', StartParams: { RuntimeContextSizeLimit: 300 * 1024 } }
    sessionStore = createStore(() => ({ execute: true }))
    render(<AIInputSettingPopover visible />)

    fireEvent.click(screen.getAllByRole('switch')[2])

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
    sessionStore = createStore(() => ({ execute: true }))
    mocks.onSend.mockReturnValue(false)
    render(<AIInputSettingPopover visible />)

    fireEvent.click(screen.getAllByRole('switch')[2])

    expect(mocks.onSend).toHaveBeenCalledTimes(1)
    expect(mocks.setActiveChat).not.toHaveBeenCalled()
    expect(emiter.emit).not.toHaveBeenCalled()
    expect(mocks.activeChat?.StartParams?.SyncPerceptionTrigger).toBe(false)
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
})
