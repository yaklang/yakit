import { NetWorkApi } from '@/services/fetch'
import type { API } from '@/services/swagger/resposeType'
import { failed } from '@/utils/notification'
import type { DynamicStatusProps } from '@/store'

export interface ResultObjProps {
  id: string
  note: string
  port: number
  host: string
  pubpem: string
  secret: string
}

export const remoteOperation = (status: boolean, dynamicStatus: DynamicStatusProps) => {
  const { id, host, port, secret, note } = dynamicStatus
  return new Promise(async (resolve, reject) => {
    NetWorkApi<API.RemoteOperationRequest, API.ActionSucceeded>({
      url: 'remote/operation',
      method: 'post',
      data: {
        tunnel: id,
        addr: `${host}:${port}`,
        auth: secret,
        note,
        status,
      },
    })
      .then((data) => {
        if (data.ok) {
          // ignore
        }
      })
      .catch((err) => {
        failed(`连接远程/取消失败:${err}`)
      })
      .finally(() => {
        resolve(true)
      })
  })
}

/** 数据内容不可读 */
export const unReadable = (resultObj: ResultObjProps) => {
  return `${resultObj.id},${resultObj.note},${resultObj.port},${resultObj.host},${resultObj.pubpem},${resultObj.secret}`
}

/** 数据内容可读 */
export const readable = (v: string) => {
  try {
    const arr = v.split(',')
    const obj: ResultObjProps = {
      id: arr[0],
      note: arr[1],
      port: parseInt(arr[2]),
      host: arr[3],
      pubpem: arr[4],
      secret: arr[5],
    }
    return obj
  } catch (error) {
    return
  }
}