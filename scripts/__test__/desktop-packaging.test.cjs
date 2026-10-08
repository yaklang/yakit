const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('fs')
const os = require('os')
const path = require('path')
const crypto = require('crypto')
const vm = require('vm')
const v8 = require('v8')
const { buildVersion, buildMatrix } = require('../ci-build-plan')
const { installerName, rendererScript, aggregate, settings } = require('../ci-desktop-build')
const { verifyBuffer } = require('../verify-bytecode-runtime')
const { installFromDmg } = require('../verify-mac-installation')

test('one Beijing date handles UTC midnight, month/year boundaries and existing suffixes', () => {
  assert.equal(buildVersion('1.4.8-0711', new Date('2026-09-29T16:01:00Z')), '1.4.8-0930')
  assert.equal(buildVersion('v1.4.9-0711-memfit', new Date('2026-12-31T16:01:00Z')), '1.4.9-0101')
  assert.equal(buildVersion('1.4.8', new Date('2026-10-01T00:00:00Z')), '1.4.8-1001')
  assert.throws(() => buildVersion('bad'), /Invalid base version/)
})

test('full platform plan contains five independent native targets and ten with legacy', () => {
  const plan = buildMatrix().include
  assert.equal(plan.length, 5)
  assert.equal(new Set(plan.map(t => t.id)).size, 5)
  assert.equal(plan.find(t => t.platform === 'darwin' && t.arch === 'x64').runner, 'macos-15-intel')
  assert.equal(plan.find(t => t.platform === 'darwin' && t.arch === 'arm64').runner, 'macos-15')
  assert.equal(plan.find(t => t.platform === 'linux' && t.arch === 'arm64').runner, 'ubuntu-24.04-arm')
  assert.equal(buildMatrix('mwl', false, true).include.length, 10)
  assert.deepEqual(buildMatrix('windows', true).include.map(t => t.id), ['windows-x64-legacy'])
  assert.equal(buildMatrix('uos').include.length, 2)
  assert.throws(() => buildMatrix('invalid'), /Unknown platform/)
})

test('development renderers are selected once and preserve edition flags', () => {
  assert.equal(rendererScript('memfit', true, false), 'build-renders-test-memfit')
  assert.equal(rendererScript('ce', true, false), 'build-test-renders')
  assert.equal(rendererScript('ee', false, true), 'build-renders-enterprise-no-license')
  assert.equal(rendererScript('memfit', false, true), 'build-renders-memfit')
})

test('installer names match platform-specific builder naming', () => {
  assert.equal(installerName({ product: 'AI Senso', target: 'windows', arch: 'x64', old: false }, '1.4.8-0930'), 'AI Senso-1.4.8-0930-windows-amd64.exe')
  assert.equal(installerName({ product: 'AI Senso', target: 'darwin', arch: 'x64', old: true }, '1.4.8-0930'), 'AI Senso-1.4.8-0930-darwin-legacy-x64.dmg')
})

test('empty, corrupt, or incompatible caches fail rather than pass file existence checks', () => {
  assert.throws(() => verifyBuffer(Buffer.alloc(0), 'empty.jsc'), /Empty or truncated/)
  v8.setFlagsFromString('--no-lazy')
  v8.setFlagsFromString('--no-flush-bytecode')
  const source = '(function(exports, require, module, __filename, __dirname) { return 42; })'
  const valid = new vm.Script(source).createCachedData()
  assert.doesNotThrow(() => verifyBuffer(valid, 'valid.jsc'))
  const incompatible = Buffer.from(valid)
  incompatible[4] ^= 0xff
  assert.throws(() => verifyBuffer(incompatible, 'wrong-runtime.jsc'), /cachedDataRejected/)
  assert.throws(() => verifyBuffer(Buffer.alloc(64), 'bad-header.jsc'), /Invalid bytecode source length/)
})

test('non-native bytecode build is refused before downloading or packing', () => {
  const previous = { ...process.env }
  try {
    process.env.BUILD_TARGET_PLATFORM = process.platform === 'win32' ? 'linux' : 'windows'
    process.env.BUILD_TARGET_ARCH = process.arch
    assert.throws(settings, /Runner OS\/architecture/)
  } finally { process.env = previous }
})

test('packager hook blocks both a different OS and a different architecture', async () => {
  const previous = process.env.PLATFORM
  process.env.PLATFORM = 'memfit'
  try {
    const hook = require('../../packageScript/buildHook/before-pack')
    await assert.rejects(hook({ arch: process.arch === 'x64' ? 1 : 3, electronPlatformName: process.platform === 'win32' ? 'darwin' : 'win32' }), /must be built on the target/)
    await assert.rejects(hook({ arch: process.arch === 'x64' ? 3 : 1, electronPlatformName: process.platform }), /must be built on the target/)
  } finally {
    if (previous === undefined) delete process.env.PLATFORM
    else process.env.PLATFORM = previous
  }
})

