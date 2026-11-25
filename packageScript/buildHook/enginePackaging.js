const fs = require('fs')
const path = require('path')

const ENGINE_MODES = ['on', 'off']

const resolveEngineMode = (value = process.env.YAKIT_BUILTIN_ENGINE) => {
  const mode = (value || 'off').toLowerCase()
  if (!ENGINE_MODES.includes(mode)) {
    throw new Error(`YAKIT_BUILTIN_ENGINE must be on or off, got ${value}`)
  }
  return mode
}

const engineArchiveFor = (platform, arch) => {
  if (platform === 'win32') return 'bins/yak_windows_amd64.zip'
  const cpu = arch === 'arm64' ? 'arm64' : 'amd64'
  if (platform === 'linux') return `bins/yak_linux_${cpu}.zip`
  if (platform === 'darwin') return `bins/yak_darwin_${cpu}.zip`
  return ''
}

const engineSha256For = (archive) => (archive.endsWith('.zip') ? archive.replace(/\.zip$/, '.sha256.txt') : '')

const assertEngineArchive = (archive, { withBuiltinEngine, cwd = process.cwd() } = {}) => {
  if (!withBuiltinEngine || !archive) return
  const target = path.isAbsolute(archive) ? archive : path.resolve(cwd, archive)
  if (!fs.existsSync(target)) {
    throw new Error(`YAKIT_BUILTIN_ENGINE=on but ${archive} is missing; prepare the built-in engine before packing`)
  }
}

module.exports = { resolveEngineMode, engineArchiveFor, engineSha256For, assertEngineArchive }
