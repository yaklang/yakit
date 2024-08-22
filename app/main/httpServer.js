const axios = require("axios")
const https = require("https")
const {ipcMain} = require("electron")
const {USER_INFO, HttpSetting} = require("./state")

// 请求超时时间
const DefaultTimeOut = 30 * 1000

// 软件启动后判断是 CE 版本还是 EE 版本
ipcMain.handle("is-enpritrace-to-domain", (event, flag) => {
    HttpSetting.httpBaseURL = flag ? "https://vip.yaklang.com" : "https://www.yaklang.com"
    return true
})

ipcMain.on("sync-edit-baseUrl", (event, arg) => {
    HttpSetting.httpBaseURL = arg.baseUrl
    event.returnValue = arg
})

const service = axios.create({
    // baseURL: "http://onlinecs.vaiwan.cn/api/",
    baseURL: `${HttpSetting.httpBaseURL}/api/`,
    timeout: DefaultTimeOut, // 请求超时时间
    maxBodyLength: Infinity, //设置适当的大小
    httpsAgent: new https.Agent({rejectUnauthorized: false}) // 忽略 HTTPS 错误
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
                message: error.response.data.reason,
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
        if (error.response) {
            return Promise.resolve(error.response.data)
        }
        return Promise.reject(error)
    }
)
let cancelTokenSource = null
function httpApi(method, url, params, headers, isAddParams = true, timeout = DefaultTimeOut) {
    if (!["get", "post"].includes(method)) {
        return Promise.reject(`call yak echo failed: ${e}`)
    }
    // 如果有当前的请求，取消它
    if (cancelTokenSource) {
        cancelTokenSource.cancel("Operation canceled due to new request.")
    }
    // 创建一个新的CancelToken
    cancelTokenSource = axios.CancelToken.source()
    return service({
        url: url,
        method: method,
        headers,
        params: isAddParams ? params : undefined,
        data: method === "post" ? params : undefined,
        timeout,
        cancelToken: cancelTokenSource.token
    }).finally(() => {
        // 请求完成后清理cancelTokenSource
        cancelTokenSource = null
    })
}

module.exports = {
    service,
    httpApi
}
