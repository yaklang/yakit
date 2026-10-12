const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('fs')
const os = require('os')
const path = require('path')
const { execFileSync } = require('child_process')
const asar = require('@electron/asar')
const {
  requiredRuntimeFiles,
  collectRuntimeAssets,
  verifyCopiedRuntimeAssets,
  verifyPackagedRuntimeAssets,
} = require('../main-runtime-assets')

const projectRoot = path.resolve(__dirname, '../..')

function fixture(t) {
  const root = fs.mkdtempSync(path.join(fs.realpathSync(os.tmpdir()), 'main-assets-test-'))
  t.after(() => {
    assert.ok(path.basename(root).startsWith('main-assets-test-'))
    assert.equal(path.dirname(root), fs.realpathSync(os.tmpdir()))
    fs.rmSync(root, { recursive: true, force: true })
  })
  const source = path.join(root, 'source')
  for (const relative of requiredRuntimeFiles) {
    const file = path.join(source, relative)
    fs.mkdirSync(path.dirname(file), { recursive: true })
    fs.writeFileSync(file, 'fixture: ' + relative)
  }
  return { root, source }
}

test('required main-process runtime assets are present and tracked for clean CI checkouts', () => {
  const assets = collectRuntimeAssets(path.join(projectRoot, 'app/main'))
  assert.ok(assets.length >= requiredRuntimeFiles.length)
  execFileSync('git', ['ls-files', '--error-unmatch', ...assets.map((p) => 'app/main/' + p)], {
    cwd: projectRoot,
    stdio: 'pipe',
  })
})

test('missing or empty source helpers fail even when there is nothing to copy', (t) => {
  const { source } = fixture(t)
  const file = path.join(source, 'handlers/libs/extVendor/fastlist-0.3.0-x64.exe')
  fs.unlinkSync(file)
  assert.throws(() => collectRuntimeAssets(source), /Missing or empty.*fastlist-0.3.0-x64/)
  fs.writeFileSync(file, '')
  assert.throws(() => collectRuntimeAssets(source), /Missing or empty.*fastlist-0.3.0-x64/)
})

test('copied runtime validation catches missing native, preload, HTML, CSS and executable resources', (t) => {
  const { root, source } = fixture(t)
  const output = path.join(root, 'output')
  fs.cpSync(source, output, { recursive: true })
  assert.equal(verifyCopiedRuntimeAssets(source, output), requiredRuntimeFiles.length)
  for (const relative of [
    'handlers/libs/extVendor/fastlist-0.3.0-x64.exe',
    'screenshots/lib/node-screenshots.win32-x64-msvc.node',
    'preload.js',
    'handlers/openNewChildWindow/index.html',
    'handlers/openNewChildWindow/index.css',
  ]) {
    const file = path.join(output, relative)
    fs.unlinkSync(file)
    assert.throws(() => verifyCopiedRuntimeAssets(source, output), /Missing main-process runtime asset/)
    fs.copyFileSync(path.join(source, relative), file)
  }
  fs.writeFileSync(path.join(output, 'preload.js'), 'stale copy')
  assert.throws(() => verifyCopiedRuntimeAssets(source, output), /content mismatch: preload.js/)
})

test('collection excludes protected JS and tests but includes new runtime assets', (t) => {
  const { source } = fixture(t)
  fs.writeFileSync(path.join(source, 'protected.js'), 'module.exports = 42')
  fs.writeFileSync(path.join(source, 'new.json'), '{"runtime":true}')
  fs.mkdirSync(path.join(source, '__test__'))
  fs.writeFileSync(path.join(source, '__test__/test.json'), '{}')
  const assets = collectRuntimeAssets(source)
  assert.ok(assets.includes('new.json'))
  assert.ok(!assets.includes('protected.js'))
  assert.ok(!assets.includes('__test__/test.json'))
})

test('final archive validation catches omitted helpers and missing unpacked sidecars', async (t) => {
  const { root, source } = fixture(t)
  const packageRoot = path.join(root, 'package')
  const mainDir = 'app/main-bytecode'
  fs.cpSync(source, path.join(packageRoot, mainDir), { recursive: true })
  const helper = mainDir + '/handlers/libs/extVendor/fastlist-0.3.0-x64.exe'
  fs.unlinkSync(path.join(packageRoot, helper))
  const archive = path.join(root, 'missing.asar')
  await asar.createPackage(packageRoot, archive)
  assert.throws(() => verifyPackagedRuntimeAssets(archive, source, mainDir), /Missing.*fastlist-0.3.0-x64/)
  fs.copyFileSync(path.join(source, 'handlers/libs/extVendor/fastlist-0.3.0-x64.exe'), path.join(packageRoot, helper))
  const complete = path.join(root, 'complete.asar')
  await asar.createPackage(packageRoot, complete)
  assert.equal(verifyPackagedRuntimeAssets(complete, source, mainDir), requiredRuntimeFiles.length)
  const unpacked = path.join(root, 'unpacked.asar')
  await asar.createPackageWithOptions(packageRoot, unpacked, { unpack: '**/*.exe' })
  assert.equal(verifyPackagedRuntimeAssets(unpacked, source, mainDir), requiredRuntimeFiles.length)
  fs.unlinkSync(path.join(unpacked + '.unpacked', helper))
  assert.throws(() => verifyPackagedRuntimeAssets(unpacked, source, mainDir), /Missing.*fastlist-0.3.0-x64/)
})

test(
  'Windows Electron enumerates processes using fastlist inside asar',
  { skip: process.platform !== 'win32' },
  async (t) => {
    const { root } = fixture(t)
    const packageRoot = path.join(root, 'process-package')
    fs.cpSync(path.join(projectRoot, 'app/main/handlers/libs'), path.join(packageRoot, 'libs'), { recursive: true })
    const archive = path.join(root, 'process.asar')
    await asar.createPackage(packageRoot, archive)
    const output = execFileSync(
      require('electron'),
      [
        '-e',
        'require(process.argv[1])().then(list => { if (!list.some(p => p.pid === process.pid)) throw new Error("Current process missing"); console.log("Process enumeration passed"); }).catch(e => { console.error(e); process.exitCode = 1; })',
        path.join(archive, 'libs/ps-yak-process.js'),
      ],
      {
        encoding: 'utf8',
        timeout: 30000,
        env: { ...process.env, ELECTRON_RUN_AS_NODE: '1', NODE_OPTIONS: '' },
      },
    )
    assert.match(output, /Process enumeration passed/)
  },
)
