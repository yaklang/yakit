import { grpcPageForUI, int64ToSafeNumber } from '@/utils/int64'
import { ipc } from '@/services/ipc'
import type { APIFunc, APINoRequestFunc } from '@/apiUtils/type'
import { yakitNotify } from '@/utils/notification'
import type { DbOperateMessage } from '../layout/mainOperatorContent/utils'
import type { Paging } from '@/utils/yakQueryHTTPFlow'
export interface FingerprintGroup {
  GroupName: string
  Count: number
}
interface FingerprintGroups {
  Data: FingerprintGroup[]
}
/** @name 获取本地指纹组列表数据 */
export const grpcFetchLocalFingerprintGroupList: APINoRequestFunc<FingerprintGroups> = () => {
  return new Promise(async (resolve, reject) => {
    ipc
      .invoke('grpc', 'GetAllFingerprintGroup', {})
      .then((res) =>
        resolve({ ...res, Data: res.Data.map((row) => ({ ...row, Count: int64ToSafeNumber(row.Count) })) }),
      )
      .catch((e) => {
        yakitNotify('error', '查询本地指纹组失败：' + e)
        reject(e)
      })
  })
}

/** @name 创建本地指纹组 */
export const grpcCreateLocalFingerprintGroup: APIFunc<FingerprintGroup, DbOperateMessage> = (request) => {
  return new Promise(async (resolve, reject) => {
    ipc
      .invoke('grpc', 'CreateFingerprintGroup', request)
      .then(resolve)
      .catch((e) => {
        yakitNotify('error', '创建本地指纹组失败：' + e)
        reject(e)
      })
  })
}

interface RenameFingerprintGroupRequest {
  GroupName: string
  NewGroupName: string
}
/** @name 更新本地指纹组 */
export const grpcUpdateLocalFingerprintGroup: APIFunc<RenameFingerprintGroupRequest, DbOperateMessage> = (
  request,
  hiddenError,
) => {
  return new Promise(async (resolve, reject) => {
    ipc
      .invoke('grpc', 'RenameFingerprintGroup', request)
      .then(resolve)
      .catch((e) => {
        if (!hiddenError) yakitNotify('error', '更新本地指纹组失败:' + e)
        reject(e)
      })
  })
}

interface DeleteFingerprintGroupRequest {
  GroupNames: string[]
}
/** @name 删除本地指纹组 */
export const grpcDeleteLocalFingerprintGroup: APIFunc<DeleteFingerprintGroupRequest, DbOperateMessage> = (
  request,
  hiddenError,
) => {
  return new Promise(async (resolve, reject) => {
    ipc
      .invoke('grpc', 'DeleteFingerprintGroup', request)
      .then(resolve)
      .catch((e) => {
        if (!hiddenError) yakitNotify('error', '删除本地指纹组失败:' + e)
        reject(e)
      })
  })
}

export interface FingerprintFilter {
  Vendor?: string[]
  Product?: string[]
  IncludeId?: (string | number)[]
  GroupName?: string[]
  RuleName?: string[]
  Keyword?: string
}
export interface QueryFingerprintRequest {
  Filter: FingerprintFilter
  Pagination: Paging
}
interface CPE {
  Part: string
  Vendor: string
  Product: string
  Version: string
  Update: string
  Edition: string
  Language: string
}
export interface FingerprintRule {
  Id: string | number
  RuleName: string
  CPE: CPE
  WebPath: string
  ExtInfo: string
  MatchExpression: string
  GroupName: string[]
}
export interface QueryFingerprintResponse {
  Data: FingerprintRule[]
  Pagination: Paging
  Total: number
}
/** @name 获取本地指纹列表数据 */
export const grpcFetchLocalFingerprintList: APIFunc<QueryFingerprintRequest, QueryFingerprintResponse> = (request) => {
  return new Promise(async (resolve, reject) => {
    ipc
      .invoke('grpc', 'QueryFingerprint', request)
      .then(grpcPageForUI)
      .then((res) => ({
        ...res,
        Data: res.Data.map((row) => ({
          ...row,
          CPE: row.CPE ?? { Part: '', Vendor: '', Product: '', Version: '', Update: '', Edition: '', Language: '' },
        })),
      }))
      .then(resolve)
      .catch((e) => {
        yakitNotify('error', '查询本地指纹列表数据失败：' + e)
        reject(e)
      })
  })
}

