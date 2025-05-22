
const { ipcMain, BrowserWindow } = require("electron")
const isDev = require("electron-is-dev")
const path = require("path")
const crypto = require("crypto")

// 子窗口集合
const childWindows = new Map() // key: hash, value: BrowserWindow

module.exports = {
  register: (win, getClient) => {
    // 只注册一次全局 handler
    ipcMain.handle("minWin-send-to-childWin", async (e, params) => {
      const targetWin = childWindows.get(params.hash)
      if (targetWin && !targetWin.isDestroyed()) {
        targetWin.webContents.send('get-parent-window-data', params)
      }
    })

    ipcMain.on('open-new-child-window', (event, data) => {
      const windowHash = crypto.randomUUID()
      let childWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        minWidth: 900,
        minHeight: 500,
        titleBarStyle: 'default', // 确保 macOS 有标题栏按钮
        webPreferences: {
          preload: path.join(__dirname, '../preload.js'),
          nodeIntegration: true,
          contextIsolation: false,
          sandbox: true
        },
        show: false
      })

      // 绑定 hash 到 Map
      childWindows.set(windowHash, childWindow)

      // 通知父窗口：带上 hash
      win.send('child-window-hash', { hash: windowHash })

      // 移除子窗口的菜单
      childWindow.setMenu(null)

      // 让子窗口加载和主窗口相同的 HTML 文件
      if (isDev) {
        childWindow.loadURL("http://127.0.0.1:3000/?window=child")
      } else {
        childWindow.loadFile(path.resolve(__dirname, "../../renderer/pages/main/index.html"), { search: "window=child" })
      }

      // 在子窗口加载完成后，向其发送数据
      childWindow.webContents.once('did-finish-load', () => {
        childWindow.show();
        // childWindow.webContents.openDevTools();
        childWindow.webContents.send('get-parent-window-data', data)
      })

      childWindow.on('close', (e) => {
        e.preventDefault()
        childWindow.destroy()
      })
      childWindow.on('closed', () => {
        childWindows.delete(windowHash)
        childWindow = null
      })

      childWindow.on("focus", () => {
        // 通知父窗口：带上 hash
        win.send('child-window-hash', { hash: windowHash })
      })
    })
  }
}

