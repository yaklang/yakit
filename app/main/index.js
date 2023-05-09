const {app, BrowserWindow, dialog, nativeImage, globalShortcut, ipcMain} = require("electron")
const isDev = require("electron-is-dev")
const path = require("path")
const {registerIPC, clearing} = require("./ipc")
const process = require("process")
const {
    initExtraLocalCache,
    getExtraLocalCacheValue,
    initLocalCache,
    setExtraLocalCache,
} = require("./localCache")
const { engineLog } = require("./filePath")
const fs = require("fs")
const Screenshots = require("./screenshots")

/** 获取缓存数据-软件是否需要展示关闭二次确认弹框 */
const UICloseFlag = "windows-close-flag"

/** 主进程窗口对象 */
let win
// 是否展示关闭二次确认弹窗的标志位
let closeFlag = true

process.on("uncaughtException", (error) => {
    console.info(error)
})

// 性能优化：https://juejin.cn/post/6844904029231775758

const createWindow = () => {
    /** 获取缓存数据并储存于软件内 */
    initLocalCache()
    /** 获取扩展缓存数据并储存于软件内(是否弹出关闭二次确认弹窗) */
    initExtraLocalCache(() => {
        const cacheFlag = getExtraLocalCacheValue(UICloseFlag);
        closeFlag = cacheFlag === undefined ? true : cacheFlag;
    })

    win = new BrowserWindow({
        width: 1600,
        height: 1000,
        minWidth: 900,
        minHeight: 500,
        autoHideMenuBar: true,
        webPreferences: {
            preload: path.join(__dirname, "preload.js"),
            nodeIntegration: true,
            contextIsolation: false,
            sandbox: true
        },
        frame: false,
        titleBarStyle: "hidden"
    })

    if (isDev) {
        win.loadURL("http://127.0.0.1:3000")
    } else {
        win.loadFile(path.resolve(__dirname, "../renderer/pages/main/index.html"))
    }

    // Open the DevTools.
    if (isDev) {
        win.webContents.openDevTools({mode: "detach"})
    }

    win.setMenu(null)
    win.setMenuBarVisibility(false)
    if (process.platform === "darwin") win.setWindowButtonVisibility(false)

    win.on("close", (e) => {
        e.preventDefault()

        if (closeFlag) {
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
                    setExtraLocalCache(UICloseFlag, !res.checkboxChecked)
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
    try {
        fs.unlinkSync(engineLog)
    } catch (e) {
        console.info(`unlinkSync 'engine.log' local cache failed: ${e}`, e)
    }

    if (["darwin", "win32"].includes(process.platform)) {
        const screenshots = new Screenshots({
            singleWindow: true
        })

        ipcMain.handle("activate-screenshot", () => {
            screenshots.startCapture()
            globalShortcut.register("esc", () => {
                screenshots.endCapture()
                globalShortcut.unregister("esc")
            })
        })

        globalShortcut.register("Control+Shift+b", () => {
            screenshots.startCapture()
            globalShortcut.register("esc", () => {
                screenshots.endCapture()
                globalShortcut.unregister("esc")
            })
        })
        globalShortcut.register("Control+Shift+q", () => {
            screenshots.endCapture()
            globalShortcut.unregister("esc")
        })

        // 点击确定按钮回调事件
        screenshots.on("ok", (e, buffer, bounds) => {
            if (screenshots.$win?.isFocused()) {
                screenshots.endCapture()
                globalShortcut.unregister("esc")
            }
        })
        // 点击取消按钮回调事件
        screenshots.on("cancel", () => {
            globalShortcut.unregister("esc")
        })
    }

    createWindow()

    try {
        registerIPC(win)
    } catch (e) {
    }

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
