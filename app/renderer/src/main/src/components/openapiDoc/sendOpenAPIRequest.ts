import { FuzzerResponse } from '@/pages/fuzzer/HTTPFuzzerPage'
import { randomString } from '@/utils/randomUtil'
import { StringToUint8Array, Uint8ArrayToString } from '@/utils/str'

const { ipcRenderer } = window.require('electron')

/** 发送单条 OpenAPI 构造的请求并返回首条响应 */
export function sendOpenAPIHTTPRequest(request: string, isHttps: boolean): Promise<FuzzerResponse> {
  return new Promise((resolve, reject) => {
    const token = randomString(40)
    const dataToken = `${token}-data`
    const errToken = `${token}-error`
    let settled = false

    const cleanup = () => {
      ipcRenderer.removeAllListeners(dataToken)
      ipcRenderer.removeAllListeners(errToken)
    }

    const finish = (fn: () => void) => {
      if (settled) return
      settled = true
      cleanup()
      fn()
    }

    ipcRenderer.once(dataToken, (_, data: FuzzerResponse) => {
      finish(() => resolve(data))
    })
    ipcRenderer.once(errToken, (_, details: string) => {
      finish(() => reject(new Error(details)))
    })

    ipcRenderer
      .invoke(
        'HTTPFuzzer',
        {
          Request: request,
          RequestRaw: StringToUint8Array(request),
          IsHTTPS: isHttps,
          Concurrent: 1,
          RepeatTimes: 1,
          PerRequestTimeoutSeconds: 15,
        },
        token,
      )
      .catch((e: Error) => {
        finish(() => reject(e))
      })
  })
}

export function fuzzerResponseToRawResponse(response: FuzzerResponse): string {
  if (response?.ResponseRaw) {
    return Uint8ArrayToString(response.ResponseRaw)
  }
  return ''
}
