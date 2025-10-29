const {app, BrowserWindow, dialog, nativeImage, globalShortcut, ipcMain, protocol, Menu} = require("electron")
const isDev = require("electron-is-dev")
const path = require("path")
const url = require("url")
const {registerIPC, clearing} = require("./ipc")
const process = require("process")
const {
    initExtraLocalCache,
    getExtraLocalCacheValue,
    initLocalCache,
    setCloeseExtraLocalCache,
    setLocalCache
} = require("./localCache")
const {asyncKillDynamicControl} = require("./handlers/dynamicControlFun")
const {windowStatePatch} = require("./filePath")
const Screenshots = require("./screenshots")
const windowStateKeeper = require("electron-window-state")
const {MenuTemplate} = require("./menu")
const {renderLogOutputFile, getAllLogHandles, closeAllLogHandles, initAllLogFolders} = require("./logFile")

/** 获取缓存数据-软件是否需要展示关闭二次确认弹框 */
const UICloseFlag = "windows-close-flag"

/** 主进程窗口对象 */
let win
/** yakitEngineLink 窗口对象 */
let yakitEngineLinkWin
// 是否展示关闭二次确认弹窗的标志位
let closeFlag = true

process.on("uncaughtException", (error) => {
    console.info(error)
})

// 性能优化：https://juejin.cn/post/6844904029231775758

