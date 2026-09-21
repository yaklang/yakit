import { useLayoutEffect, useMemo, useRef, useState } from 'react'
import { useLatest, useMemoizedFn } from 'ahooks'

/** 会话 ID；新建会话允许没有 ID。 */
export type HttpFlowSelectionKey = string | undefined

export interface HttpFlowSelectionApi {
  reset: () => void
  deselectId: (id: string) => void
}

interface HttpFlowSelectionActions {
  /** 将勾选的流量 ID 同步到当前会话输入框，传入空数组时清空流量引用。 */
  syncSelectedHttpFlowIds: (ids: string[]) => void
  /** 清空表格勾选；未提供时调用当前作用域已注册的表格 API 的 reset 方法。 */
  clearTableSelection?: () => void
  /** 取消指定流量 ID 的勾选；未提供时调用当前作用域已注册的表格 API 的 deselectId 方法。 */
  deselectHttpFlowId?: (id: string) => void
}

/** 同步表格勾选与当前会话输入框，selectionKey 使用会话 ID。
 * @param inViewPort  页面不可见时，是否允许表格选择操作同步到聊天输入框。
 */
export function useHttpFlowSelection(
  inViewPort: boolean,
  selectionKey: HttpFlowSelectionKey,
  actions: HttpFlowSelectionActions,
) {
  const [revision, setRevision] = useState(0)
  // 仅会话切换或主动清空会更换作用域，页面显隐不影响表格勾选。
  const scope = useMemo(() => ({ selectionKey, revision }), [selectionKey, revision])
  const currentScopeRef = useRef<typeof scope | undefined>(scope)
  currentScopeRef.current = scope
  const latestRef = useLatest({ inViewPort, actions })
  const tableSelectionRef = useRef<{ scope: typeof scope; api: HttpFlowSelectionApi }>()

  const resetSelection = useMemoizedFn(() => {
    const { actions } = latestRef.current
    if (actions.clearTableSelection) actions.clearTableSelection()
    else if (tableSelectionRef.current?.scope === scope) tableSelectionRef.current.api.reset()
    actions.syncSelectedHttpFlowIds([])
  })
  const previousSelectionKey = useRef(selectionKey)
  useLayoutEffect(() => {
    if (previousSelectionKey.current !== selectionKey) {
      previousSelectionKey.current = selectionKey
      resetSelection()
    }
  }, [selectionKey, resetSelection])

  // 回调捕获创建时的作用域，但执行时读取最新的操作方法和可见性。
  return useMemo(() => {
    const clearHttpFlowSelection = () => {
      if (currentScopeRef.current !== scope) return
      // 先拦截旧通知，再清空数据；没有 SessionID 时也能开始新一轮选择。
      currentScopeRef.current = undefined
      resetSelection()
      setRevision((value) => value + 1)
    }

    return {
      selectionScope: scope,
      clearHttpFlowSelection,
      onRegisterTableSelectApi: (api?: HttpFlowSelectionApi) => {
        if (currentScopeRef.current !== scope) return
        tableSelectionRef.current = api ? { scope, api } : undefined
      },
      onSetSelectedHttpFlowIds: (ids: string[]) => {
        const { inViewPort, actions } = latestRef.current
        if (!inViewPort || currentScopeRef.current !== scope) return
        actions.syncSelectedHttpFlowIds(ids)
      },
      onHttpFlowRemove: (id: string, isSummary: boolean) => {
        const { inViewPort, actions } = latestRef.current
        if (!inViewPort || currentScopeRef.current !== scope) return
        if (isSummary) {
          clearHttpFlowSelection()
          return
        }
        if (actions.deselectHttpFlowId) actions.deselectHttpFlowId(id)
        else if (tableSelectionRef.current?.scope === scope) tableSelectionRef.current.api.deselectId(id)
      },
    }
  }, [scope, resetSelection, latestRef])
}
