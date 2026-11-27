import { describe, expect, it } from 'vitest'
import { AITaskStatus } from '@/pages/ai-re-act/hooks/grpcApi'
import type { SubForgeRun } from '@/pages/ai-re-act/hooks/grpcStreamHandler/subForgeTaskTree'
import type { AITaskInfoProps } from '@/pages/ai-re-act/hooks/aiRender'
import { insertSubForgeTasks, isSubForgeTreeTask } from '../SubForgeTaskTrees'

const parentTask = (overrides: Partial<AITaskInfoProps> = {}): AITaskInfoProps => ({
  task_id: 'task-east',
  name: '华东仓委派',
  goal: '',
  level: 2,
  isLeaf: true,
  semantic_identifier: '',
  isRemove: false,
  tools: [],
  description: '',
  total_tool_call_count: 0,
  success_tool_call_count: 0,
  fail_tool_call_count: 0,
  summary: '',
  ...overrides,
})

const run = (overrides: Partial<SubForgeRun> = {}): SubForgeRun => ({
  parent_coordinator_id: 'parent',
  parent_task_id: 'task-east',
  parent_task_uuid: 'attempt-1',
  call_tool_id: 'call-1',
  child_coordinator_id: 'child-1',
  tool_name: 'sub_forge_inventory',
  revision: 1,
  status: 'running',
  task_tree: null,
  historical: false,
  ...overrides,
})

describe('insertSubForgeTasks', () => {
  it('将子 Forge 插在可见父任务后，层级为父级 + 1，无计划时 isLeaf 仍为 false', () => {
    const inserted = insertSubForgeTasks([parentTask()], { 'child-1': run() }, 'parent', true)
    expect(inserted).toHaveLength(2)
    expect(inserted[1]).toMatchObject({
      task_id: 'subforge-child-1',
      name: 'sub_forge_inventory',
      level: 3,
      isLeaf: false,
      subForgeHead: false,
      progress: AITaskStatus.inProgress,
    })
    expect(inserted[1].subForgeChildren).toBeUndefined()
  })

  it('父任务不在可见列表时按首层 level 2 挂孤儿，避免 lineNum=0 丢图标', () => {
    const inserted = insertSubForgeTasks(
      [parentTask()],
      { 'child-1': run({ parent_task_id: 'missing' }) },
      'parent',
      true,
    )
    expect(inserted[0]).toMatchObject({ task_id: 'subforge-child-1', level: 2, isLeaf: false })
    expect(inserted[1].task_id).toBe('task-east')
  })

  it('缺 task_id 的父子节点生成不同 id，并挂到弹层子树', () => {
    const inserted = insertSubForgeTasks(
      [parentTask()],
      {
        'child-1': run({
          status: 'succeeded',
          task_tree: {
            name: '仓库核算',
            subtasks: [{ name: '鲜果组' }],
          },
        }),
      },
      'parent',
      true,
    )
    const head = inserted[1]
    expect(head.subForgeHead).toBe(true)
    expect(head.isLeaf).toBe(false)
    expect(head.subForgeChildren?.map((item) => item.task_id)).toEqual(['subforge-child-1-n0', 'subforge-child-1-n1'])
  })

  it('双分支同层缺 task_id 时 id 仍唯一', () => {
    const inserted = insertSubForgeTasks(
      [parentTask()],
      {
        'child-1': run({
          status: 'succeeded',
          task_tree: {
            name: 'root',
            subtasks: [
              { name: 'a', subtasks: [{ name: 'a1' }] },
              { name: 'b', subtasks: [{ name: 'b1' }] },
            ],
          },
        }),
      },
      'parent',
      true,
    )
    const ids = inserted[1].subForgeChildren?.map((item) => item.task_id) || []
    expect(ids).toEqual([
      'subforge-child-1-n0',
      'subforge-child-1-n1',
      'subforge-child-1-n2',
      'subforge-child-1-n3',
      'subforge-child-1-n4',
    ])
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('真实 task_id 为 n0 时 fallback 不会撞号', () => {
    const inserted = insertSubForgeTasks(
      [parentTask()],
      {
        'child-1': run({
          status: 'succeeded',
          task_tree: {
            name: 'root',
            task_id: 'n0',
            subtasks: [{ name: 'leaf' }, { name: 'n1', task_id: 'n1' }],
          },
        }),
      },
      'parent',
      true,
    )
    expect(inserted[1].subForgeChildren?.map((item) => item.task_id)).toEqual([
      'subforge-child-1-n0',
      'subforge-child-1-n2',
      'subforge-child-1-n1',
    ])
  })

  it('非当前会话的 running 不展示为进行中', () => {
    const inserted = insertSubForgeTasks([parentTask()], { 'child-1': run() }, 'parent', false)
    expect(inserted[1].progress).toBe(AITaskStatus.created)
  })

  it('只插入当前 coordinator 的子 Forge，并按 child_coordinator_id 排序', () => {
    const inserted = insertSubForgeTasks(
      [parentTask()],
      {
        b: run({ child_coordinator_id: 'child-b', tool_name: 'b' }),
        a: run({ child_coordinator_id: 'child-a', tool_name: 'a' }),
        other: run({ child_coordinator_id: 'other', parent_coordinator_id: 'else' }),
      },
      'parent',
      true,
    )
    expect(inserted.map((item) => item.name)).toEqual(['华东仓委派', 'a', 'b'])
  })

  it('弹层内递归挂上以 child coordinator 为父的下一层 Forge', () => {
    const inserted = insertSubForgeTasks(
      [parentTask()],
      {
        'child-1': run({
          status: 'succeeded',
          task_tree: { name: 'inner', task_id: 'inner-1' },
        }),
        nested: run({
          child_coordinator_id: 'child-2',
          parent_coordinator_id: 'child-1',
          parent_task_id: 'inner-1',
          tool_name: 'nested',
          status: 'succeeded',
        }),
      },
      'parent',
      true,
    )
    expect(inserted.map((item) => item.task_id)).toEqual(['task-east', 'subforge-child-1'])
    expect(inserted[1].subForgeChildren?.map((item) => item.task_id)).toEqual([
      'subforge-child-1-inner-1',
      'subforge-child-2',
    ])
    expect(inserted[1].subForgeChildren?.[1]).toMatchObject({ name: 'nested', subForgeHead: false })
  })

  it('识别 subforge- 前缀', () => {
    expect(isSubForgeTreeTask('subforge-child-1')).toBe(true)
    expect(isSubForgeTreeTask('task-east')).toBe(false)
  })
})