// ---------------- 创建yakitEngineLink窗口 ----------------
const createYakitEngineLinkWindow = () => {
    const yakitEngineLinkWindowState = windowStateKeeper({
        defaultWidth: 900,
        defaultHeight: 500,
        path: windowStatePatch,
        file: "yakit-window-state.json"
    })

    yakitEngineLinkWin = new BrowserWindow({
        parent: win || undefined, // 如果有父窗口，则附着
        modal: !!win, // 父窗口存在时设置模态
        alwaysOnTop: true, // 确保在父窗口之上
        x: yakitEngineLinkWindowState.x,
        y: yakitEngineLinkWindowState.y,
        width: yakitEngineLinkWindowState.width,
        height: yakitEngineLinkWindowState.height,
        minWidth: 900,
        minHeight: 500,
        frame: false,
        autoHideMenuBar: true,
        webPreferences: {
            preload: path.join(__dirname, "preload.js"),
            nodeIntegration: true,
            contextIsolation: false,
            sandbox: true
        },
        titleBarStyle: "hidden"
    })

    yakitEngineLinkWindowState.manage(yakitEngineLinkWin)

    // 页面加载
    if (isDev) {
        yakitEngineLinkWin.loadURL("http://127.0.0.1:5173")
    } else {
        // yakitEngineLinkWin.loadFile(path.join(__dirname, "../renderer/pages/temp/index.html"))
    }

    // 阻止新窗口
    yakitEngineLinkWin.webContents.setWindowOpenHandler((details) => {
        console.log("捕获 window.open:", details.url)
        return {action: "deny"}
    })

    // 尺寸
    yakitEngineLinkWin.setSize(yakitEngineLinkWindowState.width, yakitEngineLinkWindowState.height)

    // DevTools
    if (isDev) yakitEngineLinkWin.webContents.openDevTools({mode: "detach"})

    // 菜单和 macOS 按钮
    yakitEngineLinkWin.setMenu(null)
    yakitEngineLinkWin.setMenuBarVisibility(false)
    if (process.platform === "darwin") tempWin.setWindowButtonVisibility(false)

    // 渲染进程崩溃监听
    yakitEngineLinkWin.webContents.on("render-process-gone", (event, details) => {
        // 发送渲染端崩溃事件
        renderLogOutputFile(`----- YakitEngineLinkWin Render process is gone ------`)
        renderLogOutputFile(`YakitEngineLinkWin Render process: ${details.reason}, exitcode: ${details.exitCode}`)
        if (details.reason === "crashed") {
            // 如果渲染端崩溃了，设置渲染端崩溃标记位
            setLocalCache("render-crash-screen", true)
        }
        // 记录logger日志
        require("./handlers/logger").saveLogs()
    })

    // 阻止内部react页面的链接点击跳转
    yakitEngineLinkWin.webContents.on("will-navigate", (e, url) => {
        e.preventDefault()
    })

    // 窗口事件
    yakitEngineLinkWin.on("close", (e) => {
        // e.preventDefault()
        yakitEngineLinkWindowState.saveState(win)
        // 关闭app时通知渲染进程 渲染进程操作后再进行关闭
        // yakitEngineLinkWin.webContents.send("close-yakitEngineLinkWin-renderer")
    })
    yakitEngineLinkWin.on("minimize", () => {})
    yakitEngineLinkWin.on("maximize", () => {})
    yakitEngineLinkWin.on("closed", () => {
        yakitEngineLinkWin = null
    })
}
const createWindow = () => {
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
    win.webContents.setWindowOpenHandler(({url}) => {
        console.log("prevent new-window in main window, u: ", url)
        return {action: "deny"}
    })
    win.webContents.on("new-window", (e) => {
        console.log("prevent new-window in main window")
        e.preventDefault()
    })

    // 监听渲染端的崩溃事件
    win.webContents.on("render-process-gone", (event, details) => {
        // 发送渲染端崩溃事件
        renderLogOutputFile(`----- Render process is gone ------`)
        renderLogOutputFile(`Render process: ${details.reason}, exitcode: ${details.exitCode}`)
        if (details.reason === "crashed") {
            // 如果渲染端崩溃了，设置渲染端崩溃标记位
            setLocalCache("render-crash-screen", true)
        }
        // 记录logger日志
        require("./handlers/logger").saveLogs()
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

    // 监听主进程所有错误信息
    // process.on("uncaughtException", (err, origin) => {
    //     console.log(`Caught exception: ${err}\n` + `Exception origin: ${origin}`)
    // })

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
     * init-log-folders:
     * 存在则检查文件数量是否超过10个，超过则只保留最近10个文件
     * 不存在则新建文件夹
     */
    initAllLogFolders()

    /** 获取缓存数据并储存于软件内 */
    initLocalCache()
    /** 获取扩展缓存数据并储存于软件内(是否弹出关闭二次确认弹窗) */
    initExtraLocalCache(() => {
        const cacheFlag = getExtraLocalCacheValue(UICloseFlag)
        closeFlag = cacheFlag === undefined ? true : cacheFlag
    })

    // 协议
    protocol.registerFileProtocol("atom", (request, callback) => {
        const filePath = url.fileURLToPath("file://" + request.url.slice("atom://".length))
        callback(filePath)
    })

    // 创建yakitEngineLink窗口
    createYakitEngineLinkWindow()
    app.on("activate", function () {
        if (BrowserWindow.getAllWindows().length === 0) createYakitEngineLinkWindow()
    })
    ipcMain.handle("open-yakitEngineLinkWin-window", (event, data) => {
        win?.minimize()
        createYakitEngineLinkWindow()
    })

    // IPC：yakitEngineLinkWin 完成操作
    ipcMain.on("yakitEngineLinkWin-done", async (event, data) => {
        console.log("YakitEngineLinkWin 页面完成操作，接收到数据:", data)
        if (yakitEngineLinkWin) {
            yakitEngineLinkWin.close() // 关闭 yakitEngineLinkWin 窗口
            yakitEngineLinkWin = null
        }

        // 创建或显示主窗口
        if (!win) {
            createWindow()
        } else {
            win.show()
            win.focus()
        }

        try {
            registerIPC(win)
        } catch (e) {}
    })

    try {
        getAllLogHandles()
    } catch (e) {}

    // 软件退出的逻辑
    ipcMain.handle("app-exit", async (e, params) => {
        const {isYakitEngineLinkWin, showCloseMessageBox, isIRify} = params
        const parentWindow = isYakitEngineLinkWin ? yakitEngineLinkWin : win
        const exitCleanupOperation = () => {
            if (yakitEngineLinkWin) {
                yakitEngineLinkWin.close()
                yakitEngineLinkWin = null
            }
            if (win) {
                win.close()
                win = null
            }
            closeAllLogHandles()
            app.exit()
        }
        if (closeFlag && showCloseMessageBox && parentWindow) {
            dialog
                .showMessageBox(parentWindow, {
                    icon: nativeImage.createFromPath(
                        path.join(
                            __dirname,
                            isIRify ? "../renderer/src/main/src/assets/yakitSS.png" : "../assets/yakitlogo.pic.jpg"
                        )
                    ),
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
                        yakitEngineLinkWin?.minimize()
                        win?.minimize()
                    } else if (res.response === 1) {
                        exitCleanupOperation()
                    } else {
                        e.preventDefault()
                        return
                    }
                })
        } else {
            // close时关掉远程控制
            await asyncKillDynamicControl()
            exitCleanupOperation()
        }
    })
})

// 这个退出压根执行不到 win.on("close") 阻止了默认行为
app.on("window-all-closed", function () {
    app.quit()
    // macos quit;
    // if (process.platform !== 'darwin') app.quit()
})
