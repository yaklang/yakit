import { int64ToSafeNumber } from '@/utils/int64'
import type { GrpcOutput } from '@/services/ipc'
import type { HTTPRequestBuilderParams } from '@/models/HTTPRequestBuilder'
import type { ExecResult, QueryYakScriptRequest } from '@/pages/invoker/schema'

export type HybridScanModeType = 'new' | 'resume' | 'pause' | 'status'
export type HybridScanTaskSourceType = 'pluginBatch' | 'yakPoc'
export interface HybridScanControlRequest extends HybridScanControlAfterRequest {
  // 控制帧字段
  Control: boolean
  // new: 新任务
  // resume: 恢复任务
  // pause: 暂停任务
  // status: 查询任务状态
  HybridScanMode: HybridScanModeType
  ResumeTaskId: string
}

/**再发送 HybridScanMode 后再传的参数*/
export interface HybridScanControlAfterRequest {
  // 其他参数
  Concurrent?: number
  TotalTimeoutSecond?: number
  Proxy?: string
  SingleTimeoutSecond?: number
  Plugin?: HybridScanPluginConfig
  Targets?: HybridScanInputTarget
  HybridScanTaskSource?: HybridScanTaskSourceType
}

export interface HybridScanInputTarget {
  Input: string
  InputFile: string[]
  HTTPRequestTemplate: HTTPRequestBuilderParams
}

export interface HybridScanPluginConfig {
  PluginNames: string[]
  Filter?: QueryYakScriptRequest
}

export type HybridScanResponse = GrpcOutput<'HybridScan'>
export type HybridScanStatisticResponse = Pick<
  HybridScanResponse,
  | 'TotalTargets'
  | 'TotalPlugins'
  | 'TotalTasks'
  | 'FinishedTasks'
  | 'FinishedTargets'
  | 'ActiveTasks'
  | 'ActiveTargets'
  | 'HybridScanTaskId'
>
export type HybridScanActiveTask = NonNullable<GrpcOutput<'HybridScan'>['UpdateActiveTask']>

export interface HybridScanTask {
  Id: string | number
  CreatedAt: number
  UpdatedAt: number
  TaskId: string
  Status: string // 如果 Status 有固定的几个值，可以使用联合类型
  TotalTargets: number
  TotalPlugins: number
  TotalTasks: number
  FinishedTasks: number
  FinishedTargets: number
  FirstTarget: string
  Reason: string
}

export type HybridScanRestoredConfig = Omit<
  NonNullable<GrpcOutput<'HybridScan'>['HybridScanConfig']>,
  'Control' | 'HybridScanMode' | 'ResumeTaskId'
>

export type HybridScanInputValue = HybridScanControlAfterRequest | HybridScanRestoredConfig

export function hybridTasksForUI(value: GrpcOutput<'QueryHybridScanTask'>) {
  return {
    ...value,
    Data: value.Data.map((row) => ({
      ...row,
      CreatedAt: int64ToSafeNumber(row.CreatedAt),
      UpdatedAt: int64ToSafeNumber(row.UpdatedAt),
      TotalTargets: int64ToSafeNumber(row.TotalTargets),
      TotalPlugins: int64ToSafeNumber(row.TotalPlugins),
      TotalTasks: int64ToSafeNumber(row.TotalTasks),
      FinishedTasks: int64ToSafeNumber(row.FinishedTasks),
      FinishedTargets: int64ToSafeNumber(row.FinishedTargets),
    })),
  }
}
