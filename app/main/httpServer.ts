import axios, { type AxiosRequestConfig, type AxiosResponse } from 'axios'
import https from 'node:https'

import { USER_INFO, HttpSetting } from './state'
import url from 'node:url'

interface HttpRequestConfig extends AxiosRequestConfig<unknown> {
  diyHome?: string
}
interface HttpApiRequest extends HttpRequestConfig {
  method: NonNullable<AxiosRequestConfig['method']>
  argParams?: { cancelInterrupt?: boolean; retryCount?: number; retryDelay?: number }
}
import { HttpsProxyAgent } from 'hpagent'
import { printLogOutputFile } from './logFile'
import { pickAxiosErrorCore } from './toolsFunc'
import { normalizeHttpBaseUrl } from './security'

// 请求超时时间
const DefaultTimeOut = 30 * 1000

const getSocketUrl = (inputUrl: string) => {
  // 解析 URL
  const parsedUrl = new url.URL(inputUrl)
  // 获取协议
  const protocol = parsedUrl.protocol
  // 根据协议转换为 WebSocket URL
  let wsUrl
  if (protocol === 'https:') {
    wsUrl = 'wss://' + parsedUrl.host + parsedUrl.pathname
  } else if (protocol === 'http:') {
    wsUrl = 'ws://' + parsedUrl.host + parsedUrl.pathname
  }
  if (!wsUrl) throw new Error('Unsupported HTTP URL protocol')
  return wsUrl
}

const add_proxy = process.env.https_proxy || process.env.HTTPS_PROXY
const agent = !!add_proxy
  ? new HttpsProxyAgent({
      proxy: add_proxy,
      rejectUnauthorized: false, // 忽略 HTTPS 错误
    })
  : new https.Agent({
      rejectUnauthorized: false, // 忽略 HTTPS 错误
    })

const httpClient = axios.create({
  // baseURL: "http://onlinecs.vaiwan.cn/api/",
  baseURL: `${HttpSetting.httpBaseURL}/api/`,
  timeout: DefaultTimeOut, // 请求超时时间
  maxBodyLength: Infinity, //设置适当的大小
  httpsAgent: agent,
  proxy: false,
})

// request拦截器,拦截每一个请求加上请求头
httpClient.interceptors.request.use(
  (config: HttpRequestConfig) => {
    const baseUrl = normalizeHttpBaseUrl(config.diyHome || HttpSetting.httpBaseURL)
    config.baseURL = `${baseUrl}/api/`
    config.headers = config.headers || {}
    if (USER_INFO.isLogin && USER_INFO.token) config.headers['Authorization'] = USER_INFO.token
    // console.log('request-config',config);
    return config
  },
  (error) => {
    return Promise.reject(error)
  },
)

// respone拦截器 拦截到所有的response，然后先做一些判断
const transformResponse = (response: AxiosResponse<unknown>) => {
  return { code: response.status, data: response.data }
}

const transformFailure = (error: unknown): unknown => {
  const coreError = pickAxiosErrorCore(error)
  printLogOutputFile(`[HTTP ERROR] => ${JSON.stringify(coreError)}`)
  const response = axios.isAxiosError(error) ? (error.response as AxiosResponse<unknown> | undefined) : undefined
  const data = response?.data
  const record = data && typeof data === 'object' ? (data as Record<string, unknown>) : {}
  if (response && response.data && record.message === 'token过期') {
    const res = {
      code: 401,
      message: record.message,
      userInfo: USER_INFO,
    }
    return Promise.resolve(res)
  }
  if (response && response.status === 401) {
    const res = {
      code: 401,
      message: record.message || record.reason,
      userInfo: USER_INFO,
    }
    return Promise.resolve(res)
  }
  if (response && response.data && record.code === 401) {
    const res = {
      code: 401,
      message: record.message,
      userInfo: USER_INFO,
    }
    return Promise.resolve(res)
  }
  if (response && response.status === 501 && response.data) {
    const res = {
      code: 501,
      message: response.data,
      userInfo: USER_INFO,
    }
    return Promise.resolve(res)
  }
  if (response && response.status) {
    const responseData = response.data
    const fallbackMessage =
      (typeof responseData === 'string' && responseData.trim()) ||
      record.message ||
      record.reason ||
      (error instanceof Error ? error.message : '') ||
      `Request failed with status code ${response.status}`
    const res = {
      code: response.status,
      message: fallbackMessage,
      userInfo: USER_INFO,
    }
    return Promise.resolve(res)
  }
  if (response) {
    return Promise.resolve(response.data)
  }
  return Promise.reject(error)
}

const service = (config: HttpRequestConfig): Promise<unknown> =>
  httpClient.request<unknown>(config).then(transformResponse, transformFailure)
/**
 * @param {Object} argParams - 额外参数
 * @param {Boolean} argParams.cancelInterrupt - 是否取消主动中断操作
 * @param {Boolean} argParams.cancelToken - 取消操作
 * @param {Number} argParams.retryCount - 最大重试次数（默认 1）
 * @param {Number} argParams.retryDelay - 重试间隔（ms，默认 1000）
 */
function httpApi({
  method,
  url,
  params,
  data,
  headers,
  timeout = DefaultTimeOut,
  cancelToken,
  signal,
  argParams,
}: HttpApiRequest): Promise<unknown> {
  const { cancelInterrupt, retryCount = 1, retryDelay = 1000 } = argParams || {}
  if (!['get', 'post'].includes(method)) {
    return Promise.reject(`call yak echo failed: ${method}`)
  }

  let attempt = 0
  const doRequest = () => {
    if (signal?.aborted) return Promise.reject(new Error('Operation aborted'))
    return service({
      url,
      method,
      headers,
      params,
      data,
      timeout,
      cancelToken: cancelInterrupt ? undefined : cancelToken,
      signal,
    })
  }
  const requestWithRetry = (): Promise<unknown> => {
    return doRequest().catch((error) => {
      if (signal?.aborted || axios.isCancel(error)) throw error
      attempt++
      // console.log("attempt---",attempt,retryCount);
      if (attempt < retryCount) {
        // 等待一段时间再重试
        return new Promise((resolve) => setTimeout(resolve, retryDelay)).then(requestWithRetry)
      }
      // 超过最大重试次数，抛出错误
      return Promise.reject(error)
    })
  }

  return requestWithRetry()
}

export { service, httpApi, getSocketUrl }
