import { ipc } from '../../../../../shared/communication/window-client'
import type { UserInfoProps } from '@/store'
import { loginOutLocal } from '@/utils/login'
import { failed } from '@/utils/notification'
import type { AxiosRequestConfig, AxiosResponse } from './axios'
import { globalUserLogout } from '@/utils/envfile'
import i18n from '@/i18n/i18n'
const tOriginal = i18n.getFixedT(null, 'utils')

export interface AxiosResponseInfoProps {
  message?: string
  reason?: string
  userInfo?: UserInfoProps
}

// 批量覆盖
type Merge<M, N> = Omit<M, Extract<keyof M, keyof N>> & N

export type AxiosResponseProps<T = any, D = any> = Merge<
  AxiosResponse<T, D>,
  {
    code?: number
    message?: string
  }
>

export interface requestConfig<T = any> extends AxiosRequestConfig<T> {
  params?: T
  /** @name 自定义接口域名 */
  diyHome?: string
}

export function NetWorkApi<T, D>(params: requestConfig<T>): Promise<D> {
  return new Promise((resolve, reject) => {
    // console.log("request-params", params)
    const { url, method, data, headers, timeout, diyHome, responseType, withCredentials, auth } = params
    if (responseType && responseType !== 'arraybuffer' && responseType !== 'json' && responseType !== 'text') {
      reject(new Error('Unsupported response type for IPC'))
      return
    }
    ipc
      .invoke(
        'local',
        'axios-api',
        { url, method, data, headers, timeout, diyHome, responseType, withCredentials, auth, params: params.params },
        { signal: params.signal },
      )
      .then((res) => {
        // 埋点接口 不论结果如何 不可影响页面及交互
        if (params.url === 'tourist' && params.method === 'POST') {
          resolve('' as D)
          return
        }
        handleAxios(res, (data) => resolve(data as D), reject)
      })
      .catch((err: any) => {
        // console.log("request-err", err)
        reject(err)
      })
  })
}

export const handleAxios = (res: unknown, resolve: (data: unknown) => void, reject: (error: unknown) => void) => {
  const value = res && typeof res === 'object' ? (res as Record<string, unknown>) : {}
  const { code, message, data } = value
  // console.log("返回", res)
  if (!code) {
    failed(tOriginal('servicesFetch.requestTimeout'))
    reject(tOriginal('servicesFetch.requestTimeout'))
    return
  }
  switch (code) {
    case 200:
      resolve(data)
      break
    case 209:
      reject(data && typeof data === 'object' && 'reason' in data ? data.reason : message)
      break
    case 401:
      tokenOverdue(res)
      reject(message)
      break
    default:
      reject(message)
      break
  }
}

// token过期，退出
export const tokenOverdue = (res) => {
  if (res.userInfo) loginOutLocal(res.userInfo)
  // 异常过期 无法通过接口更新连接状态 故只作退出远程处理
  ipc.invoke('local', 'ForwardMainEvent', { event: 'login-out-dynamic-control-callback', data: { loginOut: false } })
  globalUserLogout()
  failed(tOriginal('servicesFetch.loginExpired'))
}
