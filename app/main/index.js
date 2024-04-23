const {app, BrowserWindow, dialog, nativeImage, globalShortcut, ipcMain, protocol, Menu} = require("electron")
const isDev = require("electron-is-dev")
const path = require("path")
const url = require("url")
const {registerIPC, clearing} = require("./ipc")
const process = require("process")
const {initExtraLocalCache, getExtraLocalCacheValue, initLocalCache, setCloeseExtraLocalCache} = require("./localCache")
const {asyncKillDynamicControl} = require("./handlers/dynamicControlFun")
const {windowStatePatch, engineLog, renderLog, printLog} = require("./filePath")
const fs = require("fs")
const Screenshots = require("./screenshots")
const windowStateKeeper = require("electron-window-state")
const {clearFolder} = require("./toolsFunc")
const {MenuTemplate} = require("./menu")

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
        const cacheFlag = getExtraLocalCacheValue(UICloseFlag)
        closeFlag = cacheFlag === undefined ? true : cacheFlag
    })
    let mainWindowState = windowStateKeeper({
        defaultWidth: 900,
        defaultHeight: 500,
        path: windowStatePatch,
        file: "yakit-window-state.json"
    })
    win = new BrowserWindow({
        x: mainWindowState.x,
        y: mainWindowState.y,
        width: mainWindowState.width,
        height: mainWindowState.height,
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
    win.setSize(mainWindowState.width, mainWindowState.height)
    mainWindowState.manage(win)
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

    win.on("close", async (e) => {
        e.preventDefault()
        mainWindowState.saveState(win)
        // 关闭app时通知渲染进程 渲染进程操作后再进行关闭
        win.webContents.send("close-windows-renderer")
    })
    win.on("minimize", (e) => {
        win.webContents.send("refresh-token")
        // 关闭app时通知渲染进程 渲染进程操作后再进行关闭
        win.webContents.send("minimize-windows-renderer")
    })
    win.on("maximize", (e) => {
        win.webContents.send("refresh-token")
    })
    // 阻止内部react页面的链接点击跳转
    win.webContents.on("will-navigate", (e, url) => {
        e.preventDefault()
    })
    // 录屏
    // globalShortcut.register("Control+Shift+X", (e) => {
    //     win.webContents.send("open-screenCap-modal")
    // })
}

/**
 * set software menu
 */

const menu = Menu.buildFromTemplate(MenuTemplate)
Menu.setApplicationMenu(menu)

app.whenReady().then(() => {
    // 截图功能的注册(功能和全局快捷键的注册)
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

        // globalShortcut.register("Control+Shift+b", () => {
        //     screenshots.startCapture()
        //     globalShortcut.register("esc", () => {
        //         screenshots.endCapture()
        //         globalShortcut.unregister("esc")
        //     })
        // })
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

    /**
     * error-log:
     * 存在则检查文件数量是否超过10个，超过则只保留最近10个文件
     * 不存在则新建文件夹
     */
    if (fs.existsSync(engineLog)) {
        clearFolder(engineLog, 9)
    } else {
        fs.mkdirSync(engineLog, {recursive: true})
    }
    if (fs.existsSync(renderLog)) {
        clearFolder(renderLog, 9)
    } else {
        fs.mkdirSync(renderLog, {recursive: true})
    }
    if (fs.existsSync(printLog)) {
        clearFolder(printLog, 9)
    } else {
        fs.mkdirSync(printLog, {recursive: true})
    }

    // 软件退出的逻辑
    ipcMain.handle("app-exit", async (e, params) => {
        const showCloseMessageBox = params.showCloseMessageBox
        if (closeFlag && showCloseMessageBox) {
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
                .then(async (res) => {
                    await setCloeseExtraLocalCache(UICloseFlag, !res.checkboxChecked)
                    await asyncKillDynamicControl()
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
            // close时关掉远程控制
            await asyncKillDynamicControl()
            win = null
            clearing()
            app.exit()
        }
    })

    // 协议
    protocol.registerFileProtocol("atom", (request, callback) => {
        const filePath = url.fileURLToPath("file://" + request.url.slice("atom://".length))
        callback(filePath)
    })

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

// 这个退出压根执行不到 win.on("close") 阻止了默认行为
app.on("window-all-closed", function () {
    clearing()
    app.quit()
    // macos quit;
    // if (process.platform !== 'darwin') app.quit()
})
