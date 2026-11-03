import React from 'react'
import '../../hooks/__test__/setupElectron'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
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
    onVisibleChange,
  }: {
    children?: React.ReactNode
    content?: React.ReactNode
    onVisibleChange?: (open: boolean) => void
  }) => (
    <div>
      {children}
      {content}
      <button type="button" onClick={() => onVisibleChange?.(true)}>
        打开设置
      </button>
      <button type="button" onClick={() => onVisibleChange?.(false)}>
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

import { AIInputSettingPopover } from '../AIReActTaskChat'

beforeEach(() => {
  mocks.setting = { RuntimeContextSizeLimit: 300, SyncPerceptionTrigger: false, EnablePlan: false }
  mocks.activeChat = undefined
  mocks.sessionId = 'session-id'
  mocks.onSend.mockReset().mockReturnValue(true)
  mocks.setSetting.mockReset().mockImplementation((update) => {
    mocks.setting = update(mocks.setting)
  })
  mocks.setActiveChat.mockReset().mockImplementation((update) => {
    mocks.activeChat = update(mocks.activeChat)
  })
  vi.mocked(emiter.emit).mockClear()
  sessionStore = createStore(() => ({ execute: false }))
})

afterEach(cleanup)

const input = () => screen.getByLabelText('AIChatSetting.runtimeContextSize')
const changeLimit = (value: string) => fireEvent.change(input(), { target: { value } })
const runningSession = () => {
  mocks.activeChat = {
    SessionID: mocks.sessionId,
    StartParams: { RuntimeContextSizeLimit: 120 * 1024, ForgeName: 'employee-forge', EnablePlan: true },
  }
  sessionStore.setState({ execute: true })
}

describe('runtime context hotpatch in the existing AI Senso input settings', () => {
  it('sets the new-session KB default without starting a stream', () => {
    render(<AIInputSettingPopover visible />)
    expect(input()).toHaveValue('300')
    expect(input()).toHaveAttribute('aria-valuemin', '60')
    expect(screen.getByText('KB')).toBeInTheDocument()
    changeLimit('600')
    expect(mocks.setting.RuntimeContextSizeLimit).toBe(600)
    expect(mocks.onSend).not.toHaveBeenCalled()
    expect(mocks.setActiveChat).not.toHaveBeenCalled()
    expect(emiter.emit).not.toHaveBeenCalled()
  })

  it('uses session bytes and sends only the official threshold patch, preserving the Forge', () => {
    runningSession()
    mocks.setting.RuntimeContextSizeLimit = 900
    render(<AIInputSettingPopover visible />)
    expect(input()).toHaveValue('120')
    changeLimit('600')
    expect(mocks.onSend).toHaveBeenCalledTimes(1)
    expect(mocks.onSend).toHaveBeenCalledWith({
      token: 'session-id',
      type: 'casual',
      params: {
        IsConfigHotpatch: true,
        HotpatchType: 'RuntimeContextSizeLimit',
        Params: { RuntimeContextSizeLimit: 614400 },
      },
    })
    expect(mocks.activeChat?.StartParams).toEqual({
      RuntimeContextSizeLimit: 614400,
      ForgeName: 'employee-forge',
      EnablePlan: true,
    })
    expect(mocks.setting.RuntimeContextSizeLimit).toBe(600)
    expect(emiter.emit).toHaveBeenCalledWith(
      'sessionData',
      JSON.stringify({
        type: 'updateSession',
        sessionId: 'session-id',
        updates: { StartParams: { RuntimeContextSizeLimit: 614400 } },
      }),
    )
  })

  it.each(['stopped', 'rejected', 'missing-id', 'mismatched-id'])(
    'preserves session state when %s, while saving the new-session default',
    (reason) => {
      runningSession()
      const original = mocks.activeChat
      if (reason === 'stopped') sessionStore.setState({ execute: false })
      if (reason === 'rejected') mocks.onSend.mockReturnValue(false)
      if (reason === 'missing-id') mocks.sessionId = ''
      if (reason === 'mismatched-id') mocks.sessionId = 'different-session'
      render(<AIInputSettingPopover visible />)
      changeLimit('600')
      expect(mocks.onSend).toHaveBeenCalledTimes(reason === 'rejected' ? 1 : 0)
      expect(mocks.activeChat).toBe(original)
      expect(mocks.setActiveChat).not.toHaveBeenCalled()
      expect(emiter.emit).not.toHaveBeenCalled()
      expect(mocks.setting.RuntimeContextSizeLimit).toBe(600)
      fireEvent.click(screen.getByText('关闭设置'))
      fireEvent.click(screen.getByText('打开设置'))
      expect(input()).toHaveValue('120')
    },
  )

  it('switches to the new session value and directs subsequent patches only to that session', () => {
    runningSession()
    const { rerender } = render(<AIInputSettingPopover visible />)
    changeLimit('600')
    const first = mocks.activeChat
    mocks.sessionId = 'session-b'
    mocks.activeChat = { SessionID: 'session-b', StartParams: { RuntimeContextSizeLimit: 240 * 1024 } }
    mocks.onSend.mockClear()
    // The real context update rerenders React.memo; this mock needs a changed child prop.
    rerender(
      <AIInputSettingPopover visible>
        <span>session-b</span>
      </AIInputSettingPopover>,
    )
    expect(input()).toHaveValue('240')
    changeLimit('900')
    expect(mocks.onSend.mock.calls[0][0].token).toBe('session-b')
    expect(first?.StartParams?.RuntimeContextSizeLimit).toBe(600 * 1024)
    expect(mocks.activeChat?.StartParams?.RuntimeContextSizeLimit).toBe(900 * 1024)
  })

  it('does not overwrite a different session if the selection changes before the state updater runs', () => {
    runningSession()
    mocks.setActiveChat.mockImplementation((update) => {
      const other = { SessionID: 'other', StartParams: { RuntimeContextSizeLimit: 999 } }
      expect(update(other)).toBe(other)
    })
    render(<AIInputSettingPopover visible />)
    changeLimit('600')
    expect(mocks.onSend.mock.calls[0][0].token).toBe('session-id')
  })

  it.each([undefined, 0, -1])('only displays a fallback for session threshold %s; viewing never sends', (limit) => {
    runningSession()
    mocks.activeChat!.StartParams = { RuntimeContextSizeLimit: limit }
    render(<AIInputSettingPopover visible />)
    expect(input()).toHaveValue('300')
    fireEvent.blur(input())
    expect(mocks.onSend).not.toHaveBeenCalled()
    expect(mocks.setSetting).not.toHaveBeenCalled()
    expect(mocks.activeChat!.StartParams.RuntimeContextSizeLimit).toBe(limit)
  })

  it('clearing the quick input does not write 0 or reset the engine; reopening restores the session value', () => {
    runningSession()
    render(<AIInputSettingPopover visible />)
    changeLimit('')
    fireEvent.blur(input())
    expect(mocks.onSend).not.toHaveBeenCalled()
    expect(mocks.setSetting).not.toHaveBeenCalled()
    fireEvent.click(screen.getByText('关闭设置'))
    fireEvent.click(screen.getByText('打开设置'))
    expect(input()).toHaveValue('120')
  })

  it.each(['0', '1', '59'])('corrects %s to the official quick-input minimum only on blur', (value) => {
    runningSession()
    render(<AIInputSettingPopover visible />)
    changeLimit(value)
    expect(mocks.onSend).not.toHaveBeenCalled()
    fireEvent.blur(input())
    expect(input()).toHaveValue('60')
    expect(mocks.onSend.mock.calls[0][0].params.Params.RuntimeContextSizeLimit).toBe(60 * 1024)
  })

  it('rejects a fractional edit until the existing number input rounds it on blur', () => {
    runningSession()
    render(<AIInputSettingPopover visible />)
    changeLimit('60.9')
    expect(mocks.onSend).not.toHaveBeenCalled()
    fireEvent.blur(input())
    expect(input()).toHaveValue('61')
    expect(mocks.onSend.mock.calls[0][0].params.Params.RuntimeContextSizeLimit).toBe(61 * 1024)
  })

  it.each(['context-first', 'perception-first'])(
    'preserves both context and perception changes in %s order',
    (order) => {
      runningSession()
      const { rerender } = render(<AIInputSettingPopover visible />)
      const context = () => changeLimit('600')
      const perception = () => fireEvent.click(screen.getByRole('switch'))
      const changes = order === 'context-first' ? [context, perception] : [perception, context]
      changes.forEach((change) => {
        change()
        rerender(<AIInputSettingPopover visible />)
      })
      expect(mocks.onSend).toHaveBeenCalledTimes(2)
      expect(mocks.setting).toMatchObject({ RuntimeContextSizeLimit: 600, SyncPerceptionTrigger: true })
      expect(mocks.activeChat?.StartParams).toMatchObject({
        RuntimeContextSizeLimit: 614400,
        SyncPerceptionTrigger: true,
        ForgeName: 'employee-forge',
      })
    },
  )

  it('does not persist a rejected perception change into session history', () => {
    runningSession()
    mocks.onSend.mockReturnValue(false)
    render(<AIInputSettingPopover visible />)
    fireEvent.click(screen.getByRole('switch'))
    expect(mocks.setActiveChat).not.toHaveBeenCalled()
    expect(emiter.emit).not.toHaveBeenCalled()
    expect(mocks.setting.SyncPerceptionTrigger).toBe(true)
  })
})
