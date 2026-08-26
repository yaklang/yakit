import type { APIFunc } from '@/apiUtils/type'
import { yakitNotify } from '@/utils/notification'
import type {
  AIReActSchedule,
  CreateAIReActScheduleRequest,
  DeleteAIReActScheduleRequest,
  PreviewAIReActScheduleTimesRequest,
  PreviewAIReActScheduleTimesResponse,
  QueryAIReActSchedulesRequest,
  QueryAIReActSchedulesResponse,
  RunAIReActScheduleNowRequest,
  SetAIReActScheduleEnabledRequest,
  UpdateAIReActScheduleRequest,
} from '../../ai-re-act/hooks/grpcApi'
const { ipcRenderer } = window.require('electron')

/** 创建定时任务 */
export const grpcCreateAIReActSchedule: APIFunc<CreateAIReActScheduleRequest, AIReActSchedule> = (
  params,
  hiddenError,
) => {
  return new Promise((resolve, reject) => {
    ipcRenderer
      .invoke('CreateAIReActSchedule', params)
      .then(resolve)
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
    ipcRenderer
      .invoke('UpdateAIReActSchedule', params)
      .then(resolve)
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
    ipcRenderer
      .invoke('PreviewAIReActScheduleTimes', params)
      .then(resolve)
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
    ipcRenderer
      .invoke('QueryAIReActSchedules', params)
      .then(resolve)
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
    ipcRenderer
      .invoke('SetAIReActScheduleEnabled', params)
      .then(resolve)
      .catch((err) => {
        if (!hiddenError) yakitNotify('error', 'grpcSetAIReActScheduleEnabled 失败:' + err)
        reject(err)
      })
  })
}

/** 立即触发一次定时任务 */
export const grpcRunAIReActScheduleNow: APIFunc<RunAIReActScheduleNowRequest, null> = (params, hiddenError) => {
  return new Promise((resolve, reject) => {
    ipcRenderer
      .invoke('RunAIReActScheduleNow', params)
      .then(resolve)
      .catch((err) => {
        if (!hiddenError) {
          /**临时单独处理这个报错，友好提示 */
          if (`${err}`.includes('schedule already has a queued or running execution')) {
            yakitNotify('warning', '该定时任务已经有一个正在执行或排队的任务，请稍后再试')
          } else {
            yakitNotify('error', 'grpcRunAIReActScheduleNow 失败:' + err)
          }
        }
        reject(err)
      })
  })
}

/** 删除定时任务 */
export const grpcDeleteAIReActSchedule: APIFunc<DeleteAIReActScheduleRequest, null> = (params, hiddenError) => {
  return new Promise((resolve, reject) => {
    ipcRenderer
      .invoke('DeleteAIReActSchedule', params)
      .then(resolve)
      .catch((err) => {
        if (!hiddenError) yakitNotify('error', 'grpcDeleteAIReActSchedule 失败:' + err)
        reject(err)
      })
  })
}
