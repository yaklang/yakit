import { newSSARisksForUI } from '@/pages/risks/grpcAdapters'
import { ssaRisksForUI } from '@/pages/risks/grpcAdapters'
import { int64ToSafeNumber } from '@/utils/int64'
import { ipc } from '@/services/ipc'
import { yakitNotify } from '@/utils/notification'
import type {
  DeleteSSARisksRequest,
  QueryNewSSARisksRequest,
  QueryNewSSARisksResponse,
  QuerySSARisksRequest,
  QuerySSARisksResponse,
  SSARisksFilter,
} from './YakitAuditHoleTableType'
import type { FieldGroup } from '@/pages/risks/YakitRiskTable/utils'
import type { FieldName } from '@/pages/risks/RiskTable'
import type { DbOperateMessage } from '@/pages/layout/mainOperatorContent/utils'
import { JSONParseLog, type JSONParseLogOption } from '@/utils/tool'
import emiter from '@/utils/eventBus/eventBus'
import { YakitRoute } from '@/enums/yakitRoute'
import type { YakParamProps } from '@/pages/plugins/pluginsType'
import type { GetAIForgeRequest } from '@/pages/ai-agent/type/forge'
import i18n from '@/i18n/i18n'
const tOriginal = i18n.getFixedT(null, ['yakitUi', 'yakRunnerAuditHole'])

/** QuerySSARisks */
export const apiQuerySSARisks: (query?: QuerySSARisksRequest) => Promise<QuerySSARisksResponse> = (query) => {
  return new Promise((resolve, reject) => {
    ipc
      .invoke('grpc', 'QuerySSARisks', query ?? {})
      .then(ssaRisksForUI)
      .then(resolve)
      .catch((e) => {
        yakitNotify('error', tOriginal('YakitNotification.queryFailed', { error: e + '' }))
        reject(e)
      })
  })
}

/** DeleteSSARisks */
export const apiDeleteSSARisks: (query?: DeleteSSARisksRequest) => Promise<null> = (query) => {
  return new Promise((resolve, reject) => {
    ipc
      .invoke('grpc', 'DeleteSSARisks', query ?? {})
      .then(() => resolve(null))
      .catch((e) => {
        yakitNotify('error', tOriginal('YakitNotification.deleteFailed', { error: e + '' }))
        reject(e)
      })
  })
}

export interface CreateSSARiskDisposalsRequest {
  RiskIds: (string | number)[]
  Status: string
  Comment: string
}
/** CreateSSARiskDisposals */
export const apiCreateSSARiskDisposals: (params: CreateSSARiskDisposalsRequest) => Promise<null> = (params) => {
  return new Promise((resolve, reject) => {
    ipc
      .invoke('grpc', 'CreateSSARiskDisposals', params ?? {})
      .then(() => resolve(null))
      .catch((e) => {
        yakitNotify('error', tOriginal('YakitNotification.settingFailed', { error: e + '' }))
        reject(e)
      })
  })
}

export interface SSARiskDisposalData {
  Id: string | number
  Status: string
  Comment: string
  CreatedAt: number
  UpdatedAt: number
  RiskId: string | number
  TaskName: string
}

export interface GetSSARiskDisposalResponse {
  Data: SSARiskDisposalData[]
}

export const apiGetSSARiskDisposal: (params: {
  RiskId?: string | number
  RiskHash?: string
}) => Promise<GetSSARiskDisposalResponse> = (params) => {
  return new Promise((resolve, reject) => {
    ipc
      .invoke('grpc', 'GetSSARiskDisposal', params ?? {})
      .then((res) =>
        resolve({
          ...res,
          Data: res.Data.map((row) => ({
            ...row,
            CreatedAt: int64ToSafeNumber(row.CreatedAt),
            UpdatedAt: int64ToSafeNumber(row.UpdatedAt),
          })),
        }),
      )
      .catch((e) => {
        yakitNotify('error', tOriginal('YakitNotification.getFailed', { error: e + '' }))
        reject(e)
      })
  })
}

export interface SSARiskDisposalsFilter {
  ID?: (string | number)[]
  Status?: string[]
  RiskId?: (string | number)[]
  Search?: string
}

export interface DeleteSSARiskDisposalsRequest {
  Filter: SSARiskDisposalsFilter
}

export interface DeleteSSARiskDisposalsResponse {
  Message: import('@/services/ipc').GrpcOutput<'DeleteSSARiskDisposals'>['Message']
}

export const apiDeleteSSARiskDisposals: (
  params: DeleteSSARiskDisposalsRequest,
) => Promise<DeleteSSARiskDisposalsResponse> = (params) => {
  return new Promise((resolve, reject) => {
    ipc
      .invoke('grpc', 'DeleteSSARiskDisposals', params ?? {})
      .then(resolve)
      .catch((e) => {
        yakitNotify('error', tOriginal('YakitNotification.deleteFailed', { error: e + '' }))
        reject(e)
      })
  })
}

