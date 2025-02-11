const {ipcMain} = require("electron")
const childProcess = require("child_process")
const {HttpSetting} = require("../state")
const axios = require("axios")
const https = require("https")
const {HttpsProxyAgent} = require("hpagent")

const add_proxy = process.env.https_proxy || process.env.HTTPS_PROXY
const agent = !!add_proxy
    ? new HttpsProxyAgent({
          proxy: add_proxy,
          rejectUnauthorized: false // 忽略 HTTPS 错误
      })
    : new https.Agent({
          rejectUnauthorized: false // 忽略 HTTPS 错误
      })

/**
 * @name 判断当前网络通信状态
 * @returns {boolean} true可用
 */
const asyncNetworkJudgment = (win, params) => {
    return new Promise((resolve, reject) => {
        try {
            childProcess.exec("ping cc.ai55.cc", (error, stdout, stderr) => {
                if (error) {
                    resolve(false)
                } else {
                    const data = stdout.toString()
                    if (data.indexOf("0% packet loss") > -1) {
                        // console.log('connecting ok');
                        resolve(true)
                    } else if (data.indexOf("100% packet loss") > -1) {
                        // console.log('connecting err ~');
                        resolve(false)
                    } else if (data.indexOf("Destination Host Unreachable") > -1) {
                        // console.log('Destination Host Unreachable ~');
                        resolve(false)
                    } else {
                        // console.log('connecting Intermittent ~');
                        resolve(true)
                    }
                }
            })
        } catch (e) {
            reject(e)
        }
    })
}
const asyncFetchPrivateDomainUrl = (win, params) => {
    return new Promise((resolve, reject) => {
        try {
            const service = axios.create({
                baseURL: `${HttpSetting.httpBaseURL}/api/`,
                timeout: 30 * 1000,
                maxBodyLength: Infinity, //设置适当的大小
                httpsAgent: agent,
                proxy: false
            })
            service({
                url: "group/search",
                method: "get",
                timeout: 30 * 1000
            })
                .then((res) => {
                    resolve({
                        code: 200,
                        message: "ok"
                    })
                })
                .catch((err) => {
                    if (err.response) {
                        resolve({
                            code: err.response.status,
                            message: err.response.statusText
                        })
                    } else {
                        // err.code === 'ECONNREFUSED':1.服务器未启动服务;
                        // 其余情况都是按连接超时处理，提示用户网络问题
                        resolve({
                            code: err.code === "ECONNREFUSED" ? 500 : -1,
                            message: err.message
                        })
                    }
                })
        } catch (e) {
            reject(e)
        }
    })
}
module.exports = (win, getClient) => {
    /** 获取当前网络状态 */
    ipcMain.handle("fetch-netWork-status", async (e, params) => {
        return await asyncNetworkJudgment(win, params)
    })

    /** 获取私有域地址 */
    ipcMain.handle("fetch-netWork-status-by-request-interface", async (e, params) => {
        return await asyncFetchPrivateDomainUrl(win, params)
    })
}
