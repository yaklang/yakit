import { describe, it, expect, vi } from 'vitest'
import { createChatStore } from '../chatStore'
import { DefaultAgentChatStatus, DefaultCurrentExecTaskTree, getDefaultAgentLoadingTitle } from '../defaultConstant'
import { AITaskStatus } from '../grpcApi'
import { AIChatQSDataTypeEnum } from '../aiRender'

describe('历史渲染批次', () => {
  it.each(['initLoading', 'grpcLoadMoreLoading'] as const)('%s 期间业务状态立即更新，渲染树在收尾时发布', (loading) => {
    const store = createChatStore()
    store.getState().updateState({ [loading]: true })
    const published = store.renderStore.getState()
    for (const token of ['a', 'b']) {
      store.getState().dispatchStreamingNode({
        chatType: 'reAct',
        node: { kind: 'item', token, type: AIChatQSDataTypeEnum.THOUGHT, isHistory: true },
      })
      expect(store.renderStore.getState().chatElements).toBe(published.chatElements)
      expect(store.renderStore.getState().items).toBe(published.items)
    }
    expect(store.getState().chatElements.map((x) => x.token)).toEqual(['b', 'a'])
    expect(store.renderStore.getState()[loading]).toBe(true)
    store.getState().updateState({ [loading]: false })
    expect(store.renderStore.getState().chatElements).toBe(store.getState().chatElements)
    expect(store.renderStore.getState().items).toBe(store.getState().items)
  })

  it('已有分组增加历史子项时也延迟发布，顶层数量不变', () => {
    const store = createChatStore()
    const append = (token: string, isHistory = false) =>
      store.getState().dispatchStreamingNode({
        chatType: 'reAct',
        node: { kind: 'item', token, type: AIChatQSDataTypeEnum.STREAM, nodeId: 'thought', isHistory },
      })
    append('a')
    append('b')
    const group = store.getState().chatElements[0].token
    store.getState().updateState({ grpcLoadMoreLoading: true })
    append('older', true)
    expect(store.getState().groups[group].childrenTokens).toEqual(['older', 'a', 'b'])
    expect(store.renderStore.getState().groups[group].childrenTokens).toEqual(['a', 'b'])
    expect(store.renderStore.getState().chatElements).toHaveLength(1)
    store.getState().updateState({ grpcLoadMoreLoading: false })
    expect(store.renderStore.getState().groups[group].childrenTokens).toEqual(['older', 'a', 'b'])
  })

  it('等待期间 UI action 仍生效，重置不会遗留上一轮渲染树', () => {
    const store = createChatStore()
    store.getState().updateState({ grpcLoadMoreLoading: true })
    store.renderStore.getState().updateState({ cancelChatLoading: true })
    expect(store.getState().cancelChatLoading).toBe(true)
    store.reset()
    expect(store.renderStore.getState()).toEqual(store.getState())
    expect(store.renderStore.getState().grpcLoadMoreLoading).toBe(false)
  })
})

describe('chatStore basics', () => {
  it('C1: initial state and updateCurrentChatStatus / updateCurrentLoadingTitle', () => {
    const store = createChatStore()
    expect(store.getState().execute).toBe(false)
    expect(store.getState().currentChatStatus).toEqual(DefaultAgentChatStatus)
    expect(store.getState().currentLoadingTitle).toEqual(getDefaultAgentLoadingTitle())
    expect(store.getState().pendingReply).toBe(false)
    expect(store.getState().currentReviewDetail).toEqual({ token: '', renderNum: 0 })
    expect(store.getState().skipSubtaskTaskIDs).toEqual([])
    expect(store.getState().showPlanList).toBe(false)
    expect(store.getState().cancelChatLoading).toBe(false)
    expect(store.getState().timelinesLoading).toBe(false)
    expect('cancelCasualLoading' in store.getState()).toBe(false)
    expect('cancelTaskLoading' in store.getState()).toBe(false)
    expect('requestHistoryState' in store.getState()).toBe(false)
    expect('casualChat' in store.getState()).toBe(false)
    expect('taskChat' in store.getState()).toBe(false)
    expect('updatePlanTree' in store.getState()).toBe(false)
    expect('updateCasualTodoList' in store.getState()).toBe(false)

    store.getState().updateState({ execute: true, cancelChatLoading: true, timelinesLoading: true })
    store.getState().updateCurrentLoadingTitle({ casualTitle: 'hi' })
    expect(store.getState().execute).toBe(true)
    expect(store.getState().cancelChatLoading).toBe(true)
    expect(store.getState().timelinesLoading).toBe(true)
    expect(store.getState().currentLoadingTitle.casualTitle).toBe('hi')

    store.getState().updateCurrentLoadingTitle({ planTitle: 'p' })
    store.getState().updateCurrentChatStatus({ status: AITaskStatus.inProgress })
    expect(store.getState().currentLoadingTitle.planTitle).toBe('p')
    expect(store.getState().currentChatStatus.status).toBe(AITaskStatus.inProgress)
  })

  it('C2: hydrateRenderTree', () => {
    const store = createChatStore()
    store.getState().hydrateRenderTree({
      items: { a: { kind: 'item', token: 'a', type: 'thought', renderNum: 1, nodeId: '' } as any },
      groups: {},
      tasks: {},
      chatElements: [{ kind: 'item', token: 'a', chatType: 'reAct', isHistory: false }],
    })
    expect(store.getState().items.a.token).toBe('a')
    expect(store.getState().chatElements).toHaveLength(1)
  })

  it('C6: currentPlan / currentReviewDetail / folders / timeline / http / risk', () => {
    const store = createChatStore()
    store.getState().updateState({ currentPlan: { root_task_name: 'r', task_tree: [] } })
    expect(store.getState().currentPlan.root_task_name).toBe('r')

    store.getState().updateState({ currentReviewDetail: { token: 'rev-1', renderNum: 0 } })
    expect(store.getState().currentReviewDetail.token).toBe('rev-1')
    store.getState().updateState({ currentReviewDetail: { token: '', renderNum: 0 } })
    expect(store.getState().currentReviewDetail.token).toBe('')

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

    store.getState().updateStateCount('chatTodoListUpdate')
    expect(store.getState().chatTodoListUpdate).toBe(1)

    expect(DefaultCurrentExecTaskTree.task_tree).toEqual([])
  })

  it('C8: incrementNodeVersion / updateStateCount', () => {
    const store = createChatStore()
    store.getState().dispatchStreamingNode({
      chatType: 'reAct',
      node: { token: 'i1', kind: 'item', type: 'thought' },
    })
    const { renderNum: prevNum } = store.getState().items.i1
    store.getState().incrementNodeVersion('i1', 'item')
    expect(store.getState().items.i1.renderNum).toBe(prevNum + 1)

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
