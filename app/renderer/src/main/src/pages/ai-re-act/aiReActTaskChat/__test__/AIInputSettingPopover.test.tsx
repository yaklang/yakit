import type React from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createStore } from 'zustand/vanilla'

const mocks = vi.hoisted(() => ({
  setting: { SingleModelMode: false, SyncPerceptionTrigger: false, EnablePlan: false } as Record<string, unknown>,
  activeChat: undefined as { SessionID?: string } | undefined,
  globalSingleModelMode: false,
  setSetting: vi.fn(),
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
  default: () => ({ setSetting: mocks.setSetting, onSend: mocks.onSend }),
}))

vi.mock('../../hooks/useCurrentDataBySession', () => ({
  useCurrentStore: () => sessionStore,
}))

vi.mock('../../hooks/useCurrentSessionId', () => ({ default: () => 'session-id' }))

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
  YakitPopover: ({ children, content }: { children?: React.ReactNode; content?: React.ReactNode }) => (
    <div>
      {children}
      {content}
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
  YakitInput: {
    TextArea: ({
      isShowResize: _isShowResize,
      ...props
    }: React.TextareaHTMLAttributes<HTMLTextAreaElement> & {
      isShowResize?: boolean
    }) => <textarea {...props} />,
  },
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

describe('AIInputSettingPopover single-model mode', () => {
  beforeEach(() => {
    mocks.setting = { SingleModelMode: false, SyncPerceptionTrigger: false, EnablePlan: false }
    mocks.activeChat = undefined
    mocks.globalSingleModelMode = false
    mocks.setSetting.mockReset()
    mocks.onSend.mockReset()
    sessionStore = createStore(() => ({ execute: false }))
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

    expect(screen.getByText('AIReActTaskChatContent.singleModelModeGlobal')).toBeInTheDocument()
    expect(screen.getAllByRole('switch')[0]).toBeChecked()
    expect(screen.getAllByRole('switch')[0]).toBeDisabled()
  })

  it('已有会话不允许运行中切换', () => {
    mocks.activeChat = { SessionID: 'existing-session' }
    render(<AIInputSettingPopover visible />)

    expect(screen.getAllByRole('switch')[0]).toBeDisabled()
  })
})
