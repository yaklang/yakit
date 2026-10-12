const fs = require('fs')
const path = require('path')
const asar = require('@electron/asar')

const plaintextRuntimeFiles = new Set([
  'engineLinkPreload.js',
  'preload.js',
  'screenshots/preload.js',
  'handlers/libs/xterm@5.3.0/xterm.js',
  'handlers/libs/xterm-addon-fit@0.7.0/xterm-addon-fit.js',
])

const requiredRuntimeFiles = [
  ...plaintextRuntimeFiles,
  'handlers/libs/extVendor/fastlist-0.3.0-x64.exe',
  'handlers/libs/extVendor/fastlist-0.3.0-x86.exe',
  'screenshots/lib/node-screenshots.darwin-arm64.node',
  'screenshots/lib/node-screenshots.darwin-x64.node',
  'screenshots/lib/node-screenshots.win32-arm64-msvc.node',
  'screenshots/lib/node-screenshots.win32-ia32-msvc.node',
  'screenshots/lib/node-screenshots.win32-x64-msvc.node',
  'handlers/openNewChildWindow/index.html',
  'handlers/openNewChildWindow/index.css',
  'handlers/libs/xterm@5.3.0/xterm.css',
]

function collectRuntimeAssets(sourceDir) {
  for (const relative of requiredRuntimeFiles) {
    const file = path.join(sourceDir, relative)
    if (!fs.existsSync(file) || !fs.statSync(file).isFile() || fs.statSync(file).size === 0)
      throw new Error(`Missing or empty main-process runtime asset: ${relative}`)
  }
  const assets = []
  function walk(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const file = path.join(dir, entry.name)
      if (entry.isDirectory()) {
        if (!['__test__', '__tests__'].includes(entry.name)) walk(file)
      } else {
        const relative = path.relative(sourceDir, file).replaceAll('\\', '/')
        if (!entry.name.endsWith('.js') || plaintextRuntimeFiles.has(relative)) assets.push(relative)
      }
    }
  }
  walk(sourceDir)
  return assets
}

function verifyRuntimeAssets(sourceDir, readAsset) {
  const assets = collectRuntimeAssets(sourceDir)
  for (const relative of assets) {
    let actual
    try {
      actual = readAsset(relative)
    } catch (error) {
      throw new Error(`Missing main-process runtime asset: ${relative} (${error.message})`)
    }
    if (!fs.readFileSync(path.join(sourceDir, relative)).equals(actual))
      throw new Error(`Main-process runtime asset content mismatch: ${relative}`)
  }
  return assets.length
}

function verifyCopiedRuntimeAssets(sourceDir, outputDir) {
  return verifyRuntimeAssets(sourceDir, (relative) => fs.readFileSync(path.join(outputDir, relative)))
}

function verifyPackagedRuntimeAssets(archive, sourceDir, mainDir) {
  // listPackage uses the host's separators; use its original entries for extraction.
  const entries = new Map(
    asar.listPackage(archive).map((entry) => {
      const relative = entry.replace(/^[/\\]/, '')
      return [relative.replaceAll('\\', '/'), relative]
    }),
  )
  return verifyRuntimeAssets(sourceDir, (relative) => {
    const entry = entries.get(`${mainDir}/${relative}`)
    if (!entry) throw new Error('not found in app.asar')
    // extractFile also reads app.asar.unpacked for entries marked as unpacked.
    return asar.extractFile(archive, entry)
  })
}

module.exports = {
  plaintextRuntimeFiles,
  requiredRuntimeFiles,
  collectRuntimeAssets,
  verifyCopiedRuntimeAssets,
  verifyPackagedRuntimeAssets,
}
