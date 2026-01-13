const {app, BrowserWindow, dialog, nativeImage, globalShortcut, ipcMain, protocol, Menu} = require("electron")
const isDev = require("electron-is-dev")
const path = require("path")
const url = require("url")
const {registerIPC, registerNewIPC} = require("./ipc")
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

/** 窗口对象 */
let win = null
let engineLinkWin = null

/** 是否展示关闭二次确认弹窗的标志位 */
let closeFlag = true

process.on("uncaughtException", (error) => {
    console.info(error)
})

// 性能优化：https://juejin.cn/post/6844904029231775758

// ======= 全局标志（每个窗口保证只注册一次） =======
let ipcRegistered = false

/**
 * ---------------- 创建 yakitEngineLink 窗口 ----------------
 */
function createEngineLinkWindow() {
    const state = windowStateKeeper({
        defaultWidth: 900,
        defaultHeight: 600,
        path: windowStatePatch,
        file: "link-window-state.json"
    })
    const hasPos = Number.isFinite(state.x) && Number.isFinite(state.y)

    engineLinkWin = new BrowserWindow({
        x: hasPos ? state.x : undefined,
        y: hasPos ? state.y : undefined,
        width: 900,
        height: 600,
        minWidth: 900,
        minHeight: 600,
        frame: false,
        autoHideMenuBar: true,
        resizable: false,
        webPreferences: {
            preload: path.join(__dirname, "engineLinkPreload.js"),
            nodeIntegration: true,
            contextIsolation: false,
            sandbox: true
        },
        titleBarStyle: "hidden",
        show: true,
        skipTaskbar: false,
        fullscreenable: false,
        maximizable: false
    })

    if (!hasPos) engineLinkWin.center()
    if (isDev) engineLinkWin.loadURL("http://127.0.0.1:5173")
    else engineLinkWin.loadFile(path.join(__dirname, "../renderer/engine-link-startup/dist/index.html"))

    engineLinkWin.webContents.setWindowOpenHandler(() => ({action: "deny"}))

    if (isDev) engineLinkWin.webContents.openDevTools({mode: "detach"})

    engineLinkWin.setMenu(null)
    engineLinkWin.setMenuBarVisibility(false)
    if (process.platform === "darwin") engineLinkWin.setWindowButtonVisibility(false)

    engineLinkWin.webContents.on("render-process-gone", (event, details) => {
        renderLogOutputFile(`----- engineLinkWin Render gone ------`)
        renderLogOutputFile(`reason: ${details.reason}, exitCode: ${details.exitCode}`)
        if (details.reason === "crashed") setLocalCache("render-crash-screen", true)
        require("./handlers/logger").saveLogs()
    })

    engineLinkWin.webContents.on("will-navigate", (e) => e.preventDefault())

    engineLinkWin.on("show", () => {
        state.manage(engineLinkWin)
    })

    engineLinkWin.on("close", (e) => {
        e.preventDefault()
        state.saveState(engineLinkWin)
        if (engineLinkWin.isVisible()) {
            engineLinkWin.webContents.send("close-engineLinkWin-renderer")
        }
    })

    engineLinkWin.on("closed", () => {
        engineLinkWin = null
    })
}

/**
 * ---------------- 创建主窗口 ----------------
 */
