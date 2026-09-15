import { yakitNotify } from '@/utils/notification'
import type { APINoRequestFunc } from '@/apiUtils/type'
import { yakitHost } from '@/services/electronBridge'
import i18n from '@/i18n/i18n'

const tOriginal = i18n.getFixedT(null, 'utils')

export interface GetSystemProxyResult {
  CurrentProxy: string
  Enable: boolean
}
export const apiGetSystemProxy: APINoRequestFunc<GetSystemProxyResult> = (hiddenError) => {
  return new Promise(async (resolve, reject) => {
    yakitHost
      .getSystemProxy()
      .then(resolve)
      .catch((e) => {
        if (!hiddenError)
          yakitNotify('error', tOriginal('ConfigSystemProxy.getSystemProxyFailed', { error: String(e) }))
        reject(e)
      })
  })
}
