import { act, renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { useHttpFlowSelection } from '../useHttpFlowSelection'

function setup(visible = true, activeID: string | undefined = 'session-1') {
  const bridge = { clearTableSelection: vi.fn(), syncSelectedHttpFlowIds: vi.fn(), deselectHttpFlowId: vi.fn() }
  const initialProps: { visible: boolean; activeID: string | undefined } = { visible, activeID }
  const hook = renderHook(
    (props: { visible: boolean; activeID: string | undefined }) =>
      useHttpFlowSelection(props.visible, props.activeID, bridge),
    { initialProps },
  )
  return { ...hook, bridge }
}

describe('当前输入框流量选择', () => {
  it('普通重渲染保留选择，已有回调仍可同步和删除引用', () => {
    const { result, rerender, bridge } = setup()
    const previousSelection = result.current
    const { onSetSelectedHttpFlowIds, onHttpFlowRemove } = result.current
    act(() => onSetSelectedHttpFlowIds(['1', '2']))
    bridge.syncSelectedHttpFlowIds.mockClear()

    rerender({ visible: true, activeID: 'session-1' })

    expect(result.current).toBe(previousSelection)
    for (const key of Object.keys(previousSelection) as (keyof typeof previousSelection)[]) {
      expect(result.current[key]).toBe(previousSelection[key])
    }
    expect(bridge.clearTableSelection).not.toHaveBeenCalled()
    expect(bridge.syncSelectedHttpFlowIds).not.toHaveBeenCalled()
    act(() => {
      onSetSelectedHttpFlowIds(['2'])
      onHttpFlowRemove('1', false)
    })
    expect(bridge.syncSelectedHttpFlowIds).toHaveBeenCalledWith(['2'])
    expect(bridge.deselectHttpFlowId).toHaveBeenCalledWith('1')
  })

  it('单条关闭只取消该 ID，聚合关闭清空，旧会话及隐藏输入框的删除被忽略', () => {
    const { result, rerender, bridge } = setup()
    act(() => result.current.onHttpFlowRemove('1', false))
    expect(bridge.deselectHttpFlowId).toHaveBeenCalledWith('1')
    expect(bridge.clearTableSelection).not.toHaveBeenCalled()
    const oldRemove = result.current.onHttpFlowRemove
    rerender({ visible: true, activeID: 'session-2' })
    bridge.clearTableSelection.mockClear()
    bridge.deselectHttpFlowId.mockClear()
    act(() => {
      oldRemove('1', false)
      oldRemove('1,2,3', true)
    })
    expect(bridge.clearTableSelection).not.toHaveBeenCalled()
    expect(bridge.deselectHttpFlowId).not.toHaveBeenCalled()
    act(() => result.current.onHttpFlowRemove('2,3,4', true))
    expect(bridge.clearTableSelection).toHaveBeenCalled()
    rerender({ visible: false, activeID: 'session-2' })
    bridge.deselectHttpFlowId.mockClear()
    act(() => result.current.onHttpFlowRemove('2', false))
    expect(bridge.deselectHttpFlowId).not.toHaveBeenCalled()
    bridge.clearTableSelection.mockClear()
    act(() => result.current.onHttpFlowRemove('2,3', true))
    expect(bridge.clearTableSelection).not.toHaveBeenCalled()
  })
  it('仅可见输入框接收勾选，隐藏和重新显示时保留选择及表格回调', () => {
    const { result, rerender, bridge } = setup(false)
    act(() => result.current.onSetSelectedHttpFlowIds(['1']))
    expect(bridge.syncSelectedHttpFlowIds).not.toHaveBeenCalled()
    rerender({ visible: true, activeID: 'session-1' })
    expect(bridge.clearTableSelection).not.toHaveBeenCalled()
    act(() => result.current.onSetSelectedHttpFlowIds(['2']))
    expect(bridge.syncSelectedHttpFlowIds).toHaveBeenLastCalledWith(['2'])
    const oldCallback = result.current.onSetSelectedHttpFlowIds
    const previousSelection = result.current
    rerender({ visible: false, activeID: 'session-1' })
    bridge.syncSelectedHttpFlowIds.mockClear()
    act(() => oldCallback(['2']))
    act(() => result.current.onSetSelectedHttpFlowIds(['3']))
    expect(bridge.syncSelectedHttpFlowIds).not.toHaveBeenCalled()
    rerender({ visible: true, activeID: 'session-1' })
    expect(bridge.syncSelectedHttpFlowIds).not.toHaveBeenCalled()
    expect(bridge.clearTableSelection).not.toHaveBeenCalled()
    for (const key of Object.keys(previousSelection) as (keyof typeof previousSelection)[]) {
      expect(result.current[key]).toBe(previousSelection[key])
    }
    act(() => oldCallback(['2']))
    expect(bridge.syncSelectedHttpFlowIds).toHaveBeenLastCalledWith(['2'])
  })

  it('页面隐藏期间切换会话仍然清理，并使旧会话回调失效', () => {
    const { result, rerender, bridge } = setup()
    const oldCallback = result.current.onSetSelectedHttpFlowIds
    rerender({ visible: false, activeID: 'session-1' })
    expect(bridge.clearTableSelection).not.toHaveBeenCalled()
    rerender({ visible: false, activeID: 'session-2' })
    expect(bridge.clearTableSelection).toHaveBeenCalledOnce()
    expect(bridge.syncSelectedHttpFlowIds).toHaveBeenCalledExactlyOnceWith([])
    bridge.syncSelectedHttpFlowIds.mockClear()
    rerender({ visible: true, activeID: 'session-2' })
    act(() => oldCallback(['late']))
    expect(bridge.syncSelectedHttpFlowIds).not.toHaveBeenCalled()
    act(() => result.current.onSetSelectedHttpFlowIds(['2']))
    expect(bridge.syncSelectedHttpFlowIds).toHaveBeenCalledExactlyOnceWith(['2'])
  })

  it('切换会话清除选择并丢弃上一会话的延迟回调', () => {
    const { result, rerender, bridge } = setup()
    const oldCallback = result.current.onSetSelectedHttpFlowIds
    act(() => oldCallback(['1']))
    rerender({ visible: true, activeID: 'session-2' })
    expect(bridge.clearTableSelection).toHaveBeenCalled()
    expect(bridge.syncSelectedHttpFlowIds).toHaveBeenLastCalledWith([])
    act(() => oldCallback(['1']))
    expect(bridge.syncSelectedHttpFlowIds).toHaveBeenLastCalledWith([])
    act(() => result.current.onSetSelectedHttpFlowIds(['2']))
    expect(bridge.syncSelectedHttpFlowIds).toHaveBeenLastCalledWith(['2'])
  })

  it('切回原会话后，首次进入时的回调仍然失效', () => {
    const { result, rerender, bridge } = setup()
    const { onSetSelectedHttpFlowIds, onHttpFlowRemove, clearHttpFlowSelection } = result.current
    rerender({ visible: true, activeID: 'session-2' })
    rerender({ visible: true, activeID: 'session-1' })
    bridge.clearTableSelection.mockClear()
    bridge.syncSelectedHttpFlowIds.mockClear()

    act(() => {
      onSetSelectedHttpFlowIds(['1'])
      onHttpFlowRemove('1', false)
      clearHttpFlowSelection()
    })

    expect(bridge.clearTableSelection).not.toHaveBeenCalled()
    expect(bridge.syncSelectedHttpFlowIds).not.toHaveBeenCalled()
    expect(bridge.deselectHttpFlowId).not.toHaveBeenCalled()
    act(() => result.current.onSetSelectedHttpFlowIds(['2']))
    expect(bridge.syncSelectedHttpFlowIds).toHaveBeenCalledWith(['2'])
  })

  it.each([undefined, 'session-1'])('会话 ID 不变时，连续清理均立即使旧回调失效（SessionID：%s）', (activeID) => {
    const { result, rerender, bridge } = setup()
    rerender({ visible: true, activeID })

    for (let round = 0; round < 2; round++) {
      const { onSetSelectedHttpFlowIds, onHttpFlowRemove, clearHttpFlowSelection } = result.current
      act(() => onSetSelectedHttpFlowIds(['1', '2']))
      bridge.clearTableSelection.mockClear()
      bridge.syncSelectedHttpFlowIds.mockClear()
      bridge.deselectHttpFlowId.mockClear()

      act(() => {
        result.current.clearHttpFlowSelection()
        expect(bridge.clearTableSelection).toHaveBeenCalledTimes(1)
        expect(bridge.syncSelectedHttpFlowIds).toHaveBeenCalledExactlyOnceWith([])

        // 同一批更新内触发旧回调，验证重渲染前已失效。
        onSetSelectedHttpFlowIds(['1'])
        onHttpFlowRemove('1', false)
        clearHttpFlowSelection()
        expect(bridge.clearTableSelection).toHaveBeenCalledTimes(1)
        expect(bridge.syncSelectedHttpFlowIds).toHaveBeenCalledExactlyOnceWith([])
        expect(bridge.deselectHttpFlowId).not.toHaveBeenCalled()
      })

      expect(bridge.clearTableSelection).toHaveBeenCalledTimes(1)
      expect(bridge.syncSelectedHttpFlowIds).toHaveBeenCalledExactlyOnceWith([])
      bridge.clearTableSelection.mockClear()
      bridge.syncSelectedHttpFlowIds.mockClear()
      act(() => {
        onSetSelectedHttpFlowIds(['1'])
        onHttpFlowRemove('1', false)
        clearHttpFlowSelection()
      })
      expect(bridge.clearTableSelection).not.toHaveBeenCalled()
      expect(bridge.syncSelectedHttpFlowIds).not.toHaveBeenCalled()
      expect(bridge.deselectHttpFlowId).not.toHaveBeenCalled()

      act(() => {
        result.current.onSetSelectedHttpFlowIds(['3'])
        result.current.onHttpFlowRemove('3', false)
      })
      expect(bridge.syncSelectedHttpFlowIds).toHaveBeenCalledExactlyOnceWith(['3'])
      expect(bridge.deselectHttpFlowId).toHaveBeenCalledExactlyOnceWith('3')
    }
  })

  it('bridge 更新后，之前保存的清理函数调用最新 bridge', () => {
    const previousBridge = {
      activeID: 'session-1',
      clearTableSelection: vi.fn(),
      syncSelectedHttpFlowIds: vi.fn(),
      deselectHttpFlowId: vi.fn(),
    }
    const nextBridge = {
      activeID: 'session-1',
      clearTableSelection: vi.fn(),
      syncSelectedHttpFlowIds: vi.fn(),
      deselectHttpFlowId: vi.fn(),
    }
    const { result, rerender } = renderHook((bridge) => useHttpFlowSelection(true, bridge.activeID, bridge), {
      initialProps: previousBridge,
    })
    const clearSelection = result.current.clearHttpFlowSelection

    rerender(nextBridge)
    expect(nextBridge.clearTableSelection).not.toHaveBeenCalled()
    expect(nextBridge.syncSelectedHttpFlowIds).not.toHaveBeenCalled()
    act(() => clearSelection())

    expect(previousBridge.clearTableSelection).not.toHaveBeenCalled()
    expect(previousBridge.syncSelectedHttpFlowIds).not.toHaveBeenCalled()
    expect(nextBridge.clearTableSelection).toHaveBeenCalled()
    expect(nextBridge.syncSelectedHttpFlowIds).toHaveBeenLastCalledWith([])
  })

  it('操作方法更新后保持返回引用稳定，已有回调调用最新方法', () => {
    const previousActions = {
      syncSelectedHttpFlowIds: vi.fn(),
      clearTableSelection: vi.fn(),
      deselectHttpFlowId: vi.fn(),
    }
    const nextActions = {
      syncSelectedHttpFlowIds: vi.fn(),
      clearTableSelection: vi.fn(),
      deselectHttpFlowId: vi.fn(),
    }
    const { result, rerender } = renderHook((actions) => useHttpFlowSelection(true, 'session-1', actions), {
      initialProps: previousActions,
    })
    const selection = result.current
    rerender(nextActions)
    expect(result.current).toBe(selection)
    act(() => {
      selection.onSetSelectedHttpFlowIds(['1'])
      selection.onHttpFlowRemove('1', false)
      selection.clearHttpFlowSelection()
    })
    expect(nextActions.syncSelectedHttpFlowIds.mock.calls).toEqual([[['1']], [[]]])
    expect(nextActions.deselectHttpFlowId).toHaveBeenCalledExactlyOnceWith('1')
    expect(nextActions.clearTableSelection).toHaveBeenCalledOnce()
    expect(previousActions.syncSelectedHttpFlowIds).not.toHaveBeenCalled()
    expect(previousActions.deselectHttpFlowId).not.toHaveBeenCalled()
    expect(previousActions.clearTableSelection).not.toHaveBeenCalled()
  })

  it('注册的表格支持单条删除和清空，清空后旧通知和 API 注册不能影响新表格', () => {
    const syncSelectedHttpFlowIds = vi.fn()
    const { result } = renderHook(() => useHttpFlowSelection(true, 'session-1', { syncSelectedHttpFlowIds }))
    const previous = result.current
    const previousApi = { reset: vi.fn(), deselectId: vi.fn() }
    act(() => previous.onRegisterTableSelectApi(previousApi))
    act(() => previous.onHttpFlowRemove('1', false))
    expect(previousApi.deselectId).toHaveBeenCalledExactlyOnceWith('1')

    act(() => {
      previous.clearHttpFlowSelection()
      previous.onSetSelectedHttpFlowIds(['late'])
    })
    expect(previousApi.reset).toHaveBeenCalledOnce()
    expect(syncSelectedHttpFlowIds).toHaveBeenCalledExactlyOnceWith([])

    const nextApi = { reset: vi.fn(), deselectId: vi.fn() }
    act(() => result.current.onRegisterTableSelectApi(nextApi))
    syncSelectedHttpFlowIds.mockClear()
    act(() => {
      previous.onRegisterTableSelectApi(undefined)
      previous.onRegisterTableSelectApi(previousApi)
      previous.onSetSelectedHttpFlowIds(['late'])
      previous.onHttpFlowRemove('1', false)
      previous.clearHttpFlowSelection()
    })
    expect(nextApi.reset).not.toHaveBeenCalled()
    expect(nextApi.deselectId).not.toHaveBeenCalled()
    expect(syncSelectedHttpFlowIds).not.toHaveBeenCalled()
    expect(previousApi.reset).toHaveBeenCalledOnce()
    expect(previousApi.deselectId).toHaveBeenCalledOnce()

    act(() => result.current.onHttpFlowRemove('2', false))
    expect(nextApi.deselectId).toHaveBeenCalledExactlyOnceWith('2')
    act(() => result.current.onRegisterTableSelectApi(undefined))
    act(() => result.current.onHttpFlowRemove('3', false))
    expect(nextApi.deselectId).toHaveBeenCalledOnce()
  })
})
