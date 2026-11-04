const { appResourcePath, preloadPath } = require('../../runtimePaths')
const { ipcMain, BrowserWindow } = require('electron')
const isDev = require('electron-is-dev')
const crypto = require('crypto')

module.exports = {
  register: (win, getClient) => {
    // 保存当前详情窗口及最新业务数据，供主窗口的控制、推送和子窗口的数据请求使用。
    let childWindow = null
    let childWindowData = null

    // 主窗口发送数据到子窗口
    ipcMain.on('minWin-send-to-childWin', async (e, params) => {
      childWindowData = params
      if (childWindow && !childWindow.isDestroyed()) {
        childWindow.webContents.send('get-parent-window-data', params)
      }
    })

    // 监听主窗口关闭子窗口
    ipcMain.on('close-childWin', () => {
      if (childWindow && !childWindow.isDestroyed()) {
        childWindow.close()
      }
    })

    // 监听主窗口最小化子窗口
    ipcMain.on('minimize-childWin', () => {
      if (childWindow && !childWindow.isDestroyed()) {
        childWindow.minimize()
      }
    })

    // 监听主窗口最大化子窗口
    ipcMain.on('maximize-childWin', () => {
      if (childWindow && !childWindow.isDestroyed()) {
        childWindow.maximize()
      }
    })

    // 监听主窗口还原子窗口
    ipcMain.on('restore-childWin', () => {
      if (childWindow && !childWindow.isDestroyed()) {
        childWindow.restore()
      }
    })

    // 监听主窗口触发子窗口显示但不激活
    ipcMain.on('onTop-childWin', () => {
      if (childWindow && !childWindow.isDestroyed()) {
        childWindow.showInactive()
        childWindow.moveTop()
      }
    })

    // 子窗口请求父窗口数据 / 触发并发流刷新（全局只注册一次，避免重复打开子窗口时监听器泄漏）
    ipcMain.on('request-parent-data', (event) => {
      if (!childWindowData) return
      if (childWindow && !childWindow.isDestroyed() && event.sender === childWindow.webContents) {
        event.sender.send('get-parent-window-data', childWindowData)
      }
    })

    ipcMain.handle('UIOperate-childWin', (e, params) => {
      switch (params) {
        case 'close':
          childWindow.close()
          return
        case 'min':
          childWindow.minimize()
          return
        case 'full':
          let isMax = childWindow.isFullScreen()
          if (isMax) {
            childWindow.setFullScreen(false)
            if (childWindow.isMaximized()) {
              setTimeout(() => {
                childWindow.unmaximize()
              }, 10)
            }
          } else childWindow.setFullScreen(true)
          return
        case 'max':
          if (childWindow.isMaximized()) childWindow.unmaximize()
          else childWindow.maximize()
          return

        default:
          return
      }
    })

    ipcMain.on('open-new-child-window', (event, data) => {
      childWindowData = data
      const windowHash = crypto.randomUUID()
      childWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        minWidth: 900,
        minHeight: 500,
        titleBarStyle: 'hidden', // 确保 macOS 有标题栏按钮
        webPreferences: {
          preload: preloadPath('main'),
          nodeIntegration: true,
          contextIsolation: false,
          sandbox: true,
        },
        show: false,
      })

      if (process.platform === 'darwin') childWindow.setWindowButtonVisibility(false)

      // 通知父窗口：带上 hash
      win.send('child-window-hash', { hash: windowHash })

      // 移除子窗口的菜单
      childWindow.setMenu(null)

      // 固定本次创建的窗口引用：childWindow 后续可能指向新窗口或被清空，
      // 异步加载、关闭回调仍须操作它们所属的窗口；这里不会复制或新建窗口。
      const openedWindow = childWindow
      // loading 页完成握手后，切换到现有 React 详情入口；只接受本窗口的消息。
      const onReadyToLoad = (event) => {
        if (openedWindow.isDestroyed() || event.sender !== openedWindow.webContents) return
        // 校验通过后再移除，避免其他窗口的消息消耗 once 监听，同时保证只跳转一次。
        ipcMain.removeListener('ready-to-load-child', onReadyToLoad)
        if (isDev) {
          openedWindow.loadURL('http://127.0.0.1:3000/?window=child')
        } else {
          openedWindow.loadFile(appResourcePath('renderer', 'pages', 'main', 'index.html'), {
            search: 'window=child',
          })
        }
      }
      ipcMain.on('ready-to-load-child', onReadyToLoad)

      openedWindow.webContents.once('did-finish-load', () => {
        openedWindow.show()
      })

      openedWindow.webContents.once('did-fail-load', (event, errorCode, errorDescription, validatedURL) => {
        // loading 页未能完成握手时也要清理，避免重开后遗留旧窗口的监听。
        ipcMain.removeListener('ready-to-load-child', onReadyToLoad)
        if (childWindow === openedWindow) {
          win.send('child-window-hash', { hash: '' })
        }
      })

      openedWindow.on('close', (e) => {
        e.preventDefault()
        openedWindow.destroy()
      })
      openedWindow.on('closed', () => {
        ipcMain.removeListener('ready-to-load-child', onReadyToLoad)
        // 仅清理当前实例的共享状态，避免旧窗口的 closed 回调清空新窗口及其数据。
        if (childWindow === openedWindow) {
          childWindow = null
          childWindowData = null
          win.send('child-window-hash', { hash: '' })
        }
      })

      // 复用 aux HTML 的静态加载模式；收到握手后仍进入原详情页，不启动 aux 应用。
      if (isDev) {
        openedWindow.loadURL('http://127.0.0.1:3000/yakit-aux.html?mode=child-loading')
      } else {
        openedWindow.loadFile(appResourcePath('renderer', 'pages', 'main', 'yakit-aux.html'), {
          search: 'mode=child-loading',
        })
      }
    })
  },
}
