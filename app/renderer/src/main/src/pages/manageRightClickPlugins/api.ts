import i18n from '@/i18n/i18n'
import type { APIFunc, APIOptionalFunc } from '@/apiUtils/type'
import { yakitNotify } from '@/utils/notification'
import type {
  ContextMenuAction,
  ExecuteContextMenuActionRequest,
  QueryContextMenuActionsRequest,
  QueryContextMenuActionsResponse,
  SetContextMenuActionBindingRequest,
} from './types'
import { ContextMenuExecutionType } from './types'
import { cloneDeep } from 'lodash'
const tOriginal = i18n.getFixedT(null, 'manageRightClickPlugins')

const { ipcRenderer } = window.require('electron')

/** @name 查询右键插件 */
export const grpcQueryContextMenuActions: APIOptionalFunc<
  QueryContextMenuActionsRequest,
  QueryContextMenuActionsResponse
> = (request, hiddenError) => {
  return new Promise(async (resolve, reject) => {
    ipcRenderer
      .invoke('QueryContextMenuActions', request || {})
      .then((res: QueryContextMenuActionsResponse) => {
        // 数据包变形类（legacy-codec-mutate）插件走原 codec 链路展示与执行，不进右键插件列表
        const Actions = (res.Actions || []).filter(
          (action) => action.ExecutionType !== ContextMenuExecutionType.LegacyPacketMutate,
        )
        const d = cloneDeep(Actions)
        resolve({ ...res, Actions: d })
      })
      .catch((e) => {
        if (!hiddenError) yakitNotify('error', tOriginal('grpc.queryContextMenuActionsFailed', { error: String(e) }))
        reject(e)
      })
  })
}

/** @name 保存右键插件配置 */
export const grpcSetContextMenuActionBinding: APIFunc<SetContextMenuActionBindingRequest, ContextMenuAction> = (
  request,
  hiddenError,
) => {
  return new Promise(async (resolve, reject) => {
    ipcRenderer
      .invoke('SetContextMenuActionBinding', request)
      .then(resolve)
      .catch((e) => {
        if (!hiddenError)
          yakitNotify('error', tOriginal('grpc.setContextMenuActionBindingFailed', { error: String(e) }))
        reject(e)
      })
  })
}

/** @name 执行右键插件（流式） */
export const executeContextMenuAction = async (request: ExecuteContextMenuActionRequest, token: string) => {
  return ipcRenderer.invoke('ExecuteContextMenuAction', request, token)
}

/** @name 取消右键插件执行 */
export const cancelContextMenuAction = async (token: string) => {
  return ipcRenderer.invoke('cancel-ExecuteContextMenuAction', token).catch((error) => {
    yakitNotify('error', tOriginal('grpc.cancelContextMenuActionFailed', { error: String(error) }))
  })
}
