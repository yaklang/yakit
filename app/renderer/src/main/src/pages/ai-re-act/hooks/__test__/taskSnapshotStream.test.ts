import { beforeEach, describe, expect, it, vi } from 'vitest'
import './setupElectron'
import { StringToUint8Array } from '@/utils/str'
import { ChatMultiSessionController } from '../ChatMultiSessionController'
import type { AIOutputEvent } from '../grpcApi'

vi.mock('lottie-web', () => ({ default: vi.fn() }))
vi.mock('@/pages/yakRunner/utils', () => ({ isYaklangScriptDeliveryPath: vi.fn() }))

let controller: ChatMultiSessionController
beforeEach(() => {
  controller = new ChatMultiSessionController()
  controller.ensureSession('s1')
  ;(controller as unknown as { readyChannels: Set<string> }).readyChannels.add('s1')
})
const emit = async (node: string, taskId: string, payload: unknown) =>
  await controller.handleGrpcOutputEvent('s1', {
    CoordinatorId: 'react-coordinator',
    Type: 'structured',
    NodeId: node,
    TaskId: taskId,
    Content: StringToUint8Array(JSON.stringify(payload)),
  } as unknown as AIOutputEvent)
const todo = (content: string) => ({
  items: [
    {
      id: 'step',
      content,
      status: 'DONE',
      created_at: 1,
      updated_at: 2,
      created_ts: 1750000000,
      closed_ts: 1750000020,
    },
  ],
})

describe('official task snapshots through the actual stream router', () => {
  it('accepts a session task index without TaskId and rejects out-of-order index revisions', async () => {
    await emit('session_snapshot', '', { revision: 4, tasks: [{ task_id: 'B', task_name: 'Task B' }] })
    await emit('session_snapshot', '', { revision: 3, tasks: [{ task_id: 'A' }] })
    const session = controller.ensureSession('s1')
    expect(session.store.getState().sessionTaskList[0].task_id).toBe('B')
    expect(session.rawData.taskDetailsMap.size).toBe(0)
    await emit('session_snapshot', '', { revision: 5, tasks: [] })
    expect(session.store.getState().sessionTaskList).toEqual([])
  })
  it('routes task snapshots to independent map entries and notifies todo consumers', async () => {
    await emit('task_snapshot', 'A', { task_id: 'A', revision: 2, todo: todo('A step') })
    await emit('task_snapshot', 'B', { task_id: 'B', revision: 2, todo: todo('B step') })
    const { rawData, store } = controller.ensureSession('s1')
    expect(rawData.taskDetailsMap.get('A')!.todoList.items[0]).toMatchObject({
      content: 'A step',
      created_ts: 1750000000,
      closed_ts: 1750000020,
    })
    expect(rawData.taskDetailsMap.get('B')!.todoList.items[0].content).toBe('B step')
    expect(store.getState().chatTodoListUpdate).toBe(2)
    expect(store.getState().taskDetailsUpdate).toBe(2)
    expect(controller.ensureSession('s2').rawData.taskDetailsMap.size).toBe(0)
  })
  it('does not use the session snapshot revision to discard a complementary task snapshot', async () => {
    await emit('session_snapshot', 'A', { revision: 9, execution: { task_name: 'Task A' } })
    await emit('task_snapshot', 'A', { task_id: 'A', revision: 9, todo: todo('A step') })
    await emit('task_snapshot', 'A', { task_id: 'A', revision: 8, todo: todo('stale step') })
    await emit('session_snapshot', 'A', { revision: 8, execution: { task_name: 'stale title' } })
    const data = controller.ensureSession('s1').rawData.taskDetailsMap.get('A')!
    expect(data.execution.task_name).toBe('Task A')
    expect(data.todoList.items[0].content).toBe('A step')
    expect(data.taskSnapshotRevision).toBe(9)
  })
  it('projects task execution, perception and capability buckets without changing role or request settings', async () => {
    const session = controller.ensureSession('s1')
    const request = session.request
    await emit('task_snapshot', 'A', {
      task_id: 'A',
      revision: 1,
      snapshot: {
        execution: { task_name: 'Task A', tool_call_total: 2 },
        perception: { summary: ['one', 'two'], topics: ['topic'] },
        background_processes: [],
        capabilities: [
          { type: 'aitool', name: 'tool-a', position: 'FrozenBlock' },
          { type: 'plugin', name: 'plugin-a', position: 'Dynamic' },
          { type: 'forge', name: 'forge-a', position: 'FrozenBlock' },
          { type: 'skill', name: 'skill-a', position: 'Dynamic', stage: 'metadata' },
          { type: 'mcp', name: 'mcp-a', position: 'Dynamic' },
        ],
      },
    })
    const data = session.rawData.taskDetailsMap.get('A')!
    expect(data.perception.summary).toBe('one,two')
    expect(data.execution.tool_call_total).toBe(2)
    expect(data.tool.fixed[0].name).toBe('tool-a')
    expect(data.plugins.dynamic[0].name).toBe('plugin-a')
    expect(data.forges.fixed[0].name).toBe('forge-a')
    expect(data.skills.dynamic[0].skill_load_state).toBe('metadata')
    expect(data.mcp.dynamic[0].name).toBe('mcp-a')
    expect(session.request).toBe(request)
  })
  it('accepts empty todo/capability snapshots to clear obsolete cards and preserves omitted fields', async () => {
    await emit('task_snapshot', 'A', { task_id: 'A', revision: 1, todo: todo('old') })
    await emit('task_snapshot', 'A', { task_id: 'A', revision: 2, snapshot: { execution: { task_name: 'A' } } })
    expect(controller.ensureSession('s1').rawData.taskDetailsMap.get('A')!.todoList.items).toHaveLength(1)
    await emit('task_snapshot', 'A', { task_id: 'A', revision: 3, todo: { items: [] }, snapshot: { capabilities: [] } })
    const data = controller.ensureSession('s1').rawData.taskDetailsMap.get('A')!
    expect(data.todoList.items).toEqual([])
    expect(data.tool.fixed).toEqual([])
  })
  it.each([null, { error: 'not found' }])('ignores invalid snapshots: %j', async (payload) => {
    await emit('task_snapshot', 'A', payload)
    expect(controller.ensureSession('s1').rawData.taskDetailsMap.size).toBe(0)
  })
  it('uses the materialized task id even when the event envelope names the active task', async () => {
    await emit('task_snapshot', 'A', { task_id: 'B', revision: 1, todo: todo('B step') })
    const { rawData } = controller.ensureSession('s1')
    expect(rawData.taskDetailsMap.has('A')).toBe(false)
    expect(rawData.taskDetailsMap.get('B')!.todoList.items[0].content).toBe('B step')
  })
})
