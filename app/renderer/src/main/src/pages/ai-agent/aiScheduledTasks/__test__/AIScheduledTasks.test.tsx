import React from 'react'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import '../../../ai-re-act/hooks/__test__/setupElectron'
import AIScheduledTasks from '../AIScheduledTasks'
import { grpcQueryAIReActSchedules, grpcRunAIReActScheduleNow } from '../utils'
import { waitForAISessionPush } from '../waitForAISessionPush'
import { grpcQueryAISession } from '../../grpc'
import { yakitNotify } from '@/utils/notification'
import emiter from '@/utils/eventBus/eventBus'
import type { AISession } from '../../type/aiChat'
import type { AIReActSchedule } from '@/pages/ai-re-act/hooks/grpcApi'

const { setActiveChat } = vi.hoisted(() => ({ setActiveChat: vi.fn() }))

vi.mock('../../useContext/useDispatcher', () => ({ default: () => ({ setActiveChat }) }))
vi.mock('../../grpc', () => ({ grpcQueryAISession: vi.fn() }))
vi.mock('../utils', () => ({
  grpcQueryAIReActSchedules: vi.fn(),
  grpcRunAIReActScheduleNow: vi.fn(),
  grpcDeleteAIReActSchedule: vi.fn(),
  grpcGetAIReActSchedule: vi.fn(),
  grpcSetAIReActScheduleEnabled: vi.fn(),
}))
vi.mock('../waitForAISessionPush', () => ({ waitForAISessionPush: vi.fn() }))
vi.mock('../scheduledTasksForm/ScheduledTasksForm', () => ({ default: () => null }))
vi.mock('../aiScheduledTasksDetail/AIScheduledTasksDetail', () => ({ default: () => null }))
vi.mock('@/utils/notification', () => ({ yakitNotify: vi.fn() }))
vi.mock('@/components/yakitUI/YakitModal/YakitModalConfirm', () => ({
  showYakitModal: vi.fn(),
  YakitModalConfirm: vi.fn(),
}))
vi.mock('@/i18n/useI18nNamespaces', () => ({
  useI18nNamespaces: () => ({ t: (key: string) => key }),
}))
vi.mock('ahooks', async (importOriginal) => ({
  ...(await importOriginal<typeof import('ahooks')>()),
  useInViewport: () => [true],
}))
vi.mock('@/components/RollingLoadList/RollingLoadList', () => ({
  RollingLoadList: ({
    data,
    renderRow,
  }: {
    data: AIReActSchedule[]
    renderRow: (row: AIReActSchedule, index: number) => React.ReactNode
  }) => <>{data.map(renderRow)}</>,
}))
vi.mock('@/components/yakitUI/YakitDropdownMenu/YakitDropdownMenu', () => ({
  YakitDropdownMenu: ({
    menu,
    children,
  }: React.PropsWithChildren<{
    menu: { data: { key?: string }[]; onClick: (info: { key: string }) => void }
  }>) => (
    <>
      {children}
      {menu.data.some((item) => item.key === 'run') && (
        <button onClick={() => menu.onClick({ key: 'run' })}>立即运行</button>
      )}
    </>
  ),
}))

const schedule: AIReActSchedule = {
  UUID: 'schedule-1',
  Name: 'scheduled task',
  Status: 'active',
  TargetMode: 'new_session_per_run',
  Payload: { Prompt: 'run task', StartParams: {} as AIReActSchedule['Payload']['StartParams'] },
  Schedule: { RRule: 'FREQ=DAILY', Timezone: 'UTC', StartAt: 0 },
}
const session: AISession = {
  Id: '1',
  SessionID: 'session-1',
  Title: 'scheduled session',
  question: '',
  CreatedAt: 1,
  UpdatedAt: 1,
  LastUsedAt: 1,
  TitleInitialized: true,
  Source: 'ai',
}
const pagination = { Page: 1, Limit: 1, OrderBy: 'last_used_at', Order: 'desc' }
const refreshHistory = vi.fn()

