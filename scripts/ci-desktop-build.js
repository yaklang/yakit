const fs = require('fs')
const path = require('path')
const crypto = require('crypto')
const { execFileSync } = require('child_process')

const editions = {
  ce: { platform: '', product: 'Yakit', render: '' },
  ee: { platform: 'yakitEE', product: 'EnpriTrace', render: '-enterprise' },
  se: { platform: 'yakitSE', product: 'EnpriTraceAgent', render: '-simple-enterprise' },
  irify: { platform: 'irify', product: 'IRify', render: '-irify' },
  irifyee: { platform: 'irifyEE', product: 'IRifyEnpriTrace', render: '-irify-enterprise' },
  memfit: { platform: 'memfit', product: 'AI Senso', render: '-memfit' },
}
const nativePlatform = (p) => (p === 'windows' ? 'win32' : p)
const hash = (file) => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex')

function settings() {
  const edition = editions[process.env.BUILD_EDITION || 'memfit']
  if (!edition) throw new Error('Unknown edition')
  const platform = process.env.BUILD_TARGET_PLATFORM
  const arch = process.env.BUILD_TARGET_ARCH
  if (nativePlatform(platform) !== process.platform || arch !== process.arch)
    throw new Error('Runner OS/architecture must match the package target')
  process.env.PLATFORM = edition.platform
  return { ...edition, target: platform, arch, old: process.env.THE_LEGACY === 'true' }
}

function runYarn(args) {
  const result = require('cross-spawn').sync('yarn', args, { stdio: 'inherit', env: process.env })
  if (result.error) throw result.error
  if (result.status !== 0) throw new Error('yarn ' + args.join(' ') + ' failed: ' + result.status)
}

async function download(url) {
  let lastError
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(240000) })
      if (!response.ok) throw new Error('HTTP ' + response.status + ': ' + url)
      return Buffer.from(await response.arrayBuffer())
    } catch (error) {
      lastError = error
    }
  }
  throw lastError
}

async function assets() {
  const s = settings()
  const base = 'https://yaklang.oss-accelerate.aliyuncs.com/'
  const extensionVersion = (await download(base + 'chrome-extension/latest-version.txt')).toString().trim()
  if (!/^[\w.-]+$/.test(extensionVersion)) throw new Error('Invalid chrome extension version')
  fs.writeFileSync(
    'bins/scripts/google-chrome-plugin.zip',
    await download(base + 'chrome-extension/yakit-chrome-extension-v' + extensionVersion + '.zip'),
  )
  if (process.env.BUILD_WITH_ENGINE !== 'true') return
  const version = process.env.BUILD_ENGINE_VERSION
  if (!version || !/^[\w.-]+$/.test(version)) throw new Error('Invalid engine version')
  const cpu = s.arch === 'x64' ? 'amd64' : 'arm64'
  const entry = 'yak_' + s.target + '_' + cpu + (s.target === 'windows' ? '.exe' : '')
  const remote = s.target === 'windows' && s.old ? 'yak_windows_legacy_amd64.exe' : entry
  const binary = path.join('bins', entry)
  fs.writeFileSync(binary, await download(base + 'yak/' + version + '/' + remote))
  if (s.target !== 'windows') fs.chmodSync(binary, 0o755)
  if (s.target === 'darwin' && process.env.BUILD_SIGN === 'true') {
    const identityList = execFileSync('security', ['find-identity', '-v', '-p', 'codesigning', 'build.keychain'], {
      encoding: 'utf8',
    })
    const identity = identityList
      .split('\n')
      .find((line) => line.includes(process.env.APPLE_TEAM_ID))
      ?.match(/"([^"]+)"/)?.[1]
    if (!identity) throw new Error('Mac signing identity not found')
    execFileSync('codesign', ['--force', '--timestamp', '--options', 'runtime', '--sign', identity, binary], {
      stdio: 'inherit',
    })
    execFileSync('codesign', ['--verify', '--strict', binary], { stdio: 'inherit' })
  }
  if (s.target === 'darwin') fs.writeFileSync(binary + '.sha256.txt', hash(binary) + '\n')
  const zip = new (require('adm-zip'))()
  zip.addLocalFile(binary, 'bins', entry)
  zip.writeZip(binary.replace(/\.exe$/, '') + '.zip')
  fs.unlinkSync(binary)
  if (process.env.BUILD_HIDE_ENGINE_VERSION !== 'true') fs.writeFileSync('bins/engine-version.txt', version + '\n')
}

function prepare() {
  settings()
  const version = process.env.BUILD_VERSION
  if (!/^\d+\.\d+\.\d+-\d{4}$/.test(version || '')) throw new Error('Invalid build version')
  const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'))
  pkg.version = version
  fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2) + '\n')
  console.log('Embedded package version: ' + version)
}