function createWindow() {
    const state = windowStateKeeper({
        defaultWidth: 900,
        defaultHeight: 650,
        path: windowStatePatch,
        file: "yakit-window-state.json"
    })

    win = new BrowserWindow({
        x: state.x,
        y: state.y,
        width: state.width,
        height: state.height,
        minWidth: 900,
        minHeight: 650,
        frame: false,
        autoHideMenuBar: true,
        webPreferences: {
            preload: path.join(__dirname, "preload.js"),
            nodeIntegration: true,
            contextIsolation: false,
            sandbox: true
        },
        titleBarStyle: "hidden",
        show: false,
        skipTaskbar: true
    })

    if (isDev) win.loadURL("http://127.0.0.1:3000")
    else win.loadFile(path.resolve(__dirname, "../renderer/pages/main/index.html"))

    if (isDev) win.webContents.openDevTools({mode: "detach"})

    win.setMenu(null)
    win.setMenuBarVisibility(false)
    if (process.platform === "darwin") win.setWindowButtonVisibility(false)

    win.webContents.setWindowOpenHandler(() => ({action: "deny"}))
    win.webContents.on("will-navigate", (e) => e.preventDefault())

    win.webContents.on("render-process-gone", (event, details) => {
        renderLogOutputFile(`----- Render gone ------`)
        renderLogOutputFile(`reason: ${details.reason}, exitCode: ${details.exitCode}`)
        if (details.reason === "crashed") setLocalCache("render-crash-screen", true)
        require("./handlers/logger").saveLogs()
    })

    win.on("show", () => {
        state.manage(win)
    })

    win.on("close", (e) => {
        e.preventDefault()
        state.saveState(win)
        if (win.isVisible()) {
            win.webContents.send("close-windows-renderer")
        }
    })

    win.on("minimize", () => {
        win.webContents.send("refresh-token")
        win.webContents.send("minimize-windows-renderer")
    })

    win.on("maximize", () => {
        win.webContents.send("refresh-token")
    })

    win.on("closed", () => {
        win = null
    })
}

/**
 * ---------------- 通用方法 ----------------
 */
// 窗口加载完再发送数据
function safeSend(targetWin, channel, data) {
    if (!targetWin || targetWin.isDestroyed()) return

    const sendFn = () => {
        try {
            targetWin.webContents.send(channel, data)
        } catch (e) {
            console.warn(`[safeSend] send failed: ${channel}`, e)
        }
    }

    if (targetWin.webContents.isLoading()) {
        targetWin.webContents.once("did-finish-load", sendFn)
    } else {
        sendFn()
    }
}
// 窗口隐藏
function winHide(targetWin) {
    if (targetWin && !targetWin.isDestroyed()) {
        targetWin.hide()
        targetWin.setSkipTaskbar(true)
    }
}
// 窗口显示
function winShow(targetWin) {
    if (targetWin && !targetWin.isDestroyed()) {
        targetWin.show()
        targetWin.focus()
        targetWin.setSkipTaskbar(false)
    }
}
// 窗口关闭
function winClose(targetWin, removeEvent) {
    if (targetWin && !targetWin.isDestroyed()) {
        removeEvent && targetWin.removeAllListeners("close")
        targetWin.close()
        targetWin = null
    }
}
// 获取当前窗口
function getActiveWindow() {
    // 优先：当前聚焦窗口
    const focused = BrowserWindow.getFocusedWindow()
    if (focused && !focused.isDestroyed()) {
        return focused
    }

    // 次优：可见窗口
    if (engineLinkWin?.isVisible()) return engineLinkWin
    if (win?.isVisible()) return win

    return null
}

/**
 * ---------------- 注册 IPC，只执行一次 ----------------
 */
