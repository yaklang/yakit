import { StringToUint8Array } from '@/utils/str'
import { afterEach, describe, expect, it, vi } from 'vitest'
import './setupElectron'

vi.mock('lottie-web', () => ({ default: vi.fn() }))
vi.mock('@/pages/yakRunner/utils', () => ({ isYaklangScriptDeliveryPath: vi.fn() }))
import { ChatMultiSessionController } from '../ChatMultiSessionController'
import { aiTaskDetailDataHandlers } from '../grpcStreamHandler/aiTaskDetail'
import { groupTaskBoardItems } from '@/pages/ai-agent/chatTemplate/aiTaskExecutionDetails/aiTaskBoard/boardUtils'
import type { AIMessageHandlerParams } from '../type'

afterEach(() => {
  vi.restoreAllMocks()
})

describe('actual todo stream into task board data', () => {
  it('retains time fields, increments the normal update signal, and keeps task maps separate', () => {
    const controller = new ChatMultiSessionController()
    const session = controller.ensureSession('session-a')
    const send = (taskId: string, status: string, scope = '') => {
      aiTaskDetailDataHandlers.current_task_todo_list_update({
        ...session,
        sessionId: 'session-a',
        chatType: 'reAct',
        sendRequest: vi.fn(),
        pushLog: vi.fn(),
        res: {
          Type: 'current_task_todo_list_update',
          NodeId: 'current_task_todo_list',
          TaskId: taskId,
          Content: StringToUint8Array(
            JSON.stringify({
              task_id: scope,
              items: [
                {
                  id: 'step',
                  content: taskId,
                  status,
                  created_at: 1,
                  updated_at: 2,
                  created_ts: 1700000000,
                  focus_started_ts: 1700000010,
                  focus_seconds: 66,
                  scope_task_id: scope,
                },
              ],
            }),
          ),
        },
      } as unknown as AIMessageHandlerParams)
    }
    send('task-a', 'DOING')
    send('task-b', 'PENDING', 'scope-b')
    send('task-a', 'DONE')
    const first = session.rawData.taskDetailsMap.get('task-a')!.todoList.items
    expect(first[0]).toMatchObject({
      status: 'DONE',
      created_ts: 1700000000,
      focus_started_ts: 1700000010,
      focus_seconds: 66,
    })
    expect(groupTaskBoardItems(first).DONE).toHaveLength(1)
    expect(session.rawData.taskDetailsMap.get('task-b')!.todoList.items[0].status).toBe('PENDING')
    expect(session.store.getState().chatTodoListUpdate).toBe(3)
    expect(controller.ensureSession('session-b').rawData.taskDetailsMap.size).toBe(0)
  })
})
