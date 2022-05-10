const {app, BrowserWindow, dialog, nativeImage} = require("electron");
const isDev = require("electron-is-dev");
const path = require("path");
const { extrakvpairs, getExtraKVPair, setExtraKVPair } = require("./handlers/upgradeUtil");
const {registerIPC, clearing} = require("./ipc");

// 性能优化：https://juejin.cn/post/6844904029231775758

let flag = true // 是否展示关闭二次确认弹窗的标志位
let win;
const createWindow = () => {
    getExtraKVPair((err) => {
        if(!err) flag = extrakvpairs.get('windows-close-flag') === undefined ? true : extrakvpairs.get('windows-close-flag')
    })

    win = new BrowserWindow({
        width: 1600, height: 1000,
        minWidth: 1280, minHeight: 720,
        webPreferences: {
            preload: path.join(__dirname, "preload.js"),
            nodeIntegration: false,
            contextIsolation: false,
            sandbox: true,
        },
    })

    // win.loadFile(path.resolve(__dirname, "../renderer/pages/main/index.html"))
    if (isDev) {
        win.loadURL("http://127.0.0.1:3000")
    } else {
        win.loadFile(path.resolve(__dirname, "../renderer/pages/main/index.html"))
    }

    // Open the DevTools.
    if (isDev) {
        win.webContents.openDevTools({mode: 'detach'});
    }

    win.on('close', (e) => {
        e.preventDefault()

        if(flag){
            dialog.showMessageBox(win, {
                icon: nativeImage.createFromPath(path.join(__dirname, "../assets/yakitlogo.pic.jpg")),
                type: 'none',
                title: '提示',
                defaultId: 0,
                cancelId: 3,
                message: '确定要关闭吗？',
                buttons: ['最小化','直接退出'],
                checkboxLabel: "不再展示关闭二次确认？",
                checkboxChecked: false,
                noLink: true
            }).then((res) => {
                setExtraKVPair('windows-close-flag', !res.checkboxChecked)
                if(res.response === 0){
                  e.preventDefault()
                  win.minimize();
                } else if(res.response === 1) {
                  win = null;
                  clearing();
                  app.exit();
                } else {
                    e.preventDefault()
                    return
                }
            })
        }else{
            win = null;
            clearing();
            app.exit();
        }
    })
    
    // 阻止内部react页面的链接点击跳转
    win.webContents.on('will-navigate', (e, url) => {
        e.preventDefault()
    })
}

app.whenReady().then(() => {
    createWindow()

    try{
        registerIPC(win);
    }catch (e) {
    }

    //
    // // autoUpdater.autoDownload = false
    // autoUpdater.checkForUpdates();
    // autoUpdater.signals.updateDownloaded(info => {
    //     console.info(info.downloadedFile)
    // })

    app.on('activate', function () {
        if (BrowserWindow.getAllWindows().length === 0) createWindow()
    })
})

app.on('window-all-closed', function () {
    clearing();
    app.quit();
    // macos quit;
    // if (process.platform !== 'darwin') app.quit()
})