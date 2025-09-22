const axios = require("axios")
const https = require("https")
const {ipcMain} = require("electron")
const {USER_INFO, HttpSetting} = require("./state")
const url = require("url")
const {HttpsProxyAgent} = require("hpagent")

// 请求超时时间
const DefaultTimeOut = 30 * 1000

// 软件启动后判断是 CE 版本还是 EE 版本
ipcMain.handle("is-enpritrace-to-domain", (event, flag) => {
    HttpSetting.httpBaseURL = flag ? "https://vip.yaklang.com" : "https://www.yaklang.com"
    return true
})

const getSocketUrl = (inputUrl) => {
    // 解析 URL
    const parsedUrl = new url.URL(inputUrl)
    // 获取协议
    const protocol = parsedUrl.protocol
    // 根据协议转换为 WebSocket URL
    let wsUrl
    if (protocol === "https:") {
        wsUrl = "wss://" + parsedUrl.host + parsedUrl.pathname
    } else if (protocol === "http:") {
        wsUrl = "ws://" + parsedUrl.host + parsedUrl.pathname
    }
    return wsUrl
}

ipcMain.on("sync-edit-baseUrl", (event, arg) => {
    try {
        HttpSetting.httpBaseURL = arg.baseUrl
        HttpSetting.wsBaseURL = getSocketUrl(arg.baseUrl)
        event.returnValue = arg
    } catch (error) {}
})

const add_proxy = process.env.https_proxy || process.env.HTTPS_PROXY
const agent = !!add_proxy
    ? new HttpsProxyAgent({
          proxy: add_proxy,
          rejectUnauthorized: false // 忽略 HTTPS 错误
      })
    : new https.Agent({
          rejectUnauthorized: false // 忽略 HTTPS 错误
      })

const service = axios.create({
    // baseURL: "http://onlinecs.vaiwan.cn/api/",
    baseURL: `${HttpSetting.httpBaseURL}/api/`,
    timeout: DefaultTimeOut, // 请求超时时间
    maxBodyLength: Infinity, //设置适当的大小
    httpsAgent: agent,
    proxy: false
})

// request拦截器,拦截每一个请求加上请求头
service.interceptors.request.use(
    (config) => {
        config.baseURL = config.diyHome ? `${config.diyHome}/api/` : `${HttpSetting.httpBaseURL}/api/`
        if (USER_INFO.isLogin && USER_INFO.token) config.headers["Authorization"] = USER_INFO.token
        // console.log('request-config',config);
        return config
    },
    (error) => {
        Promise.reject(error)
    }
)

// respone拦截器 拦截到所有的response，然后先做一些判断
service.interceptors.response.use(
    (response) => {
        const res = {
            code: response.status,
            data: response.data
        }
        // console.log("response__1", response)
        return res
    },
    (error) => {
        // console.log("error_1", error)
        if (error.response && error.response.data && error.response.data.message === "token过期") {
            const res = {
                code: 401,
                message: error.response.data.message,
                userInfo: USER_INFO
            }
            return Promise.resolve(res)
        }
        if (error.response && error.response.status === 401) {
            const res = {
                code: 401,
                message: error.response.data?.message || error.response.data.reason,
                userInfo: USER_INFO
            }
            return Promise.resolve(res)
        }
        if (error.response && error.response.data && error.response.data.code === 401) {
            const res = {
                code: 401,
                message: error.response.data.message,
                userInfo: USER_INFO
            }
            return Promise.resolve(res)
        }
        if (error.response && error.response.status === 501 && error.response.data) {
            const res = {
                code: 501,
                message: error.response.data,
                userInfo: USER_INFO
            }
            return Promise.resolve(res)
        }
        if (error.response && error.response.status && error.response.data) {
            const res = {
                code: error.response.status,
                message: error.response.data,
                userInfo: USER_INFO
            }
            return Promise.resolve(res)
        }
        if (error.response) {
            return Promise.resolve(error.response.data)
        }
        return Promise.reject(error)
    }
)
let cancelTokenSource = null
/**
 * @param {Object} argParams - 额外参数
 * @param {Boolean} argParams.cancelInterrupt - 是否取消主动中断操作
 * @param {Boolean} argParams.cancelToken - 取消操作
 * @param {Number} argParams.retryCount - 最大重试次数（默认 1）
 * @param {Number} argParams.retryDelay - 重试间隔（ms，默认 1000）
 */
function httpApi({method, url, params, data, headers, timeout = DefaultTimeOut, cancelToken, argParams}) {
    const {cancelInterrupt, retryCount = 1, retryDelay = 1000} = argParams || {}
    if (!["get", "post"].includes(method)) {
        return Promise.reject(`call yak echo failed: ${method}`)
    }

    let attempt = 0
    let newCancelToken = cancelToken ?? cancelTokenSource.token
    const doRequest = () => {
        // 如果有当前的请求，取消它
        if (cancelTokenSource) {
            cancelTokenSource.cancel("Operation canceled due to new request.")
        }
        // 创建一个新的CancelToken
        cancelTokenSource = axios.CancelToken.source()
        return service({
            url,
            method,
            headers,
            params,
            data,
            timeout,
            cancelToken: cancelInterrupt ? undefined : newCancelToken
        }).finally(() => {
            // 请求完成后清理cancelTokenSource
            cancelTokenSource = null
        })
    }
    const requestWithRetry = () => {
        return doRequest().catch((error) => {
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

module.exports = {
    service,
    httpApi,
    getSocketUrl
}
