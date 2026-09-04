const { ipcMain, dialog, app } = require('electron')
const path = require('path')
const { assertApplicationWindowSender, assertExpectedWindowSender } = require('../security')
const { grantOpenDialogResult, grantSaveDialogResult } = require('../fileAccessPolicy')

/**
 * @name 选择文件-打开系统文件弹窗
 * @param {Electron.OpenDialogOptions} options
 * @return {Promise<Electron.OpenDialogReturnValue>}
 */
const handleOpenFileSystem = (options) => {
  return new Promise(async (resolve, reject) => {
    try {
      const object = await dialog.showOpenDialog({
        defaultPath: path.join(app.getPath('desktop')),
        ...options,
      })
      resolve({ ...object })
    } catch (error) {
      reject(error)
    }
  })
}

/**
 * @name 保存文件-打开系统文件弹窗
 * @param {Electron.SaveDialogOptions} options
 * @return {Promise<Electron.SaveDialogReturnValue>}
 */
const handleSaveFileSystem = (options) => {
  return new Promise(async (resolve, reject) => {
    try {
      const obejct = await dialog.showSaveDialog({
        defaultPath: path.join(app.getPath('desktop')),
        ...options,
      })
      resolve({ ...obejct })
    } catch (error) {
      reject(error)
    }
  })
}

module.exports = {
  handleOpenFileSystem: handleOpenFileSystem,
  handleSaveFileSystem: handleSaveFileSystem,
  register: (win, getClient) => {
    ipcMain.handle('open-file-system-dialog', async (event, params) => {
      assertApplicationWindowSender(event, 'open-file-system-dialog')
      return grantOpenDialogResult(event, await handleOpenFileSystem(params))
    })

    ipcMain.handle('save-file-system-dialog', async (event, params) => {
      assertApplicationWindowSender(event, 'save-file-system-dialog')
      return grantSaveDialogResult(event, await handleSaveFileSystem(params))
    })
  },
  registerNewIPC: (win, getClient, ipcEventPre) => {
    ipcMain.handle(ipcEventPre + 'open-file-system-dialog', async (event, params) => {
      assertExpectedWindowSender(event, win, ipcEventPre + 'open-file-system-dialog')
      return grantOpenDialogResult(event, await handleOpenFileSystem(params))
    })
  },
}
