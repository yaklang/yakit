import { yakitNotify } from '@/utils/notification'
import { APIOptionalFunc } from '@/apiUtils/type'
import { QuerySSAProgramRequest, QuerySSAProgramResponse } from './YakRunnerScanHistory'
import { OpenSSAProjectResponse, SSAProjectResponse } from '../yakRunnerAuditCode/AuditCode/AuditCodeType'

const { ipcRenderer } = window.require('electron')

/** 打开 SSA 分析项目并切换全局 SSA 数据库连接 */
export const apiOpenSSAProject = (projectId: number): Promise<SSAProjectResponse> => {
  if (!projectId || projectId <= 0) {
    return Promise.reject(new Error('OpenSSAProject: project id is required'))
  }
  return new Promise((resolve, reject) => {
    ipcRenderer
      .invoke('OpenSSAProject', { ID: projectId })
      .then((res: OpenSSAProjectResponse) => {
        resolve(res?.Project)
      })
      .catch((e) => {
        reject(e)
        yakitNotify('error', 'OpenSSAProject：' + e)
      })
  })
}

/** 获取QuerySSAPrograms */
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
