
const { ipcMain, BrowserWindow } = require("electron")
const isDev = require("electron-is-dev")
const path = require("path")
module.exports = {
  register: (win, getClient) => {
    ipcMain.on('open-new-child-window', (event, data) => {
      childWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        minWidth: 900,
        minHeight: 500,
        parent: win,
        webPreferences: {
          preload: path.join(__dirname, '../preload.js'),
          nodeIntegration: true,
          contextIsolation: false,
          sandbox: true
        },
        show: false
      })

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

      childWindow.on('closed', () => {
        childWindow = null
      })
    })
  }
}