interface DeleteFingerprintRequest {
  Filter: FingerprintFilter
  Pagination?: Paging
}
/** @name 删除本地指纹列表数据 */
export const grpcDeleteFingerprint: APIFunc<DeleteFingerprintRequest, DbOperateMessage> = (request) => {
  return new Promise(async (resolve, reject) => {
    ipc
      .invoke('grpc', 'DeleteFingerprint', request)
      .then(resolve)
      .catch((e) => {
        yakitNotify('error', '删除本地指纹列表数据失败：' + e)
        reject(e)
      })
  })
}

interface UpdateFingerprintRequest {
  Id: string | number
  Rule: FingerprintRule
}
/** @name 更新本地指纹 */
export const grpcUpdateFingerprint: APIFunc<UpdateFingerprintRequest, DbOperateMessage> = (request) => {
  return new Promise(async (resolve, reject) => {
    ipc
      .invoke('grpc', 'UpdateFingerprint', request)
      .then(resolve)
      .catch((e) => {
        yakitNotify('error', '更新本地指纹列表数据失败：' + e)
        reject(e)
      })
  })
}

interface CreateFingerprintRequest {
  Rule: {
    RuleName: string
    MatchExpression: string
    GroupName: string[]
  }
}
/** @name 创建本地指纹 */
export const grpcCreateFingerprint: APIFunc<CreateFingerprintRequest, DbOperateMessage> = (request) => {
  return new Promise(async (resolve, reject) => {
    ipc
      .invoke('grpc', 'CreateFingerprint', request)
      .then(resolve)
      .catch((e) => {
        yakitNotify('error', '创建本地指纹列表数据失败：' + e)
        reject(e)
      })
  })
}

interface GetFingerprintGroupSetRequest {
  Filter: FingerprintFilter
  Union?: boolean // 默认交集，如果设置为true，则返回联合
}
/** @name 查询指纹集合的所属组交集 */
export const grpcFetchFingerprintForSameGroup: APIFunc<GetFingerprintGroupSetRequest, FingerprintGroups> = (
  request,
) => {
  return new Promise(async (resolve, reject) => {
    ipc
      .invoke('grpc', 'GetFingerprintGroupSetByFilter', request)
      .then((res) =>
        resolve({ ...res, Data: res.Data.map((row) => ({ ...row, Count: int64ToSafeNumber(row.Count) })) }),
      )
      .catch((e) => {
        yakitNotify('error', '查询指纹所属于组交集失败：' + e)
        reject(e)
      })
  })
}

export interface BatchUpdateFingerprintToGroupRequest {
  Filter: FingerprintFilter
  AppendGroupName: string[]
  DeleteGroupName: string[]
}
/** @name 更新指纹里的本地组 */
export const grpcUpdateFingerprintToGroup: APIFunc<BatchUpdateFingerprintToGroupRequest, DbOperateMessage> = (
  request,
) => {
  return new Promise(async (resolve, reject) => {
    ipc
      .invoke('grpc', 'BatchUpdateFingerprintToGroup', request)
      .then(resolve)
      .catch((e) => {
        yakitNotify('error', '更新组失败：' + e)
        reject(e)
      })
  })
}

/** @name 下载默认指纹压缩包 */
export const httpDownloadFingerprint: APIFunc<string, string> = (savePath) => {
  return new Promise(async (resolve, reject) => {
    ipc
      .invoke('local', 'DownloadFingerprint', savePath)
      .then(resolve)
      .catch((e) => {
        reject(e)
      })
  })
}
