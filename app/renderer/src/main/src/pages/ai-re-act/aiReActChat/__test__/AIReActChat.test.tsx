import React from 'react'
import get from 'lodash/get'
import type * as AIReActChatModule from '../AIReActChat'
import type { AIReActChatContentsRef } from '../../aiReActChatContents/AIReActChatContentsType'
import { compileReactModule } from '@/utils/__test__/helpers/compileReactModule'
import enLayout from '@/locales/en/layout.json'
import zhLayout from '@/locales/zh/layout.json'

const { scrollToItemIndex, locale } = vi.hoisted(() => ({ scrollToItemIndex: vi.fn(), locale: { language: 'zh' } }))
import { act, fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createChatStore } from '../../hooks/chatStore'
import { AINotifyType } from '../../hooks/grpcApi'
import emiter from '@/utils/eventBus/eventBus'

let chatStore: ReturnType<typeof createChatStore>

beforeEach(() => {
  chatStore = createChatStore()
  vi.clearAllMocks()
  locale.language = 'zh'
})

vi.mock('ahooks', async () => {
  const actual = await vi.importActual('ahooks')
  return {
    ...actual,
    useInViewport: () => [true],
  }
})

vi.mock('@/pages/ai-agent/useContext/useStore', () => ({
  default: () => ({ activeChat: undefined, setting: undefined }),
}))

vi.mock('@/pages/ai-agent/useContext/useDispatcher', () => ({
  default: () => ({
    setActiveChat: vi.fn(),
    getSetting: () => ({}),
    onStart: vi.fn(),
    onSend: vi.fn(),
  }),
}))

vi.mock('@/pages/ai-agent/utils', () => ({
  formatAIAgentSetting: () => ({}),
  getAIReActRequestParams: () => ({ attachedResourceInfo: undefined }),
}))

vi.mock('@/utils/notification', () => ({ yakitNotify: vi.fn() }))
vi.mock('@/utils/randomUtil', () => ({ randomString: () => 'test-id' }))
vi.mock('@/utils/eventBus/eventBus', () => ({ default: { emit: vi.fn() } }))

vi.mock('../../hooks/useCurrentDataBySession', () => ({
  useCurrentStore: () => chatStore,
}))
vi.mock('../../hooks/useCurrentSessionId', () => ({ default: () => 'test-session' }))
vi.mock('../../hooks/useSessionId', () => ({ default: () => ({ getSession: () => 'test-session' }) }))
vi.mock('../../hooks/useAINodeLabel', () => ({ default: () => ({ nodeLabel: '' }) }))
vi.mock('../../hooks/ChatMultiSessionController', () => ({
  globalSessionEngine: {
    ensureSession: () => ({ store: {} }),
    setActiveShowSession: vi.fn(),
  },
}))
vi.mock('@/components/yakitUI/YakitButton/YakitButton', () => ({
  YakitButton: ({
    type,
    icon,
    children,
    ...props
  }: Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'type'> & {
    type: string
    icon?: React.ReactNode
  }) => (
    <button {...props} data-type={type}>
      {icon}
      {children}
    </button>
  ),
}))
vi.mock('@/i18n/useI18nNamespaces', () => ({
  useI18nNamespaces: () => ({
    t: (key: string) => get(locale.language === 'en' ? enLayout : zhLayout, key, key),
  }),
}))

vi.mock('../../aiReActChatContents/AIReActChatContents', () => ({
  AIReActChatContents: React.forwardRef<AIReActChatContentsRef>((_props, ref) => {
    React.useImperativeHandle(ref, () => ({ scrollToItemIndex }), [])
    return <div data-testid="chat-contents" />
  }),
}))
vi.mock('../aiReActChatHeader/AIReActChatHeader', () => ({
  AIReActChatHeader: ({ scrollToItemIndex }: Partial<AIReActChatContentsRef>) => (
    <button data-testid="chat-header" onClick={() => scrollToItemIndex?.(3, 'smooth')}>
      定位任务
    </button>
  ),
}))
vi.mock('../aiReactChatTextarea/AIReactChatTextarea', () => ({
  AIReactChatTextarea: React.forwardRef(() => <div data-testid="chat-textarea" />),
}))
vi.mock('../aiToDoListWrapper/AIToDoListWrapper', () => ({
  AIToDoListWrapper: () => <div data-testid="todo-list" />,
}))
vi.mock('@/pages/ai-agent/components/aiTaskQuery/AITaskQuery', () => ({
  AITaskQuery: () => null,
}))
vi.mock('@/pages/ai-agent/aiAgentChat/AIAgentChat', () => ({
  AIReActTaskChatReview: () => null,
}))
vi.mock('../AIReActComponent', () => ({
  ChevrondownButton: () => <span data-testid="expand-button" />,
}))
vi.mock('../../aiRightPanel/AIRightPanel', () => ({
  AIRightPanel: () => <div data-testid="right-panel" />,
}))

