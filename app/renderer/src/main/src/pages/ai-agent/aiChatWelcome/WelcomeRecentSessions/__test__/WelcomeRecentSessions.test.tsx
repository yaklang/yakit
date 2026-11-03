import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import moment from 'moment'
import { createStore } from 'zustand/vanilla'
import emiter from '@/utils/eventBus/eventBus'
import type { AISession } from '../../../type/aiChat'
import { AIAgentTabListEnum, SwitchAIAgentTabEventEnum } from '../../../defaultConstant'
import { grpcQueryAISession } from '../../../grpc'
import WelcomeRecentSessions, { formatRecentSessionTime, getRecentSessionTimestamp } from '../WelcomeRecentSessions'

const mocks = vi.hoisted(() => ({
  setActiveChat: vi.fn(),
  setSetting: vi.fn(),
  openChatInNewTab: false,
  openAIAgentChatTab: vi.fn(),
  viewport: { visible: true },
}))

vi.mock('ahooks', async () => ({
  ...(await vi.importActual('ahooks')),
  useInViewport: () => [mocks.viewport.visible],
}))
vi.mock('@/i18n/useI18nNamespaces', () => ({
  useI18nNamespaces: () => ({
    t: (key: string, options?: Record<string, unknown>) => {
      if (options?.count != null) return `${key}:${options.count}`
      if (options?.month != null) return `${key}:${options.month}/${options.day}`
      return key
    },
  }),
}))
vi.mock('../../../grpc', () => ({ grpcQueryAISession: vi.fn() }))
vi.mock('../../../historyChat/HistoryChat', () => ({
  openAIAgentChatTab: (...args: unknown[]) => mocks.openAIAgentChatTab(...args),
}))
vi.mock('../../../historyChat/source', () => ({
  getSessionDisplayTitle: (item?: AISession) => item?.Title || '',
}))
vi.mock('../../../useContext/useDispatcher', () => ({
  default: () => ({ setActiveChat: mocks.setActiveChat, setSetting: mocks.setSetting }),
}))
vi.mock('../../../useContext/useStore', () => ({
  default: () => ({ openChatInNewTab: mocks.openChatInNewTab }),
}))
vi.mock('@/pages/ai-re-act/hooks/ChatMultiSessionController', () => ({
  globalSessionEngine: {
    sessionStores: createStore(() => new Map()),
  },
}))
vi.mock('../WelcomeRecentSessions.module.scss', () => ({
  default: {
    'welcome-recent-sessions': 'welcome-recent-sessions',
    'welcome-recent-header': 'welcome-recent-header',
    'welcome-recent-title': 'welcome-recent-title',
    'welcome-recent-list': 'welcome-recent-list',
    'welcome-recent-item': 'welcome-recent-item',
    'welcome-recent-more': 'welcome-recent-more',
    'welcome-recent-list-wrapper-expanded': 'welcome-recent-list-wrapper-expanded',
  },
}))

const makeSession = (overrides: Partial<AISession> = {}): AISession =>
  ({
    Id: '1',
    SessionID: 's-1',
    Title: '会话一',
    question: '',
    CreatedAt: 1_700_000_000,
    UpdatedAt: 1_700_000_000,
    TitleInitialized: true,
    LastUsedAt: 1_700_000_000,
    Source: 'ai',
    StartParams: {
      SyncPerceptionTrigger: true,
      EnablePlan: true,
      SingleModelMode: false,
      DisableMemoryTriage: false,
      Strategy: {
        EnableMultiAgent: true,
        EnableGoalMode: false,
        GoalMinIterations: 1,
        MaxSubAgents: 2,
      },
    },
    ...overrides,
  }) as AISession

const queryResponse = (Data: AISession[], Total = Data.length) => ({
  Data,
  Total,
  Pagination: { Page: 1, Limit: 5, Order: 'desc', OrderBy: 'last_used_at' },
})

const t = (key: string, options?: Record<string, unknown>) => {
  if (options?.count != null) return `${key}:${options.count}`
  if (options?.month != null) return `${key}:${options.month}/${options.day}`
  return key
}

beforeEach(() => {
  vi.clearAllMocks()
  mocks.openChatInNewTab = false
  mocks.viewport.visible = true
  vi.mocked(grpcQueryAISession).mockReset()
  vi.mocked(grpcQueryAISession).mockResolvedValue(queryResponse([makeSession()]))
})

afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

describe('getRecentSessionTimestamp', () => {
  it('LastUsedAt 为零值字符串时回退 UpdatedAt/CreatedAt', () => {
    const updatedAtSec = 1_700_000_100
    expect(
      getRecentSessionTimestamp(
        makeSession({
          LastUsedAt: '0' as unknown as number,
          UpdatedAt: updatedAtSec,
          CreatedAt: 1_700_000_000,
        }),
      ),
    ).toBe(updatedAtSec * 1000)
    expect(
      getRecentSessionTimestamp(
        makeSession({
          LastUsedAt: '0' as unknown as number,
          UpdatedAt: '0' as unknown as number,
          CreatedAt: 1_700_000_000,
        }),
      ),
    ).toBe(1_700_000_000 * 1000)
  })
})

describe('formatRecentSessionTime', () => {
  it('空时间戳返回空字符串', () => {
    expect(formatRecentSessionTime(0, t)).toBe('')
  })

  it.each([
    ['刚刚', 30 * 1000, 'AIChatWelcome.justNow'],
    ['分钟前', 5 * 60 * 1000, 'AIChatWelcome.minutesAgo:5'],
    ['小时前', 3 * 60 * 60 * 1000, 'AIChatWelcome.hoursAgo:3'],
  ] as const)('%s', (_label, msAgo, expected) => {
    const now = new Date('2026-11-02T12:00:00')
    vi.useFakeTimers()
    vi.setSystemTime(now)
    expect(formatRecentSessionTime(now.getTime() - msAgo, t)).toBe(expected)
  })

  it('昨天返回 yesterday', () => {
    const now = new Date('2026-11-02T12:00:00')
    vi.useFakeTimers()
    vi.setSystemTime(now)
    const yesterday = moment(now).subtract(1, 'day').hour(10).valueOf()
    expect(formatRecentSessionTime(yesterday, t)).toBe('AIChatWelcome.yesterday')
  })

  it('更早日期返回月日', () => {
    const now = new Date('2026-11-02T12:00:00')
    vi.useFakeTimers()
    vi.setSystemTime(now)
    const earlier = moment('2026-10-23T08:00:00').valueOf()
    expect(formatRecentSessionTime(earlier, t)).toBe('AIChatWelcome.monthDay:10/23')
  })
})

