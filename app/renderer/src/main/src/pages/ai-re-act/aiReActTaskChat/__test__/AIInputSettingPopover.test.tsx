import type React from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createStore } from 'zustand/vanilla'
import emiter from '@/utils/eventBus/eventBus'

const mocks = vi.hoisted(() => ({
  setting: { SingleModelMode: false, SyncPerceptionTrigger: false, EnablePlan: false } as Record<string, unknown>,
  activeChat: undefined as { SessionID?: string; StartParams?: Record<string, unknown> } | undefined,
  globalSingleModelMode: false,
  sessionId: 'session-id',
  setSetting: vi.fn(),
  setActiveChat: vi.fn(),
  onSend: vi.fn(),
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
  }: {
    checked?: boolean
    disabled?: boolean
    onChange?: (v: boolean) => void
  }) => (
    <input
      type="checkbox"
      role="switch"
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
vi.mock('@/utils/eventBus/eventBus', () => ({ default: { emit: vi.fn() } }))
vi.mock('@/i18n/useI18nNamespaces', () => ({
  useI18nNamespaces: () => ({ t: (key: string) => key }),
}))

const { AIInputSettingPopover } = await import('../AIReActTaskChat')

describe('AIInputSettingPopover', () => {
  beforeEach(() => {
    mocks.setting = { SingleModelMode: false, SyncPerceptionTrigger: false, EnablePlan: false }
    mocks.activeChat = undefined
    mocks.globalSingleModelMode = false
    mocks.sessionId = 'session-id'
    mocks.setSetting.mockReset()
    mocks.setActiveChat.mockReset()
    mocks.setActiveChat.mockImplementation((update) => {
      mocks.activeChat = update(mocks.activeChat)
    })
    mocks.onSend.mockReset().mockReturnValue(true)
    vi.mocked(emiter.emit).mockClear()
    sessionStore = createStore(() => ({ execute: false }))
  })

  it('已有会话打开设置读取自己的字节上限，修改后当前会话和下次默认值同时更新', () => {
    mocks.setting.RuntimeContextSizeLimit = 900
    mocks.activeChat = {
      SessionID: 'session-id',
      StartParams: { RuntimeContextSizeLimit: 120 * 1024, EnablePlan: true },
    }
    mocks.setSetting.mockImplementation((update) => {
      mocks.setting = update(mocks.setting)
    })
    sessionStore.setState({ execute: true })
    const { rerender } = render(<AIInputSettingPopover visible />)
    const input = screen.getByLabelText('AIChatSetting.runtimeContextSize')
    expect(input).toHaveValue('120')
    fireEvent.change(input, { target: { value: '600' } })
    fireEvent.blur(input)
    expect(mocks.activeChat?.StartParams).toEqual({ RuntimeContextSizeLimit: 614400, EnablePlan: true })
    expect(mocks.setting.RuntimeContextSizeLimit).toBe(600)
    expect(mocks.onSend).toHaveBeenCalledWith(
      expect.objectContaining({
        token: 'session-id',
        params: expect.objectContaining({ Params: { RuntimeContextSizeLimit: 614400 } }),
      }),
    )
    fireEvent.click(screen.getByText('关闭设置'))
    mocks.setting.RuntimeContextSizeLimit = 800
    rerender(<AIInputSettingPopover visible={false} />)
    fireEvent.click(screen.getByText('打开设置'))
    expect(input).toHaveValue('600')
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

  it('运行时上下文位于同步意图识别和全局指令之间，按 KB 更新配置', () => {
    render(<AIInputSettingPopover visible />)
    const input = screen.getByLabelText('AIChatSetting.runtimeContextSize')
    expect(input).toHaveValue('300')
    expect(input).toHaveAttribute('role', 'spinbutton')
    expect(input).toHaveAttribute('aria-valuemin', '60')
    expect(screen.getByText('K')).toBeInTheDocument()
    const label = screen.getByText('AIChatSetting.runtimeContextSize')
    expect(screen.getByText('AIReActTaskChatContent.syncPerceptionTrigger').compareDocumentPosition(label)).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    )
    expect(label.compareDocumentPosition(screen.getByText('AIReActTaskChatContent.globalDirective'))).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    )

    fireEvent.change(input, { target: { value: '00600' } })

    expect(input).toHaveValue('600')
    expect(mocks.setSetting).toHaveBeenCalledTimes(1)
    expect(mocks.setSetting.mock.calls[0][0](mocks.setting)).toEqual({ ...mocks.setting, RuntimeContextSizeLimit: 600 })
    expect(mocks.onSend).not.toHaveBeenCalled()
  })

  it('运行时上下文输入 0 后由数字输入框在失焦时校正为 60', () => {
    mocks.setting.RuntimeContextSizeLimit = 300
    render(<AIInputSettingPopover visible />)
    const input = screen.getByLabelText('AIChatSetting.runtimeContextSize')
    expect(input).toHaveValue('300')

    fireEvent.change(input, { target: { value: '0' } })
    expect(mocks.setSetting).not.toHaveBeenCalled()
    fireEvent.blur(input)

    expect(input).toHaveValue('60')
    expect(mocks.setSetting.mock.calls[0][0](mocks.setting)).toMatchObject({ RuntimeContextSizeLimit: 60 })
  })

  it('关闭期间配置变化，重新打开时同步最新上下文大小', () => {
    mocks.setting.RuntimeContextSizeLimit = 300
    const { rerender } = render(<AIInputSettingPopover />)
    fireEvent.click(screen.getByText('打开设置'))
    fireEvent.click(screen.getByText('关闭设置'))

    mocks.setting = { ...mocks.setting, RuntimeContextSizeLimit: 600 }
    rerender(
      <AIInputSettingPopover>
        <span>设置入口</span>
      </AIInputSettingPopover>,
    )
    fireEvent.click(screen.getByText('打开设置'))

    expect(screen.getByLabelText('AIChatSetting.runtimeContextSize')).toHaveValue('600')
    expect(mocks.setSetting).not.toHaveBeenCalled()
    expect(mocks.onSend).not.toHaveBeenCalled()
  })

  it('清空后关闭再打开，恢复有效配置且不发送热更新', () => {
    mocks.setting.RuntimeContextSizeLimit = 600
    sessionStore = createStore(() => ({ execute: true }))
    render(<AIInputSettingPopover />)
    fireEvent.click(screen.getByText('打开设置'))
    const input = screen.getByLabelText('AIChatSetting.runtimeContextSize')
    fireEvent.change(input, { target: { value: '' } })
    fireEvent.blur(input)
    expect(input).toHaveValue('')
    fireEvent.click(screen.getByText('关闭设置'))
    fireEvent.click(screen.getByText('打开设置'))

    expect(input).toHaveValue('600')
    expect(mocks.setSetting).not.toHaveBeenCalled()
    expect(mocks.onSend).not.toHaveBeenCalled()
    expect(emiter.emit).not.toHaveBeenCalled()
  })

  it.each(['1', '59'])('自定义值 %s 在失焦时调整为 60', (value) => {
    render(<AIInputSettingPopover visible />)
    const input = screen.getByLabelText('AIChatSetting.runtimeContextSize')

    fireEvent.change(input, { target: { value } })
    expect(input).toHaveValue(value)
    expect(mocks.setSetting).not.toHaveBeenCalled()
    fireEvent.blur(input)

    expect(input).toHaveValue('60')
    expect(mocks.setSetting.mock.calls[0][0](mocks.setting)).toMatchObject({ RuntimeContextSizeLimit: 60 })
  })

  it('输入过程不提前修正数值，60 及以上正常保存', () => {
    render(<AIInputSettingPopover visible />)
    const input = screen.getByLabelText('AIChatSetting.runtimeContextSize')
    fireEvent.change(input, { target: { value: '6' } })
    expect(mocks.setSetting).not.toHaveBeenCalled()
    fireEvent.change(input, { target: { value: '60' } })
    expect(input).toHaveValue('60')
    expect(mocks.setSetting.mock.calls[0][0](mocks.setting)).toMatchObject({ RuntimeContextSizeLimit: 60 })
    fireEvent.change(input, { target: { value: '600' } })
    fireEvent.blur(input)
    expect(input).toHaveValue('600')
    expect(mocks.setSetting).toHaveBeenCalledTimes(2)
    expect(mocks.setSetting.mock.calls[1][0](mocks.setting)).toMatchObject({ RuntimeContextSizeLimit: 600 })
  })

  it.each([
    [59.9, 60],
    [60.5, 61],
    [120.9, 121],
  ])('已有值 %s 在失焦时校正为正整数 %s，再保存和热更新', (value, expected) => {
    mocks.setting.RuntimeContextSizeLimit = value
    sessionStore = createStore(() => ({ execute: true }))
    render(<AIInputSettingPopover visible />)
    const input = screen.getByLabelText('AIChatSetting.runtimeContextSize')

    fireEvent.blur(input)

    expect(input).toHaveValue(String(expected))
    expect(mocks.setSetting.mock.calls[0][0](mocks.setting)).toMatchObject({ RuntimeContextSizeLimit: expected })
    expect(mocks.onSend.mock.calls[0][0].params.Params).toEqual({ RuntimeContextSizeLimit: expected * 1024 })
  })

  it.each([undefined, 0, -1])('新会话配置为 %s 时显示默认 300KB，查看和失焦不改写配置', (limit) => {
    mocks.setting.RuntimeContextSizeLimit = limit
    sessionStore = createStore(() => ({ execute: true }))
    render(<AIInputSettingPopover visible />)
    const input = screen.getByLabelText('AIChatSetting.runtimeContextSize')

    expect(input).toHaveValue('300')
    fireEvent.blur(input)

    expect(input).toHaveValue('300')
    expect(mocks.setting.RuntimeContextSizeLimit).toBe(limit)
    expect(mocks.setSetting).not.toHaveBeenCalled()
    expect(mocks.onSend).not.toHaveBeenCalled()
  })

  it.each([undefined, 0, -1])('已有会话阈值为 %s 时显示默认 300KB，不热更新或改写原始参数', (limit) => {
    mocks.setting.RuntimeContextSizeLimit = 900
    mocks.activeChat = { SessionID: 'session-id', StartParams: { RuntimeContextSizeLimit: limit } }
    sessionStore = createStore(() => ({ execute: true }))
    render(<AIInputSettingPopover visible />)
    const input = screen.getByLabelText('AIChatSetting.runtimeContextSize')

    expect(input).toHaveValue('300')
    fireEvent.blur(input)
    fireEvent.click(screen.getByText('关闭设置'))
    fireEvent.click(screen.getByText('打开设置'))

    expect(input).toHaveValue('300')
    expect(mocks.activeChat.StartParams?.RuntimeContextSizeLimit).toBe(limit)
    expect(mocks.setSetting).not.toHaveBeenCalled()
    expect(mocks.setActiveChat).not.toHaveBeenCalled()
    expect(mocks.onSend).not.toHaveBeenCalled()
    expect(emiter.emit).not.toHaveBeenCalled()
  })

  it('清空输入后失焦和关闭弹窗不会保存或热更新空值', () => {
    sessionStore = createStore(() => ({ execute: true }))
    render(<AIInputSettingPopover visible />)
    fireEvent.change(screen.getByLabelText('AIChatSetting.runtimeContextSize'), { target: { value: '' } })
    fireEvent.blur(screen.getByLabelText('AIChatSetting.runtimeContextSize'))
    fireEvent.click(screen.getByText('关闭设置'))

    expect(mocks.setSetting).not.toHaveBeenCalled()
    expect(mocks.onSend).not.toHaveBeenCalled()
    expect(emiter.emit).not.toHaveBeenCalled()
  })

  it.each(['60', '600', '0'])('运行中将输入 %j 按字节热更新，并同步会话参数', (value) => {
    mocks.setting.RuntimeContextSizeLimit = 600
    mocks.activeChat = { SessionID: 'existing-session', StartParams: { SyncPerceptionTrigger: true } }
    sessionStore = createStore(() => ({ execute: true }))
    render(<AIInputSettingPopover visible />)

    fireEvent.change(screen.getByLabelText('AIChatSetting.runtimeContextSize'), { target: { value } })
    fireEvent.blur(screen.getByLabelText('AIChatSetting.runtimeContextSize'))
    const expected = Math.max(60, Number(value))

    expect(mocks.onSend).toHaveBeenCalledExactlyOnceWith({
      token: 'session-id',
      type: 'casual',
      params: {
        IsConfigHotpatch: true,
        HotpatchType: 'RuntimeContextSizeLimit',
        Params: { RuntimeContextSizeLimit: expected * 1024 },
      },
    })
    expect(emiter.emit).toHaveBeenCalledExactlyOnceWith(
      'sessionData',
      JSON.stringify({
        type: 'updateSession',
        sessionId: 'existing-session',
        updates: {
          StartParams: { RuntimeContextSizeLimit: expected * 1024 },
        },
      }),
    )
    expect(mocks.setSetting.mock.calls[0][0](mocks.setting)).toMatchObject({ RuntimeContextSizeLimit: expected })
  })

  it('运行中切换同步意图识别，会话更新只携带本次变更字段', () => {
    mocks.activeChat = { SessionID: 'existing-session', StartParams: { RuntimeContextSizeLimit: 300 * 1024 } }
    sessionStore = createStore(() => ({ execute: true }))
    render(<AIInputSettingPopover visible />)

    fireEvent.click(screen.getAllByRole('switch')[1])

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

  it.each(['context-first', 'perception-first'] as const)(
    '连续修改上下文与同步意图识别时保留两项设置，分别热更新（%s）',
    (order) => {
      mocks.setting.RuntimeContextSizeLimit = 300
      mocks.activeChat = {
        SessionID: 'session-id',
        StartParams: { RuntimeContextSizeLimit: 300 * 1024, SyncPerceptionTrigger: false },
      }
      sessionStore = createStore(() => ({ execute: true }))
      mocks.setSetting.mockImplementation((updater: (setting: typeof mocks.setting) => typeof mocks.setting) => {
        mocks.setting = updater(mocks.setting)
      })
      const { rerender } = render(
        <AIInputSettingPopover visible>
          <button type="button">设置</button>
        </AIInputSettingPopover>,
      )
      const updates = {
        context: {
          change: () =>
            fireEvent.change(screen.getByLabelText('AIChatSetting.runtimeContextSize'), {
              target: { value: '600' },
            }),
          params: {
            IsConfigHotpatch: true,
            HotpatchType: 'RuntimeContextSizeLimit',
            Params: { RuntimeContextSizeLimit: 600 * 1024 },
          },
        },
        perception: {
          change: () => fireEvent.click(screen.getAllByRole('switch')[1]),
          params: {
            IsConfigHotpatch: true,
            HotpatchType: 'SyncPerceptionTrigger',
            Params: { SyncPerceptionTrigger: true },
          },
        },
      }
      const sequence =
        order === 'context-first' ? [updates.context, updates.perception] : [updates.perception, updates.context]

      sequence.forEach((update, index) => {
        update.change()
        rerender(
          <AIInputSettingPopover visible>
            <button type="button">设置</button>
          </AIInputSettingPopover>,
        )
        expect(mocks.onSend).toHaveBeenNthCalledWith(index + 1, {
          token: 'session-id',
          type: 'casual',
          params: update.params,
        })
      })

      expect(mocks.setSetting).toHaveBeenCalledTimes(2)
      expect(mocks.setting).toMatchObject({ RuntimeContextSizeLimit: 600, SyncPerceptionTrigger: true })
      expect(screen.getByLabelText('AIChatSetting.runtimeContextSize')).toHaveValue('600')
      expect(screen.getAllByRole('switch')[1]).toBeChecked()
      expect(mocks.onSend).toHaveBeenCalledTimes(2)
      expect(vi.mocked(emiter.emit).mock.calls).toEqual(
        sequence.map((update) => [
          'sessionData',
          JSON.stringify({
            type: 'updateSession',
            sessionId: 'session-id',
            updates: { StartParams: update.params.Params },
          }),
        ]),
      )
    },
  )

  it('切换当前会话后，两项热更新仅发送给新的会话', () => {
    mocks.sessionId = 'session-a'
    mocks.activeChat = { SessionID: 'session-a' }
    sessionStore = createStore(() => ({ execute: true }))
    mocks.setSetting.mockImplementation((updater: (setting: typeof mocks.setting) => typeof mocks.setting) => {
      mocks.setting = updater(mocks.setting)
    })
    const { rerender } = render(
      <AIInputSettingPopover visible>
        <button type="button">设置</button>
      </AIInputSettingPopover>,
    )
    fireEvent.change(screen.getByLabelText('AIChatSetting.runtimeContextSize'), { target: { value: '600' } })
    expect(mocks.onSend.mock.calls[0][0].token).toBe('session-a')

    mocks.sessionId = 'session-b'
    mocks.activeChat = { SessionID: 'session-b' }
    rerender(
      <AIInputSettingPopover visible>
        <button type="button">设置</button>
      </AIInputSettingPopover>,
    )
    mocks.onSend.mockClear()

    fireEvent.change(screen.getByLabelText('AIChatSetting.runtimeContextSize'), { target: { value: '900' } })
    rerender(
      <AIInputSettingPopover visible>
        <button type="button">设置</button>
      </AIInputSettingPopover>,
    )
    fireEvent.click(screen.getAllByRole('switch')[1])
    rerender(
      <AIInputSettingPopover visible>
        <button type="button">设置</button>
      </AIInputSettingPopover>,
    )

    expect(mocks.onSend.mock.calls).toEqual([
      [
        {
          token: 'session-b',
          type: 'casual',
          params: {
            IsConfigHotpatch: true,
            HotpatchType: 'RuntimeContextSizeLimit',
            Params: { RuntimeContextSizeLimit: 900 * 1024 },
          },
        },
      ],
      [
        {
          token: 'session-b',
          type: 'casual',
          params: {
            IsConfigHotpatch: true,
            HotpatchType: 'SyncPerceptionTrigger',
            Params: { SyncPerceptionTrigger: true },
          },
        },
      ],
    ])
    expect(mocks.setting).toMatchObject({ RuntimeContextSizeLimit: 900, SyncPerceptionTrigger: true })
    expect(screen.getByLabelText('AIChatSetting.runtimeContextSize')).toHaveValue('900')
    expect(screen.getAllByRole('switch')[1]).toBeChecked()
  })

  it.each(['stopped', 'rejected', 'missing-session-id'])(
    '热更新未发送时仅保存新会话默认值，重开设置仍显示当前会话原值（%s）',
    (reason) => {
      mocks.setting.RuntimeContextSizeLimit = 300
      mocks.activeChat = {
        SessionID: 'session-id',
        StartParams: { RuntimeContextSizeLimit: 120 * 1024, SyncPerceptionTrigger: false },
      }
      mocks.setSetting.mockImplementation((update) => {
        mocks.setting = update(mocks.setting)
      })
      sessionStore = createStore(() => ({ execute: reason !== 'stopped' }))
      mocks.onSend.mockReturnValue(false)
      if (reason === 'missing-session-id') mocks.sessionId = ''
      const { rerender } = render(<AIInputSettingPopover visible />)
      const input = screen.getByLabelText('AIChatSetting.runtimeContextSize')

      fireEvent.change(input, { target: { value: '600' } })
      fireEvent.blur(input)

      expect(mocks.onSend).toHaveBeenCalledTimes(reason === 'rejected' ? 1 : 0)
      expect(mocks.setActiveChat).not.toHaveBeenCalled()
      expect(emiter.emit).not.toHaveBeenCalled()
      expect(mocks.activeChat.StartParams).toEqual({
        RuntimeContextSizeLimit: 120 * 1024,
        SyncPerceptionTrigger: false,
      })
      expect(mocks.setting.RuntimeContextSizeLimit).toBe(600)
      fireEvent.click(screen.getByText('关闭设置'))
      rerender(<AIInputSettingPopover visible={false} />)
      fireEvent.click(screen.getByText('打开设置'))
      expect(input).toHaveValue('120')

      // 恢复发送后重试相同值，才能更新当前会话的生效配置。
      mocks.sessionId = 'session-id'
      sessionStore = createStore(() => ({ execute: true }))
      mocks.onSend.mockReturnValue(true)
      rerender(<AIInputSettingPopover visible />)
      fireEvent.change(input, { target: { value: '600' } })
      expect(mocks.activeChat?.StartParams?.RuntimeContextSizeLimit).toBe(600 * 1024)
      expect(emiter.emit).toHaveBeenCalledExactlyOnceWith(
        'sessionData',
        JSON.stringify({
          type: 'updateSession',
          sessionId: 'session-id',
          updates: { StartParams: { RuntimeContextSizeLimit: 600 * 1024 } },
        }),
      )
    },
  )

  it('同步意图识别热更新被拒绝时不记录会话参数', () => {
    mocks.activeChat = { SessionID: 'session-id', StartParams: { SyncPerceptionTrigger: false } }
    sessionStore = createStore(() => ({ execute: true }))
    mocks.onSend.mockReturnValue(false)
    render(<AIInputSettingPopover visible />)

    fireEvent.click(screen.getAllByRole('switch')[1])

    expect(mocks.onSend).toHaveBeenCalledTimes(1)
    expect(mocks.setActiveChat).not.toHaveBeenCalled()
    expect(emiter.emit).not.toHaveBeenCalled()
    expect(mocks.activeChat?.StartParams?.SyncPerceptionTrigger).toBe(false)
  })

  it.each([
    ['60.123', 60],
    ['60.9', 61],
  ] as const)('输入小数 %s 时不保存，失焦校正为整数后才热更新', (value, expected) => {
    mocks.setting.RuntimeContextSizeLimit = 300
    mocks.activeChat = { SessionID: 'session-id', StartParams: { RuntimeContextSizeLimit: 300 * 1024 } }
    sessionStore = createStore(() => ({ execute: true }))
    render(<AIInputSettingPopover visible />)
    const input = screen.getByLabelText('AIChatSetting.runtimeContextSize')

    fireEvent.focus(input)
    fireEvent.keyDown(input, { key: '3' })
    fireEvent.change(input, { target: { value } })
    fireEvent.keyUp(input, { key: '3' })

    expect(mocks.setSetting).not.toHaveBeenCalled()
    expect(mocks.onSend).not.toHaveBeenCalled()
    expect(mocks.setActiveChat).not.toHaveBeenCalled()
    expect(emiter.emit).not.toHaveBeenCalled()
    expect(mocks.activeChat?.StartParams?.RuntimeContextSizeLimit).toBe(300 * 1024)

    fireEvent.blur(input)

    expect(input).toHaveValue(String(expected))
    expect(mocks.onSend).toHaveBeenCalledExactlyOnceWith({
      token: 'session-id',
      type: 'casual',
      params: {
        IsConfigHotpatch: true,
        HotpatchType: 'RuntimeContextSizeLimit',
        Params: { RuntimeContextSizeLimit: expected * 1024 },
      },
    })
    expect(mocks.setSetting).toHaveBeenCalledTimes(1)
    expect(mocks.setSetting.mock.calls[0][0](mocks.setting).RuntimeContextSizeLimit).toBe(expected)
    expect(mocks.activeChat?.StartParams?.RuntimeContextSizeLimit).toBe(expected * 1024)
  })

  it('运行中小于 60 的正数在校正后才热更新，关闭时不重复发送', () => {
    sessionStore = createStore(() => ({ execute: true }))
    render(<AIInputSettingPopover visible />)
    const input = screen.getByLabelText('AIChatSetting.runtimeContextSize')
    fireEvent.change(input, { target: { value: '30' } })
    expect(mocks.onSend).not.toHaveBeenCalled()
    fireEvent.blur(input)
    fireEvent.click(screen.getByText('关闭设置'))

    expect(mocks.onSend).toHaveBeenCalledTimes(1)
    expect(mocks.onSend.mock.calls[0][0].params.Params).toEqual({ RuntimeContextSizeLimit: 60 * 1024 })
  })
})
