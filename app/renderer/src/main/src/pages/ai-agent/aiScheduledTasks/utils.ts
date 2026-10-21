import type { APIFunc } from '@/apiUtils/type'
import { yakitNotify } from '@/utils/notification'
import i18n from '@/i18n/i18n'
import { withServerRuntimeContextLimit } from '../../ai-re-act/hooks/grpcApi'
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
const { ipcRenderer } = window.require('electron')
const t = i18n.getFixedT(null, 'aiAgent')

/** 在 IPC 返回处转换 int64 字符串，业务层统一使用数字阈值。 */
const normalizeSchedule = (schedule: AIReActSchedule): AIReActSchedule => {
  if (!schedule.Payload?.StartParams) return schedule
  return {
    ...schedule,
    Payload: {
      ...schedule.Payload,
      StartParams: withServerRuntimeContextLimit(schedule.Payload.StartParams),
    },
  }
}

/** 创建定时任务 */
export const grpcCreateAIReActSchedule: APIFunc<CreateAIReActScheduleRequest, AIReActSchedule> = (
  params,
  hiddenError,
) => {
  return new Promise((resolve, reject) => {
    ipcRenderer
      .invoke('CreateAIReActSchedule', params)
      .then(normalizeSchedule)
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
      .then(normalizeSchedule)
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
      .then((response: QueryAIReActSchedulesResponse) => ({
        ...response,
        Data: (response.Data || []).map(normalizeSchedule),
      }))
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
      .then(normalizeSchedule)
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
    ipcRenderer
      .invoke('GetAIReActSchedule', params)
      .then(normalizeSchedule)
      .then(resolve)
      .catch((err) => {
        if (!hiddenError) yakitNotify('error', 'grpcGetAIReActSchedule 失败:' + err)
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
