import React, { createRef, useImperativeHandle, useState } from 'react'
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { AIReActChatRefProps } from '@/pages/ai-re-act/aiReActChat/AIReActChatType'
import type { AIChatTextareaProps, AIChatTextareaRefProps } from '../../template/type'
import type * as WelcomeModule from '../AIChatWelcome'
import welcomeStyles from '../AIChatWelcome.module.scss'
import { compileReactModule } from '@/utils/__test__/helpers/compileReactModule'

const createInputHandle = (value: string) => ({
  setHttpFlow: vi.fn(),
  setValue: vi.fn(),
  setMention: vi.fn(),
  getValue: vi.fn(() => value),
})
const inputHandles = [createInputHandle('first draft'), createInputHandle('second draft')]

const resizeObservers = vi.hoisted(() => {
  const instances: Array<{
    callback: ResizeObserverCallback
    trigger: (width: number, height: number) => void
  }> = []
  class MockResizeObserver {
    callback: ResizeObserverCallback
    constructor(callback: ResizeObserverCallback) {
      this.callback = callback
      instances.push({
        callback,
        trigger: (width, height) => {
          callback([{ contentRect: { width, height } } as ResizeObserverEntry], this as unknown as ResizeObserver)
        },
      })
    }
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  return { instances, MockResizeObserver }
})

const welcomeAnimationMocks = vi.hoisted(() => ({
  animationDisabled: false,
}))

vi.mock('../../template/template', () => ({
  AIChatTextarea: React.forwardRef<AIChatTextareaRefProps, AIChatTextareaProps>(function Input(props, ref) {
    const [revision, setRevision] = useState(0)
    useImperativeHandle(ref, () => inputHandles[revision], [revision])
    return (
      <div>
        <button onClick={() => setRevision(1)}>更换输入框 ref</button>
        <button onClick={() => props.onHttpFlowRemove?.('101', false)}>删除单条流量</button>
        <button onClick={() => props.onHttpFlowRemove?.('101,102', true)}>删除聚合流量</button>
        <button onClick={() => props.onSubmit?.({ qs: 'hello', sessionId: 'stale-image-draft' })}>发送首问</button>
      </div>
    )
  }),
}))
vi.mock('ahooks', async () => ({ ...(await vi.importActual('ahooks')), useInViewport: () => [false] }))
vi.mock('@/i18n/useI18nNamespaces', () => ({
  useI18nNamespaces: () => ({ t: (key: string) => key, i18n: { language: 'zh' } }),
}))
vi.mock('../../grpc', () => ({
  grpcGetAIReActRecommendedSkills: vi.fn().mockResolvedValue({ Data: [] }),
  grpcUpdateAIReActRecommendedSkill: vi.fn(),
  grpcResetAIReActRecommendedSkill: vi.fn(),
}))
vi.mock('@/components/yakitUI/YakitButton/YakitButton', () => ({ YakitButton: () => null }))
vi.mock('@/components/yakitUI/YakitEditor/YakitEditor', () => ({ YakitEditor: () => null }))
vi.mock('@/components/yakitUI/YakitModal/YakitModal', () => ({ YakitModal: () => null }))
vi.mock('@/utils/getMainOperatorPageBodyContainer', () => ({
  getMainOperatorPageBodyContainerOrBody: () => document.body,
}))
vi.mock('@/utils/notification', () => ({ yakitNotify: vi.fn() }))
vi.mock('../AIChatWelcomeSideSetting', () => ({ SideSettingButton: () => null }))
vi.mock('../AIWelcomeAsciiRipple', () => ({
  AIWelcomeAsciiRipple: () => <div data-testid="welcome-ascii-ripple" aria-hidden="true" />,
}))
vi.mock('../../store/welcomeAnimationStore', () => ({
  useWelcomeAnimationDisabled: () => welcomeAnimationMocks.animationDisabled,
}))
// 隔离欢迎页新模块：避免 WelcomeRecentSessions → historyChat → lottie 在 jsdom 触发 canvas/ipc 错误。
// 同时把 props 透出到 DOM，供集成层断言 compact 传递与挂载位置。
vi.mock('../WelcomeRecentSessions/WelcomeRecentSessions', () => ({
  default: ({ density }: { density?: string }) => (
    <div data-testid="welcome-recent-sessions" data-density={density || 'full'} />
  ),
}))
const tipsMocks = vi.hoisted(() => ({ empty: false }))

vi.mock('../WelcomeTipsCards/WelcomeTipsCards', () => {
  function MockWelcomeTipsCards({
    compact,
    onEmptyChange,
  }: {
    compact?: boolean
    onEmptyChange?: (empty: boolean) => void
  }) {
    React.useEffect(() => {
      onEmptyChange?.(tipsMocks.empty)
    }, [onEmptyChange])
    return <div data-testid="welcome-tips-cards" data-compact={compact ? 'true' : 'false'} />
  }
  return { default: MockWelcomeTipsCards }
})
// CI 的根配置将样式模块替换为空对象；为滚动兜底结构用例断言的类名提供稳定映射。
vi.mock('../AIChatWelcome.module.scss', () => ({
  default: {
    'ai-chat-welcome-wrapper': 'ai-chat-welcome-wrapper',
    'welcome-scroll': 'welcome-scroll',
    'input-wrapper': 'input-wrapper',
    'input-wrapper-compact': 'input-wrapper-compact',
    'welcome-tips-block': 'welcome-tips-block',
    title: 'title',
    'title-char': 'title-char',
  },
}))

const { default: AIChatWelcome } = await compileReactModule<typeof WelcomeModule>(
  import.meta.url,
  '../AIChatWelcome.tsx',
)

beforeEach(() => {
  resizeObservers.instances.length = 0
  welcomeAnimationMocks.animationDisabled = false
  tipsMocks.empty = false
  vi.stubGlobal('ResizeObserver', resizeObservers.MockResizeObserver)
  // jsdom 默认 clientWidth/Height 为 0，会误判成 compact/short；先固定为大屏。
  Object.defineProperty(HTMLElement.prototype, 'clientWidth', { configurable: true, get: () => 900 })
  Object.defineProperty(HTMLElement.prototype, 'clientHeight', { configurable: true, get: () => 900 })
})

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
  vi.unstubAllGlobals()
})