const { AIReActChat } = await compileReactModule<typeof AIReActChatModule>(import.meta.url, '../AIReActChat.tsx')

const baseProps = {
  showFreeChat: true,
  showAIRightPanel: true,
  setShowFreeChat: vi.fn(),
  startRequest: vi.fn(),
}

describe('AIReActChat', () => {
  it('首次挂载后点击任务，通过已挂载的内容引用定位', () => {
    scrollToItemIndex.mockClear()
    render(<AIReActChat {...baseProps} title="会话" />)
    fireEvent.click(screen.getByText('定位任务'))
    expect(scrollToItemIndex).toHaveBeenCalledWith(3, 'smooth')
  })
  it('提供聊天区域定位引用，供公共面板对齐', () => {
    const rightPanelLayoutRef = vi.fn()
    const { unmount } = render(
      <AIReActChat {...baseProps} showAIRightPanel={false} rightPanelLayoutRef={rightPanelLayoutRef} />,
    )
    const element = rightPanelLayoutRef.mock.calls[0][0] as HTMLDivElement
    expect(element).toContainElement(screen.getByTestId('chat-contents'))
    expect(element).toContainElement(screen.getByTestId('chat-textarea'))
    unmount()
    expect(rightPanelLayoutRef.mock.calls.at(-1)?.[0]).toBeNull()
  })
  const showNotify = (type: AINotifyType, content = '余额不足') => {
    act(() => {
      chatStore.getState().updateState({ notifyMessage: { type, content, label: { Zh: '', En: '' } } })
    })
  }

  it('配额耗尽时显示充值和关闭，任务停止后仍显示，关闭后新消息仍可显示', () => {
    showNotify(AINotifyType.notify429TypeQuotaExceeded)
    render(<AIReActChat {...baseProps} />)

    const rechargeBtn = screen.getByRole('button', { name: '充值' })
    const closeBtn = screen.getAllByRole('button').find((btn) => btn.getAttribute('data-type') === 'text')!
    expect(rechargeBtn).toHaveAttribute('data-type', 'primary')
    expect(closeBtn).toHaveAttribute('data-type', 'text')
    expect(closeBtn).toHaveTextContent(/^$/)
    expect(closeBtn.querySelector('svg')).toBeInTheDocument()
    fireEvent.click(rechargeBtn)
    expect(emiter.emit).toHaveBeenCalledWith('onOpenRecharge', '')
    expect(chatStore.getState().notifyMessage).not.toBeNull()

    fireEvent.click(closeBtn)
    expect(chatStore.getState().notifyMessage).toBeNull()
    expect(screen.queryByText('余额不足')).not.toBeInTheDocument()

    showNotify(AINotifyType.notify429TypeQuotaExceeded, '新的配额提示')
    expect(screen.getByRole('button', { name: '充值' })).toBeInTheDocument()
  })

  it('英文界面使用翻译后的充值文案，点击仍触发充值入口', () => {
    locale.language = 'en'
    showNotify(AINotifyType.notify429TypeQuotaExceeded)
    render(<AIReActChat {...baseProps} />)

    const rechargeBtn = screen.getByRole('button', { name: 'Recharge' })
    expect(screen.queryByRole('button', { name: '充值' })).not.toBeInTheDocument()
    expect(rechargeBtn).toHaveAttribute('data-type', 'primary')
    fireEvent.click(rechargeBtn)
    expect(emiter.emit).toHaveBeenCalledWith('onOpenRecharge', '')
  })

  it('限流消息覆盖配额提示后不显示操作按钮，停止执行后隐藏', () => {
    showNotify(AINotifyType.notify429TypeQuotaExceeded)
    render(<AIReActChat {...baseProps} />)
    act(() => chatStore.getState().updateState({ execute: true }))
    showNotify(AINotifyType.notify429TypeRateLimited, '请求过快')

    expect(screen.queryByRole('button', { name: '充值' })).not.toBeInTheDocument()
    expect(screen.queryAllByRole('button').find((btn) => btn.getAttribute('data-type') === 'text')).toBeUndefined()
    expect(screen.getAllByText('请求过快')).toHaveLength(2)
    act(() => chatStore.getState().updateState({ execute: false }))
    expect(screen.queryByText('请求过快')).not.toBeInTheDocument()
  })

  it('自由对话收起时不渲染右侧面板', () => {
    render(<AIReActChat {...baseProps} showFreeChat={false} />)

    expect(screen.queryByTestId('right-panel')).not.toBeInTheDocument()
  })

  it('未开启右侧面板开关时不渲染右侧面板', () => {
    render(<AIReActChat {...baseProps} showAIRightPanel={false} />)

    expect(screen.queryByTestId('right-panel')).not.toBeInTheDocument()
  })

  it('自由对话展开时渲染右侧面板', () => {
    render(<AIReActChat {...baseProps} />)

    expect(screen.getByTestId('right-panel')).toBeInTheDocument()
  })
})
