import { describe, it, expect, vi } from 'vitest'
import { aiTaskDetailDataHandlers } from '../grpcStreamHandler/aiTaskDetail'
import { makeGrpcJsonRes, makeHandlerRequest } from './fixtures'
import { AIToDoListStatusEnum } from '@/pages/ai-agent/defaultConstant'

vi.mock('../persist/contentPersistHelper', () => ({
  persistIndependentItem: vi.fn(),
}))

describe('aiTaskDetail handlers', () => {
  it('capability_inventory 按加载状态重新分类两组技能，保留字段并兼容缺失状态', () => {
    const taskId = 'legacy-skill-state'
    const req = makeHandlerRequest({
      res: makeGrpcJsonRes(
        'structured',
        {
          fixed: {
            skills: [
              { name: 'fixed-loaded', verbose_name: '已加载', category: 'skill', skill_load_state: 'loaded' },
              {
                name: 'fixed-metadata',
                verbose_name: '可加载',
                description: '技能描述',
                category: 'skill',
                skill_load_state: 'metadata',
                token_count: 0,
              },
              { name: 'fixed-missing', verbose_name: '缺失状态', category: 'skill' },
              { name: 'fixed-empty', verbose_name: '空状态', category: 'skill', skill_load_state: '' },
            ],
          },
          dynamic: {
            skills: [
              {
                name: 'dynamic-loaded',
                description: '动态来源',
                category: 'skill',
                skill_load_state: 'loaded',
                token_count: 123,
              },
              { name: 'dynamic-metadata', category: 'skill', skill_load_state: 'metadata' },
            ],
          },
        },
        { NodeId: 'capability_inventory', TaskId: taskId },
      ),
    })

    aiTaskDetailDataHandlers.capability_inventory(req)

    const skills = req.rawData.taskDetailsMap.get(taskId)!.skills
    expect(skills.fixed.map((skill) => skill.name)).toEqual(['fixed-loaded', 'dynamic-loaded'])
    expect(skills.fixed[1]).toMatchObject({
      verbose_name: 'dynamic-loaded',
      description: '动态来源',
      skill_load_state: 'loaded',
      token_count: 123,
    })
    expect(skills.dynamic.map((skill) => skill.name)).toEqual([
      'fixed-metadata',
      'fixed-missing',
      'fixed-empty',
      'dynamic-metadata',
    ])
    expect(skills.dynamic[0]).toMatchObject({ description: '技能描述', skill_load_state: 'metadata', token_count: 0 })
    expect(skills.dynamic[1].skill_load_state).toBe('')
    expect(skills.dynamic[2].skill_load_state).toBe('')
  })

  it.each(['capability_inventory', 'task_snapshot'] as const)('%s 随加载状态变化移动技能且不残留旧分组', (nodeId) => {
    const taskId = 'skill-state-transition'
    const { rawData, store } = makeHandlerRequest({ res: makeGrpcJsonRes('structured', {}) })
    const states = ['metadata', 'loaded', 'metadata'] as const

    states.forEach((state, index) => {
      const payload =
        nodeId === 'task_snapshot'
          ? {
              task_id: taskId,
              revision: index + 1,
              snapshot: {
                capabilities: [
                  { name: 'skill', type: 'skill', position: 'Dynamic', data: { skill_load_state: state } },
                ],
              },
            }
          : {
              fixed: { skills: [] },
              dynamic: { skills: [{ name: 'skill', description: '', category: 'skill', skill_load_state: state }] },
            }
      const req = makeHandlerRequest({
        rawData,
        store,
        res: makeGrpcJsonRes('structured', payload, { NodeId: nodeId, TaskId: taskId }),
      })
      aiTaskDetailDataHandlers[nodeId](req)

      const skills = rawData.taskDetailsMap.get(taskId)!.skills
      expect(skills.fixed.map((skill) => skill.name)).toEqual(state === 'loaded' ? ['skill'] : [])
      expect(skills.dynamic.map((skill) => skill.name)).toEqual(state === 'loaded' ? [] : ['skill'])
    })
  })

  it.each([
    ['capability_inventory', 'structured', { fixed: { tools: [] } }],
    ['perception', 'perception', { summary: 'updated perception' }],
  ] as const)('%s notifies after writing task details', (nodeId, type, payload) => {
    const req = makeHandlerRequest({
      res: makeGrpcJsonRes(type, payload, { NodeId: nodeId, TaskId: 'task-detail-notify' }),
    })
    const listener = vi.fn(() => {
      expect(req.rawData.taskDetailsMap.has('task-detail-notify')).toBe(true)
    })
    req.store.subscribe(listener)

    aiTaskDetailDataHandlers[nodeId](req)

    expect(req.store.getState().taskDetailsUpdate).toBe(1)
    expect(listener).toHaveBeenCalledTimes(1)
  })

  it('D8: handler keys exist', () => {
    for (const key of [
      'capability_inventory',
      'perception',
      'current_task_todo_list_update',
      'session_snapshot',
      'task_snapshot',
    ] as const) {
      expect(typeof aiTaskDetailDataHandlers[key]).toBe('function')
    }
  })

  it('D8: current_task_todo_list_update bumps chatTodoListUpdate and populates taskDetailsMap (reAct)', () => {
    const taskId = 'task-detail-1'
    const req = makeHandlerRequest({
      res: makeGrpcJsonRes(
        'current_task_todo_list_update',
        {
          items: [
            { id: '1', status: AIToDoListStatusEnum.Pending, scope_task_id: taskId },
            { id: '2', status: AIToDoListStatusEnum.Pending, scope_task_id: '' },
          ],
          task_id: taskId,
        },
        { NodeId: 'current_task_todo_list', TaskId: taskId },
      ),
      chatType: 'reAct',
    })
    const before = req.store.getState().chatTodoListUpdate
    aiTaskDetailDataHandlers.current_task_todo_list_update(req)
    expect(req.store.getState().taskDetailsUpdate).toBe(1)
    // reAct 分支应触发 chatTodoListUpdate
    expect(req.store.getState().chatTodoListUpdate).toBeGreaterThan(before)
    // taskDetailsMap 应写入对应 taskId 的条目
    const detail = req.rawData.taskDetailsMap.get(taskId)
    expect(detail).toBeDefined()
    expect(detail!.todoList.items.length).toBeGreaterThan(0)
  })

  it('D8: current_task_todo_list_update with task chatType does not bump chatTodoListUpdate but still writes taskDetailsMap', () => {
    const taskId = 'task-detail-2'
    const req = makeHandlerRequest({
      res: makeGrpcJsonRes(
        'current_task_todo_list_update',
        {
          items: [{ id: '1', status: AIToDoListStatusEnum.Pending, scope_task_id: '' }],
          task_id: taskId,
        },
        { NodeId: 'current_task_todo_list', TaskId: taskId },
      ),
      chatType: 'task',
    })
    const before = req.store.getState().chatTodoListUpdate
    aiTaskDetailDataHandlers.current_task_todo_list_update(req)
    // task 分支不应触发 chatTodoListUpdate
    expect(req.store.getState().taskDetailsUpdate).toBe(1)
    expect(req.store.getState().chatTodoListUpdate).toBe(before)
    // 但 taskDetailsMap 仍应写入
    expect(req.rawData.taskDetailsMap.get(taskId)).toBeDefined()
  })

  it('session_snapshot writes flow/risk aggregates and ignores stale revisions', () => {
    const taskId = 'task-snapshot-1'
    const snapshot = {
      revision: 2,
      execution: {
        http_flow_count: 42,
        risk_count: 22,
        risk_level_count: { critical: 4, high: 6, warning: 1, low: 3, info: 5, other: 3, total: 22 },
      },
      background_processes: [],
    }
    const req = makeHandlerRequest({
      res: makeGrpcJsonRes('structured', snapshot, {
        NodeId: 'session_snapshot',
        TaskId: taskId,
        IsJson: true,
        IsSystem: true,
      }),
    })

    aiTaskDetailDataHandlers.session_snapshot(req)
    const detail = req.rawData.taskDetailsMap.get(taskId)
    expect(detail?.execution?.http_flow_count).toBe(42)
    expect(detail?.execution?.risk_level_count).toEqual(snapshot.execution.risk_level_count)
    expect(detail?.sessionSnapshotRevision).toBe(2)
    expect(req.store.getState().taskDetailsUpdate).toBe(1)

    const staleRequest = makeHandlerRequest({
      rawData: req.rawData,
      store: req.store,
      res: makeGrpcJsonRes(
        'structured',
        { ...snapshot, revision: 1, execution: { ...snapshot.execution, http_flow_count: 7 } },
        { NodeId: 'session_snapshot', TaskId: taskId, IsJson: true, IsSystem: true },
      ),
    })
    aiTaskDetailDataHandlers.session_snapshot(staleRequest)
    expect(req.store.getState().taskDetailsUpdate).toBe(1)
    expect(req.rawData.taskDetailsMap.get(taskId)?.execution?.http_flow_count).toBe(42)
  })

  it('session_snapshot ignores responses that are not structured', () => {
    const taskId = 'task-snapshot-unstructured'
    const req = makeHandlerRequest({
      res: makeGrpcJsonRes(
        'session_snapshot',
        { revision: 1, execution: { http_flow_count: 99 } },
        { NodeId: 'session_snapshot', TaskId: taskId, IsJson: true, IsSystem: true },
      ),
    })

    aiTaskDetailDataHandlers.session_snapshot(req)

    expect(req.rawData.taskDetailsMap.has(taskId)).toBe(false)
  })

  it('current_task_todo_list_update records iteration_index as step', () => {
    const taskId = 'task-iteration-todo'
    const req = makeHandlerRequest({
      res: makeGrpcJsonRes(
        'current_task_todo_list_update',
        { items: [], task_id: taskId, iteration_index: 7 },
        { NodeId: 'current_task_todo_list', TaskId: taskId },
      ),
    })
    aiTaskDetailDataHandlers.current_task_todo_list_update(req)
    expect(req.rawData.taskDetailsMap.get(taskId)?.execution?.execution_rounds).toBe(7)
  })

  it('current_task_todo_list_update never regresses execution_rounds on out-of-order iteration_index', () => {
    const taskId = 'task-iteration-todo-max'
    const { rawData, store } = makeHandlerRequest({
      res: makeGrpcJsonRes(
        'current_task_todo_list_update',
        { items: [], task_id: taskId, iteration_index: 7 },
        { NodeId: 'current_task_todo_list', TaskId: taskId },
      ),
    })
    const makeTodoReq = (iteration_index: number) =>
      makeHandlerRequest({
        rawData,
        store,
        res: makeGrpcJsonRes(
          'current_task_todo_list_update',
          { items: [], task_id: taskId, iteration_index },
          { NodeId: 'current_task_todo_list', TaskId: taskId },
        ),
      })

    aiTaskDetailDataHandlers.current_task_todo_list_update(makeTodoReq(7))
    expect(rawData.taskDetailsMap.get(taskId)?.execution?.execution_rounds).toBe(7)

    // 乱序迟到的更小 iteration_index 不回退步数
    aiTaskDetailDataHandlers.current_task_todo_list_update(makeTodoReq(3))
    expect(rawData.taskDetailsMap.get(taskId)?.execution?.execution_rounds).toBe(7)

    aiTaskDetailDataHandlers.current_task_todo_list_update(makeTodoReq(9))
    expect(rawData.taskDetailsMap.get(taskId)?.execution?.execution_rounds).toBe(9)
  })

  it('session_snapshot keeps client-side step when overwriting execution', () => {
    const taskId = 'task-iteration-snapshot'
    const todoReq = makeHandlerRequest({
      res: makeGrpcJsonRes(
        'current_task_todo_list_update',
        { items: [], task_id: taskId, iteration_index: 5 },
        { NodeId: 'current_task_todo_list', TaskId: taskId },
      ),
    })
    aiTaskDetailDataHandlers.current_task_todo_list_update(todoReq)

    const snapshotReq = makeHandlerRequest({
      rawData: todoReq.rawData,
      store: todoReq.store,
      res: makeGrpcJsonRes(
        'structured',
        { revision: 1, execution: { http_flow_count: 1 }, background_processes: [] },
        { NodeId: 'session_snapshot', TaskId: taskId, IsJson: true, IsSystem: true },
      ),
    })
    aiTaskDetailDataHandlers.session_snapshot(snapshotReq)

    const detail = todoReq.rawData.taskDetailsMap.get(taskId)
    expect(detail?.execution?.http_flow_count).toBe(1)
    expect(detail?.execution?.execution_rounds).toBe(5)
  })

  it('session_snapshot writes sessionTaskList from tasks', () => {
    const tasks = [
      {
        task_id: 'task-list-1',
        task_name: '列表任务一',
        attempt: 1,
        status: 'running',
        is_final: false,
        updated_at: 11,
      },
      {
        task_id: 'task-list-2',
        task_name: '列表任务二',
        attempt: 2,
        status: 'done',
        is_final: true,
        updated_at: 22,
      },
    ]
    const req = makeHandlerRequest({
      res: makeGrpcJsonRes(
        'structured',
        { revision: 1, execution: { http_flow_count: 1 }, background_processes: [], tasks },
        { NodeId: 'session_snapshot', TaskId: 'task-list-1', IsJson: true, IsSystem: true },
      ),
    })

    aiTaskDetailDataHandlers.session_snapshot(req)

    expect(req.store.getState().sessionTaskList).toEqual(tasks)
    expect(req.store.getState().sessionTaskListRevision).toBe(1)
  })

  it('session_snapshot 旧 revision 的 tasks 不回退已更新的 sessionTaskList', () => {
    const newerTasks = [
      {
        task_id: 'task-a',
        task_name: 'A',
        attempt: 1,
        status: 'running',
        is_final: false,
        updated_at: 10,
      },
      {
        task_id: 'task-b',
        task_name: 'B',
        attempt: 1,
        status: 'done',
        is_final: true,
        updated_at: 20,
      },
    ]
    const newerReq = makeHandlerRequest({
      res: makeGrpcJsonRes(
        'structured',
        {
          revision: 10,
          execution: { http_flow_count: 10 },
          background_processes: [],
          tasks: newerTasks,
        },
        { NodeId: 'session_snapshot', TaskId: 'task-a', IsJson: true, IsSystem: true },
      ),
    })
    aiTaskDetailDataHandlers.session_snapshot(newerReq)
    expect(newerReq.store.getState().sessionTaskList).toEqual(newerTasks)
    expect(newerReq.store.getState().sessionTaskListRevision).toBe(10)

    const staleReq = makeHandlerRequest({
      rawData: newerReq.rawData,
      store: newerReq.store,
      res: makeGrpcJsonRes(
        'structured',
        {
          revision: 9,
          execution: { http_flow_count: 1 },
          background_processes: [],
          tasks: [
            {
              task_id: 'task-a',
              task_name: 'A',
              attempt: 1,
              status: 'running',
              is_final: false,
              updated_at: 10,
            },
          ],
        },
        { NodeId: 'session_snapshot', TaskId: 'task-a', IsJson: true, IsSystem: true },
      ),
    })
    aiTaskDetailDataHandlers.session_snapshot(staleReq)

    expect(newerReq.store.getState().sessionTaskList).toEqual(newerTasks)
    expect(newerReq.store.getState().sessionTaskListRevision).toBe(10)
    expect(newerReq.rawData.taskDetailsMap.get('task-a')?.execution?.http_flow_count).toBe(10)
  })

  it('task_snapshot writes execution/todo/perception into taskDetailsMap', () => {
    const taskId = 'task-full-snapshot'
    const req = makeHandlerRequest({
      chatType: 'reAct',
      res: makeGrpcJsonRes(
        'structured',
        {
          task_id: taskId,
          attempt: 1,
          status: 'running',
          is_final: false,
          revision: 3,
          updated_at: 100,
          snapshot: {
            execution: {
              task_name: '完整任务',
              http_flow_count: 8,
              risk_count: 2,
              execution_rounds: 4,
            },
            perception: {
              summary: '快照感知摘要',
              last_trigger: 'tool_call',
              last_update_at: 12345,
              confidence: 0.9,
            },
            capabilities: [],
          },
          todo: {
            items: [{ id: 'todo-1', status: AIToDoListStatusEnum.Pending, content: '待办一', scope_task_id: taskId }],
            stats: { pending: 1, doing: 0, done: 0, skipped: 0, deleted: 0 },
          },
        },
        { NodeId: 'task_snapshot', TaskId: taskId, IsJson: true, IsSystem: true },
      ),
    })

    const beforeTodoUpdate = req.store.getState().chatTodoListUpdate
    aiTaskDetailDataHandlers.task_snapshot(req)
    expect(req.store.getState().taskDetailsUpdate).toBe(1)

    const detail = req.rawData.taskDetailsMap.get(taskId)
    expect(detail).toBeDefined()
    expect(detail?.execution?.task_name).toBe('完整任务')
    expect(detail?.execution?.http_flow_count).toBe(8)
    expect(detail?.execution?.execution_rounds).toBe(4)
    expect(detail?.perception?.summary).toBe('快照感知摘要')
    expect(detail?.perception?.trigger).toBe('tool_call')
    expect(detail?.perception?.timestamp).toBe(12345)
    expect(detail?.todoList?.items?.length).toBe(1)
    expect(req.store.getState().chatTodoListUpdate).toBeGreaterThan(beforeTodoUpdate)
    expect(detail?.todoList?.items?.[0]?.content).toBe('待办一')
    expect(detail?.taskSnapshotRevision).toBe(3)
  })

  it('task_snapshot with task chatType writes todo but does not bump chatTodoListUpdate', () => {
    const taskId = 'task-todo-no-bump'
    const req = makeHandlerRequest({
      chatType: 'task',
      res: makeGrpcJsonRes(
        'structured',
        {
          task_id: taskId,
          revision: 1,
          todo: {
            items: [{ id: 'todo-1', status: AIToDoListStatusEnum.Pending, content: '规划待办', scope_task_id: taskId }],
          },
        },
        { NodeId: 'task_snapshot', TaskId: taskId, IsJson: true, IsSystem: true },
      ),
    })
    const before = req.store.getState().chatTodoListUpdate
    aiTaskDetailDataHandlers.task_snapshot(req)
    expect(req.rawData.taskDetailsMap.get(taskId)?.todoList?.items?.[0]?.content).toBe('规划待办')
    expect(req.store.getState().chatTodoListUpdate).toBe(before)
  })

  it('task_snapshot ignores stale revisions before mutating cached details', () => {
    const taskId = 'task-stale-snapshot'
    const newerReq = makeHandlerRequest({
      res: makeGrpcJsonRes(
        'structured',
        {
          task_id: taskId,
          revision: 5,
          snapshot: {
            execution: { task_name: '新快照', http_flow_count: 10 },
            perception: { summary: '新感知', last_update_at: 200 },
          },
          todo: {
            items: [{ id: 'todo-new', status: AIToDoListStatusEnum.Doing, content: '新待办', scope_task_id: taskId }],
          },
        },
        { NodeId: 'task_snapshot', TaskId: taskId, IsJson: true, IsSystem: true },
      ),
    })
    aiTaskDetailDataHandlers.task_snapshot(newerReq)
    expect(newerReq.store.getState().taskDetailsUpdate).toBe(1)
    expect(newerReq.rawData.taskDetailsMap.get(taskId)?.execution?.http_flow_count).toBe(10)
    expect(newerReq.rawData.taskDetailsMap.get(taskId)?.taskSnapshotRevision).toBe(5)

    const staleReq = makeHandlerRequest({
      rawData: newerReq.rawData,
      store: newerReq.store,
      res: makeGrpcJsonRes(
        'structured',
        {
          task_id: taskId,
          revision: 3,
          snapshot: {
            execution: { task_name: '旧快照', http_flow_count: 1 },
            perception: { summary: '旧感知', last_update_at: 100 },
          },
          todo: {
            items: [{ id: 'todo-old', status: AIToDoListStatusEnum.Pending, content: '旧待办', scope_task_id: taskId }],
          },
        },
        { NodeId: 'task_snapshot', TaskId: taskId, IsJson: true, IsSystem: true },
      ),
    })
    aiTaskDetailDataHandlers.task_snapshot(staleReq)
    expect(newerReq.store.getState().taskDetailsUpdate).toBe(1)

    const detail = newerReq.rawData.taskDetailsMap.get(taskId)
    expect(detail?.execution?.task_name).toBe('新快照')
    expect(detail?.execution?.http_flow_count).toBe(10)
    expect(detail?.perception?.summary).toBe('新感知')
    expect(detail?.todoList?.items?.[0]?.content).toBe('新待办')
    expect(detail?.taskSnapshotRevision).toBe(5)
  })

  it('session_snapshot rev=N 后再 task_snapshot rev=N：互补字段仍写入', () => {
    const taskId = 'task-cross-channel-rev'
    const sessionReq = makeHandlerRequest({
      res: makeGrpcJsonRes(
        'structured',
        {
          revision: 5,
          execution: { task_name: '会话快照', http_flow_count: 9 },
          background_processes: [],
        },
        { NodeId: 'session_snapshot', TaskId: taskId, IsJson: true, IsSystem: true },
      ),
    })
    aiTaskDetailDataHandlers.session_snapshot(sessionReq)
    expect(sessionReq.rawData.taskDetailsMap.get(taskId)?.sessionSnapshotRevision).toBe(5)
    expect(sessionReq.rawData.taskDetailsMap.get(taskId)?.taskSnapshotRevision).toBe(0)

    const taskReq = makeHandlerRequest({
      rawData: sessionReq.rawData,
      store: sessionReq.store,
      res: makeGrpcJsonRes(
        'structured',
        {
          task_id: taskId,
          revision: 5,
          snapshot: {
            execution: { task_name: '任务快照', http_flow_count: 9 },
            perception: { summary: '同 rev 感知', last_update_at: 10 },
          },
          todo: {
            items: [
              { id: 'todo-cross', status: AIToDoListStatusEnum.Pending, content: '同 rev 待办', scope_task_id: taskId },
            ],
          },
        },
        { NodeId: 'task_snapshot', TaskId: taskId, IsJson: true, IsSystem: true },
      ),
    })
    aiTaskDetailDataHandlers.task_snapshot(taskReq)

    const detail = sessionReq.rawData.taskDetailsMap.get(taskId)
    expect(detail?.sessionSnapshotRevision).toBe(5)
    expect(detail?.taskSnapshotRevision).toBe(5)
    expect(detail?.perception?.summary).toBe('同 rev 感知')
    expect(detail?.todoList?.items?.[0]?.content).toBe('同 rev 待办')
  })

  it('task_snapshot 技能按加载状态分类，其他能力按 position 分类，加载状态优先 data 再回退 stage', () => {
    const taskId = 'task-capabilities'
    const req = makeHandlerRequest({
      res: makeGrpcJsonRes(
        'structured',
        {
          task_id: taskId,
          attempt: 1,
          status: 'running',
          is_final: false,
          revision: 1,
          updated_at: 1,
          snapshot: {
            execution: { task_name: '能力清单任务' },
            capabilities: [
              // 空名跳过
              { name: '  ', type: 'tool', stage: '', position: 'Fixed' },
              // skill：忽略 position，按加载状态分类，data 优先于 stage=loaded
              { name: 'skill-fixed', type: 'skill', stage: '', position: 'Fixed' },
              {
                name: 'skill-fixed-data-priority',
                type: 'skill',
                stage: 'loaded',
                position: 'Fixed',
                data: { skill_load_state: 'metadata', token_count: 123 },
              },
              {
                name: 'skill-fixed-from-data',
                type: 'skill',
                stage: 'metadata',
                position: 'Fixed',
                data: { skill_load_state: 'loaded' },
              },
              {
                name: 'skill-data-priority',
                type: 'skill',
                stage: 'loaded',
                position: 'Dynamic',
                data: { skill_load_state: 'metadata', token_count: 0 },
              },
              {
                name: 'skill-from-data',
                type: 'skill',
                stage: 'metadata',
                position: 'Dynamic',
                data: { skill_load_state: 'loaded', token_count: 456 },
              },
              { name: 'skill-default', type: 'skill', stage: 'schema', position: 'Dynamic' },
              { name: 'skill-fixed-stage-fallback', type: 'skill', stage: 'loaded', position: 'Fixed' },
              { name: 'skill-stage-fallback', type: 'skill', stage: 'loaded', position: 'Dynamic' },
              {
                name: 'skill-empty-state',
                type: 'skill',
                stage: 'loaded',
                position: 'Dynamic',
                data: { skill_load_state: '' },
              },
              // forge
              { name: 'forge-fixed', type: 'forge', stage: '', position: 'Fixed' },
              { name: 'forge-dynamic', type: 'forge', stage: '', position: 'Dynamic' },
              // mcp_server：有意不进 UI 桶（legacy 一致，见 planItemDetailsToCapabilityFields 注释）
              { name: 'mcp-server-1', type: 'mcp_server', stage: '', position: 'Fixed' },
              // tool / plugin / mcp → tools 再按 category 分桶
              { name: 'tool-fixed', type: 'tool', stage: '', position: 'Fixed' },
              { name: 'tool-dynamic', type: 'aitool', stage: '', position: 'Dynamic' },
              { name: 'plugin-fixed', type: 'plugin', stage: '', position: 'Fixed' },
              { name: 'plugin-dynamic', type: 'plugin', stage: '', position: 'Dynamic' },
              { name: 'mcp-fixed', type: 'mcp', stage: '', position: 'Fixed' },
              { name: 'mcp-dynamic', type: 'mcp', stage: '', position: 'Dynamic' },
            ],
          },
          todo: {
            items: [],
            stats: { pending: 0, doing: 0, done: 0, skipped: 0, deleted: 0 },
          },
        },
        { NodeId: 'task_snapshot', TaskId: taskId, IsJson: true, IsSystem: true },
      ),
    })

    aiTaskDetailDataHandlers.task_snapshot(req)
    const detail = req.rawData.taskDetailsMap.get(taskId)
    expect(detail).toBeDefined()

    expect(detail!.skills.fixed.map((i) => ({ name: i.name, state: i.skill_load_state }))).toEqual([
      { name: 'skill-fixed-from-data', state: 'loaded' },
      { name: 'skill-fixed-stage-fallback', state: 'loaded' },
      { name: 'skill-from-data', state: 'loaded' },
      { name: 'skill-stage-fallback', state: 'loaded' },
    ])
    expect(detail!.skills.fixed[2].token_count).toBe(456)
    expect(detail!.skills.fixed[0].token_count).toBeUndefined()
    expect(detail!.skills.dynamic[1].token_count).toBe(123)
    expect(detail!.skills.dynamic[2].token_count).toBe(0)
    expect(detail!.skills.dynamic[3].token_count).toBeUndefined()
    expect(detail!.skills.dynamic.map((i) => ({ name: i.name, state: i.skill_load_state }))).toEqual([
      { name: 'skill-fixed', state: 'metadata' },
      { name: 'skill-fixed-data-priority', state: 'metadata' },
      { name: 'skill-data-priority', state: 'metadata' },
      { name: 'skill-default', state: 'metadata' },
      { name: 'skill-empty-state', state: '' },
    ])

    expect(detail!.forges.fixed.map((i) => i.name)).toEqual(['forge-fixed'])
    expect(detail!.forges.dynamic.map((i) => i.name)).toEqual(['forge-dynamic'])

    expect(detail!.tool.fixed.map((i) => i.name)).toEqual(['tool-fixed'])
    expect(detail!.tool.dynamic.map((i) => i.name)).toEqual(['tool-dynamic'])
    expect(detail!.plugins.fixed.map((i) => i.name)).toEqual(['plugin-fixed'])
    expect(detail!.plugins.dynamic.map((i) => i.name)).toEqual(['plugin-dynamic'])
    expect(detail!.mcp.fixed.map((i) => i.name)).toEqual(['mcp-fixed'])
    expect(detail!.mcp.dynamic.map((i) => i.name)).toEqual(['mcp-dynamic'])
  })

  it.each(['Fixed', 'Dynamic'])('task_snapshot %s skill 原样透传 token_count', (position) => {
    const taskId = 'task-token-count'
    const tokenCounts = [undefined, null, -1, '123', true, 0, 456]
    const req = makeHandlerRequest({
      res: makeGrpcJsonRes(
        'structured',
        {
          task_id: taskId,
          revision: 1,
          snapshot: {
            capabilities: tokenCounts.map((tokenCount, index) => ({
              name: `skill-${index}`,
              type: 'skill',
              stage: 'loaded',
              position,
              data: { token_count: tokenCount },
            })),
          },
        },
        { NodeId: 'task_snapshot', TaskId: taskId, IsJson: true, IsSystem: true },
      ),
    })
    aiTaskDetailDataHandlers.task_snapshot(req)
    const skills = req.rawData.taskDetailsMap.get(taskId)!.skills
    expect(skills.fixed.map((item) => item.token_count)).toEqual(tokenCounts)
    expect(skills.dynamic).toEqual([])
  })

  it('task_snapshot capabilities=[] 整表清空，不残留旧 tool/forge/技能', () => {
    const taskId = 'task-capabilities-clear'
    const seeded = makeHandlerRequest({
      chatType: 'reAct',
      res: makeGrpcJsonRes(
        'structured',
        {
          task_id: taskId,
          revision: 1,
          snapshot: {
            capabilities: [
              { name: 'old-tool', type: 'tool', stage: '', position: 'Fixed' },
              { name: 'old-skill', type: 'skill', stage: '', position: 'Fixed' },
              { name: 'old-forge', type: 'forge', stage: '', position: 'Dynamic' },
            ],
          },
        },
        { NodeId: 'task_snapshot', TaskId: taskId, IsJson: true, IsSystem: true },
      ),
    })
    aiTaskDetailDataHandlers.task_snapshot(seeded)
    expect(seeded.rawData.taskDetailsMap.get(taskId)?.tool.fixed).toHaveLength(1)
    expect(seeded.rawData.taskDetailsMap.get(taskId)?.skills.dynamic).toHaveLength(1)
    expect(seeded.rawData.taskDetailsMap.get(taskId)?.forges.dynamic).toHaveLength(1)

    const clearReq = makeHandlerRequest({
      chatType: 'reAct',
      rawData: seeded.rawData,
      store: seeded.store,
      res: makeGrpcJsonRes(
        'structured',
        {
          task_id: taskId,
          revision: 2,
          snapshot: { capabilities: [] },
        },
        { NodeId: 'task_snapshot', TaskId: taskId, IsJson: true, IsSystem: true },
      ),
    })
    // reAct + 无 todo：不得 bump chatTodoListUpdate（守卫 todoUpdated）
    const beforeTodoUpdate = clearReq.store.getState().chatTodoListUpdate
    aiTaskDetailDataHandlers.task_snapshot(clearReq)
    expect(clearReq.store.getState().chatTodoListUpdate).toBe(beforeTodoUpdate)

    const detail = seeded.rawData.taskDetailsMap.get(taskId)
    expect(detail?.tool.fixed).toEqual([])
    expect(detail?.tool.dynamic).toEqual([])
    expect(detail?.skills.fixed).toEqual([])
    expect(detail?.skills.dynamic).toEqual([])
    expect(detail?.forges.fixed).toEqual([])
    expect(detail?.forges.dynamic).toEqual([])
    expect(detail?.plugins.fixed).toEqual([])
    expect(detail?.mcp.fixed).toEqual([])
  })

  it('session_snapshot merges execution_rounds into step and never regresses', () => {
    const taskId = 'task-snapshot-rounds'
    const firstReq = makeHandlerRequest({
      res: makeGrpcJsonRes(
        'structured',
        { revision: 1, execution: { http_flow_count: 1, execution_rounds: 6 }, background_processes: [] },
        { NodeId: 'session_snapshot', TaskId: taskId, IsJson: true, IsSystem: true },
      ),
    })
    const { rawData } = firstReq
    const makeFollowUpReq = (revision: number, execution_rounds: number) =>
      makeHandlerRequest({
        rawData,
        res: makeGrpcJsonRes(
          'structured',
          { revision, execution: { http_flow_count: 1, execution_rounds }, background_processes: [] },
          { NodeId: 'session_snapshot', TaskId: taskId, IsJson: true, IsSystem: true },
        ),
      })

    // 快照自带的 execution_rounds 应写入 step
    aiTaskDetailDataHandlers.session_snapshot(firstReq)
    expect(rawData.taskDetailsMap.get(taskId)?.execution?.execution_rounds).toBe(6)

    // 后续快照 execution_rounds 变小时(事件乱序/回放)不回退已记录的步数
    aiTaskDetailDataHandlers.session_snapshot(makeFollowUpReq(2, 4))
    expect(rawData.taskDetailsMap.get(taskId)?.execution?.execution_rounds).toBe(6)

    // execution_rounds 变大时正常前进
    aiTaskDetailDataHandlers.session_snapshot(makeFollowUpReq(3, 9))
    expect(rawData.taskDetailsMap.get(taskId)?.execution?.execution_rounds).toBe(9)
  })
})
