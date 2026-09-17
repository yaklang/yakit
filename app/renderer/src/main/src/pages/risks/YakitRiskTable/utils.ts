import { risksForUI } from '@/pages/risks/grpcAdapters'
import { ipc } from '@/services/ipc'
import { yakitNotify } from '@/utils/notification'
import type { QueryRisksRequest, QueryRisksResponse } from './YakitRiskTableType'
import type { Risk } from '../schema'
import type { FieldName, Fields } from '../RiskTable'
import { defQueryRisksRequest } from './constants'
import i18n from '@/i18n/i18n'
const tOriginal = i18n.getFixedT(null, ['yakitUi', 'risk'])

/** QueryRisks */
export const apiQueryRisks: (query?: QueryRisksRequest) => Promise<QueryRisksResponse> = (query) => {
  return new Promise((resolve, reject) => {
    ipc
      .invoke('grpc', 'QueryRisks', query ?? {})
      .then(risksForUI)
      .then(resolve)
      .catch((e) => {
        yakitNotify('error', tOriginal('YakitNotification.queryFailed', { error: e + '' }))
        reject(e)
      })
  })
}
/** 获取漏洞与风险的总数 通过RuntimeId */
export const apiQueryRisksTotalByRuntimeId: (RuntimeId: string) => Promise<QueryRisksResponse> = (RuntimeId) => {
  return new Promise((resolve, reject) => {
    const params: QueryRisksRequest = {
      ...defQueryRisksRequest,
      Pagination: {
        ...defQueryRisksRequest.Pagination,
        Page: 1,
        Limit: 1,
      },
      RuntimeId,
    }
    ipc
      .invoke('grpc', 'QueryRisks', params ?? {})
      .then(risksForUI)
      .then(resolve)
      .catch((e) => {
        yakitNotify('error', tOriginal('YakitRiskTable.queryRisksTotalFailed') + `${e}`)
        reject(e)
      })
  })
}
/** 获取漏洞与风险的总数 通过RuntimeIds */
export const apiQueryRisksTotalByRuntimeIds: (RuntimeIds: string[]) => Promise<QueryRisksResponse> = (RuntimeIds) => {
  return new Promise((resolve, reject) => {
    const params: QueryRisksRequest = {
      ...defQueryRisksRequest,
      Pagination: {
        ...defQueryRisksRequest.Pagination,
        Page: 1,
        Limit: 1,
      },
      RuntimeIds,
    }
    ipc
      .invoke('grpc', 'QueryRisks', params ?? {})
      .then(risksForUI)
      .then(resolve)
      .catch((e) => {
        yakitNotify('error', tOriginal('YakitRiskTable.queryRisksTotalFailed') + `${e}`)
        reject(e)
      })
  })
}
/**
 * @description QueryRisks 获取降序的增量数据
 */
export const apiQueryRisksIncrementOrderDesc: (params: QueryRisksRequest) => Promise<QueryRisksResponse> = (params) => {
  const newParams: QueryRisksRequest = { ...params, UntilId: 0 }
  return apiQueryRisks(newParams)
}
export interface NewRiskReadRequest {
  /**@deprecated */
  AfterId?: string
  /**传空数组代表全部已读 */
  Ids?: (string | number)[]
  Filter?: QueryRisksRequest
}
export const apiNewRiskRead: (query?: NewRiskReadRequest) => Promise<null> = (query) => {
  return new Promise((resolve, reject) => {
    ipc
      .invoke('grpc', 'NewRiskRead', query ?? {})
      .then(() => resolve(null))
      .catch((e) => {
        yakitNotify('error', tOriginal('YakitNotification.readFailed', { error: e + '' }))
        reject(e)
      })
  })
}

