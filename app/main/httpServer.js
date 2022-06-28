const axios = require("axios")
const {USER_INFO} = require("./state")

const service = axios.create({
    // baseURL: "http://onlinecs.vaiwan.cn/api/",
    baseURL: "http://192.168.101.104:8080/api/",
    timeout: 30 * 1000, // 请求超时时间
    maxBodyLength: Infinity //设置适当的大小
})

// request拦截器,拦截每一个请求加上请求头
service.interceptors.request.use(
    (config) => {
        if (USER_INFO.isLogin && USER_INFO.token) config.headers["Authorization"] = USER_INFO.token
        return config
    },
    (error) => {
        console.log("request", error)
        Promise.reject(error)
    }
)

// respone拦截器 拦截到所有的response，然后先做一些判断
service.interceptors.response.use(
    (response) => {
        const res = response.data
        // console.log('response',response);
        if (!res.ok) return Promise.reject(res.reason || "请求失败,请稍等片刻后再次尝试")
        else return response.data
    },
    (error) => {
        console.log("res_error", error)
        if (error?.response?.data?.code === 401) {
            return Promise.reject("未登录，请先登录或者刷新~~")
        }
        if (error?.response?.data?.reason) {
            return Promise.reject(error?.response?.data?.reason)
        }
        return Promise.reject(error)
    }
)

function httpApi(method, url, params, headers, isAddParams = true) {
    if (!["get", "post"].includes(method)) {
        return Promise.reject(`call yak echo failed: ${e}`)
    }
    return service({
        url: url,
        method: method,
        headers,
        params: isAddParams ? params : undefined,
        data: method === "post" ? params : undefined
        // params: method === "get" ? params : undefined,
        // data: method === "post" ? params : undefined
    })
}

module.exports = {
    service,
    httpApi
}
