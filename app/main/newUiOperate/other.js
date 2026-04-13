const { ipcMain, shell } = require('electron')
const { assertTrustedAppSender, normalizeHttpUrl } = require('../security')

module.exports = {
  registerNewIPC: (win, getClient, ipcEventPre) => {
    /**
     * 打开外部链接
     * @description 需要渲染进程传入的url自带http或https协议头字符串
     */
    ipcMain.handle(ipcEventPre + 'open-url', (e, url) => {
      assertTrustedAppSender(e, ipcEventPre + 'open-url')
      return shell.openExternal(normalizeHttpUrl(url))
    })
  },
}