describe('WelcomeRecentSessions', () => {
  it('有会话时渲染列表，Total 超过 5 显示查看更多', async () => {
    vi.mocked(grpcQueryAISession).mockResolvedValue(
      queryResponse([makeSession(), makeSession({ SessionID: 's-2', Title: '会话二', Id: '2' })], 6),
    )
    render(<WelcomeRecentSessions />)
    await waitFor(() => expect(screen.getByText('会话一')).toBeInTheDocument())
    expect(screen.getByText('会话二')).toBeInTheDocument()
    expect(screen.getByText('AIChatWelcome.viewMoreSessions')).toBeInTheDocument()
  })

  it('collapsed 时默认收起，切回 full 自动展开', async () => {
    const { container, rerender } = render(<WelcomeRecentSessions density="collapsed" />)
    await waitFor(() => expect(screen.getByText('AIChatWelcome.recentSessions')).toBeInTheDocument())
    expect(container.querySelector('.welcome-recent-list-wrapper-expanded')).toBeNull()
    expect(screen.getByRole('button', { name: /AIChatWelcome.recentSessions/ })).toHaveAttribute(
      'aria-expanded',
      'false',
    )

    rerender(<WelcomeRecentSessions density="full" />)
    expect(container.querySelector('.welcome-recent-list-wrapper-expanded')).toBeTruthy()
    expect(screen.getByRole('button', { name: /AIChatWelcome.recentSessions/ })).toHaveAttribute(
      'aria-expanded',
      'true',
    )
  })

  it('density=three 时只展示 3 条，Total 超过 3 显示查看更多', async () => {
    vi.mocked(grpcQueryAISession).mockResolvedValue(
      queryResponse(
        [
          makeSession(),
          makeSession({ SessionID: 's-2', Title: '会话二', Id: '2' }),
          makeSession({ SessionID: 's-3', Title: '会话三', Id: '3' }),
          makeSession({ SessionID: 's-4', Title: '会话四', Id: '4' }),
        ],
        4,
      ),
    )
    render(<WelcomeRecentSessions density="three" />)
    await waitFor(() => expect(screen.getByText('会话一')).toBeInTheDocument())
    expect(screen.getByText('会话二')).toBeInTheDocument()
    expect(screen.getByText('会话三')).toBeInTheDocument()
    expect(screen.queryByText('会话四')).not.toBeInTheDocument()
    expect(screen.getByText('AIChatWelcome.viewMoreSessions')).toBeInTheDocument()
  })

  it('Total 不超过展示上限时不显示查看更多', async () => {
    vi.mocked(grpcQueryAISession).mockResolvedValue(queryResponse([makeSession()], 5))
    render(<WelcomeRecentSessions />)
    await waitFor(() => expect(screen.getByText('会话一')).toBeInTheDocument())
    expect(screen.queryByText('AIChatWelcome.viewMoreSessions')).not.toBeInTheDocument()
  })

  it('sessionData refresh 会重新拉取列表', async () => {
    vi.mocked(grpcQueryAISession)
      .mockResolvedValueOnce(queryResponse([makeSession()]))
      .mockResolvedValueOnce(queryResponse([makeSession({ SessionID: 's-new', Title: '新会话', Id: '9' })]))
    render(<WelcomeRecentSessions />)
    await waitFor(() => expect(screen.getByText('会话一')).toBeInTheDocument())
    expect(grpcQueryAISession).toHaveBeenCalledTimes(1)

    await act(async () => {
      emiter.emit('sessionData', JSON.stringify({ type: 'refresh' }))
    })
    await waitFor(() => expect(screen.getByText('新会话')).toBeInTheDocument())
    expect(grpcQueryAISession).toHaveBeenCalledTimes(2)
  })

  it('sessionData clear 清空列表并隐藏组件', async () => {
    render(<WelcomeRecentSessions />)
    await waitFor(() => expect(screen.getByText('会话一')).toBeInTheDocument())

    await act(async () => {
      emiter.emit('sessionData', JSON.stringify({ type: 'clear' }))
    })
    await waitFor(() => expect(screen.queryByText('会话一')).not.toBeInTheDocument())
    expect(screen.queryByText('AIChatWelcome.recentSessions')).not.toBeInTheDocument()
  })

  it('sessionData updateSession 合并标题与 StartParams，保留未改字段', async () => {
    const session = makeSession({
      StartParams: {
        SyncPerceptionTrigger: true,
        EnablePlan: true,
        SingleModelMode: false,
        DisableMemoryTriage: false,
        Strategy: {
          EnableMultiAgent: true,
          EnableGoalMode: false,
          GoalMinIterations: 1,
          MaxSubAgents: 2,
        },
      },
    })
    vi.mocked(grpcQueryAISession).mockResolvedValue(queryResponse([session]))
    render(<WelcomeRecentSessions />)
    await waitFor(() => expect(screen.getByText('会话一')).toBeInTheDocument())

    await act(async () => {
      emiter.emit(
        'sessionData',
        JSON.stringify({
          type: 'updateSession',
          sessionId: 's-1',
          updates: {
            Title: '更新后的标题',
            StartParams: {
              EnablePlan: false,
              Strategy: { MaxSubAgents: 9 },
            },
          },
        }),
      )
    })
    await waitFor(() => expect(screen.getByText('更新后的标题')).toBeInTheDocument())
    expect(screen.queryByText('会话一')).not.toBeInTheDocument()

    fireEvent.click(screen.getByText('更新后的标题'))
    const updater = mocks.setSetting.mock.calls[0][0] as (old: Record<string, unknown>) => Record<string, unknown>
    expect(updater({})).toMatchObject({
      SyncPerceptionTrigger: true,
      EnablePlan: false,
      SingleModelMode: false,
      DisableMemoryTriage: false,
      Strategy: {
        EnableMultiAgent: true,
        EnableGoalMode: false,
        GoalMinIterations: 1,
        MaxSubAgents: 9,
      },
    })
    expect(mocks.setActiveChat).toHaveBeenCalledWith(
      expect.objectContaining({
        SessionID: 's-1',
        Title: '更新后的标题',
      }),
    )
  })

  it('sessionData updateSession 对不在列表中的会话不改动', async () => {
    render(<WelcomeRecentSessions />)
    await waitFor(() => expect(screen.getByText('会话一')).toBeInTheDocument())

    await act(async () => {
      emiter.emit(
        'sessionData',
        JSON.stringify({
          type: 'updateSession',
          sessionId: 's-missing',
          updates: { Title: '无关标题' },
        }),
      )
    })
    expect(screen.getByText('会话一')).toBeInTheDocument()
    expect(screen.queryByText('无关标题')).not.toBeInTheDocument()
  })

  it('并发 refresh 时旧响应不会覆盖新响应', async () => {
    let resolveSlow!: (value: ReturnType<typeof queryResponse>) => void
    const slow = new Promise<ReturnType<typeof queryResponse>>((resolve) => {
      resolveSlow = resolve
    })
    vi.mocked(grpcQueryAISession)
      .mockResolvedValueOnce(queryResponse([makeSession()]))
      .mockImplementationOnce(() => slow)
      .mockResolvedValueOnce(queryResponse([makeSession({ SessionID: 's-new', Title: '新会话', Id: '9' })]))

    render(<WelcomeRecentSessions />)
    await waitFor(() => expect(screen.getByText('会话一')).toBeInTheDocument())

    await act(async () => {
      emiter.emit('sessionData', JSON.stringify({ type: 'refresh' }))
    })
    await act(async () => {
      emiter.emit('sessionData', JSON.stringify({ type: 'refresh' }))
    })
    await waitFor(() => expect(screen.getByText('新会话')).toBeInTheDocument())

    await act(async () => {
      resolveSlow(queryResponse([makeSession({ SessionID: 's-old', Title: '旧会话', Id: '8' })]))
    })
    expect(screen.getByText('新会话')).toBeInTheDocument()
    expect(screen.queryByText('旧会话')).not.toBeInTheDocument()
  })

  it('点击会话恢复配置并 setActiveChat', async () => {
    const session = makeSession()
    vi.mocked(grpcQueryAISession).mockResolvedValue(queryResponse([session]))
    render(<WelcomeRecentSessions />)
    await waitFor(() => expect(screen.getByText('会话一')).toBeInTheDocument())

    fireEvent.click(screen.getByText('会话一'))
    expect(mocks.openAIAgentChatTab).not.toHaveBeenCalled()
    expect(mocks.setSetting).toHaveBeenCalled()
    const updater = mocks.setSetting.mock.calls[0][0] as (old: Record<string, unknown>) => Record<string, unknown>
    expect(updater({})).toMatchObject({
      SyncPerceptionTrigger: true,
      EnablePlan: true,
      SingleModelMode: false,
      DisableMemoryTriage: false,
      Strategy: {
        EnableMultiAgent: true,
        EnableGoalMode: false,
        GoalMinIterations: 1,
        MaxSubAgents: 2,
      },
    })
    expect(mocks.setActiveChat).toHaveBeenCalledWith(session)
  })

  it('openChatInNewTab 为 true 时打开新 Tab', async () => {
    mocks.openChatInNewTab = true
    const session = makeSession()
    vi.mocked(grpcQueryAISession).mockResolvedValue(queryResponse([session]))
    render(<WelcomeRecentSessions />)
    await waitFor(() => expect(screen.getByText('会话一')).toBeInTheDocument())

    fireEvent.click(screen.getByText('会话一'))
    expect(mocks.openAIAgentChatTab).toHaveBeenCalledWith(session)
    expect(mocks.setActiveChat).not.toHaveBeenCalled()
  })

  it('点击查看更多展开左侧会话历史', async () => {
    const emitSpy = vi.spyOn(emiter, 'emit')
    vi.mocked(grpcQueryAISession).mockResolvedValue(queryResponse([makeSession()], 8))
    render(<WelcomeRecentSessions />)
    await waitFor(() => expect(screen.getByText('AIChatWelcome.viewMoreSessions')).toBeInTheDocument())

    fireEvent.click(screen.getByText('AIChatWelcome.viewMoreSessions'))
    expect(emitSpy).toHaveBeenCalledWith(
      'switchAIAgentTab',
      JSON.stringify({
        type: SwitchAIAgentTabEventEnum.SET_TAB_ACTIVE,
        params: { active: AIAgentTabListEnum.Session, show: true },
      }),
    )
  })
})
