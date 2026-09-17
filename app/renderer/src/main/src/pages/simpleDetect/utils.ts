import { grpcPageForUI, grpcPagingToUI, int64ToSafeNumber } from '@/utils/int64'
import { ipc } from '@/services/ipc'
import { yakitNotify } from '@/utils/notification'
import type { Paging } from '@/utils/yakQueryHTTPFlow'
import type { RecordPortScanRequest } from '../securityTool/newPortScan/utils'

export interface UnfinishedTask {
  Percent: number
  CreatedAt: number
  RuntimeId: string
  YakScriptOnlineGroup: string
  TaskName: string
  LastRecordPtr: number
  Target: string
}
export interface QueryUnfinishedTaskResponse {
  Tasks: UnfinishedTask[]
  Pagination: Paging
  Total: number
}

export interface UnfinishedTaskFilter {
  RuntimeId?: string[]
  ProgressSource?: string[]
  TaskName?: string
  Target?: string
}
export interface QueryUnfinishedTaskRequest {
  Pagination: Paging
  Filter: UnfinishedTaskFilter
}

/** QuerySimpleDetectUnfinishedTask 简易版安全检测 获取未完成任务  */
export const apiQuerySimpleDetectUnfinishedTask: (
  params: QueryUnfinishedTaskRequest,
) => Promise<QueryUnfinishedTaskResponse> = (params) => {
  return new Promise((resolve, reject) => {
    ipc
      .invoke('grpc', 'QuerySimpleDetectUnfinishedTask', params)
      .then((res) =>
        grpcPageForUI({
          ...res,
          Tasks: res.Tasks.map((row) => ({
            ...row,
            CreatedAt: int64ToSafeNumber(row.CreatedAt),
            LastRecordPtr: int64ToSafeNumber(row.LastRecordPtr),
          })),
        }),
      )
      .then(resolve)
      .catch((e) => {
        yakitNotify('error', `获取未完成任务失败：${e}`)
        reject(e)
      })
  })
}

export interface DeleteUnfinishedTaskRequest {
  Filter: UnfinishedTaskFilter
}
/** DeleteSimpleDetectUnfinishedTask 简易版安全检测 删除任务  */
export const apiDeleteSimpleDetectUnfinishedTask: (params: DeleteUnfinishedTaskRequest) => Promise<null> = (params) => {
  return new Promise((resolve, reject) => {
    ipc
      .invoke('grpc', 'DeleteSimpleDetectUnfinishedTask', { ...params })
      .then(() => resolve(null))
      .catch((e) => {
        yakitNotify('error', `删除未完成任务失败：${e}`)
        reject(e)
      })
  })
}

export interface GetUnfinishedTaskDetailByIdRequest {
  RuntimeId: string
}

/** GetSimpleDetectRecordRequestById 简易版安全检测 获取任务详情  */
export const apiGetSimpleDetectRecordRequestById: (
  params: GetUnfinishedTaskDetailByIdRequest,
) => Promise<RecordPortScanRequest> = (params) => {
  return new Promise((resolve, reject) => {
    ipc
      .invoke('grpc', 'GetSimpleDetectRecordRequestById', params)
      .then(simpleDetectRecordForUI)
      .then(resolve)
      .catch((e) => {
        yakitNotify('error', `获取任务详情失败：${e}`)
        reject(e)
      })
  })
}

/** SaveCancelSimpleDetect 简易版安全检测 保存任务  */
export const apiSaveCancelSimpleDetect: (params: RecordPortScanRequest) => Promise<null> = (params) => {
  return new Promise((resolve, reject) => {
    ipc
      .invoke('grpc', 'SaveCancelSimpleDetect', params)
      .then(() => resolve(null))
      .catch((e) => {
        yakitNotify('error', `保存任务失败：${e}`)
        reject(e)
      })
  })
}

export interface RecoverUnfinishedTaskRequest {
  RuntimeId: string
}
/** RecoverSimpleDetectTask 简易版安全检测 恢复任务  */
export const apiRecoverSimpleDetectTask: (
  params: RecoverUnfinishedTaskRequest,
  open: (params: import('@/services/ipc').GrpcInput<'RecoverSimpleDetectTask'>) => Promise<unknown>,
) => Promise<null> = (params, open) => {
  return new Promise((resolve, reject) => {
    open(params)
      .then(() => resolve(null))
      .catch((e) => {
        yakitNotify('error', `恢复任务失败：${e}`)
        reject(e)
      })
  })
}

function simpleDetectRecordForUI(
  value: import('@/services/ipc').GrpcOutput<'GetSimpleDetectRecordRequestById'>,
): RecordPortScanRequest {
  const port = value.PortScanRequest
  if (!port) throw new Error('扫描记录缺少端口扫描配置')
  if (port.Mode !== 'syn' && port.Mode !== 'fingerprint' && port.Mode !== 'all')
    throw new Error('未知端口扫描模式: ' + port.Mode)
  if (port.FingerprintMode !== 'service' && port.FingerprintMode !== 'web' && port.FingerprintMode !== 'all')
    throw new Error('未知指纹扫描模式: ' + port.FingerprintMode)
  const protocols = port.Proto.map((protocol) => {
    if (protocol !== 'tcp' && protocol !== 'udp') throw new Error('未知扫描协议: ' + protocol)
    return protocol
  })
  const brute = value.StartBruteParams
  return {
    ...value,
    LastRecord: value.LastRecord
      ? { ...value.LastRecord, LastRecordPtr: int64ToSafeNumber(value.LastRecord.LastRecordPtr) }
      : undefined,
    PortScanRequest: {
      ...port,
      Mode: port.Mode,
      FingerprintMode: port.FingerprintMode,
      Proto: protocols,
      scanProtocol: protocols[0] ?? 'tcp',
      Concurrent: int64ToSafeNumber(port.Concurrent),
      SynConcurrent: int64ToSafeNumber(port.SynConcurrent),
      BasicCrawlerRequestMax: int64ToSafeNumber(port.BasicCrawlerRequestMax),
      LinkPluginConfig: port.LinkPluginConfig
        ? {
            ...port.LinkPluginConfig,
            Filter: port.LinkPluginConfig.Filter
              ? {
                  ...port.LinkPluginConfig.Filter,
                  Pagination: grpcPagingToUI(port.LinkPluginConfig.Filter.Pagination),
                  IsMITMParamPlugins: int64ToSafeNumber(port.LinkPluginConfig.Filter.IsMITMParamPlugins),
                  Group: port.LinkPluginConfig.Filter.Group ?? undefined,
                }
              : undefined,
          }
        : undefined,
    },
    StartBruteParams: brute
      ? {
          ...brute,
          Concurrent: int64ToSafeNumber(brute.Concurrent),
          TargetTaskConcurrent: int64ToSafeNumber(brute.TargetTaskConcurrent),
          DelayMin: int64ToSafeNumber(brute.DelayMin),
          DelayMax: int64ToSafeNumber(brute.DelayMax),
        }
      : undefined,
  }
}