test('collection requires every target and detects installer modification', () => {
  const tempRoot = fs.realpathSync(os.tmpdir())
  const temp = fs.mkdtempSync(path.join(tempRoot, 'desktop-collection-test-'))
  const previous = { ...process.env }
  try {
    const matrix = buildMatrix('windows')
    process.env.BUILD_MATRIX = JSON.stringify(matrix)
    process.env.BUILD_VERSION = '1.4.8-0930'
    process.env.BUILD_ARTIFACT_DIR = temp
    const file = 'AI Senso-1.4.8-0930-windows-amd64.exe'
    const data = Buffer.from('test installer')
    fs.writeFileSync(path.join(temp, file), data)
    const manifest = { version: process.env.BUILD_VERSION, target: 'windows-x64', platform: 'windows', arch: 'x64', legacy: false,
      files: [{ name: file, size: data.length, sha256: crypto.createHash('sha256').update(data).digest('hex') }] }
    fs.writeFileSync(path.join(temp, 'build-windows-x64.json'), JSON.stringify(manifest))
    assert.doesNotThrow(aggregate)
    fs.writeFileSync(path.join(temp, file), 'changed')
    assert.throws(aggregate, /checksum mismatch/)
    fs.unlinkSync(path.join(temp, 'build-windows-x64.json'))
    assert.throws(aggregate, /ENOENT/)
  } finally {
    process.env = previous
    assert.equal(path.dirname(path.resolve(temp)), tempRoot)
    assert.ok(path.basename(temp).startsWith('desktop-collection-test-'))
    fs.rmSync(temp, { recursive: true, force: true })
  }
})

test('certificate-free Mac builds are locally signed after fuses, while release signing stays enabled', () => {
  const previous = { ...process.env }
  const configPath = require.resolve('../../packageScript/electron-builder.config')
  try {
    process.env.CSC_IDENTITY_AUTO_DISCOVERY = 'false'
    process.env.BUILD_SIGN = 'false'
    delete require.cache[configPath]
    const unsigned = require(configPath)
    assert.equal(unsigned.mac.identity, '-')
    assert.equal(unsigned.mac.hardenedRuntime, false)
    assert.equal(unsigned.mac.notarize, false)
    assert.equal(unsigned.electronFuses.onlyLoadAppFromAsar, true)
    assert.equal(unsigned.electronFuses.enableEmbeddedAsarIntegrityValidation, true)
    process.env.CSC_IDENTITY_AUTO_DISCOVERY = 'true'
    process.env.BUILD_SIGN = 'true'
    delete require.cache[configPath]
    const signed = require(configPath)
    assert.equal(signed.mac.identity, undefined)
    assert.equal(signed.mac.hardenedRuntime, true)
    if (process.platform === 'darwin') assert.equal(signed.forceCodeSigning, true)
  } finally { process.env = previous; delete require.cache[configPath] }
})

test('Mac verification copies the final DMG and verifies that copy after unmounting', () => {
  const tempRoot = fs.realpathSync(os.tmpdir())
  const temp = fs.mkdtempSync(path.join(tempRoot, 'desktop-dmg-test-'))
  const previous = { ...process.env }
  const release = path.join(temp, 'release')
  const checks = path.join(temp, 'checks')
  const mount = path.join(checks, 'dmg-mount')
  const mountedApp = path.join(mount, 'AI Senso.app')
  const calls = []
  try {
    process.env.BUILD_SIGN = 'false'
    fs.mkdirSync(release)
    fs.mkdirSync(checks)
    fs.writeFileSync(path.join(release, 'AI Senso.dmg'), 'fixture')
    const runner = (command, args) => {
      calls.push({ command, args })
      if (command === 'hdiutil' && args[0] === 'attach') fs.mkdirSync(mountedApp)
      if (command === 'ditto') {
        assert.equal(args[0], mountedApp)
        assert.equal(path.dirname(args[1]), path.join(checks, 'installed'))
        fs.mkdirSync(args[1], { recursive: true })
      }
      if (command === 'hdiutil' && args[0] === 'detach') fs.rmdirSync(mountedApp)
    }
    const app = installFromDmg(release, checks, runner)
    assert.equal(app, path.join(checks, 'installed', 'AI Senso.app'))
    assert.deepEqual(calls.map(c => c.command), ['hdiutil', 'ditto', 'hdiutil', 'codesign'])
    assert.ok(calls[3].args.includes('--strict'))
    assert.equal(calls[3].args.at(-1), app)
    assert.throws(() => installFromDmg(release, checks, (command, args) => {
      runner(command, args)
      if (command === 'codesign') throw new Error('invalid code signature')
    }), /invalid code signature/)
    process.env.BUILD_SIGN = 'true'
    calls.length = 0
    installFromDmg(release, checks, runner)
    assert.deepEqual(calls.map(c => c.command), ['hdiutil', 'ditto', 'hdiutil', 'codesign', 'spctl', 'xcrun'])
  } finally {
    process.env = previous
    assert.equal(path.dirname(path.resolve(temp)), tempRoot)
    assert.ok(path.basename(temp).startsWith('desktop-dmg-test-'))
    fs.rmSync(temp, { recursive: true, force: true })
  }
})
