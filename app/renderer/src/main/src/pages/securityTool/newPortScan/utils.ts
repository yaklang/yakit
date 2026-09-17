import { yakitNotify } from '@/utils/notification'
import type { PortScanExecuteExtraFormValue } from './NewPortScanType'
import type { StartBruteParams } from '../newBrute/NewBruteType'

/**
 * @description 端口扫描执行方法 社区版
 */
export const apiPortScan: (
  params: PortScanExecuteExtraFormValue,
  open: (params: import('@/services/ipc').GrpcInput<'PortScan'>) => Promise<unknown>,
) => Promise<null> = (params, open) => {
  return new Promise((resolve, reject) => {
    const executeParams: PortScanExecuteExtraFormValue = {
      ...params,
    }
    open(executeParams)
      .then(() => {
        yakitNotify('info', '启动任务成功')
        resolve(null)
      })
      .catch((e: any) => {
        yakitNotify('error', '端口扫描执行出错:' + e)
        reject(e)
      })
  })
}

export interface LastRecordProps {
  ExtraInfo: string
  YakScriptOnlineGroup: string
  Percent: number
  LastRecordPtr: number
}
export interface RecordPortScanRequest {
  LastRecord?: LastRecordProps
  StartBruteParams?: StartBruteParams
  PortScanRequest: PortScanExecuteExtraFormValue
  RuntimeId?: string
}
/**
 * @description 端口扫描执行方法  企业版
 */
export const apiSimpleDetect: (
  params: RecordPortScanRequest,
  open: (params: import('@/services/ipc').GrpcInput<'SimpleDetect'>) => Promise<unknown>,
) => Promise<null> = (params, open) => {
  return new Promise((resolve, reject) => {
    const executeParams = {
      ...params,
    }
    open(executeParams)
      .then(() => {
        yakitNotify('info', '启动任务成功')
        resolve(null)
      })
      .catch((e: any) => {
        yakitNotify('error', '端口扫描执行出错:' + e)
        reject(e)
      })
  })
}

export interface ExecParamItem {
  Key: string
  Value: string
}
