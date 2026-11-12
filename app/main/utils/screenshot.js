const { ipcMain, dialog, shell } = require('electron')
const fs = require('fs/promises')
const path = require('path')
const { randomUUID } = require('crypto')
const { getConfig, setConfig, getYakitHome } = require('../filePath')
const { captureYakitScreenshot } = require('../yakitScreenshot')
const { assertTrustedAppSender } = require('../security')

const watermarkPositions = ['top-left', 'top-right', 'bottom-left', 'bottom-right']

const getScreenshotSettings = () => {
  const defaultDirectory = path.join(getYakitHome(), 'screenshots')
  const config = getConfig()
  const directory = config.screenshotDirectory || defaultDirectory
  const watermark = config.screenshotWatermark || {}
  return {
    directory,
    defaultDirectory,
    watermarkEnabled: watermark.enabled !== false,
    watermarkPosition: watermarkPositions.includes(watermark.position) ? watermark.position : 'bottom-left',
  }
}

const saveScreenshot = async (win) => {
  const { directory, watermarkEnabled, watermarkPosition } = getScreenshotSettings()
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(new Error('Yakit page capture timed out')), 10000)
  let screenshot
  try {
    screenshot = await captureYakitScreenshot(win, controller.signal, { watermarkEnabled, watermarkPosition })
  } finally {
    clearTimeout(timer)
  }

  const timestamp = screenshot.capturedAt.slice(0, 19).replace(/[: ]/g, '-')
  const filename = path.join(directory, `screenshot-${timestamp}-${randomUUID()}.png`)
  await fs.mkdir(directory, { recursive: true, mode: 0o750 })
  const file = await fs.open(filename, 'wx', 0o600)
  try {
    await file.writeFile(Buffer.from(screenshot.data, 'base64'))
    await file.close()
  } catch (error) {
    await file.close().catch(() => {})
    await fs.unlink(filename).catch(() => {})
    throw error
  }
  return { path: filename, capturedAt: screenshot.capturedAt, width: screenshot.width, height: screenshot.height }
}

module.exports = {
  register: (win) => {
    const handle = (channel, callback) => {
      ipcMain.handle(channel, async (event, ...args) => {
        assertTrustedAppSender(event, channel)
        return callback(...args)
      })
    }

    handle('screenshot-capture-and-save', () => saveScreenshot(win))
    handle('screenshot-get-settings', getScreenshotSettings)
    handle('screenshot-update-watermark', (options) => {
      if (!options || typeof options !== 'object' || Array.isArray(options)) {
        throw new Error('Invalid screenshot watermark settings')
      }
      const current = getScreenshotSettings()
      const enabled = options.watermarkEnabled ?? current.watermarkEnabled
      const position = options.watermarkPosition ?? current.watermarkPosition
      if (typeof enabled !== 'boolean' || !watermarkPositions.includes(position)) {
        throw new Error('Invalid screenshot watermark settings')
      }
      if (!setConfig('screenshotWatermark', { enabled, position })) {
        throw new Error('Failed to save screenshot watermark settings')
      }
      return getScreenshotSettings()
    })
    handle('screenshot-select-directory', async () => {
      const result = await dialog.showOpenDialog(win, {
        defaultPath: getScreenshotSettings().directory,
        properties: ['openDirectory', 'createDirectory'],
      })
      if (result.canceled || !result.filePaths.length) return null
      const directory = result.filePaths[0]
      if (!setConfig('screenshotDirectory', directory)) throw new Error('Failed to save screenshot directory')
      return getScreenshotSettings()
    })
    handle('screenshot-reset-directory', () => {
      if (!setConfig('screenshotDirectory', '')) throw new Error('Failed to save screenshot directory')
      return getScreenshotSettings()
    })
    handle('screenshot-open-directory', async () => {
      const { directory } = getScreenshotSettings()
      await fs.mkdir(directory, { recursive: true, mode: 0o750 })
      const error = await shell.openPath(directory)
      if (error) throw new Error(error)
    })
  },
  // The engine connection window does not expose screenshot actions.
  registerNewIPC: () => {},
}
