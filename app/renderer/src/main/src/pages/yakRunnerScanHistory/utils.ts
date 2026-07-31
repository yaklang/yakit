import { yakitNotify } from '@/utils/notification'
import type { APIOptionalFunc } from '@/apiUtils/type'
import type { QuerySSAProgramRequest, QuerySSAProgramResponse } from './YakRunnerScanHistory'

const { ipcRenderer } = window.require('electron')

/** 获取QuerySSAPrograms（后端根据 Filter.ProjectIds / ProgramNames 自动切换 SSA 库） */
export const apiQuerySSAPrograms: APIOptionalFunc<QuerySSAProgramRequest, QuerySSAProgramResponse> = (params) => {
  return new Promise((resolve, reject) => {
    ipcRenderer
      .invoke('QuerySSAPrograms', params)
      .then((res: QuerySSAProgramResponse) => {
        resolve(res)
      })
      .catch((e) => {
        reject(e)
        yakitNotify('error', 'QuerySSAPrograms：' + e)
      })
  })
}