const WELCOME_TITLE = 'Memfit AI Agent'

describe('AIChatWelcome 输入框转发', () => {
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

    welcomeHandle.setHttpFlow(['101'])
    welcomeHandle.setValue('first question')
    welcomeHandle.setMention(mention)
    expect(welcomeHandle.getValue()).toBe('first draft')
    expect(inputHandles[0].setHttpFlow).toHaveBeenCalledWith(['101'])
    expect(inputHandles[0].setValue).toHaveBeenCalledWith('first question')
    expect(inputHandles[0].setMention).toHaveBeenCalledWith(mention)

    fireEvent.click(screen.getByRole('button', { name: '更换输入框 ref' }))
    expect(ref.current).toBe(welcomeHandle)
    welcomeHandle.setHttpFlow(['102', '103'])
    welcomeHandle.setValue('second question')
    welcomeHandle.setMention({ ...mention, mentionId: 'skill-2' })
    expect(welcomeHandle.getValue()).toBe('second draft')
    expect(inputHandles[1].setHttpFlow).toHaveBeenCalledWith(['102', '103'])
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

describe('AIChatWelcome 标题动画', () => {
  it('动画启用时按字符拆成 title-char span，关闭后回退为纯文本', () => {
    const { container, rerender } = render(<AIChatWelcome onTriageSubmit={vi.fn()} onSetReAct={vi.fn()} />)
    const title = container.querySelector('.title') as HTMLElement
    expect(title).toBeTruthy()
    expect(title.querySelectorAll('.title-char')).toHaveLength(WELCOME_TITLE.length)
    expect(title).toHaveTextContent(WELCOME_TITLE)

    welcomeAnimationMocks.animationDisabled = true
    rerender(<AIChatWelcome onTriageSubmit={vi.fn()} onSetReAct={vi.fn()} />)
    const staticTitle = container.querySelector('.title') as HTMLElement
    expect(staticTitle.querySelectorAll('.title-char')).toHaveLength(0)
    expect(staticTitle).toHaveTextContent(WELCOME_TITLE)
  })
})

describe('AIChatWelcome 欢迎区集成', () => {
  it('TipsCards 与 RecentSessions 嵌在 welcome-tips-block 内，大屏 density=full', () => {
    const { container } = render(<AIChatWelcome onTriageSubmit={vi.fn()} onSetReAct={vi.fn()} />)
    const tipsBlock = container.querySelector('.welcome-tips-block') as HTMLElement
    expect(tipsBlock).toBeTruthy()
    expect(tipsBlock).toContainElement(screen.getByText('AIChatWelcome.WelcomeHomeSubTitle'))
    expect(tipsBlock).toContainElement(screen.getByTestId('welcome-tips-cards'))
    expect(tipsBlock).toContainElement(screen.getByTestId('welcome-recent-sessions'))
    expect(screen.getByTestId('welcome-tips-cards')).toHaveAttribute('data-compact', 'false')
    expect(screen.getByTestId('welcome-recent-sessions')).toHaveAttribute('data-density', 'full')
    expect(container.querySelector('.input-wrapper-compact')).toBeNull()
  })

  it('高度 ≤850 时最近会话 density=three，边距仍用常规档', () => {
    const { container } = render(<AIChatWelcome onTriageSubmit={vi.fn()} onSetReAct={vi.fn()} />)
    expect(screen.getByTestId('welcome-recent-sessions')).toHaveAttribute('data-density', 'full')

    act(() => {
      resizeObservers.instances.at(-1)?.trigger(800, 750)
    })
    expect(container.querySelector('.input-wrapper-compact')).toBeNull()
    expect(screen.getByTestId('welcome-tips-cards')).toHaveAttribute('data-compact', 'false')
    expect(screen.getByTestId('welcome-recent-sessions')).toHaveAttribute('data-density', 'three')

    act(() => {
      resizeObservers.instances.at(-1)?.trigger(900, 900)
    })
    expect(screen.getByTestId('welcome-recent-sessions')).toHaveAttribute('data-density', 'full')
  })

  it('ResizeObserver 进入小屏时 TipsCards compact，最近会话 density=collapsed', () => {
    const { container } = render(<AIChatWelcome onTriageSubmit={vi.fn()} onSetReAct={vi.fn()} />)
    expect(screen.getByTestId('welcome-tips-cards')).toHaveAttribute('data-compact', 'false')
    expect(screen.getByTestId('welcome-recent-sessions')).toHaveAttribute('data-density', 'full')
    expect(resizeObservers.instances.length).toBeGreaterThan(0)

    act(() => {
      resizeObservers.instances.at(-1)?.trigger(600, 900)
    })
    expect(screen.getByTestId('welcome-tips-cards')).toHaveAttribute('data-compact', 'true')
    expect(screen.getByTestId('welcome-recent-sessions')).toHaveAttribute('data-density', 'full')

    act(() => {
      resizeObservers.instances.at(-1)?.trigger(600, 500)
    })
    expect(screen.getByTestId('welcome-tips-cards')).toHaveAttribute('data-compact', 'true')
    expect(screen.getByTestId('welcome-recent-sessions')).toHaveAttribute('data-density', 'collapsed')
    expect(container.querySelector('.input-wrapper-compact')).toBeTruthy()

    act(() => {
      resizeObservers.instances.at(-1)?.trigger(900, 900)
    })
    expect(screen.getByTestId('welcome-tips-cards')).toHaveAttribute('data-compact', 'false')
    expect(screen.getByTestId('welcome-recent-sessions')).toHaveAttribute('data-density', 'full')
    expect(container.querySelector('.input-wrapper-compact')).toBeNull()
  })
})

describe('AIChatWelcome 空态', () => {
  it('漏洞与流量都为 0 时切换场景副标题并隐藏最近会话', async () => {
    tipsMocks.empty = true
    render(<AIChatWelcome onTriageSubmit={vi.fn()} onSetReAct={vi.fn()} />)
    await waitFor(() => {
      expect(screen.queryByText('AIChatWelcome.WelcomeHomeSubTitle')).not.toBeInTheDocument()
    })
    expect(screen.queryByTestId('welcome-recent-sessions')).not.toBeInTheDocument()
    expect(screen.getByTestId('welcome-tips-cards')).toBeInTheDocument()
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
    expect(scroll).toContainElement(screen.getByTestId('welcome-tips-cards'))
    expect(scroll).toContainElement(screen.getByTestId('welcome-recent-sessions'))
  })
})
