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

const protectedFiles = []
const collectProtectedFiles = (dir) => {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const sourcePath = path.join(dir, entry.name)
    const relativePath = path.relative(sourceDir, sourcePath).replaceAll('\\', '/')

    if (entry.isDirectory()) {
      if (entry.name === '__test__' || entry.name === '__tests__') continue
      collectProtectedFiles(sourcePath)
      continue
    }

    if (entry.name.endsWith('.js') && !plaintextRuntimeFiles.has(relativePath)) {
      protectedFiles.push(relativePath)
    }
  }
}

collectProtectedFiles(sourceDir)

const missingFiles = []
const staleFiles = []
for (const relativePath of protectedFiles) {
  const sourcePath = path.join(sourceDir, relativePath)
  const loaderPath = path.join(outputDir, relativePath)
  const bytecodePath = `${loaderPath}c`

  if (!fs.existsSync(loaderPath) || !fs.existsSync(bytecodePath)) {
    missingFiles.push(relativePath)
    continue
  }

  if (fs.statSync(bytecodePath).mtimeMs < fs.statSync(sourcePath).mtimeMs) staleFiles.push(relativePath)

  const loader = fs.readFileSync(loaderPath, 'utf8')
  if (
    !loader.includes('bytecode-loader.cjs') ||
    !loader.includes(`module.exports = require("./${path.basename(relativePath)}c")`)
  ) {
    missingFiles.push(`${relativePath} (not a bytecode loader)`)
  }
}

const removedSwitchTokens = ['MEMFIT_LICENSE_REQUIRED', 'isMemfitLicenseRequired', 'IsMemfitLicenseRequired']
const authorizationSources = [
  path.join(sourceDir, 'memfitLicense.js'),
  path.join(sourceDir, 'index.js'),
  path.join(sourceDir, 'ipc.js'),
]
for (const sourcePath of authorizationSources) {
  const source = fs.readFileSync(sourcePath, 'utf8')
  for (const token of removedSwitchTokens) {
    if (source.includes(token)) throw new Error(`production license bypass token still exists: ${token}`)
  }
}

if (missingFiles.length || staleFiles.length) {
  const details = [
    missingFiles.length ? `missing: ${missingFiles.join(', ')}` : '',
    staleFiles.length ? `stale: ${staleFiles.join(', ')}` : '',
  ]
    .filter(Boolean)
    .join('\n')
  throw new Error(`main-process bytecode verification failed\n${details}`)
}

console.log(`Verified ${protectedFiles.length} main-process bytecode modules.`)
