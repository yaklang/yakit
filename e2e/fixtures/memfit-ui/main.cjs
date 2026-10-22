const { app, BrowserWindow } = require('electron')
const path = require('node:path')
const profile = process.env.MEMFIT_UI_PROFILE
if (!profile || !path.isAbsolute(profile) || !process.env.MEMFIT_UI_HTML) throw new Error('Use test:memfit-ui:electron')
app.setPath('userData', profile)
app.whenReady().then(() => {
  const window = new BrowserWindow({
    width: 1100,
    height: 850,
    webPreferences: { contextIsolation: true, nodeIntegration: false },
  })
  window.loadFile(process.env.MEMFIT_UI_HTML)
})
app.on('window-all-closed', () => app.quit())
