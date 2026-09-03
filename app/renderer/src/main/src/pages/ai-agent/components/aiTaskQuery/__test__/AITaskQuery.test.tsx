import React from 'react'
import { act, fireEvent, render } from '@testing-library/react'
import { describe, expect, it, vi, beforeEach } from 'vitest'
// 先于被测模块注册 window.require('electron') stub（组件链路上 ChatMultiSessionController 顶层会解构 ipcRenderer）
import '../../../../ai-re-act/hooks/__test__/setupElectron'
import AIAgentContext from '@/pages/ai-agent/useContext/AIAgentContext'
import type { AIChatSendParams } from '@/pages/ai-re-act/hooks/type'
import type { AIChatQSData } from '@/pages/ai-re-act/hooks/aiRender'
import { AIChatQSDataTypeEnum } from '@/pages/ai-re-act/hooks/aiRender'
import type { AIAgentGrpcApi } from '@/pages/ai-re-act/hooks/grpcApi'
import { globalSessionEngine } from '@/pages/ai-re-act/hooks/ChatMultiSessionController'
import { AITaskQuery } from '../AITaskQuery'

// i18n 直接回 key，避免测试环境加载懒资源
vi.mock('@/i18n/useI18nNamespaces', () => ({
  useI18nNamespaces: () => ({ t: (key: string) => key, i18nRefresh: 0 }),
}))
// 渲染无关的持久化 / 日志依赖打桩
vi.mock('@/pages/ai-re-act/hooks/persist/contentPersistHelper', () => ({
  persistIndependentItem: vi.fn(),
  persistToolResultIfTerminal: vi.fn(),
  drainSessionContentWrites: vi.fn().mockResolvedValue([]),
  applyHydratedStageSettled: (content: any) => content,
}))
vi.mock('@/pages/ai-re-act/hooks/AIAgentLogEmitter', () => ({
  aiAgentLogEmitter: { dispatch: vi.fn(), clearSessionBuffer: vi.fn() },
  AIAgentLogEmitter: class {},
}))

const SESSION_ID = 'task-query-test-session'

const queueItem = (id: string, userInput: string): AIAgentGrpcApi.QuestionQueueItem => ({
  created_at: '2026-09-02T10:00:00Z',
  focus_mode: '',
  id,
  is_recovery: false,
  status: 'waiting' as AIAgentGrpcApi.QuestionQueueItem['status'],
  user_input: userInput,
})

const onSendMock = vi.fn<(params: AIChatSendParams) => void>()
const pushSpy = vi.spyOn(globalSessionEngine, 'pushDataToSession')

const renderAITaskQuery = () => {
  const contextValue = {
    store: { setting: {}, activeChat: { SessionID: SESSION_ID } },
    dispatcher: {
      onStart: vi.fn(),
      onSend: onSendMock,
      onClose: vi.fn(),
      onUpdatePageId: vi.fn(),
      setSetting: vi.fn(),
      getSetting: () => ({}),
      setActiveChat: vi.fn(),
    },
  }
  return render(
    <AIAgentContext.Provider value={contextValue as never}>
      <AITaskQuery />
    </AIAgentContext.Provider>,
  )
}

const setQueue = (execute: boolean, items: AIAgentGrpcApi.QuestionQueueItem[]) => {
  const { store } = globalSessionEngine.ensureSession(SESSION_ID)
  act(() => {
    store.getState().updateState({
      execute,
      questionQueue: { total: items.length, data: items },
    })
  })
}

const clickAdjustButton = (container: HTMLElement, index = 0) => {
  const buttons = container.querySelectorAll('button')
  const target = [...buttons].filter((b) => b.textContent?.includes('AITaskQuery.adjustDirection'))[index]
  expect(target).toBeTruthy()
  act(() => {
    fireEvent.click(target!)
  })
}

describe('AITaskQuery 调整方向（原人工介入）', () => {
  beforeEach(() => {
    onSendMock.mockClear()
    pushSpy.mockClear()
  })

  it('点击「调整方向」先发删除单条队列信号，再以该条 user_input 发人工介入信号', () => {
    const { container } = renderAITaskQuery()
    setQueue(true, [queueItem('task-1', '帮我扫描目标站点')])

    clickAdjustButton(container)

    // 1. 先发 SYNC_TYPE_REACT_REMOVE_TASK；2. 再发 SYNC_TYPE_USER_INTERVENTION；3. 补发 QUEUE_INFO 刷新队列
    expect(onSendMock).toHaveBeenCalledTimes(3)
    const [removeCall, interventionCall, queueInfoCall] = onSendMock.mock.calls.map((c) => c[0])
    expect(removeCall.token).toBe(SESSION_ID)
    expect(removeCall.type).toBe('')
    expect(removeCall.params.SyncType).toBe('react_remove_task')
    expect(JSON.parse(removeCall.params.SyncJsonInput || '{}')).toEqual({ task_id: 'task-1' })
    expect(interventionCall.token).toBe(SESSION_ID)
    expect(interventionCall.type).toBe('task')
    expect(interventionCall.params.SyncType).toBe('user_intervention')
    expect(JSON.parse(interventionCall.params.SyncJsonInput || '{}')).toEqual({ content: '帮我扫描目标站点' })
    expect(queueInfoCall.params.SyncType).toBe('queue_info')
  })

  it('点击后把介入记录以 USER_MANUAL_INTERVENTION 写入当前会话聊天流', () => {
    const { container } = renderAITaskQuery()
    setQueue(true, [queueItem('task-2', '补充上下文内容')])

    clickAdjustButton(container)

    expect(pushSpy).toHaveBeenCalledTimes(1)
    const [pushedSession, chatData] = pushSpy.mock.calls[0] as [string, AIChatQSData]
    expect(pushedSession).toBe(SESSION_ID)
    expect(chatData.chatType).toBe('reAct')
    expect(chatData.type).toBe(AIChatQSDataTypeEnum.USER_MANUAL_INTERVENTION)
    expect(chatData.data).toMatchObject({ type: '加入上下文', content: '补充上下文内容' })
  })

  it('多条排队任务各自有独立的「调整方向」按钮，作用于自己的 task_id/user_input', () => {
    const { container } = renderAITaskQuery()
    setQueue(true, [queueItem('task-a', '问题A'), queueItem('task-b', '问题B')])

    clickAdjustButton(container, 1)

    const removeCall = onSendMock.mock.calls[0][0]
    const interventionCall = onSendMock.mock.calls[1][0]
    expect(JSON.parse(removeCall.params.SyncJsonInput || '{}')).toEqual({ task_id: 'task-b' })
    expect(JSON.parse(interventionCall.params.SyncJsonInput || '{}')).toEqual({ content: '问题B' })
  })

  it('loading 期间重复点击不重复发送（防抖 + 回执 loading 双重保护）', () => {
    const { container } = renderAITaskQuery()
    setQueue(true, [queueItem('task-3', '问题C')])

    clickAdjustButton(container)
    clickAdjustButton(container)

    // 双击仍只有一轮信号（remove + intervention + queue_info 各一次）
    expect(onSendMock).toHaveBeenCalledTimes(3)
  })

  it('未执行（execute=false）时整个任务队列不渲染', () => {
    const { container } = renderAITaskQuery()
    setQueue(false, [queueItem('task-4', '问题D')])
    expect(container.querySelector('[data-testid="loading"]')).toBeNull()
    expect(container.innerHTML).toBe('')
    expect(onSendMock).not.toHaveBeenCalled()
  })
})