beforeEach(() => {
  vi.resetAllMocks()
  emiter.on('sessionData', refreshHistory)
  vi.mocked(grpcQueryAIReActSchedules).mockResolvedValue({ Data: [schedule], Total: 1, Pagination: pagination })
  vi.mocked(grpcRunAIReActScheduleNow).mockResolvedValue(null)
  vi.mocked(waitForAISessionPush).mockResolvedValue(session.SessionID)
  vi.mocked(grpcQueryAISession).mockResolvedValue({ Data: [session], Total: 1, Pagination: pagination })
})
afterEach(() => {
  cleanup()
  emiter.off('sessionData', refreshHistory)
})

const runNow = async () => {
  // 只挂载任务列表，不挂载 HistoryChat，覆盖右侧历史浮层关闭时的实际调用路径。
  render(<AIScheduledTasks visible />)
  fireEvent.click(await screen.findByRole('button', { name: '立即运行' }))
}

describe('AIScheduledTasks 立即运行跳转', () => {
  it('历史面板未挂载时，按推送 ID 查询并激活任务会话', async () => {
    await runNow()
    await waitFor(() => expect(setActiveChat).toHaveBeenCalledWith(session))
    expect(grpcRunAIReActScheduleNow).toHaveBeenCalledWith({ UUID: schedule.UUID })
    expect(refreshHistory).toHaveBeenCalledExactlyOnceWith(
      JSON.stringify({ type: 'refresh', sessionId: session.SessionID }),
    )
    expect(grpcQueryAISession).toHaveBeenCalledWith(
      {
        Pagination: pagination,
        Filter: { SessionID: [session.SessionID] },
      },
      true,
    )
  })

  it('推送等待超时时，查询最新的本地 AI 会话并激活', async () => {
    vi.mocked(waitForAISessionPush).mockResolvedValue(undefined)
    await runNow()
    await waitFor(() => expect(setActiveChat).toHaveBeenCalledWith(session))
    expect(waitForAISessionPush).toHaveBeenCalledWith(2000)
    expect(refreshHistory).toHaveBeenCalledExactlyOnceWith(JSON.stringify({ type: 'refresh' }))
    expect(grpcQueryAISession).toHaveBeenCalledWith(
      {
        Pagination: pagination,
        Filter: { Source: ['ai', ''] },
      },
      true,
    )
  })

  it.each(['reject', 'empty', 'mismatch'])('会话查询失败时保留当前页面并提示已启动（%s）', async (failure) => {
    if (failure === 'reject') vi.mocked(grpcQueryAISession).mockRejectedValue(new Error('query failed'))
    else
      vi.mocked(grpcQueryAISession).mockResolvedValue({
        Data: failure === 'empty' ? [] : [{ ...session, SessionID: 'unrelated-session' }],
        Total: failure === 'empty' ? 0 : 1,
        Pagination: pagination,
      })
    await runNow()
    await waitFor(() => expect(yakitNotify).toHaveBeenCalledWith('warning', 'AIScheduledTasks.openRunSessionFailed'))
    expect(setActiveChat).not.toHaveBeenCalled()
    expect(yakitNotify).toHaveBeenCalledWith('success', 'AIScheduledTasks.runStarted')
    expect(refreshHistory).toHaveBeenCalledExactlyOnceWith(
      JSON.stringify({ type: 'refresh', sessionId: session.SessionID }),
    )
  })

  it('启动请求失败时不查询或切换会话', async () => {
    vi.mocked(grpcRunAIReActScheduleNow).mockRejectedValue(new Error('run failed'))
    await runNow()
    await waitFor(() => expect(grpcRunAIReActScheduleNow).toHaveBeenCalled())
    expect(waitForAISessionPush).not.toHaveBeenCalled()
    expect(grpcQueryAISession).not.toHaveBeenCalled()
    expect(setActiveChat).not.toHaveBeenCalled()
    expect(yakitNotify).not.toHaveBeenCalledWith('success', 'AIScheduledTasks.runStarted')
    expect(refreshHistory).not.toHaveBeenCalled()
  })
})
