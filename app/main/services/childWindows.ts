import { sendEvent } from '../ipc/events'
import { registerRenderer, registerMainMethod, invocationWindow } from '../ipc/index'
import { preloadPath, rendererPath, resourcePath } from '../paths'
import { BrowserWindow, type IpcMainEvent } from 'electron'
import isDev from 'electron-is-dev'
const path = require('path')
import crypto from 'node:crypto'

export function registerChildWindows(win: BrowserWindow) {
  let childWindow: BrowserWindow | null = null
  let childWindowData: unknown = null

  // 主窗口发送数据到子窗口
  registerMainMethod('minWin-send-to-childWin', async (params) => {
    childWindowData = params
    if (childWindow && !childWindow.isDestroyed()) {
      sendEvent(childWindow.webContents, 'get-parent-window-data', params)
    }
  })

  // 监听主窗口关闭子窗口
  registerMainMethod('close-childWin', () => {
    if (childWindow && !childWindow.isDestroyed()) {
      childWindow.close()
    }
  })

  // 监听主窗口最小化子窗口
  registerMainMethod('minimize-childWin', () => {
    if (childWindow && !childWindow.isDestroyed()) {
      childWindow.minimize()
    }
  })

  // 监听主窗口最大化子窗口
  registerMainMethod('maximize-childWin', () => {
    if (childWindow && !childWindow.isDestroyed()) {
      childWindow.maximize()
    }
  })

  // 监听主窗口还原子窗口
  registerMainMethod('restore-childWin', () => {
    if (childWindow && !childWindow.isDestroyed()) {
      childWindow.restore()
    }
  })

  // 监听主窗口触发子窗口显示但不激活
  registerMainMethod('onTop-childWin', () => {
    if (childWindow && !childWindow.isDestroyed()) {
      childWindow.showInactive()
      childWindow.moveTop()
    }
  })

  // 子窗口请求父窗口数据 / 触发并发流刷新（全局只注册一次，避免重复打开子窗口时监听器泄漏）
  registerMainMethod('request-parent-data', (_params, context) => {
    if (!childWindowData) return
    if (childWindow && !childWindow.isDestroyed() && invocationWindow(context) === childWindow) {
      sendEvent(childWindow.webContents, 'get-parent-window-data', childWindowData)
    }
  })

  registerMainMethod('UIOperate-childWin', (params) => {
    const target = childWindow
    if (!target || target.isDestroyed()) return
    switch (params) {
      case 'close':
        target.close()
        return
      case 'min':
        target.minimize()
        return
      case 'full':
        let isMax = target.isFullScreen()
        if (isMax) {
          target.setFullScreen(false)
          if (target.isMaximized()) {
            setTimeout(() => {
              target.unmaximize()
            }, 10)
          }
        } else target.setFullScreen(true)
        return
      case 'max':
        if (target.isMaximized()) target.unmaximize()
        else target.maximize()
        return

      default:
        return
    }
  })

  registerMainMethod('open-new-child-window', async (data) => {
    if (childWindow && !childWindow.isDestroyed()) childWindow.close()
    childWindowData = data
    const windowHash = crypto.randomUUID()
    const created = new BrowserWindow({
      width: 1200,
      height: 800,
      minWidth: 900,
      minHeight: 500,
      titleBarStyle: 'hidden', // 确保 macOS 有标题栏按钮
      webPreferences: {
        preload: preloadPath('main'),
        nodeIntegration: false,
        contextIsolation: false,
        sandbox: true,
      },
      show: false,
    })
    childWindow = created
    registerRenderer(created.webContents, 'main')

    if (process.platform === 'darwin') created.setWindowButtonVisibility(false)

    // 通知父窗口：带上 hash
    sendEvent(win.webContents, 'child-window-hash', { hash: windowHash })

    // 移除子窗口的菜单
    created.setMenu(null)

    // The loading page has no bridge logic; navigation follows its load completion.
    created.webContents.once('did-finish-load', () => {
      if (created.isDestroyed()) return
      created.show()
    })

    created.webContents.once('did-fail-load', (event, errorCode, errorDescription, validatedURL) => {
      sendEvent(win.webContents, 'child-window-hash', { hash: '' })
    })

    created.on('close', (e) => {
      e.preventDefault()
      created.destroy()
      sendEvent(win.webContents, 'child-window-hash', { hash: '' })
    })
    created.on('closed', () => {
      if (childWindow === created) {
        childWindow = null
        childWindowData = null
      }
      sendEvent(win.webContents, 'child-window-hash', { hash: '' })
    })
    await created.loadFile(resourcePath('child-window', 'index.html'))
    if (created.isDestroyed()) return
    if (isDev) await created.loadURL('http://127.0.0.1:3000/?window=child')
    else await created.loadFile(rendererPath('main'), { search: 'window=child' })
  })
}
