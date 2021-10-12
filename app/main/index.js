const {app, BrowserWindow, globalShortcut} = require("electron");
const isDev = require("electron-is-dev");
const path = require("path");
const {registerIPC} = require("./ipc");

let win;
const createWindow = () => {
    win = new BrowserWindow({
        width: 1600, height: 1000,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
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
}

app.whenReady().then(() => {
    createWindow()

    registerIPC(win);

    app.on('activate', function () {
        if (BrowserWindow.getAllWindows().length === 0) createWindow()
    })
})

app.on('window-all-closed', function () {
    app.quit()
    // macos quit;
    // if (process.platform !== 'darwin') app.quit()
})

app.on('browser-window-focus', function () {
    globalShortcut.register("CommandOrControl+R", () => {
        console.log("CommandOrControl+R is pressed: Shortcut Disabled");
    });
    globalShortcut.register("F5", () => {
        console.log("F5 is pressed: Shortcut Disabled");
    });
});