export interface DeleteRiskRequest {
  Id?: string | number
  Hash?: string
  Filter?: QueryRisksRequest
  Ids?: (string | number)[]
  DeleteAll?: boolean
  DeleteRepetition?: boolean
}
/** DeleteRisk */
export const apiDeleteRisk: (query?: DeleteRiskRequest) => Promise<null> = (query) => {
  return new Promise((resolve, reject) => {
    ipc
      .invoke('grpc', 'DeleteRisk', query ?? {})
      .then(() => resolve(null))
      .catch((e) => {
        yakitNotify('error', tOriginal('YakitNotification.deleteFailed', { error: e + '' }))
        reject(e)
      })
  })
}
export interface ExportHtmlProps {
  htmlContent: string
  fileName: string
  data: Risk[]
}
/** export-risk-html */
export const apiExportHtml: (params: ExportHtmlProps) => Promise<string> = (params) => {
  return new Promise((resolve, reject) => {
    ipc
      .invoke('local', 'export-risk-html', params)
      .then(resolve)
      .catch((e) => {
        yakitNotify('error', tOriginal('YakitNotification.exportFailed', { error: e + '' }))
        reject(e)
      })
  })
}

export interface QueryRiskTagsResponse {
  RiskTags: FieldGroup[]
}
export interface FieldGroup {
  Name: string
  Total: number
}
/** QueryRiskTags */
export const apiQueryRiskTags: () => Promise<QueryRiskTagsResponse> = () => {
  return new Promise((resolve, reject) => {
    ipc
      .invoke('grpc', 'QueryRiskTags', {})
      .then(resolve)
      .catch((e) => {
        yakitNotify('error', tOriginal('YakitRiskTable.queryRiskTagsFailed') + `${e}`)
        reject(e)
      })
  })
}

/** QueryAvailableRiskType */
export const apiQueryAvailableRiskType: () => Promise<FieldName[]> = () => {
  return new Promise((resolve, reject) => {
    ipc
      .invoke('grpc', 'QueryAvailableRiskType', {})
      .then((res) => {
        const { Values = [] } = res
        if (Values.length > 0) {
          const data = Values.sort((a, b) => b.Total - a.Total)
          resolve(data)
        } else {
          resolve([])
        }
      })
      .catch((e) => {
        yakitNotify('error', tOriginal('YakitRiskTable.queryAvailableRiskTypeFailed') + `${e}`)
        reject(e)
      })
  })
}

export interface SetTagForRiskRequest {
  Id: string | number
  Hash: string
  Tags: string[]
}
/** SetTagForRisk */
export const apiSetTagForRisk: (params: SetTagForRiskRequest) => Promise<void> = (params) => {
  return new Promise((resolve, reject) => {
    ipc
      .invoke('grpc', 'SetTagForRisk', params ?? {})
      .then(() => resolve(undefined))
      .catch((e) => {
        yakitNotify('error', tOriginal('YakitNotification.settingFailed', { error: e + '' }))
        reject(e)
      })
  })
}

export interface RiskFieldGroupResponse {
  RiskIPGroup: FieldGroup[]
  RiskLevelGroup: FieldName[]
  RiskTypeGroup: FieldName[]
}
/** RiskFieldGroup */
export const apiRiskFieldGroup: () => Promise<RiskFieldGroupResponse> = () => {
  return new Promise((resolve, reject) => {
    ipc
      .invoke('grpc', 'RiskFieldGroup', {})
      .then(resolve)
      .catch((e) => {
        yakitNotify('error', tOriginal('YakitNotification.queryFailed', { error: e + '' }))
        reject(e)
      })
  })
}

export interface UploadRiskToOnlineRequest {
  Token: string
  ProjectName?: string
  Hash: string[]
}
/** RiskFeedbackToOnline */
export const apiRiskFeedbackToOnline: (params: UploadRiskToOnlineRequest) => Promise<unknown> = (params) => {
  return new Promise((resolve, reject) => {
    ipc
      .invoke('grpc', 'RiskFeedbackToOnline', params ?? {})
      .then(resolve)
      .catch((e) => {
        yakitNotify('error', tOriginal('YakitNotification.feedbackFailed', { error: e + '' }))
        reject(e)
      })
  })
}
