const fs = require('fs')
const os = require('os')
const path = require('path')
const Module = require('module')

const paths = { engineDir: '', extraRoot: '' }
const originalRequire = Module.prototype.require

Module.prototype.require = function (id) {
  if (id === 'electron') {
    return {
      app: {
        isPackaged: true,
        getName: () => 'yakit',
        getPath: () => os.tmpdir(),
        getAppPath: () => os.tmpdir(),
      },
    }
  }
  if (id === 'electron-is-dev') return false
  if (id === '../../filePath') {
    return {
      getYaklangEngineDir: () => paths.engineDir,
      loadExtraFilePath: (p) => path.join(paths.extraRoot, p),
    }
  }
  return originalRequire.apply(this, arguments)
}

const {
  fetchEngineBuildType,
  readBundledEngineBuildType,
  resolveEngineBuildType,
  writeEngineBuildType,
} = require('../engineVersion')

const engineFileName = process.platform === 'win32' ? 'yak.exe' : 'yak'

describe('engine build type on legacy packs', () => {
  let root

  afterAll(() => {
    Module.prototype.require = originalRequire
  })

  beforeEach(() => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), 'yakit-engine-version-'))
    paths.engineDir = path.join(root, 'yak-engine')
    paths.extraRoot = root
    fs.mkdirSync(paths.engineDir, { recursive: true })
    fs.mkdirSync(path.join(root, 'bins'), { recursive: true })
  })

  afterEach(() => {
    fs.rmSync(root, { recursive: true, force: true })
  })

  const writeMode = (mode) => {
    fs.writeFileSync(path.join(root, 'bins', 'yakit-system-mode.txt'), mode)
  }

  const writeSameBytes = (name) => {
    const body = Buffer.from('same-engine')
    fs.writeFileSync(path.join(paths.engineDir, engineFileName), body)
    fs.writeFileSync(path.join(paths.engineDir, name), body)
  }

  it('does not mark a full legacy engine as slim when the cache name collapses', () => {
    writeMode('legacy')
    writeSameBytes('yak-1.4.8-beta19')
    expect(fetchEngineBuildType('1.4.8-beta19')).toBe('full')
    expect(fs.existsSync(path.join(paths.engineDir, 'engine-build-type.txt'))).toBe(false)
  })

  it('marks a matching slim cache as slim outside legacy mode', () => {
    writeSameBytes('yak-slim-1.4.8-beta19')
    expect(fetchEngineBuildType('1.4.8-beta19')).toBe('slim')
  })

  it('stays full on legacy when the slim checksum is missing', async () => {
    writeMode('legacy')
    writeSameBytes('yak-1.4.8-beta19')
    const fetchHash = vi.fn(async () => '')
    expect(await resolveEngineBuildType('1.4.8-beta19', fetchHash)).toBe('full')
    expect(fetchHash).toHaveBeenCalledWith('slim/1.4.8-beta19', { timeout: 3000 })
    expect(fs.existsSync(path.join(paths.engineDir, 'engine-build-type.txt'))).toBe(false)
  })

  it('marks a legacy install slim when the exact slim checksum matches', async () => {
    writeMode('legacy')
    fs.writeFileSync(path.join(paths.engineDir, engineFileName), 'slim-engine')
    const fetchHash = vi.fn(async () => {
      const crypto = require('crypto')
      return crypto.createHash('sha256').update(Buffer.from('slim-engine')).digest('hex')
    })
    expect(await resolveEngineBuildType('1.4.8-beta19', fetchHash)).toBe('slim')
    expect(fetchHash).toHaveBeenCalledWith('slim/1.4.8-beta19', { timeout: 3000 })
  })

  it('persists slim when the online slim hash matches the local engine', async () => {
    fs.writeFileSync(path.join(paths.engineDir, engineFileName), 'slim-engine')
    const fetchHash = vi.fn(async () => {
      const crypto = require('crypto')
      return crypto.createHash('sha256').update(Buffer.from('slim-engine')).digest('hex')
    })
    expect(await resolveEngineBuildType('1.4.8-beta19', fetchHash)).toBe('slim')
    expect(fetchHash).toHaveBeenCalledWith('slim/1.4.8-beta19', { timeout: 3000 })
    expect(fs.readFileSync(path.join(paths.engineDir, 'engine-build-type.txt'), 'utf8')).toBe('slim')
  })

  it('reads the bundled build type and falls back to full', () => {
    expect(readBundledEngineBuildType()).toBe('full')
    fs.writeFileSync(path.join(root, 'bins', 'engine-build-type.txt'), 'slim\n')
    expect(readBundledEngineBuildType()).toBe('slim')
    fs.writeFileSync(path.join(root, 'bins', 'engine-build-type.txt'), 'other')
    expect(readBundledEngineBuildType()).toBe('full')
    writeEngineBuildType('full')
    expect(fetchEngineBuildType('1.4.8-beta19')).toBe('full')
  })
})
