import { dialog, app, type OpenDialogOptions, type SaveDialogOptions } from 'electron'

export const handleOpenFileSystem = (options: OpenDialogOptions = {}) =>
  dialog.showOpenDialog({
    defaultPath: app.getPath('desktop'),
    ...options,
  })

export const handleSaveFileSystem = (options: SaveDialogOptions = {}) =>
  dialog.showSaveDialog({
    defaultPath: app.getPath('desktop'),
    ...options,
  })
