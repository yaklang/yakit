const { ipcMain, shell, clipboard } = require('electron')
const Path = require('path')
const Fs = require('fs')
const { assertTrustedAppSender, normalizeHttpUrl } = require('../security')

module.exports = (win, getClient) => {
  /**
   * 打开外部链接
   * @description 需要渲染进程传入的url自带http或https协议头字符串
   */
  ipcMain.handle('open-url', (e, url) => {
    assertTrustedAppSender(e, 'open-url')
    return shell.openExternal(normalizeHttpUrl(url))
  })

  // 将绝对路径里的文件名(不带文件后缀)提取出来
  ipcMain.handle('fetch-path-file-name', (e, path) => {
    assertTrustedAppSender(e, 'fetch-path-file-name')
    const extension = Path.extname(path)
    return Path.basename(path, extension)
  })

  /** 判断目标路径文件是否存在 */
  ipcMain.handle('is-file-exists', (e, path) => {
    assertTrustedAppSender(e, 'is-file-exists')
    return Fs.existsSync(path)
  })
}
