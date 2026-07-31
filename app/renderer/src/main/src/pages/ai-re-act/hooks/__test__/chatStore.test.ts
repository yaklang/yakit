import { describe, it, expect, vi } from 'vitest'
import { createChatStore } from '../chatStore'
import { DefaultTaskPlanStatus, DefaultCurrentExecTaskTree } from '../defaultConstant'

describe('chatStore basics', () => {
  it('C1: initial state and updateState / updateTaskLoadingStatus', () => {
    const store = createChatStore()
    expect(store.getState().execute).toBe(false)
    expect(store.getState().taskStatus).toEqual(DefaultTaskPlanStatus)

    store.getState().updateState({ execute: true, casualTitle: 'hi' })
    expect(store.getState().execute).toBe(true)
    expect(store.getState().casualTitle).toBe('hi')

    store.getState().updateTaskLoadingStatus({ plan: 'p', status: 'processing' })
    expect(store.getState().taskStatus.plan).toBe('p')
    expect(store.getState().taskStatus.status).toBe('processing')
  })

  it('C2: hydrateRenderTree', () => {
    const store = createChatStore()
    store.getState().hydrateRenderTree({
      items: { a: { kind: 'item', token: 'a', type: 'thought', renderNum: 1, nodeId: '' } as any },
      groups: {},
      tasks: {},
      casualElements: [{ kind: 'item', token: 'a', chatType: 'reAct', isHistory: false }],
      taskElements: [],
    })
    expect(store.getState().items.a.token).toBe('a')
    expect(store.getState().casualChat.elements).toHaveLength(1)
  })

  it('C6: updatePlanTree / updateCasualReview / folders / timeline / http / risk', () => {
    const store = createChatStore()
    store.getState().updatePlanTree({ root_task_name: 'r', task_tree: [] })
    expect(store.getState().taskChat.plan.root_task_name).toBe('r')

    store.getState().updateCasualReview('rev-1', 'add')
    expect(store.getState().currentCasualReview).toContain('rev-1')
    store.getState().updateCasualReview('rev-1', 'remove')
    expect(store.getState().currentCasualReview).not.toContain('rev-1')

    store.getState().updateFolders({ path: '/a', isFolder: true })
    store.getState().updateFolders({ path: '/a', isFolder: true })
    expect(store.getState().grpcFolders).toHaveLength(1)

    store.getState().setGrpcFolders([{ path: '/b', isFolder: false }])
    expect(store.getState().grpcFolders.some((f) => f.path === '/b')).toBe(true)

    store.getState().updateTimeLineItem({ id: 1 } as any)
    store.getState().setReActTimelines([{ id: 1 } as any, { id: 2 } as any])
    expect(store.getState().reActTimelines.map((t) => t.id)).toEqual([2, 1])

    store.getState().updateHttpData()
    store.getState().updateRiskData()
    expect(store.getState().httpTabShow).toBe(true)
    expect(store.getState().riskTabShow).toBe(true)

    store.getState().updateCasualTodoList()
    expect(store.getState().casualChat.todoListUpdate).toBe(1)

    expect(DefaultCurrentExecTaskTree.task_tree).toEqual([])
  })

  it('C8: incrementNodeVersion / updateStateCount', () => {
    const store = createChatStore()
    store.getState().dispatchStreamingNode({
      chatType: 'reAct',
      node: { token: 'i1', kind: 'item', type: 'thought' },
    })
    const before = store.getState().items.i1.renderNum
    store.getState().incrementNodeVersion('i1', 'item')
    expect(store.getState().items.i1.renderNum).toBe(before + 1)

    const memBefore = store.getState().memoryListUpdate
    store.getState().updateStateCount('memoryListUpdate')
    expect(store.getState().memoryListUpdate).toBe(memBefore + 1)
  })
})

describe('chatStore onRenderStructureChange', () => {
  it('C7: fires on structural dispatch', () => {
    const onRenderStructureChange = vi.fn()
    const store = createChatStore({ onRenderStructureChange })
    store.getState().dispatchStreamingNode({
      chatType: 'reAct',
      node: { token: 'n1', kind: 'item', type: 'thought' },
    })
    expect(onRenderStructureChange).toHaveBeenCalled()
  })
})