function rendererScript(edition, devTool, skipLicense) {
  const s = editions[edition]
  if (!s) throw new Error('Unknown edition')
  if (edition === 'ce') return devTool ? 'build-test-renders' : 'build-renders'
  return 'build-renders' + (devTool ? '-test' : '') + s.render + (edition === 'ee' && skipLicense ? '-no-license' : '')
}

function render() {
  settings()
  runYarn([
    rendererScript(
      process.env.BUILD_EDITION,
      process.env.BUILD_DEV_TOOL === 'true',
      process.env.BUILD_SKIP_ENTERPRISE_LICENSE === 'true',
    ),
  ])
  if (process.env.BUILD_EDITION === 'memfit') runYarn(['build-main-bytecode'])
}

function pack() {
  const s = settings()
  const flag = { windows: '--win', linux: '--linux', darwin: '--mac' }[s.target]
  runYarn([
    'electron-builder',
    'build',
    flag,
    '--' + s.arch,
    '--publish',
    'never',
    '--config',
    './packageScript/electron-builder.config.js',
  ])
}

function installerName(s, version) {
  const cpu = s.target === 'darwin' ? s.arch : s.arch === 'x64' ? 'amd64' : 'arm64'
  const ext = { windows: 'exe', darwin: 'dmg', linux: 'AppImage' }[s.target]
  return s.product + '-' + version + '-' + s.target + (s.old ? '-legacy' : '') + '-' + cpu + '.' + ext
}

function uos() {
  const s = settings()
  const file = installerName(s, process.env.BUILD_VERSION)
  const folder = path.join('release', file.replace(/\.AppImage$/, ''))
  fs.mkdirSync(folder, { recursive: true })
  fs.copyFileSync(path.join('release', file), path.join(folder, file))
  const script = '#!/bin/sh\nset -e\ncd "$(dirname "$0")"\nchmod +x ./*.AppImage\nexec ./*.AppImage "$@"\n'
  fs.writeFileSync(path.join(folder, 'run.sh'), script, { mode: 0o755 })
  execFileSync('makeself', ['--gzip', folder, folder + '.run', path.basename(folder), './run.sh'], { stdio: 'inherit' })
}

function collect() {
  const s = settings()
  const version = process.env.BUILD_VERSION
  const name = installerName(s, version)
  const names = [name, ...(process.env.BUILD_PLATFORM === 'uos' ? [name.replace(/\.AppImage$/, '.run')] : [])]
  const output = 'release/ci-artifacts'
  fs.mkdirSync(output, { recursive: true })
  const files = names.map((name) => {
    const source = path.join('release', name)
    if (!fs.existsSync(source) || fs.statSync(source).size < 1024)
      throw new Error('Installer missing or empty: ' + name)
    fs.copyFileSync(source, path.join(output, name))
    return { name, size: fs.statSync(source).size, sha256: hash(source) }
  })
  const manifest = {
    version,
    target: process.env.BUILD_TARGET_ID,
    platform: s.target,
    arch: s.arch,
    legacy: s.old,
    electron: require('../package.json').devDependencies.electron,
    engine: process.env.BUILD_ENGINE_VERSION || '',
    commit: process.env.GITHUB_SHA || '',
    run: process.env.GITHUB_RUN_ID || '',
    files,
  }
  fs.writeFileSync(path.join(output, 'build-' + manifest.target + '.json'), JSON.stringify(manifest, null, 2) + '\n')
}

function aggregate() {
  const matrix = JSON.parse(process.env.BUILD_MATRIX)
  const dir = process.env.BUILD_ARTIFACT_DIR || 'packages'
  for (const target of matrix.include) {
    const manifest = JSON.parse(fs.readFileSync(path.join(dir, 'build-' + target.id + '.json'), 'utf8'))
    if (
      manifest.version !== process.env.BUILD_VERSION ||
      manifest.target !== target.id ||
      manifest.platform !== target.platform ||
      manifest.arch !== target.arch ||
      manifest.legacy !== target.legacy
    )
      throw new Error('Build manifest mismatch: ' + target.id)
    if (!manifest.files.length) throw new Error('Empty build manifest')
    for (const file of manifest.files) {
      if (path.basename(file.name) !== file.name || !file.name.includes('-' + manifest.version + '-'))
        throw new Error('Invalid artifact name')
      const artifact = path.join(dir, file.name)
      if (fs.statSync(artifact).size !== file.size || hash(artifact) !== file.sha256)
        throw new Error('Artifact checksum mismatch: ' + file.name)
    }
  }
  fs.writeFileSync(path.join(dir, 'build-version.txt'), process.env.BUILD_VERSION + '\n')
  console.log('Verified all ' + matrix.include.length + ' native build outputs')
}

if (require.main === module) {
  const commands = { prepare, assets, render, pack, uos, collect, aggregate }
  Promise.resolve()
    .then(() => {
      const command = commands[process.argv[2]]
      if (!command) throw new Error('Unknown CI command')
      return command()
    })
    .catch((error) => {
      console.error(error)
      process.exitCode = 1
    })
}

module.exports = { rendererScript, installerName, settings, aggregate, download }
