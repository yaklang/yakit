import React, { createRef, useImperativeHandle, useState } from 'react'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { AIReActChatRefProps } from '@/pages/ai-re-act/aiReActChat/AIReActChatType'
import type { AIChatTextareaProps, AIChatTextareaRefProps } from '../../template/type'
import type * as WelcomeModule from '../AIChatWelcome'
import welcomeStyles from '../AIChatWelcome.module.scss'
import { compileReactModule } from '@/utils/__test__/helpers/compileReactModule'

const createInputHandle = (value: string) => ({
  setValue: vi.fn(),
  setMention: vi.fn(),
  getValue: vi.fn(() => value),
})
const inputHandles = [createInputHandle('first draft'), createInputHandle('second draft')]
vi.mock('../../template/template', () => ({
  AIChatTextarea: React.forwardRef<AIChatTextareaRefProps, AIChatTextareaProps>(function Input(props, ref) {
    const [revision, setRevision] = useState(0)
    useImperativeHandle(ref, () => inputHandles[revision], [revision])
    return (
      <div>
        <div data-testid="scenario-capabilities" data-enabled={props.showScenarioCapabilities} />
        <button onClick={() => setRevision(1)}>更换输入框 ref</button>
        <button onClick={() => props.onHttpFlowRemove?.('101', false)}>删除单条流量</button>
        <button onClick={() => props.onHttpFlowRemove?.('101,102', true)}>删除聚合流量</button>
        <button
          onClick={() =>
            props.onSubmit?.({
              qs: 'hello',
              sessionId: 'stale-image-draft',
            })
          }
        >
          发送首问
        </button>
      </div>
    )
  }),
}))
vi.mock('@/i18n/useI18nNamespaces', () => ({
  useI18nNamespaces: () => ({ t: (key: string) => key, i18n: { language: 'zh' } }),
}))
vi.mock('../AIChatWelcomeSideSetting', () => ({ SideSettingButton: () => null }))
vi.mock('../AIWelcomeAsciiRipple', () => ({
  AIWelcomeAsciiRipple: () => <div data-testid="welcome-ascii-ripple" aria-hidden="true" />,
}))
// CI 的根配置将样式模块替换为空对象；为滚动兜底结构用例断言的类名提供稳定映射。
vi.mock('../AIChatWelcome.module.scss', () => ({
  default: {
    'ai-chat-welcome-wrapper': 'ai-chat-welcome-wrapper',
    'welcome-scroll': 'welcome-scroll',
    'input-wrapper': 'input-wrapper',
  },
}))

const { default: AIChatWelcome } = await compileReactModule<typeof WelcomeModule>(
  import.meta.url,
  '../AIChatWelcome.tsx',
)

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe('AIChatWelcome 输入框转发', () => {
  it('在欢迎页开启场景能力入口', () => {
    render(<AIChatWelcome onTriageSubmit={vi.fn()} onSetReAct={vi.fn()} />)
    expect(screen.getByTestId('scenario-capabilities')).toHaveAttribute('data-enabled', 'true')
  })

  it('首次发送原样转发输入框提供的会话 ID', () => {
    const onTriageSubmit = vi.fn()
    render(<AIChatWelcome onTriageSubmit={onTriageSubmit} onSetReAct={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: '发送首问' }))
    expect(onTriageSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ qs: 'hello', sessionId: 'stale-image-draft' }),
    )
  })
  it('转发输入方法，并在子输入框 handle 更换后使用最新 ref', () => {
    const ref = createRef<AIReActChatRefProps>()
    render(<AIChatWelcome ref={ref} onTriageSubmit={vi.fn()} onSetReAct={vi.fn()} />)
    const welcomeHandle = ref.current!
    const mention: Parameters<AIChatTextareaRefProps['setMention']>[0] = {
      mentionId: 'skill-1',
      mentionName: '测试技能',
      mentionType: 'tool',
    }

    welcomeHandle.setValue('first question')
    welcomeHandle.setMention(mention)
    expect(welcomeHandle.getValue()).toBe('first draft')
    expect(inputHandles[0].setValue).toHaveBeenCalledWith('first question')
    expect(inputHandles[0].setMention).toHaveBeenCalledWith(mention)

    fireEvent.click(screen.getByRole('button', { name: '更换输入框 ref' }))
    expect(ref.current).toBe(welcomeHandle)
    welcomeHandle.setValue('second question')
    welcomeHandle.setMention({ ...mention, mentionId: 'skill-2' })
    expect(welcomeHandle.getValue()).toBe('second draft')
    expect(inputHandles[1].setValue).toHaveBeenCalledWith('second question')
    expect(inputHandles[1].setMention).toHaveBeenCalledWith({ ...mention, mentionId: 'skill-2' })
    for (const method of Object.values(inputHandles[0])) expect(method).toHaveBeenCalledOnce()
  })

  it('将单条与聚合流量删除事件传给父级，并使用更新后的回调', () => {
    const onHttpFlowRemove = vi.fn()
    const onTriageSubmit = vi.fn()
    const onSetReAct = vi.fn()
    const { rerender } = render(<AIChatWelcome {...{ onHttpFlowRemove, onTriageSubmit, onSetReAct }} />)
    fireEvent.click(screen.getByRole('button', { name: '删除单条流量' }))
    fireEvent.click(screen.getByRole('button', { name: '删除聚合流量' }))
    expect(onHttpFlowRemove.mock.calls).toEqual([
      ['101', false],
      ['101,102', true],
    ])

    const nextRemove = vi.fn()
    rerender(<AIChatWelcome {...{ onTriageSubmit, onSetReAct }} onHttpFlowRemove={nextRemove} />)
    fireEvent.click(screen.getByRole('button', { name: '删除单条流量' }))
    fireEvent.click(screen.getByRole('button', { name: '删除聚合流量' }))
    expect(nextRemove.mock.calls).toEqual([
      ['101', false],
      ['101,102', true],
    ])
    expect(onHttpFlowRemove).toHaveBeenCalledTimes(2)
  })
})

describe('AIChatWelcome 最小高度滚动兜底', () => {
  it('ASCII 波纹背景挂在 wrapper 上，输入内容包在 welcome-scroll 滚动层内', () => {
    const { container } = render(<AIChatWelcome ref={createRef()} onTriageSubmit={vi.fn()} onSetReAct={vi.fn()} />)
    const wrapper = container.firstElementChild as HTMLElement
    // 背景固定在可视区域，不随内容滚动。
    expect(screen.getByTestId('welcome-ascii-ripple').parentElement).toBe(wrapper)
    // wrapper 下第二个元素是滚动兜底层，input-wrapper 及输入内容整体位于该层内。
    const scroll = wrapper.children.item(1) as HTMLElement
    expect(scroll.classList.contains(welcomeStyles['welcome-scroll'])).toBe(true)
    const inputWrapper = scroll.firstElementChild as HTMLElement
    expect(inputWrapper.classList.contains(welcomeStyles['input-wrapper'])).toBe(true)
    expect(scroll).toContainElement(screen.getByRole('button', { name: '更换输入框 ref' }))
  })
})
