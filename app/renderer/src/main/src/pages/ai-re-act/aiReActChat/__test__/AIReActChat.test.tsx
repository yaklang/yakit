import React from 'react'
import get from 'lodash/get'
import type * as AIReActChatModule from '../AIReActChat'
import type { AIReActChatRefProps } from '../AIReActChatType'
import type { AIReactChatTextareaProps } from '../aiReactChatTextarea/type'
import type { AIReActChatContentsRef } from '../../aiReActChatContents/AIReActChatContentsType'
import { compileReactModule } from '@/utils/__test__/helpers/compileReactModule'
import enLayout from '@/locales/en/layout.json'
import zhLayout from '@/locales/zh/layout.json'
import enYakitUi from '@/locales/en/yakitUi.json'
import zhYakitUi from '@/locales/zh/yakitUi.json'
import enAiAgent from '@/locales/en/aiAgent.json'
import zhAiAgent from '@/locales/zh/aiAgent.json'
import type * as OutlineIcons from '@yakit-libs/yakit-ui-icons/outline'
import styles from '../AIReActChat.module.scss'

const { scrollToItemIndex, locale, formattedSetting, latestSetting } = vi.hoisted(() => ({
  scrollToItemIndex: vi.fn(),
  locale: { language: 'zh' },
  formattedSetting: { value: {} as Record<string, unknown> },
  latestSetting: { value: {} as Record<string, unknown> },
}))
const chat = vi.hoisted(() => ({
  activeChat: undefined as { SessionID: string } | undefined,
  pendingChat: undefined as { status: 'connecting' | 'failed'; error?: string; retry?: () => void } | undefined,
  onStart: vi.fn(),
  onSend: vi.fn(),
  cancelPendingChat: vi.fn(),
}))

// CI 的根配置将样式模块替换为空对象；为通知图标用例验证的类名提供稳定映射。
vi.mock('../AIReActChat.module.scss', () => ({
  default: {
    'notify-icon': 'notify-icon',
    'notify-icon-error': 'notify-icon-error',
    'notify-icon-yellow': 'notify-icon-yellow',
  },
}))
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createChatStore } from '../../hooks/chatStore'
import { AINotifyType } from '../../hooks/grpcApi'
import emiter from '@/utils/eventBus/eventBus'
import { isCommunityEdition } from '@/utils/envfile'

let chatStore: ReturnType<typeof createChatStore>

beforeEach(() => {
  chatStore = createChatStore()
  vi.clearAllMocks()
  chat.activeChat = undefined
  chat.pendingChat = undefined
  locale.language = 'zh'
  formattedSetting.value = {}
  latestSetting.value = {}
  vi.mocked(isCommunityEdition).mockReturnValue(true)
})

vi.mock('@/utils/envfile', () => ({ isCommunityEdition: vi.fn(() => true) }))

vi.mock('ahooks', async () => {
  const actual = await vi.importActual('ahooks')
  return {
    ...actual,
    useInViewport: () => [true],
  }
})

vi.mock('@/pages/ai-agent/useContext/useStore', () => ({
  default: () => ({ activeChat: chat.activeChat, pendingChat: chat.pendingChat, setting: {} }),
}))

vi.mock('@/pages/ai-agent/useContext/useDispatcher', () => ({
  default: () => ({
    setActiveChat: vi.fn(),
    getSetting: () => latestSetting.value,
    onStart: chat.onStart,
    onSend: chat.onSend,
    cancelPendingChat: chat.cancelPendingChat,
  }),
}))

vi.mock('@/pages/ai-agent/utils', () => ({
  createActiveChatSessionId: () => 'client-session',
  formatAIAgentSetting: (setting: Record<string, unknown>) => ({ ...setting, ...formattedSetting.value }),
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
  useI18nNamespaces: (namespaces: string[]) => ({
    t: (key: string) => {
      const resources =
        locale.language === 'en'
          ? { layout: enLayout, yakitUi: enYakitUi, aiAgent: enAiAgent }
          : { layout: zhLayout, yakitUi: zhYakitUi, aiAgent: zhAiAgent }
      return namespaces.map((namespace) => get(resources, `${namespace}.${key}`)).find(Boolean) ?? key
    },
  }),
}))