export interface GetSSARiskFieldGroupRequest {
  Filter: SSARisksFilter
}

export interface GetSSARiskFieldGroupExResponse {
  FileField: FieldGroup[]
  SeverityField: FieldName[]
  RiskTypeField: FieldName[]
}
/** GetSSARiskFieldGroupEx */
export const apiGetSSARiskFieldGroupEx: (
  params?: GetSSARiskFieldGroupRequest,
) => Promise<GetSSARiskFieldGroupExResponse> = (params = { Filter: {} }) => {
  return new Promise((resolve, reject) => {
    ipc
      .invoke('grpc', 'GetSSARiskFieldGroupEx', params ?? {})
      .then(resolve)
      .catch((e) => {
        yakitNotify('error', tOriginal('YakitNotification.queryFailed', { error: e + '' }))
        reject(e)
      })
  })
}

export const apiNewRiskRead: (query?: SSARisksFilter) => Promise<null> = (query) => {
  return new Promise((resolve, reject) => {
    ipc
      .invoke('grpc', 'NewSSARiskRead', { Filter: query })
      .then(() => resolve(null))
      .catch((e) => {
        yakitNotify('error', tOriginal('YakitNotification.readFailed', { error: e + '' }))
        reject(e)
      })
  })
}

export interface GroupTableColumnRequest {
  DatabaseName: 'Project' | 'Profile' | 'SSA'
  TableName: string
  ColumnName: string
}

export interface GroupTableColumnResponse {
  Data: string[]
}

export const apiGroupTableColumn: (query: GroupTableColumnRequest) => Promise<GroupTableColumnResponse> = (query) => {
  return new Promise((resolve, reject) => {
    ipc
      .invoke('grpc', 'GroupTableColumn', query ?? {})
      .then(resolve)
      .catch((e) => {
        yakitNotify('error', tOriginal('YakitNotification.readFailed', { error: e + '' }))
        reject(e)
      })
  })
}

export interface SSARiskFeedbackToOnlineRequest {
  Token: string
  Filter: SSARisksFilter
}
/** SSARiskFeedbackToOnline */
export const apiSSARiskFeedbackToOnline: (params: SSARiskFeedbackToOnlineRequest) => Promise<unknown> = (params) => {
  return new Promise((resolve, reject) => {
    ipc
      .invoke('grpc', 'SSARiskFeedbackToOnline', params ?? {})
      .then(resolve)
      .catch((e) => {
        yakitNotify('error', tOriginal('YakitNotification.feedbackFailed', { error: e + '' }))
        reject(e)
      })
  })
}

/** QueryNewSSARisks */
export const apiQueryNewSSARisks: (query?: QueryNewSSARisksRequest) => Promise<QueryNewSSARisksResponse> = (query) => {
  return new Promise((resolve, reject) => {
    ipc
      .invoke('grpc', 'QueryNewSSARisks', query ?? {})
      .then(newSSARisksForUI)
      .then(resolve)
      .catch((e) => {
        yakitNotify('error', tOriginal('YakitNotification.queryFailed', { error: e + '' }))
        reject(e)
      })
  })
}

export const openAIForge = (params: {
  query: GetAIForgeRequest
  handleParamsUIConfig: (v: YakParamProps) => YakParamProps
  jsonParseLogParams: JSONParseLogOption
}) => {
  const { query, handleParamsUIConfig, jsonParseLogParams } = params
  Promise.all([
    import('@/pages/ai-agent/grpc').then(({ grpcGetAIForge }) => grpcGetAIForge(query, true)),
    import('@/pages/ai-agent/defaultConstant').then(({ ReActChatEventEnum }) => ReActChatEventEnum),
  ])
    .then(([res, ReActChatEventEnum]) => {
      if (!res) {
        yakitNotify('warning', tOriginal('YakitAuditHoleTable.noForgeNameMatchesFound'))
        return
      }
      if (!res.ParamsUIConfig) {
        yakitNotify('warning', tOriginal('YakitAuditHoleTable.noParamsUIConfigConfigFound'))
        return
      }
      let paramsUIConfig: YakParamProps = JSONParseLog(res.ParamsUIConfig, jsonParseLogParams)
      paramsUIConfig = handleParamsUIConfig(paramsUIConfig)
      const newRes = { ...res, ParamsUIConfig: JSON.stringify(paramsUIConfig) }
      emiter.emit('menuOpenPage', JSON.stringify({ route: YakitRoute.AI_Agent }))
      setTimeout(() => {
        emiter.emit(
          'onReActChatEvent',
          JSON.stringify({
            type: ReActChatEventEnum.OPEN_FORGE_FORM,
            params: { value: newRes },
            useForge: true,
          }),
        )
      }, 100)
    })
    .catch((e) => {
      yakitNotify('error', tOriginal('YakitAuditHoleTable.forgeNameMatchingError') + `${e}`)
    })
}
