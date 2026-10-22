import { writeFile } from 'node:fs/promises'
import path from 'node:path'

// Electron 27 does not implement every ChromeDriver window/screenshot command.
export async function capture(name) {
  const encoded = await browser.electron.execute(async (electron) => {
    const window = electron.BrowserWindow.getAllWindows()[0]
    let timer
    try {
      return await Promise.race([
        window.webContents.capturePage().then((image) => image.toPNG().toString('base64')),
        new Promise((_, reject) => {
          timer = setTimeout(() => reject(new Error('Screenshot timed out')), 3000)
        }),
      ])
    } finally {
      clearTimeout(timer)
    }
  })
  await writeFile(path.join(process.env.MEMFIT_UI_ARTIFACTS, `${name}.png`), Buffer.from(encoded, 'base64'))
}
