import { yakScriptForUI } from '@/pages/invoker/grpcAdapters'
import { int64ToSafeNumber } from '@/utils/int64'
import type { GrpcOutput } from '@/services/ipc'
import { ipc } from '@/services/ipc'
import i18n from '@/i18n/i18n'
import type { APIFunc, APIOptionalFunc } from '@/apiUtils/type'
import { yakitNotify } from '@/utils/notification'
import type { YakScript } from '@/pages/invoker/schema'
import type {
  ContextMenuAction,
  ExecuteContextMenuActionRequest,
  QueryContextMenuActionsRequest,
  QueryContextMenuActionsResponse,
  SetContextMenuActionBindingRequest,
} from './types'
import { ContextMenuExecutionType, ContextMenuResultMode, ContextMenuScene } from './types'
import { cloneDeep } from 'lodash'
const tOriginal = i18n.getFixedT(null, 'manageRightClickPlugins')

/** @name 查询右键插件 */
export const grpcQueryContextMenuActions: APIOptionalFunc<
  QueryContextMenuActionsRequest,
  QueryContextMenuActionsResponse
> = (request, hiddenError) => {
  return new Promise(async (resolve, reject) => {
    ipc
      .invoke('grpc', 'QueryContextMenuActions', request || {})
      .then((res) => {
        // 数据包变形类（legacy-codec-mutate）插件走原 codec 链路展示与执行，不进右键插件列表
        const Actions = (res.Actions || []).filter(
          (action) => action.ExecutionType !== ContextMenuExecutionType.LegacyPacketMutate,
        )
        const d = Actions.map(contextMenuActionForUI)
        resolve({
          ...res,
          Actions: d,
          EnabledCustomPluginCount: int64ToSafeNumber(res.EnabledCustomPluginCount),
          MaxCustomPluginCount: int64ToSafeNumber(res.MaxCustomPluginCount),
        })
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
    ipc
      .invoke('grpc', 'SetContextMenuActionBinding', request)
      .then(contextMenuActionForUI)
      .then(resolve)
      .catch((e) => {
        if (!hiddenError)
          yakitNotify('error', tOriginal('grpc.setContextMenuActionBindingFailed', { error: String(e) }))
        reject(e)
      })
  })
}

interface FetchLocalPluginDetailByUUIDRequest {
  UUID: string
}
/** @name 通过 UUID 查询本地插件详情 */
export const grpcFetchLocalPluginDetailByUUID: APIFunc<FetchLocalPluginDetailByUUIDRequest, YakScript> = (
  request,
  hiddenError,
) => {
  return new Promise(async (resolve, reject) => {
    if (!request?.UUID) {
      if (!hiddenError) yakitNotify('error', tOriginal('grpc.fetchPluginDetailFailedNoUUID'))
      reject(tOriginal('grpc.fetchPluginDetailFailedNoUUID'))
      return
    }
    ipc
      .invoke('grpc', 'GetYakScriptByOnlineID', { UUID: request.UUID })
      .then(yakScriptForUI)
      .then(resolve)
      .catch((e) => {
        if (!hiddenError) yakitNotify('error', tOriginal('grpc.fetchPluginDetailFailed', { error: String(e) }))
        reject(e)
      })
  })
}

function contextMenuActionForUI(value: GrpcOutput<'SetContextMenuActionBinding'>): ContextMenuAction {
  const ResultMode = Object.values(ContextMenuResultMode).find((mode) => mode === (value.ResultMode || 'auto'))
  const Scene = Object.values(ContextMenuScene).find((scene) => scene === value.Scene)
  const ExecutionType = Object.values(ContextMenuExecutionType).find(
    (type) => type === (value.ExecutionType || 'context-menu'),
  )
  if (!ResultMode || !Scene || !ExecutionType) throw new Error(`Unsupported context menu action: ${value.ActionID}`)
  return { ...value, Sort: int64ToSafeNumber(value.Sort), ResultMode, Scene, ExecutionType }
}
