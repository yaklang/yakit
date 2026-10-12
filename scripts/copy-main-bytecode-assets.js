const fs = require('fs')
const path = require('path')
const { collectRuntimeAssets, verifyCopiedRuntimeAssets } = require('./main-runtime-assets')

const projectRoot = path.resolve(__dirname, '..')
const sourceDir = path.join(projectRoot, 'app/main')
const outputDir = path.join(projectRoot, 'app/main-bytecode')

if (!fs.existsSync(path.join(outputDir, 'index.jsc'))) {
  throw new Error('electron-vite bytecode output is missing; build the main process before copying runtime assets')
}

for (const relativePath of collectRuntimeAssets(sourceDir)) {
  const outputPath = path.join(outputDir, relativePath)
  fs.mkdirSync(path.dirname(outputPath), { recursive: true })
  fs.copyFileSync(path.join(sourceDir, relativePath), outputPath)
}
console.log(`Copied and verified ${verifyCopiedRuntimeAssets(sourceDir, outputDir)} main-process runtime assets.`)
