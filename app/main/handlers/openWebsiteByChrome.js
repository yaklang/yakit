const electronFull = require('electron')
const { ipcMain, shell } = electronFull
const { assertTrustedAppSender, normalizeHttpUrl, validateOpenPath } = require('../security')

module.exports = (win, getClient) => {
  ipcMain.handle('shell-open-external', async (e, url) => {
    assertTrustedAppSender(e, 'shell-open-external')
    await shell.openExternal(normalizeHttpUrl(url))
  })

  ipcMain.handle('shell-open-abs-file', async (e, file) => {
    assertTrustedAppSender(e, 'shell-open-abs-file')
    return shell.openPath(validateOpenPath(file))
  })
}
