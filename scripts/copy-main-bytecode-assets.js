const fs = require('fs')
const path = require('path')

const projectRoot = path.resolve(__dirname, '..')
const sourceDir = path.join(projectRoot, 'app/main')
const outputDir = path.join(projectRoot, 'app/main-bytecode')

const plaintextRuntimeFiles = new Set([
  'engineLinkPreload.js',
  'preload.js',
  'screenshots/preload.js',
  'handlers/libs/xterm@5.3.0/xterm.js',
  'handlers/libs/xterm-addon-fit@0.7.0/xterm-addon-fit.js',
])

const copyRuntimeAssets = (dir) => {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const sourcePath = path.join(dir, entry.name)
    const relativePath = path.relative(sourceDir, sourcePath).replaceAll('\\', '/')
    const outputPath = path.join(outputDir, relativePath)

    if (entry.isDirectory()) {
      if (entry.name === '__test__' || entry.name === '__tests__') continue
      copyRuntimeAssets(sourcePath)
      continue
    }

    if (entry.name.endsWith('.js') && !plaintextRuntimeFiles.has(relativePath)) continue
    fs.mkdirSync(path.dirname(outputPath), { recursive: true })
    fs.copyFileSync(sourcePath, outputPath)
  }
}

if (!fs.existsSync(path.join(outputDir, 'index.jsc'))) {
  throw new Error('electron-vite bytecode output is missing; build the main process before copying runtime assets')
}

copyRuntimeAssets(sourceDir)
