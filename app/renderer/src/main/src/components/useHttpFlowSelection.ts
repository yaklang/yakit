import { useMemo } from 'react'
import { useResourceSelection } from './useResourceSelection'
import type { ResourceSelectionApi } from './useResourceSelection'

/** 会话 ID；新建会话允许没有 ID。 */
export type HttpFlowSelectionKey = string | undefined

export type HttpFlowSelectionApi = ResourceSelectionApi

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
 * @param actions  传入时通过外部桥接同步勾选，省略时由 Hook 保存并返回选中的流量 ID。
 */
export const useHttpFlowSelection = (
  inViewPort: boolean,
  selectionKey: HttpFlowSelectionKey,
  actions?: HttpFlowSelectionActions,
) => {
  const selection = useResourceSelection(
    inViewPort,
    selectionKey,
    actions && {
      syncSelectedIds: actions.syncSelectedHttpFlowIds,
      clearTableSelection: actions.clearTableSelection,
      deselectId: actions.deselectHttpFlowId,
    },
  )
  return useMemo(
    () => ({
      selectionScope: selection.selectionScope,
      clearHttpFlowSelection: selection.clearSelection,
      onRegisterTableSelectApi: selection.onRegisterTableSelectApi,
      onSetSelectedHttpFlowIds: selection.onChangeSelectedIds,
      onHttpFlowRemove: selection.onRemove,
      selectedHttpFlowIds: selection.selectedIds,
    }),
    [selection],
  )
}
