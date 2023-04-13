const {ipcMain, BrowserWindow} = require("electron")
const {httpApi} = require("../httpServer")
const {USER_INFO, HttpSetting} = require("../state")

module.exports = (win, getClient) => {
    // login modal
    ipcMain.on("user-sign-in", (event, arg) => {
        const excludeUrl = ["github.com", "open.weixin.qq.com"]
        const typeApi = {
            github: "auth/from-github/callback",
            wechat: "auth/from-wechat/callback",
            qq: "auth/from-qq/callback"
        }

        const {url = "", type} = arg
        const geturlparam = (url) => {
            let p = url.split("?")[1]
            return new URLSearchParams(p)
        }

        var authWindow = new BrowserWindow({
            width: 600,
            height: 500,
            autoHideMenuBar: true,
            resizable: true,
            parent: win,
            minimizable: false,
            webPreferences: {
                nodeIntegration: true
            }
        })
        authWindow.show()
        authWindow.loadURL(url)
        authWindow.webContents.on("will-navigate", (event, url) => {
            if (!url) return
            if (!typeApi[type]) return
            if (excludeUrl.filter((item) => url.indexOf(item) > -1).length > 0) return

            const params = geturlparam(url)
            const wxCode = params.get("code")
            if (!wxCode) {
                authWindow.webContents.session.clearStorageData()
                win.webContents.send("fetch-signin-data", {ok: false, info: "code获取失败,请重新登录！"})
                authWindow.close()
                return
            }
            httpApi("get", typeApi[type], {code: wxCode})
                .then((res) => {
                    if (!authWindow) return
                    if (res.code !== 200) {
                        authWindow.webContents.session.clearStorageData()
                        win.webContents.send("fetch-signin-data", {
                            ok: false,
                            info: res.data.reason || "请求异常，请重新登录！"
                        })
                        authWindow.close()
                        return
                    }

                    const info = res.data
                    const user = {
                        isLogin: true,
                        platform: info.from_platform,
                        githubName: info.from_platform === "github" ? info.name : null,
                        githubHeadImg: info.from_platform === "github" ? info.head_img : null,
                        wechatName: info.from_platform === "wechat" ? info.name : null,
                        wechatHeadImg: info.from_platform === "wechat" ? info.head_img : null,
                        qqName: info.from_platform === "qq" ? info.name : null,
                        qqHeadImg: info.from_platform === "qq" ? info.head_img : null,
                        role: info.role,
                        user_id: info.user_id,
                        token: info.token
                    }

                    USER_INFO.isLogin = user.isLogin
                    USER_INFO.platform = user.platform
                    USER_INFO.githubName = user.githubName
                    USER_INFO.githubHeadImg = user.githubHeadImg
                    USER_INFO.wechatName = user.wechatName
                    USER_INFO.wechatHeadImg = user.wechatHeadImg
                    USER_INFO.qqName = user.qqName
                    USER_INFO.qqHeadImg = user.qqHeadImg
                    USER_INFO.role = user.role
                    USER_INFO.token = info.token

                    USER_INFO.user_id = user.user_id
                    authWindow.webContents.session.clearStorageData()
                    win.webContents.send("fetch-signin-token", user)
                    win.webContents.send("fetch-signin-data", {ok: true, info: "登录成功"})
                    setTimeout(() => authWindow.close(), 200)
                })
                .catch((err) => {
                    authWindow.webContents.session.clearStorageData()
                    win.webContents.send("fetch-signin-data", {ok: false, info: "登录错误:" + err})
                    authWindow.close()
                })
        })

        authWindow.on("close", () => {
            authWindow.webContents.session.clearStorageData()
            authWindow = null
        })
    })
    ipcMain.handle("company-sign-in", async (event, info) => {
        const user = {
            isLogin: true,
            platform: info.from_platform,
            githubName: null,
            githubHeadImg: null,
            wechatName: null,
            wechatHeadImg: null,
            qqName: null,
            qqHeadImg: null,
            role: info.role,
            user_id: info.user_id,
            token: info.token,
            companyName: info.name,
            companyHeadImg: info.head_img,
            showStatusSearch: info?.showStatusSearch
        }
        USER_INFO.isLogin = user.isLogin
        USER_INFO.platform = user.platform
        USER_INFO.githubName = user.githubName
        USER_INFO.githubHeadImg = user.githubHeadImg
        USER_INFO.wechatName = user.wechatName
        USER_INFO.wechatHeadImg = user.wechatHeadImg
        USER_INFO.qqName = user.qqName
        USER_INFO.qqHeadImg = user.qqHeadImg
        USER_INFO.role = user.role
        USER_INFO.token = info.token
        USER_INFO.user_id = user.user_id
        USER_INFO.showStatusSearch = user.showStatusSearch
        USER_INFO.companyName = user.companyName
        USER_INFO.companyHeadImg = user.companyHeadImg
        win.webContents.send("fetch-signin-token", user)
        win.webContents.send("fetch-signin-data", {ok: true, info: "登录成功"})

        return new Promise((resolve, reject) => {
            resolve({next: true})
        })
    })

    ipcMain.on("company-refresh-in", (event) => {
        win.webContents.send("fetch-signin-token", USER_INFO)
        win.webContents.send("fetch-signin-data", {ok: true, info: "登录成功"})
    })

    ipcMain.handle("get-login-user-info", async (e) => {
        return await new Promise((resolve, reject) => {
            resolve(USER_INFO)
        })
    })

    ipcMain.on("user-sign-out", (event) => {
        USER_INFO.isLogin = false
        USER_INFO.platform = null
        USER_INFO.githubName = null
        USER_INFO.githubHeadImg = null
        USER_INFO.wechatName = null
        USER_INFO.wechatHeadImg = null
        USER_INFO.qqName = null
        USER_INFO.qqHeadImg = null
        USER_INFO.role = null
        USER_INFO.token = null
        USER_INFO.user_id = ""
        USER_INFO.showStatusSearch = false
        USER_INFO.companyName = null
        USER_INFO.companyHeadImg = null
        win.webContents.send("login-out")
    })

    ipcMain.on("sync-update-user", (event, user) => {
        USER_INFO.isLogin = user.isLogin
        USER_INFO.platform = user.platform
        USER_INFO.githubName = user.githubName
        USER_INFO.githubHeadImg = user.githubHeadImg
        USER_INFO.wechatName = user.wechatName
        USER_INFO.wechatHeadImg = user.wechatHeadImg
        USER_INFO.qqName = user.qqName
        USER_INFO.qqHeadImg = user.qqHeadImg
        USER_INFO.role = user.role
        USER_INFO.token = user.token
        USER_INFO.user_id = user.user_id
        USER_INFO.showStatusSearch = user.showStatusSearch
        event.returnValue = user
    })

    ipcMain.on("edit-baseUrl", (event, arg) => {
        HttpSetting.httpBaseURL = arg.baseUrl
        win.webContents.send("edit-baseUrl-status", {ok: true, info: "更改成功"})
        win.webContents.send("refresh-new-home", {ok: true, info: "刷新成功"})
    })
}
