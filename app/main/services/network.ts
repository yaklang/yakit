import { execFile } from 'node:child_process'
import axios from 'axios'
import https from 'node:https'
import { HttpsProxyAgent } from 'hpagent'
import { registerMainMethod } from '../ipc/index'
import { service, getSocketUrl } from '../httpServer'
import { HttpSetting } from '../state'
import { normalizeHttpBaseUrl, normalizeRelativeApiPath } from '../security'

export function registerNetworkServices() {
  registerMainMethod('axios-api', (params, context) => {
    if (params.responseType && !['arraybuffer', 'json', 'text'].includes(params.responseType))
      throw new Error('Unsupported response type for IPC')
    const { method, data, headers, timeout, diyHome, responseType, withCredentials, auth } = params
    return service({
      url: normalizeRelativeApiPath(params.url),
      params: params.params,
      method,
      data,
      headers,
      timeout,
      diyHome,
      responseType,
      withCredentials,
      auth,
      signal: context.signal,
    })
  })
  registerMainMethod(
    'is-enpritrace-to-domain',
    (enterprise) => {
      if (typeof enterprise !== 'boolean') throw new Error('Invalid edition flag')
      const baseUrl = normalizeHttpBaseUrl(enterprise ? 'https://vip.yaklang.com' : 'https://www.yaklang.com')
      HttpSetting.httpBaseURL = baseUrl
      HttpSetting.wsBaseURL = getSocketUrl(baseUrl)
      return true
    },
    ['main', 'link'],
  )
  registerMainMethod('sync-edit-baseUrl', (params) => {
    try {
      const baseUrl = normalizeHttpBaseUrl(params.baseUrl)
      HttpSetting.httpBaseURL = baseUrl
      HttpSetting.wsBaseURL = getSocketUrl(baseUrl)
      return { baseUrl }
    } catch (error) {
      // Existing business validation is a resolved value, not a transport failure.
      return { error: error instanceof Error ? error.message : String(error) }
    }
  })
  registerMainMethod(
    'fetch-netWork-status',
    (_params, context) =>
      new Promise<boolean>((resolve) => {
        const count = process.platform === 'win32' ? ['-n', '1'] : ['-c', '1']
        execFile(
          'ping',
          [...count, 'cc.ai55.cc'],
          { timeout: 5000, windowsHide: true, signal: context.signal },
          (error) => resolve(!error),
        )
      }),
  )
  const proxy = process.env.https_proxy || process.env.HTTPS_PROXY
  const agent = proxy
    ? new HttpsProxyAgent({ proxy, rejectUnauthorized: false })
    : new https.Agent({ rejectUnauthorized: false })
  registerMainMethod('fetch-netWork-status-by-request-interface', async (_params, context) => {
    try {
      await axios.get(`${HttpSetting.httpBaseURL}/api/group/search`, {
        timeout: 30_000,
        maxBodyLength: Infinity,
        httpsAgent: agent,
        proxy: false,
        signal: context.signal,
      })
      return { code: 200, message: 'ok' }
    } catch (error) {
      if (context.signal.aborted) throw error
      if (axios.isAxiosError(error)) {
        if (error.response) return { code: error.response.status, message: error.response.statusText }
        return { code: error.code === 'ECONNREFUSED' ? 500 : -1, message: error.message }
      }
      throw error
    }
  })
}
