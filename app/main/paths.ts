import { app } from 'electron'
import path from 'node:path'

export const appPath = (...segments: string[]) => path.join(app.getAppPath(), ...segments)
export const resourcePath = (...segments: string[]) => appPath('dist', 'electron', 'resources', ...segments)
export const preloadPath = (name: 'main' | 'engine-link' | 'screenshots') =>
  appPath('dist', 'electron', 'preload', `${name}.js`)
export const rendererPath = (name: 'main' | 'link' | 'aux' | 'screenshots') => {
  switch (name) {
    case 'main':
      return appPath('app', 'renderer', 'pages', 'main', 'index.html')
    case 'link':
      return appPath('app', 'renderer', 'engine-link-startup', 'dist', 'index.html')
    case 'aux':
      return appPath('app', 'renderer', 'pages', 'main', 'yakit-aux.html')
    case 'screenshots':
      return appPath('app', 'renderer', 'electron', 'electron.html')
  }
}
