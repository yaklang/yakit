import { sendEvent } from '../ipc/events'
import type { BrowserWindow } from 'electron'

export const registerWindowOperations = (win: BrowserWindow) => {
  /** 窗口最大化 */
  win.on('maximize', () => {
    sendEvent(win.webContents, 'callback-win-maximize')
  })
  /** 窗口退出最大化 */
  win.on('unmaximize', () => {
    sendEvent(win.webContents, 'callback-win-unmaximize')
  })
  /** 窗口全屏 */
  win.on('enter-full-screen', () => {
    sendEvent(win.webContents, 'callback-win-enter-full')
  })
  /** 窗口退出全屏 */
  win.on('leave-full-screen', () => {
    sendEvent(win.webContents, 'callback-win-leave-full')
  })
}