vi.mock('@yakit-libs/yakit-ui-icons/outline', async (importOriginal) => ({
  ...(await importOriginal<typeof OutlineIcons>()),
  HourglassOutlined: (props: React.SVGProps<SVGSVGElement>) => <svg {...props} data-testid="hourglass-icon" />,
  ExclamationOutlined: (props: React.SVGProps<SVGSVGElement>) => <svg {...props} data-testid="exclamation-icon" />,
  ExclamationCircleOutlined: (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} data-testid="exclamation-circle-icon" />
  ),
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
  AIReactChatTextarea: React.forwardRef<unknown, AIReactChatTextareaProps>(
    ({ handleSubmit, handleStopCasualTask }, _ref) => (
      <div data-testid="chat-textarea">
        <button onClick={() => handleSubmit({ qs: 'question', sessionId: 'draft' })}>提交问题</button>
        <button onClick={handleStopCasualTask}>停止任务</button>
      </div>
    ),
  ),
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
  it.each([
    [undefined, undefined, 'new', 'client-session'],
    [undefined, 'image-session', 'new', 'image-session'],
    ['history-session', 'image-session', 'resume', 'history-session'],
  ] as const)('提交入口固定会话目标并透传单模型模式 (%s, %s)', async (activeId, imageId, kind, sessionId) => {
    chat.activeChat = activeId ? { SessionID: activeId } : undefined
    latestSetting.value = { SingleModelMode: true }
    const ref = React.createRef<AIReActChatRefProps>()
    const startRequest = vi.fn(({ params }) => Promise.resolve({ params }))
    render(<AIReActChat {...baseProps} ref={ref} startRequest={startRequest} />)

    act(() => ref.current?.handleStart({ qs: 'hello', sessionId: imageId }))

    await waitFor(() => expect(startRequest).toHaveBeenCalledTimes(1))
    expect(startRequest.mock.calls[0][0].params).toMatchObject({
      IsStart: true,
      Params: { SingleModelMode: true, UserQuery: 'hello', TimelineSessionID: sessionId },
    })
    await waitFor(() => expect(chat.onStart).toHaveBeenCalledTimes(1))
    expect(chat.onStart.mock.calls[0][0]).toMatchObject({ kind, sessionId })
  })

  it('连接中阻止重复提交，并将停止操作交给 pending 取消入口', () => {
    chat.pendingChat = { status: 'connecting' }
    render(<AIReActChat {...baseProps} />)
    fireEvent.click(screen.getByRole('button', { name: '提交问题' }))
    expect(baseProps.startRequest).not.toHaveBeenCalled()
    expect(chat.onSend).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: '停止任务' }))
    expect(chat.cancelPendingChat).toHaveBeenCalledTimes(1)
  })

  it('欢迎页提交后挂载的失败视图通过 pending 回调重试', () => {
    const retry = vi.fn()
    chat.pendingChat = { status: 'failed', error: 'disk full', retry }
    render(<AIReActChat {...baseProps} />)
    expect(screen.getByRole('status')).toHaveTextContent('disk full')
    fireEvent.click(screen.getByRole('button', { name: '重试' }))
    expect(retry).toHaveBeenCalledTimes(1)
    expect(baseProps.startRequest).not.toHaveBeenCalled()
  })

  it('重试组件内的提交时保留原新建意图，不受当前历史会话影响', async () => {
    const startRequest = vi.fn(async ({ params }) => ({ params }))
    const ref = React.createRef<AIReActChatRefProps>()
    const result = render(<AIReActChat {...baseProps} startRequest={startRequest} ref={ref} />)
    await act(async () => ref.current?.handleStart({ qs: 'original', sessionId: 'draft' }))
    chat.activeChat = { SessionID: 'other-history' }
    const retry = vi.fn()
    chat.pendingChat = { status: 'failed', error: 'connect failed', retry }
    result.rerender(<AIReActChat {...baseProps} title="changed" startRequest={startRequest} ref={ref} />)
    await act(async () => fireEvent.click(screen.getByRole('button', { name: '重试' })))
    expect(retry).toHaveBeenCalledTimes(1)
    expect(chat.onStart).toHaveBeenCalledTimes(1)
    expect(startRequest).toHaveBeenCalledTimes(1)
    expect(chat.onStart.mock.calls[0][0]).toMatchObject({
      kind: 'new',
      sessionId: 'draft',
      params: { Params: { TimelineSessionID: 'draft', UserQuery: 'original' } },
    })
  })

  it('已连接会话的自由输入继续经过 sendRequest，不重新建联', async () => {
    chat.activeChat = { SessionID: 'history-session' }
    chatStore.setState({ execute: true })
    const sendRequest = vi.fn(async ({ params }) => ({ params: { ...params, FreeInput: 'prepared question' } }))
    render(<AIReActChat {...baseProps} sendRequest={sendRequest} />)
    await act(async () => fireEvent.click(screen.getByRole('button', { name: '提交问题' })))
    expect(sendRequest).toHaveBeenCalledWith({
      params: expect.objectContaining({ IsFreeInput: true, FreeInput: 'question' }),
    })
    expect(chat.onSend).toHaveBeenCalledWith({
      token: 'history-session',
      type: 'casual',
      params: expect.objectContaining({ IsFreeInput: true, FreeInput: 'prepared question' }),
    })
    expect(baseProps.startRequest).not.toHaveBeenCalled()
    expect(chat.onStart).not.toHaveBeenCalled()
  })

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
    const closeBtn = screen.getByRole('button', { name: '关闭' })
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

  it('英文界面可通过关闭按钮的可访问名称关闭通知', () => {
    locale.language = 'en'
    showNotify(AINotifyType.notify429TypeQuotaExceeded)
    render(<AIReActChat {...baseProps} />)

    fireEvent.click(screen.getByRole('button', { name: 'Close' }))

    expect(chatStore.getState().notifyMessage).toBeNull()
    expect(screen.queryByText('余额不足')).not.toBeInTheDocument()
  })

  it.each([
    [AINotifyType.notify429TypeRateLimited, 'hourglass-icon', 'notify-icon-yellow'],
    [AINotifyType.notify429TypeQuotaExceeded, 'exclamation-icon', 'notify-icon-error'],
    ['unknown' as AINotifyType, 'exclamation-circle-icon', 'notify-icon-yellow'],
  ] as const)('通知类型 %s 显示对应图标和颜色', (type, icon, color) => {
    act(() => chatStore.getState().updateState({ execute: true }))
    showNotify(type)
    render(<AIReActChat {...baseProps} />)

    expect(screen.getByTestId(icon)).toHaveClass(styles['notify-icon'], styles[color])
    for (const otherIcon of ['hourglass-icon', 'exclamation-icon', 'exclamation-circle-icon']) {
      if (otherIcon !== icon) expect(screen.queryByTestId(otherIcon)).not.toBeInTheDocument()
    }
  })

  it.each([true, false])('非社区版 execute=%s 时不提供充值操作，配额提示仅在执行时显示', (execute) => {
    vi.mocked(isCommunityEdition).mockReturnValue(false)
    act(() => chatStore.getState().updateState({ execute }))
    showNotify(AINotifyType.notify429TypeQuotaExceeded)
    render(<AIReActChat {...baseProps} />)

    expect(screen.queryAllByText('余额不足')).toHaveLength(execute ? 2 : 0)
    expect(screen.queryByRole('button', { name: '充值' })).not.toBeInTheDocument()
    expect(screen.queryAllByRole('button').find((btn) => btn.getAttribute('data-type') === 'text')).toBeUndefined()
    expect(emiter.emit).not.toHaveBeenCalledWith('onOpenRecharge', '')

    act(() => chatStore.getState().updateState({ execute: false }))
    expect(screen.queryByText('余额不足')).not.toBeInTheDocument()
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
