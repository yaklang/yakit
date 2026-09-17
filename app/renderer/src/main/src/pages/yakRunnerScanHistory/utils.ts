import { ssaProgramsForUI } from '@/pages/yakRunnerCodeScan/grpcAdapters'
import { grpcPageForUI } from '@/utils/int64'
import { ipc } from '@/services/ipc'
import { yakitNotify } from '@/utils/notification'
import type { APIOptionalFunc } from '@/apiUtils/type'
import type { QuerySSAProgramRequest, QuerySSAProgramResponse } from './YakRunnerScanHistory'

/** 获取QuerySSAPrograms（后端根据 Filter.ProjectIds / ProgramNames 自动切换 SSA 库） */
export const apiQuerySSAPrograms: APIOptionalFunc<QuerySSAProgramRequest, QuerySSAProgramResponse> = (params) => {
  return new Promise((resolve, reject) => {
    ipc
      .invoke('grpc', 'QuerySSAPrograms', params ?? {})
      .then(ssaProgramsForUI)
      .then(grpcPageForUI)
      .then((res) => {
        resolve(res)
      })
      .catch((e) => {
        reject(e)
        yakitNotify('error', 'QuerySSAPrograms：' + e)
      })
  })
}
