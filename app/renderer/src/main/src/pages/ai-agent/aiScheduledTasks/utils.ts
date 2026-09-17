import { aiScheduleForUI, grpcPagingToUI, int64ToSafeNumber } from '../grpcAdapters'
import { ipc } from '@/services/ipc'
import type { APIFunc } from '@/apiUtils/type'
import { yakitNotify } from '@/utils/notification'
import i18n from '@/i18n/i18n'
import type {
  AIReActSchedule,
  CreateAIReActScheduleRequest,
  DeleteAIReActScheduleRequest,
  GetAIReActScheduleRequest,
  PreviewAIReActScheduleTimesRequest,
  PreviewAIReActScheduleTimesResponse,
  QueryAIReActSchedulesRequest,
  QueryAIReActSchedulesResponse,
  RunAIReActScheduleNowRequest,
  SetAIReActScheduleEnabledRequest,
  UpdateAIReActScheduleRequest,
} from '../../ai-re-act/hooks/grpcApi'
const t = i18n.getFixedT(null, 'aiAgent')

/** 创建定时任务 */
export const grpcCreateAIReActSchedule: APIFunc<CreateAIReActScheduleRequest, AIReActSchedule> = (
  params,
  hiddenError,
) => {
  return new Promise((resolve, reject) => {
    ipc
      .invoke('grpc', 'CreateAIReActSchedule', params)
      .then((res) => resolve(aiScheduleForUI(res)))
      .catch((err) => {
        if (!hiddenError) yakitNotify('error', 'grpcCreateAIReActSchedule 失败:' + err)
        reject(err)
      })
  })
}

/** 更新定时任务 */
export const grpcUpdateAIReActSchedule: APIFunc<UpdateAIReActScheduleRequest, AIReActSchedule> = (
  params,
  hiddenError,
) => {
  return new Promise((resolve, reject) => {
    ipc
      .invoke('grpc', 'UpdateAIReActSchedule', params)
      .then((res) => resolve(aiScheduleForUI(res)))
      .catch((err) => {
        if (!hiddenError) yakitNotify('error', 'grpcUpdateAIReActSchedule 失败:' + err)
        reject(err)
      })
  })
}

/** 预览定时任务的未来执行时间点 */
export const grpcPreviewAIReActScheduleTimes: APIFunc<
  PreviewAIReActScheduleTimesRequest,
  PreviewAIReActScheduleTimesResponse
> = (params, hiddenError) => {
  return new Promise((resolve, reject) => {
    ipc
      .invoke('grpc', 'PreviewAIReActScheduleTimes', params)
      .then((res) => resolve({ Timestamps: res.Timestamps.map(int64ToSafeNumber) }))
      .catch((err) => {
        if (!hiddenError) yakitNotify('error', 'grpcPreviewAIReActScheduleTimes 失败:' + err)
        reject(err)
      })
  })
}

/** 分页查询定时任务列表 */
export const grpcQueryAIReActSchedules: APIFunc<QueryAIReActSchedulesRequest, QueryAIReActSchedulesResponse> = (
  params,
  hiddenError,
) => {
  return new Promise((resolve, reject) => {
    ipc
      .invoke('grpc', 'QueryAIReActSchedules', params)
      .then((res) =>
        resolve({
          ...res,
          Data: res.Data.map(aiScheduleForUI),
          Pagination: grpcPagingToUI(res.Pagination),
          Total: int64ToSafeNumber(res.Total),
        }),
      )
      .catch((err) => {
        if (!hiddenError) yakitNotify('error', 'grpcQueryAIReActSchedules 失败:' + err)
        reject(err)
      })
  })
}

/** 启用/暂停定时任务 */
export const grpcSetAIReActScheduleEnabled: APIFunc<SetAIReActScheduleEnabledRequest, AIReActSchedule> = (
  params,
  hiddenError,
) => {
  return new Promise((resolve, reject) => {
    ipc
      .invoke('grpc', 'SetAIReActScheduleEnabled', params)
      .then((res) => resolve(aiScheduleForUI(res)))
      .catch((err) => {
        if (!hiddenError) yakitNotify('error', 'grpcSetAIReActScheduleEnabled 失败:' + err)
        reject(err)
      })
  })
}

/** 立即触发一次定时任务 */
export const grpcRunAIReActScheduleNow: APIFunc<RunAIReActScheduleNowRequest, null> = (params, hiddenError) => {
  return new Promise((resolve, reject) => {
    ipc
      .invoke('grpc', 'RunAIReActScheduleNow', params)
      .then(() => resolve(null))
      .catch((err) => {
        if (!hiddenError) {
          /**临时单独处理这个报错，友好提示 */
          if (`${err}`.includes('schedule already has a queued or running execution')) {
            yakitNotify('warning', t('AIScheduledTasks.runNowQueued'))
          } else {
            yakitNotify('error', 'grpcRunAIReActScheduleNow 失败:' + err)
          }
        }
        reject(err)
      })
  })
}

/** 根据 UUID 获取单个定时任务详情 */
export const grpcGetAIReActSchedule: APIFunc<GetAIReActScheduleRequest, AIReActSchedule> = (params, hiddenError) => {
  return new Promise((resolve, reject) => {
    ipc
      .invoke('grpc', 'GetAIReActSchedule', params)
      .then((res) => resolve(aiScheduleForUI(res)))
      .catch((err) => {
        if (!hiddenError) yakitNotify('error', 'grpcGetAIReActSchedule 失败:' + err)
        reject(err)
      })
  })
}

/** 删除定时任务 */
export const grpcDeleteAIReActSchedule: APIFunc<DeleteAIReActScheduleRequest, null> = (params, hiddenError) => {
  return new Promise((resolve, reject) => {
    ipc
      .invoke('grpc', 'DeleteAIReActSchedule', params)
      .then(() => resolve(null))
      .catch((err) => {
        if (!hiddenError) yakitNotify('error', 'grpcDeleteAIReActSchedule 失败:' + err)
        reject(err)
      })
  })
}