function registerGlobalIPC() {
    if (ipcRegistered) return
    ipcRegistered = true

    // ------------------- 刷新相关 -------------------
    /** 刷新缓存 */
    ipcMain.handle("trigger-reload", () => {
        win.webContents.reload()
        winHide(win)
        engineLinkWin.webContents.reload()
        setTimeout(() => {
            winShow(engineLinkWin)
        }, 500)
        return
    })
    /** 强制清空刷新缓存 */
    ipcMain.handle("trigger-reload-cache", () => {
        win.webContents.reloadIgnoringCache()
        winHide(win)
        engineLinkWin.webContents.reloadIgnoringCache()
        setTimeout(() => {
            winShow(engineLinkWin)
        }, 500)
        return
    })

    // ------------------- 主题相关 -------------------
    ipcMain.handle("set-theme", (_e, theme) => {
        ;[
            // 通知所有窗口更新
            engineLinkWin
        ].forEach((w) => safeSend(w, "theme-updated", theme))
    })

    // ------------------- 窗口发送数据操作 -------------------
    // engineLink 完成操作
    ipcMain.handle("engineLinkWin-done", async (event, data) => {
        winHide(engineLinkWin)
        winShow(win)
        safeSend(win, "from-engineLinkWin", data)
    })

    // win 完成操作
    ipcMain.handle("yakitMainWin-done", async (event, data) => {
        winHide(win)
        winShow(engineLinkWin)
        safeSend(engineLinkWin, "from-win", data)
    })

    // win 远程连接通知 engineLink 更新 认证信息
    ipcMain.handle("updateCredential", async (event, data) => {
        safeSend(engineLinkWin, "from-win-updateCredential", data)
    })

    // ------------------- 软件重启逻辑 -------------------
    ipcMain.handle("relaunch", () => {
        winClose(engineLinkWin, true)
        winClose(win, true)
        closeAllLogHandles()
        app.relaunch()
        app.exit(0)
    })

    // ------------------- 软件退出逻辑 -------------------
    ipcMain.handle("app-exit", async (e, params) => {
        const {showCloseMessageBox, isIRify, isMemfit} = params
        const parentWindow = getActiveWindow()

        const exitCleanupOperation = () => {
            winClose(engineLinkWin, false)
            winClose(win, false)
            closeAllLogHandles()
            app.exit()
        }
        if (closeFlag && showCloseMessageBox && parentWindow) {
            const showIcon = isIRify
                ? "../assets/irify-close.png"
                : isMemfit
                ? "../assets/memfit-close.png"
                : "../assets/yakit-close.png"

            dialog
                .showMessageBox(parentWindow, {
                    icon: nativeImage.createFromPath(path.join(__dirname, showIcon)),
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
                        engineLinkWin?.minimize()
                        win?.minimize()
                    } else if (res.response === 1) {
                        exitCleanupOperation()
                    } else {
                        e.preventDefault()
                    }
                })
        } else {
            await asyncKillDynamicControl()
            exitCleanupOperation()
        }
    })

    // ------------------- 窗口通信注册 -------------------
    try {
        registerNewIPC(engineLinkWin, "EngineLink:")
        console.log("[engineLinkWin] registerNewIPC completed")
    } catch (err) {
        console.error("[engineLinkWin] registerNewIPC error:", err)
    }
    try {
        registerIPC(win)
        console.log("[Main] registerIPC completed")
    } catch (err) {
        console.error("[Main] registerIPC error:", err)
    }
}

/**
 * set software menu
 */
const menu = Menu.buildFromTemplate(MenuTemplate)
Menu.setApplicationMenu(menu)

/**
 * ---------------- App Ready ----------------
 */
app.whenReady().then(() => {
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

    // 截图功能注册
    if (["darwin", "win32"].includes(process.platform)) {
        const screenshots = new Screenshots({singleWindow: true})
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
        screenshots.on("ok", () => {
            if (screenshots.$win?.isFocused()) {
                screenshots.endCapture()
                globalShortcut.unregister("esc")
            }
        })
        screenshots.on("cancel", () => {
            globalShortcut.unregister("esc")
        })
    }

    // 注册协议
    protocol.registerFileProtocol("atom", (request, callback) => {
        const filePath = url.fileURLToPath("file://" + request.url.slice("atom://".length))
        callback(filePath)
    })

    try {
        getAllLogHandles()
    } catch (error) {}

    createEngineLinkWindow()
    createWindow()

    app.on("activate", function () {
        if (BrowserWindow.getAllWindows().length === 0) {
            createEngineLinkWindow()
        }
    })

    // IPC
    try {
        registerGlobalIPC()
    } catch (error) {}
})

/**
 * ---------------- 全局退出逻辑 ----------------
 */
// 这个退出压根执行不到 win.on("close") 阻止了默认行为
app.on("window-all-closed", () => {
    app.quit()
})
