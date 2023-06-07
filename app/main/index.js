const {app, BrowserWindow, dialog, nativeImage, globalShortcut, ipcMain, protocol, screen} = require("electron")
const isDev = require("electron-is-dev")
const path = require("path")
const url = require("url")
const {registerIPC, clearing} = require("./ipc")
const process = require("process")
const {initExtraLocalCache, getExtraLocalCacheValue, initLocalCache, setCloeseExtraLocalCache} = require("./localCache")
const {asyncKillDynamicControl} = require("./handlers/dynamicControlFun")
const {engineLog} = require("./filePath")
const fs = require("fs")
const Screenshots = require("./screenshots")
const windowStateKeeper = require("electron-window-state")

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
    let mainWindowState = getBrowserWindow()
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
    // 将窗口的位置和大小保存到文件中
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
        // 关闭app时通知渲染进程 渲染进程操作后再进行关闭
        win.webContents.send("close-windows-renderer")
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
    // 录屏
    globalShortcut.register("Control+Shift+X", (e) => {
        win.webContents.send("open-screenCap-modal")
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

        ipcMain.handle("app-exit", async (e, params) => {
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

app.on("window-all-closed", function () {
    clearing()
    app.quit()
    // macos quit;
    // if (process.platform !== 'darwin') app.quit()
})
/**@description 获取缓存的屏幕参数，位置以及宽高 */
function getBrowserWindow() {
    // 使用 electron-window-state 模块来获取窗口状态
    let windowState = windowStateKeeper({
        defaultWidth: 1200 * screen.getPrimaryDisplay().scaleFactor,
        defaultHeight: 1000 * screen.getPrimaryDisplay().scaleFactor
    })
    // 获取所有可用的屏幕
    let displays = screen.getAllDisplays()
    // 获取第二个屏幕的大小和位置
    let externalDisplay = displays.find((display) => {
        return display.bounds.x !== 0 || display.bounds.y !== 0
    })
    // 如果找到了第二个屏幕，则将窗口放置在第二个屏幕上
    if (externalDisplay) {
        // 将窗口的位置设置为第二个屏幕
        windowState.x = externalDisplay.bounds.x
        windowState.y = externalDisplay.bounds.y
    }
    return windowState
}
