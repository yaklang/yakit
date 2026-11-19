import { writeFile } from 'node:fs/promises'
import path from 'node:path'

// Electron 27 does not implement every ChromeDriver window/screenshot command.
export async function capture(name) {
  const encoded = await browser.electron.execute(async (electron) => {
    const window = electron.BrowserWindow.getAllWindows()[0]
    let timer
    let timedOut = false
    const captureWithRetry = async () => {
      for (let attempt = 0; attempt < 5; attempt++) {
        try {
          const image = await window.webContents.capturePage()
          return image.toPNG().toString('base64')
        } catch (error) {
          if (timedOut || attempt === 4 || !String(error?.message || error).includes('UnknownVizError')) throw error
          await new Promise((resolve) => setTimeout(resolve, 100))
        }
      }
    }
    try {
      return await Promise.race([
        captureWithRetry(),
        new Promise((_, reject) => {
          timer = setTimeout(() => {
            timedOut = true
            reject(new Error('Screenshot timed out'))
          }, 3000)
        }),
      ])
    } finally {
      clearTimeout(timer)
    }
  })
  await writeFile(path.join(process.env.MEMFIT_UI_ARTIFACTS, `${name}.png`), Buffer.from(encoded, 'base64'))
}
