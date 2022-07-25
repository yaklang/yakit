const {app, BrowserWindow, dialog, nativeImage, ipcMain, session} = require("electron")
const isDev = require("electron-is-dev")
const path = require("path")
const {extrakvpairs, getExtraKVPair, setExtraKVPair} = require("./handlers/upgradeUtil")
const {registerIPC, clearing} = require("./ipc")
const {service, httpApi} = require("./httpServer")
const {USER_INFO, HttpSetting} = require("./state")

const process = require("process")

process.on("uncaughtException", (error) => {
    console.info(error)
})

// 性能优化：https://juejin.cn/post/6844904029231775758

let flag = true // 是否展示关闭二次确认弹窗的标志位
let win
const createWindow = () => {
    getExtraKVPair((err) => {
        if (!err)
            flag = extrakvpairs.get("windows-close-flag") === undefined ? true : extrakvpairs.get("windows-close-flag")
    })

    win = new BrowserWindow({
        width: 1600,
        height: 1000,
        autoHideMenuBar: false,
        webPreferences: {
            preload: path.join(__dirname, "preload.js"),
            nodeIntegration: true,
            contextIsolation: false,
            sandbox: true
        }
    })

    // win.loadFile(path.resolve(__dirname, "../renderer/pages/main/index.html"))
    if (isDev) {
        win.loadURL("http://127.0.0.1:3000")
    } else {
        win.loadFile(path.resolve(__dirname, "../renderer/pages/main/index.html"))
    }

    // Open the DevTools.
    if (isDev) {
        win.webContents.openDevTools({mode: "detach"})
    }

    win.on("close", (e) => {
        e.preventDefault()

        if (flag) {
            dialog
                .showMessageBox(win, {
                    icon: nativeImage.createFromPath(path.join(__dirname, "../assets/yakitlogo.pic.jpg")),
                    type: "none",
                    title: "提示",
                    defaultId: 0,
                    cancelId: 3,
                    message: "确定要关闭吗？",
                    buttons: ["最小化", "直接退出"],
                    checkboxLabel: "不再展示关闭二次确认？",
                    checkboxChecked: false,
                    noLink: true
                })
                .then((res) => {
                    setExtraKVPair("windows-close-flag", !res.checkboxChecked)
                    if (res.response === 0) {
                        e.preventDefault()
                        win.minimize()
                    } else if (res.response === 1) {
                        win = null
                        clearing()
                        app.exit()
                    } else {
                        e.preventDefault()
                        return
                    }
                })
        } else {
            win = null
            clearing()
            app.exit()
        }
    })
    win.on("minimize", (e) => {
        win.webContents.send("refresh-token")
    })
    win.on("maximize", (e) => {
        win.webContents.send("refresh-token")
    })
    // 阻止内部react页面的链接点击跳转
    win.webContents.on("will-navigate", (e, url) => {
        e.preventDefault()
    })
}

app.whenReady().then(() => {
    createWindow()

    try {
        registerIPC(win)
    } catch (e) {}

    //
    // // autoUpdater.autoDownload = false
    // autoUpdater.checkForUpdates();
    // autoUpdater.signals.updateDownloaded(info => {
    //     console.info(info.downloadedFile)
    // })

    app.on("activate", function () {
        if (BrowserWindow.getAllWindows().length === 0) createWindow()
    })
})

app.on("window-all-closed", function () {
    clearing()
    app.quit()
    // macos quit;
    // if (process.platform !== 'darwin') app.quit()
})

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
        httpApi("get", typeApi[type], {code: params.get("code")})
            .then((res) => {
                // console.log("loginres", res)
                if (!authWindow) return
                if (res.code !== 200) {
                    authWindow.webContents.session.clearStorageData()
                    win.webContents.send("fetch-signin-data", {ok: false, info: res.reason || "请求异常，请重新登录！"})
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
                    user_id: info.user_id
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
                win.webContents.send("fetch-signin-data", {ok: false, info: "请求异常，请重新登录！"})
                authWindow.close()
            })
    })

    authWindow.on("close", () => {
        authWindow.webContents.session.clearStorageData()
        authWindow = null
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
    win.webContents.send("login-out")
})
