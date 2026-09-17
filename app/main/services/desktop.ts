import { getConfig, setConfig, getYakitHome, getAppConfigDir } from '../filePath'
import { calculateEngineHashes } from './files'
import { app, clipboard, shell } from 'electron'
import fs from 'node:fs'
import path from 'node:path'
import { invocationWindow, invocationRole, registerMainMethod } from '../ipc/index'
import { normalizeHttpUrl, validateOpenPath } from '../security'
import { handleOpenFileSystem, handleSaveFileSystem } from './fileDialog'
import {
  openEngineLogFolder,
  openRenderLogFolder,
  openPrintLogFolder,
  renderLogOutputFile,
  printLogOutputFile,
} from '../logFile'
import { registerCache, setLocalCache } from '../localCache'

export function registerDesktopServices() {
  registerMainMethod(
    'get-yakit-home-config',
    () => ({ ...getConfig(), currentHome: getYakitHome(), configDir: getAppConfigDir() }),
    ['main', 'link'],
  )
  registerMainMethod('set-yakit-home-config', ({ key, value }) => ({ success: setConfig(key, value) }), [
    'main',
    'link',
  ])
  registerMainMethod(
    'relaunch-app',
    () => {
      app.relaunch()
      app.exit(0)
    },
    ['main', 'link'],
  )
  registerMainMethod(
    'get-dir-size',
    async (dirPath, context) => {
      const calcSize = async (dir: string): Promise<number> => {
        let size = 0
        try {
          const entries = await fs.promises.readdir(dir, { withFileTypes: true })
          for (let i = 0; i < entries.length; i++) {
            if (i % 200 === 0) {
              context.signal.throwIfAborted()
              await new Promise((resolve) => setImmediate(resolve))
            }
            const fullPath = path.join(dir, entries[i].name)
            if (entries[i].isFile()) {
              try {
                const stat = await fs.promises.stat(fullPath)
                size += stat.size
              } catch {
                /* ignore single file stat errors */
              }
            } else if (entries[i].isDirectory()) {
              size += await calcSize(fullPath)
            }
          }
        } catch {
          /* ignore unreadable directories */
        }
        return size
      }
      if (!dirPath) return 0
      try {
        await fs.promises.access(dirPath)
      } catch {
        return 0
      }
      return calcSize(dirPath)
    },
    ['main', 'link'],
  )
  registerCache()
  const shared = ['main', 'link'] as const
  registerMainMethod(
    'CalcEngineSha265',
    (_params, context) => calculateEngineHashes(context.signal, invocationRole(context) === 'main'),
    shared,
  )
  registerMainMethod('open-url', (url) => shell.openExternal(normalizeHttpUrl(url)), shared)
  registerMainMethod('shell-open-external', (url) => shell.openExternal(normalizeHttpUrl(url)))
  registerMainMethod('shell-open-abs-file', (file) => shell.openPath(validateOpenPath(file)))
  registerMainMethod('fetch-path-file-name', (file) => path.basename(file, path.extname(file)))
  registerMainMethod('is-file-exists', (file) => fs.existsSync(file))
  registerMainMethod('open-file-system-dialog', (params) => handleOpenFileSystem(params), shared)
  registerMainMethod('save-file-system-dialog', (params) => handleSaveFileSystem(params))
  registerMainMethod(
    'set-clipboard-text',
    (text) => {
      if (typeof text !== 'string') throw new Error('Clipboard text must be a string')
      clipboard.writeText(text)
    },
    shared,
  )
  registerMainMethod('get-clipboard-text', () => clipboard.readText(), shared)
  registerMainMethod('check-clipboard-image', () => !clipboard.readImage().isEmpty())
  registerMainMethod('get-clipboard-image', () => {
    const image = clipboard.readImage()
    return { size: image.getSize(), blob: image.toDataURL() }
  })
  registerMainMethod(
    'UIOperate',
    (operation, context) => {
      const win = invocationWindow(context)
      switch (operation) {
        case 'close':
          win.close()
          break
        case 'min':
          win.minimize()
          break
        case 'max':
          if (win.isMaximized()) win.unmaximize()
          else win.maximize()
          break
        case 'full': {
          const exiting = win.isFullScreen()
          win.setFullScreen(!exiting)
          if (exiting && win.isMaximized())
            setTimeout(() => {
              if (!win.isDestroyed()) win.unmaximize()
            }, 10)
          break
        }
        default:
          throw new Error('Invalid window operation')
      }
    },
    shared,
  )
  registerMainMethod('is-full-screen', (_params, context) => invocationWindow(context).isFullScreen(), shared)
  registerMainMethod('is-maximize-screen', (_params, context) => invocationWindow(context).isMaximized(), shared)
  registerMainMethod('trigger-devtool', (_params, context) => {
    const contents = invocationWindow(context).webContents
    if (contents.isDevToolsOpened()) contents.closeDevTools()
    else contents.openDevTools()
  })
  registerMainMethod(
    'render-crash-flag',
    () => {
      setLocalCache('render-crash-screen', true)
    },
    shared,
  )
  registerMainMethod(
    'open-engine-log',
    () => {
      openEngineLogFolder()
    },
    shared,
  )
  registerMainMethod(
    'open-render-log',
    () => {
      openRenderLogFolder()
    },
    shared,
  )
  registerMainMethod(
    'open-print-log',
    () => {
      openPrintLogFolder()
    },
    shared,
  )
  registerMainMethod(
    'render-error-log',
    (content) => {
      if (typeof content !== 'string') throw new Error('Invalid error log')
      if (content) renderLogOutputFile(content)
    },
    shared,
  )
  registerMainMethod(
    'debug-print-log',
    (content) => {
      if (typeof content !== 'string') throw new Error('Invalid debug log')
      if (content) printLogOutputFile(content)
    },
    shared,
  )
}
