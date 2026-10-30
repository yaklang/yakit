import { act, cleanup, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { AITaskInfoProps, ChatTaskNodeGroup } from '@/pages/ai-re-act/hooks/aiRender'
import { AIChatQSDataTypeEnum } from '@/pages/ai-re-act/hooks/aiRender'
import type { AIAgentGrpcApi, AITaskStatusType } from '@/pages/ai-re-act/hooks/grpcApi'
import { createTestSession } from '@/pages/ai-re-act/hooks/__test__/fixtures'

const context = vi.hoisted(() => ({ current: '' }))
const sessions = new Map<string, ReturnType<typeof createTestSession>>()

vi.mock('@/pages/ai-re-act/hooks/useCurrentDataBySession', () => ({
  useCurrentStore: () => sessions.get(context.current)!.store,
  useCurrentRawData: () => sessions.get(context.current)!.rawData,
}))

import useRunningAsyncTaskCount, { useAsyncTaskStates } from '../useRunningAsyncTaskCount'
import { useCasualConcurrentTaskList } from '../useHasTaskTree'

const getSession = () => sessions.get(context.current)!
const planTask = (taskId: string, extra: Partial<AITaskInfoProps> = {}): AITaskInfoProps => ({
  task_id: taskId,
  name: taskId,
  goal: '',
  semantic_identifier: '',
  level: 2,
  isLeaf: true,
  isRemove: false,
  tools: [],
  description: '',
  total_tool_call_count: 0,
  success_tool_call_count: 0,
  fail_tool_call_count: 0,
  summary: '',
  progress: 'processing',
  ...extra,
})

const addAgent = (
  taskId: string,
  options: { history?: boolean; nested?: boolean; questionId?: string; status?: AITaskStatusType } = {},
) => {
  const session = getSession()
  const token = `${options.questionId ?? 'question-1'}-${taskId}`
  const node: ChatTaskNodeGroup = {
    id: token,
    chatType: options.nested ? 'task' : 'reAct',
    type: AIChatQSDataTypeEnum.TASK_NODE_GROUP,
    Timestamp: 10,
    AIService: '',
    AIModelName: '',
    data: {
      taskId,
      taskName: taskId,
      goal: '',
      status: options.status ?? 'processing',
      loadingTitle: '',
    },
  }
  session.rawData.contents.set(token, node)
  session.store.getState().dispatchStreamingNode({
    chatType: node.chatType,
    node: { token, type: node.type, kind: 'task', isHistory: options.history },
  })
  return node
}

const snapshotTask = (taskId: string, extra: Partial<AIAgentGrpcApi.SessionSnapshotTaskSummary> = {}) => ({
  task_id: taskId,
  attempt: 1,
  status: 'processing',
  is_final: false,
  updated_at: 20,
  ...extra,
})

describe('useRunningAsyncTaskCount', () => {
  beforeEach(() => {
    context.current = 'session-a'
    const session = createTestSession(context.current)
    session.store.getState().updateState({
      execute: true,
      currentChatStatus: { questionID: 'question-1', coordinatorId: 'plan-1', status: 'processing' },
    })
    sessions.set(context.current, session)
  })

  afterEach(() => {
    cleanup()
    sessions.clear()
  })

  it('统计一个执行叶子和两个子 Agent，排除父节点、删除节点及非执行状态', () => {
    const session = getSession()
    session.store.getState().updateState({
      currentPlan: {
        root_task_name: '',
        task_tree: [
          planTask('parent', { isLeaf: false }),
          planTask('leaf'),
          planTask('removed', { isRemove: true }),
          ...(['', 'completed', 'aborted', 'cancel', 'skipped'] as const).map((progress) =>
            planTask(`plan-${progress}`, { progress }),
          ),
        ],
      },
    })
    addAgent('agent-1')
    addAgent('agent-2')
    addAgent('done-agent', { status: 'completed' })
    const { result } = renderHook(() => useRunningAsyncTaskCount())
    expect(result.current).toBe(3)
  })

  it.each(['completed', 'aborted', 'cancel', 'skipped'] as const)('子 Agent 到达 %s 后即时减数', (status) => {
    const session = getSession()
    const agent = addAgent('agent-1')
    const { result } = renderHook(() => useRunningAsyncTaskCount())
    expect(result.current).toBe(1)
    act(() => {
      agent.data.status = status
      session.store.getState().incrementNodeVersion(agent.id, 'task')
    })
    expect(result.current).toBe(0)
  })

  it('同一规划内重复展示的节点只计一次，子 Agent 独立计数', () => {
    const session = getSession()
    session.store.getState().updateState({
      currentPlan: { root_task_name: '', task_tree: [planTask('1'), planTask('1')] },
    })
    addAgent('agent-1')
    addAgent('agent-1')
    const { result } = renderHook(() => useRunningAsyncTaskCount())
    expect(result.current).toBe(2)
  })

  it('子 Agent 来源保持原 reAct 筛选，task 通道节点不进入该列表和计数', () => {
    addAgent('nested-agent', { nested: true })
    addAgent('casual-agent')
    const { result } = renderHook(() => ({
      count: useRunningAsyncTaskCount(),
      list: useCasualConcurrentTaskList(),
    }))
    expect(result.current.count).toBe(1)
    expect(result.current.list).toMatchObject([{ task_id: 'casual-agent', progress: 'processing' }])
  })

  it('历史 processing 直接计入本地数量，历史终态保持排除', () => {
    const session = getSession()
    const agent = addAgent('restored-agent', { history: true })
    addAgent('completed-agent', { history: true, status: 'completed' })
    const { result } = renderHook(() => ({ count: useRunningAsyncTaskCount(), list: useCasualConcurrentTaskList() }))
    expect(result.current.count).toBe(1)
    expect(result.current.list.find((task) => task.task_id === 'restored-agent')?.progress).toBe('processing')
    act(() => {
      agent.data.status = 'completed'
      session.store.getState().incrementNodeVersion(agent.id, 'task')
    })
    expect(result.current.count).toBe(0)
  })

  it('相同或不同 ID 的快照更新均不改变本地数量和列表状态', () => {
    const session = getSession()
    addAgent('agent-1', { history: true })
    addAgent('completed-agent', { status: 'completed' })
    const { result } = renderHook(() => ({ count: useRunningAsyncTaskCount(), list: useCasualConcurrentTaskList() }))
    const localList = result.current.list
    expect(result.current.count).toBe(1)
    act(() =>
      session.store.getState().updateState({
        sessionTaskListRevision: 1,
        sessionTaskList: [
          snapshotTask('agent-1', { status: 'completed', is_final: true }),
          snapshotTask('completed-agent'),
          snapshotTask('unknown'),
          snapshotTask('question-1'),
        ],
      }),
    )
    expect(result.current.count).toBe(1)
    expect(result.current.list).toEqual(localList)
    act(() => session.store.getState().updateState({ sessionTaskListRevision: 2, sessionTaskList: [] }))
    expect(result.current.count).toBe(1)
    expect(result.current.list).toEqual(localList)
  })

  it('useAsyncTaskStates 只返回规划内去重后的可执行子任务，保留其本地状态', () => {
    getSession()
      .store.getState()
      .updateState({
        currentPlan: {
          root_task_name: '',
          task_tree: [
            planTask('parent', { isLeaf: false }),
            planTask('removed', { isRemove: true }),
            planTask('leaf'),
            planTask('leaf'),
            planTask('done', { progress: 'completed' }),
          ],
        },
      })
    addAgent('agent-1')
    const { result } = renderHook(() => ({ tasks: useAsyncTaskStates(), count: useRunningAsyncTaskCount() }))
    expect(result.current.tasks).toEqual([planTask('leaf'), planTask('done', { progress: 'completed' })])
    expect(result.current.count).toBe(2)
  })

  it('切换规划后复用 task_id，旧规划的快照不会改变新规划状态', () => {
    const session = getSession()
    session.store.getState().updateState({
      currentPlan: { root_task_name: '旧规划', task_tree: [planTask('1', { progress: 'completed' })] },
      sessionTaskListRevision: 1,
      sessionTaskList: [snapshotTask('1', { is_final: true, status: 'completed' })],
    })
    addAgent('agent-1')
    const { result } = renderHook(() => ({ count: useRunningAsyncTaskCount(), tasks: useAsyncTaskStates() }))
    expect(result.current.count).toBe(1)
    act(() =>
      session.store.getState().updateState({
        currentChatStatus: { questionID: 'question-2', coordinatorId: 'plan-2', status: 'processing' },
        currentPlan: { root_task_name: '新规划', task_tree: [planTask('1')] },
      }),
    )
    expect(result.current.count).toBe(2)
    expect(result.current.tasks).toEqual([planTask('1')])
  })

  it('断线和恢复中的本地执行数量保持不变', () => {
    const session = getSession()
    addAgent('agent-1')
    const { result } = renderHook(() => useRunningAsyncTaskCount())
    expect(result.current).toBe(1)
    act(() => session.store.getState().updateState({ execute: false }))
    expect(result.current).toBe(1)
    act(() => session.store.getState().updateState({ execute: true, initLoading: true }))
    expect(result.current).toBe(1)
    act(() => session.store.getState().updateState({ initLoading: false }))
    expect(result.current).toBe(1)
  })

  it('切换会话后读取当前规划，相同长度和 ID 的不同状态不会串 store', () => {
    getSession()
      .store.getState()
      .updateState({
        currentPlan: { root_task_name: 'A', task_tree: [planTask('leaf')] },
      })
    const { result, rerender } = renderHook(() => ({
      count: useRunningAsyncTaskCount(),
      tasks: useAsyncTaskStates(),
    }))
    expect(result.current.count).toBe(1)
    const next = createTestSession('session-b')
    next.store.getState().updateState({
      currentPlan: { root_task_name: 'B', task_tree: [planTask('leaf', { progress: 'completed' })] },
    })
    sessions.set('session-b', next)
    context.current = 'session-b'
    rerender()
    expect(result.current.count).toBe(0)
    expect(result.current.tasks[0].progress).toBe('completed')
    context.current = 'session-a'
    rerender()
    expect(result.current.count).toBe(1)
    expect(result.current.tasks[0].progress).toBe('processing')
  })
})
