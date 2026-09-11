import path from 'node:path'
import { fileURLToPath } from 'node:url'

const specDir = path.dirname(fileURLToPath(import.meta.url))
const screenshotModulePath = path.resolve(specDir, '../../../app/main/yakitScreenshot.js')
const syntheticPage = `<!doctype html>
<html>
  <head>
    <meta charset="utf-8">
    <style>
      * { box-sizing: border-box; }
      html, body { width: 100%; height: 100%; margin: 0; overflow: hidden; }
      body { background: #183153; }
      .top { height: 50%; background: #f2c94c; }
      .bottom { height: 50%; background: #2d9cdb; }
    </style>
  </head>
  <body>
    <div class="top"></div>
    <div class="bottom"></div>
  </body>
</html>`

describe('Yakit screenshot capture', () => {
  let capture

  before(async () => {
    capture = await browser.electron.execute(
      async (electron, modulePath, pageHtml) => {
        // CDP callbacks lack a module loader; use the running app's CJS loader.
        const { captureYakitScreenshot: captureScreenshot, attachYakitScreenshot } =
          process.mainModule.require(modulePath)

        const win = new electron.BrowserWindow({
          width: 420,
          height: 220,
          useContentSize: true,
          show: false,
          webPreferences: {
            backgroundThrottling: false,
          },
        })

        try {
          await win.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(pageHtml)}`)
          win.showInactive()
          await win.webContents.executeJavaScript(
            'new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)))',
          )
          const beforeCapture = Date.now()
          const rawScreenshot = await win.webContents.capturePage()
          const result = await captureScreenshot(win)
          const afterCapture = Date.now()

          const rawPng = rawScreenshot.toPNG()
          const watermarkedPng = Buffer.from(result.data, 'base64')
          // Native captures can carry the monitor's ICC profile. Normalize the
          // reference to canvas sRGB before comparing with the watermarked PNG.
          const referenceDataUrl = await win.webContents.executeJavaScript(`(async () => {
            const image = new Image()
            image.src = ${JSON.stringify(`data:image/png;base64,${rawPng.toString('base64')}`)}
            await image.decode()
            const canvas = document.createElement('canvas')
            canvas.width = image.naturalWidth
            canvas.height = image.naturalHeight
            canvas.getContext('2d').drawImage(image, 0, 0)
            return canvas.toDataURL('image/png')
          })()`)
          const { writeFile } = process.mainModule.require('node:fs/promises')
          const { join } = process.mainModule.require('node:path')
          await Promise.all([
            writeFile(join(process.env.YAKIT_E2E_ARTIFACTS_DIR, 'screenshot-raw.png'), rawPng),
            writeFile(join(process.env.YAKIT_E2E_ARTIFACTS_DIR, 'screenshot-watermarked.png'), watermarkedPng),
          ])
          const decodedRaw = electron.nativeImage.createFromDataURL(referenceDataUrl)
          const decodedWatermarked = electron.nativeImage.createFromBuffer(watermarkedPng)
          if (decodedRaw.isEmpty() || decodedWatermarked.isEmpty()) {
            throw new Error('Electron could not decode the captured PNG')
          }

          const rawBitmap = decodedRaw.toBitmap()
          const watermarkedBitmap = decodedWatermarked.toBitmap()
          const physicalWidth = watermarkedPng.readUInt32BE(16)
          const physicalHeight = watermarkedPng.readUInt32BE(20)
          const rawPhysicalWidth = rawPng.readUInt32BE(16)
          const rawPhysicalHeight = rawPng.readUInt32BE(20)
          const logicalSize = win.getContentSize()
          const displayScaleFactor = electron.screen.getDisplayMatching(win.getBounds()).scaleFactor
          if (
            rawPhysicalWidth !== physicalWidth ||
            rawPhysicalHeight !== physicalHeight ||
            rawBitmap.length !== watermarkedBitmap.length
          ) {
            throw new Error('Raw and watermarked screenshot dimensions differ')
          }

          const countChangedPixels = (raw, watermarked) => {
            let count = 0
            for (let offset = 0; offset < watermarked.length; offset += 4) {
              if (
                raw[offset] !== watermarked[offset] ||
                raw[offset + 1] !== watermarked[offset + 1] ||
                raw[offset + 2] !== watermarked[offset + 2] ||
                raw[offset + 3] !== watermarked[offset + 3]
              ) {
                count += 1
              }
            }
            return count
          }

          const halfHeight = Math.floor(physicalHeight / 2)
          const bottomHeight = physicalHeight - halfHeight
          const leftWidth = Math.floor(physicalWidth / 2)
          const topBounds = { x: 0, y: 0, width: physicalWidth, height: halfHeight }
          const bottomBounds = { x: 0, y: halfHeight, width: physicalWidth, height: bottomHeight }
          const bottomLeftBounds = { x: 0, y: halfHeight, width: leftWidth, height: bottomHeight }
          const topChangedPixels = countChangedPixels(
            decodedRaw.crop(topBounds).toBitmap(),
            decodedWatermarked.crop(topBounds).toBitmap(),
          )
          const bottomChangedPixels = countChangedPixels(
            decodedRaw.crop(bottomBounds).toBitmap(),
            decodedWatermarked.crop(bottomBounds).toBitmap(),
          )
          const bottomLeftChangedPixels = countChangedPixels(
            decodedRaw.crop(bottomLeftBounds).toBitmap(),
            decodedWatermarked.crop(bottomLeftBounds).toBitmap(),
          )
          let watermarkTextPixels = 0
          for (let offset = physicalWidth * halfHeight * 4; offset < watermarkedBitmap.length; offset += 4) {
            if (
              watermarkedBitmap[offset] > 240 &&
              watermarkedBitmap[offset + 1] > 240 &&
              watermarkedBitmap[offset + 2] > 240
            ) {
              watermarkTextPixels += 1
            }
          }

          const { EventEmitter } = process.mainModule.require('node:events')
          const stream = new EventEmitter()
          const messages = []
          const response = new Promise((resolve) => {
            stream.write = (message) => {
              messages.push(message)
              if (message.MessageType === 'yakit_screenshot_response') resolve(JSON.parse(message.Data.toString()))
            }
          })
          let streamedCapture
          try {
            attachYakitScreenshot(win, stream)
            stream.emit('data', {
              MessageType: 'yakit_screenshot_request',
              Data: Buffer.from(JSON.stringify({ requestId: 'electron-screenshot' })),
            })
            streamedCapture = await response
          } finally {
            stream.emit('end')
          }
          if (streamedCapture.error) throw new Error(streamedCapture.error)

          return {
            beforeCapture,
            afterCapture,
            capturedAt: result.capturedAt,
            resultWidth: result.width,
            resultHeight: result.height,
            logicalWidth: logicalSize[0],
            logicalHeight: logicalSize[1],
            physicalWidth,
            physicalHeight,
            rawPhysicalWidth,
            rawPhysicalHeight,
            decodedWidth: decodedWatermarked.getSize().width,
            decodedHeight: decodedWatermarked.getSize().height,
            bitmapBytes: watermarkedBitmap.length,
            rawBitmapBytes: rawBitmap.length,
            pngSignature: watermarkedPng.subarray(0, 8).toString('hex'),
            changedPixels: countChangedPixels(rawBitmap, watermarkedBitmap),
            topChangedPixels,
            bottomChangedPixels,
            bottomLeftChangedPixels,
            watermarkTextPixels,
            subscriptionType: messages[0].MessageType,
            streamedRequestId: streamedCapture.requestId,
            streamedPngSignature: Buffer.from(streamedCapture.data, 'base64').subarray(0, 8).toString('hex'),
            remainingDataListeners: stream.listenerCount('data'),
            displayScaleFactor,
            electronVersion: process.versions.electron,
            platform: process.platform,
          }
        } finally {
          if (!win.isDestroyed()) win.destroy()
        }
      },
      screenshotModulePath,
      syntheticPage,
    )
    console.info(
      `[electron-e2e] Yakit screenshot capture: ${JSON.stringify({
        platform: capture.platform,
        electronVersion: capture.electronVersion,
        displayScaleFactor: capture.displayScaleFactor,
        logicalSize: [capture.logicalWidth, capture.logicalHeight],
        physicalSize: [capture.physicalWidth, capture.physicalHeight],
        changedPixels: capture.changedPixels,
      })}`,
    )
  })

  it('returns a decodable PNG with matching physical dimensions', () => {
    expect(capture.pngSignature).toBe('89504e470d0a1a0a')
    expect(capture.physicalWidth).toBe(capture.rawPhysicalWidth)
    expect(capture.physicalHeight).toBe(capture.rawPhysicalHeight)
    expect(capture.resultWidth).toBe(capture.physicalWidth)
    expect(capture.resultHeight).toBe(capture.physicalHeight)
    expect(capture.decodedWidth).toBe(capture.physicalWidth)
    expect(capture.decodedHeight).toBe(capture.physicalHeight)
    expect(capture.bitmapBytes).toBe(capture.physicalWidth * capture.physicalHeight * 4)
    expect(capture.rawBitmapBytes).toBe(capture.bitmapBytes)
  })

  it('changes pixels only in the bottom watermark area', () => {
    expect(capture.changedPixels).toBeGreaterThan(100)
    expect(capture.bottomChangedPixels).toBe(capture.changedPixels)
    expect(capture.bottomLeftChangedPixels).toBeGreaterThan(100)
    expect(capture.topChangedPixels).toBe(0)
    expect(capture.watermarkTextPixels).toBeGreaterThan(100)
  })

  it('subscribes and delivers a real PNG through the correlated stream response', () => {
    expect(capture.subscriptionType).toBe('yakit_screenshot_subscribe')
    expect(capture.streamedRequestId).toBe('electron-screenshot')
    expect(capture.streamedPngSignature).toBe('89504e470d0a1a0a')
    expect(capture.remainingDataListeners).toBe(0)
  })

  it('returns a local timestamp from the capture interval', () => {
    expect(capture.capturedAt).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2} [+-]\d{2}:\d{2}$/)
    const capturedAtMillis = Date.parse(capture.capturedAt.replace(' ', 'T').replace(' ', ''))
    expect(capturedAtMillis).toBeGreaterThanOrEqual(capture.beforeCapture - 1_000)
    expect(capturedAtMillis).toBeLessThanOrEqual(capture.afterCapture + 1_000)
  })

  it('records the active Electron display environment for scale coverage', () => {
    const widthScale = capture.physicalWidth / capture.logicalWidth
    const heightScale = capture.physicalHeight / capture.logicalHeight

    expect(widthScale).toBeCloseTo(heightScale, 2)
    expect(capture.displayScaleFactor).toBeGreaterThan(0)
    expect(capture.electronVersion).toMatch(/^27\./)
    expect(['darwin', 'linux', 'win32']).toContain(capture.platform)
  })
})
