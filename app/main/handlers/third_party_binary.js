const {ipcMain} = require("electron")

module.exports = (win, getClient) => {
    const handlerHelper = require("./handleStreamWithContext")

    // ListThirdPartyBinary - 获取第三方应用列表
    const asyncListThirdPartyBinary = (params) => {
        return new Promise((resolve, reject) => {
            getClient().ListThirdPartyBinary(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    ipcMain.handle("ListThirdPartyBinary", async (e, params) => {
        return await asyncListThirdPartyBinary(params)
    })

    // InstallThirdPartyBinary - 安装第三方应用 (流式接口)
    const streamInstallMap = new Map()
    ipcMain.handle("cancel-InstallThirdPartyBinary", handlerHelper.cancelHandler(streamInstallMap))
    ipcMain.handle("InstallThirdPartyBinary", (e, params, token) => {
        let stream = getClient().InstallThirdPartyBinary(params)
        handlerHelper.registerHandler(win, stream, streamInstallMap, token)
    })

    // UninstallThirdPartyBinary - 卸载第三方应用
    const asyncUninstallThirdPartyBinary = (params) => {
        return new Promise((resolve, reject) => {
            getClient().UninstallThirdPartyBinary(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    ipcMain.handle("UninstallThirdPartyBinary", async (e, params) => {
        return await asyncUninstallThirdPartyBinary(params)
    })

    // IsThirdPartyBinaryReady - 检查第三方应用是否准备就绪
    const asyncIsThirdPartyBinaryReady = (params) => {
        return new Promise((resolve, reject) => {
            getClient().IsThirdPartyBinaryReady(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    ipcMain.handle("IsThirdPartyBinaryReady", async (e, params) => {
        return await asyncIsThirdPartyBinaryReady(params)
    })

    // StartThirdPartyBinary - 启动第三方应用 (流式接口)
    const streamStartMap = new Map()
    ipcMain.handle("cancel-StartThirdPartyBinary", handlerHelper.cancelHandler(streamStartMap))
    ipcMain.handle("StartThirdPartyBinary", (e, params, token) => {
        let stream = getClient().StartThirdPartyBinary(params)
        handlerHelper.registerHandler(win, stream, streamStartMap, token)
    })

    // DownloadRAGs - 安装x线上知识库 (流式接口)
    const streamInstallOnlineRagMap = new Map()
    ipcMain.handle("cancel-DownloadRAGs", handlerHelper.cancelHandler(streamInstallOnlineRagMap))
    ipcMain.handle("DownloadRAGs", (e, params, token) => {
        let stream = getClient().DownloadRAGs(params)
        handlerHelper.registerHandler(win, stream, streamInstallOnlineRagMap, token)
    })
}
