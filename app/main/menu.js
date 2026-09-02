const { app } = require('electron')
const process = require('process')

const isMac = process.platform === 'darwin'

/**
 * @name mac系统专属应用上下文菜单项
 * @type {Electron.MenuItemConstructorOptions}
 */
const macAppMenu = {
  label: app.name,
  submenu: [
    { role: 'about' },
    { type: 'separator' },
    { role: 'services' },
    { type: 'separator' },
    { role: 'hide' },
    { role: 'hideOthers' },
    { role: 'unhide' },
    { type: 'separator' },
    { role: 'quit' },
  ],
}

/**
 * @name 开发者工具菜单项
 * @type {Electron.MenuItemConstructorOptions}
 */
const devToolMenu = {
  label: 'View',
  submenu: [
    { role: 'reload', accelerator: '' },
    { role: 'forceReload', accelerator: '' },
    { role: 'toggleDevTools' },
    { type: 'separator' },
    { role: 'resetZoom' },
    { role: 'zoomIn' },
    { role: 'zoomOut' },
    { type: 'separator' },
    { role: 'togglefullscreen' },
  ],
}

/** @name 软件顶部菜单 */
const MenuTemplate = [
  ...(isMac ? [macAppMenu] : []),
  { role: 'editMenu' },
  devToolMenu,
  { role: 'windowMenu' },
]

module.exports = { MenuTemplate }
