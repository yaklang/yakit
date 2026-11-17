const { ipcMain, clipboard } = require('electron')
const { readClipboardImage } = require('../clipboardCompat')

const registerTextClipboard = (prefix = '') => {
  ipcMain.handle(prefix + 'set-clipboard-text', (_event, text) => clipboard.writeText(text))
  ipcMain.handle(prefix + 'get-clipboard-text', () => clipboard.readText())
}

module.exports = {
  register: () => {
    ipcMain.handle('check-clipboard-image', async () => {
      const image = await readClipboardImage()
      return !image.isEmpty()
    })
    ipcMain.handle('get-clipboard-image', async () => {
      const image = await readClipboardImage()
      return { size: image.getSize(), blob: image.toDataURL() }
    })
    registerTextClipboard()
  },
  registerNewIPC: (_win, _getClient, prefix) => registerTextClipboard(prefix),
}
