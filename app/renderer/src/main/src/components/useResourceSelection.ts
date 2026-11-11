import { useLayoutEffect, useMemo, useRef, useState } from 'react'
import { useLatest, useMemoizedFn } from 'ahooks'

export interface ResourceSelectionApi {
  reset: () => void
  deselectId: (id: string) => void
}

interface ResourceSelectionActions {
  syncSelectedIds: (ids: string[]) => void
  clearTableSelection?: () => void
  deselectId?: (id: string) => void
}

const EMPTY_SELECTION: string[] = []

/**
 * 批量添加或移除 AI 已选资源 ID
 * @param selectedIds - 当前已选的资源 ID
 * @param changedIds - 本次勾选或取消勾选的资源 ID
 * @param checked - 为 true 时添加，为 false 时移除
 * @returns 更新后的 ID 数组，选中项无变化时复用原数组
 */
export const updateSelectedResourceIds = (selectedIds: string[], changedIds: string[], checked: boolean) => {
  const ids = new Set(selectedIds)
  for (const id of changedIds) {
    if (checked) ids.add(id)
    else ids.delete(id)
  }
  return ids.size === selectedIds.length ? selectedIds : [...ids]
}

export const useResourceSelection = (
  inViewPort: boolean,
  selectionKey: string | undefined,
  actions?: ResourceSelectionActions,
) => {
  const [revision, setRevision] = useState(0)
  // 仅会话切换或主动清空会更换作用域，页面显隐不影响表格勾选。
  const scope = useMemo(() => ({ selectionKey, revision }), [selectionKey, revision])
  const currentScopeRef = useRef<typeof scope | undefined>(scope)
  currentScopeRef.current = scope
  const [selection, setSelection] = useState<{ scope: typeof scope; ids: string[] }>()
  const latestRef = useLatest({ inViewPort, actions })
  const tableSelectionRef = useRef<{ scope: typeof scope; api: ResourceSelectionApi }>()

  const resetSelection = useMemoizedFn(() => {
    const { actions } = latestRef.current
    if (actions?.clearTableSelection) actions.clearTableSelection()
    else tableSelectionRef.current?.api.reset()
    if (actions) actions.syncSelectedIds([])
    else setSelection(undefined)
  })
  const previousSelectionKey = useRef(selectionKey)
  useLayoutEffect(() => {
    if (previousSelectionKey.current !== selectionKey) {
      previousSelectionKey.current = selectionKey
      resetSelection()
    }
  }, [selectionKey, resetSelection])

  // 回调捕获创建时的作用域，但执行时读取最新的操作方法和可见性。
  const callbacks = useMemo(() => {
    const clearSelection = () => {
      if (currentScopeRef.current !== scope) return
      // 先拦截旧通知，再清空数据；没有 SessionID 时也能开始新一轮选择。
      currentScopeRef.current = undefined
      resetSelection()
      setRevision((value) => value + 1)
    }

    return {
      selectionScope: scope,
      clearSelection,
      onRegisterTableSelectApi: (api?: ResourceSelectionApi) => {
        if (currentScopeRef.current !== scope) return
        tableSelectionRef.current = api ? { scope, api } : undefined
      },
      onChangeSelectedIds: (ids: string[], checked?: boolean) => {
        const { inViewPort, actions } = latestRef.current
        if (!inViewPort || currentScopeRef.current !== scope) return
        if (actions) actions.syncSelectedIds(ids)
        else {
          setSelection((current) => {
            const previous = current?.scope === scope ? current.ids : EMPTY_SELECTION
            const next = checked === undefined ? [...new Set(ids)] : updateSelectedResourceIds(previous, ids, checked)
            return next === previous ? current : { scope, ids: next }
          })
        }
      },
      onRemove: (id: string, isSummary: boolean, deselectFromTable = false) => {
        const { inViewPort, actions } = latestRef.current
        if (!inViewPort || currentScopeRef.current !== scope) return
        if (isSummary) {
          clearSelection()
          return
        }
        if (!actions) {
          setSelection((current) =>
            current?.scope === scope ? { scope, ids: updateSelectedResourceIds(current.ids, [id], false) } : current,
          )
        }
        // 侧栏表格还维护自身的勾选状态，需要同步取消对应行。
        if (actions?.deselectId) actions.deselectId(id)
        else if ((actions || deselectFromTable) && tableSelectionRef.current?.scope === scope) {
          tableSelectionRef.current.api.deselectId(id)
        }
      },
    }
  }, [scope, resetSelection, latestRef])

  const selectedIds = actions ? undefined : selection?.scope === scope ? selection.ids : EMPTY_SELECTION
  return useMemo(() => ({ ...callbacks, selectedIds }), [callbacks, selectedIds])
}
