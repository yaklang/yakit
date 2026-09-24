const fs = require('fs')
const os = require('os')
const path = require('path')
const Module = require('module')

const flags = { dev: false, extraRoot: '', axiosGet: null }
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
  if (id === 'electron-is-dev') return flags.dev
  if (id === 'axios') {
    return {
      get: (...args) => (flags.axiosGet ? flags.axiosGet(...args) : Promise.reject(new Error('offline'))),
    }
  }
  if (id === '../../filePath') {
    return {
      getYaklangEngineDir: () => path.join(flags.extraRoot, 'yak-engine'),
      loadExtraFilePath: (p) => path.join(flags.extraRoot, p),
    }
  }
  return originalRequire.apply(this, arguments)
}

const loadNetwork = () => {
  const networkPath = require.resolve('../network')
  const versionPath = require.resolve('../engineVersion')
  delete require.cache[networkPath]
  delete require.cache[versionPath]
  delete require.cache[require.resolve('electron-is-dev')]
  return require('../network')
}

describe('engine artifact urls', () => {
  let root

  afterAll(() => {
    Module.prototype.require = originalRequire
  })

  beforeEach(() => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), 'yakit-network-'))
    flags.extraRoot = root
    flags.legacy = false
    flags.dev = false
    flags.axiosGet = null
    fs.mkdirSync(path.join(root, 'bins'), { recursive: true })
  })

  afterEach(() => {
    fs.rmSync(root, { recursive: true, force: true })
  })

  const platformFile = () => {
    if (process.platform === 'darwin') return process.arch === 'arm64' ? 'darwin_arm64' : 'darwin_amd64'
    if (process.platform === 'linux') return process.arch === 'arm64' ? 'linux_arm64' : 'linux_amd64'
    return 'windows_amd64.exe'
  }

  const writeLegacy = () => {
    fs.writeFileSync(path.join(root, 'bins', 'yakit-system-mode.txt'), 'legacy')
  }

  it('uses the slim checksum outside legacy mode', async () => {
    const { getCheckTextUrl, isLegacyEnginePack } = loadNetwork()
    const url = await getCheckTextUrl('slim/1.4.8-beta19')
    expect(url).toBe(
      `https://yaklang.oss-accelerate.aliyuncs.com/yak/1.4.8-beta19/yak-slim_${platformFile()}.sha256.txt`,
    )
    expect(isLegacyEnginePack(false)).toBe(false)
  })

  it('keeps the slim checksum url on legacy installs', async () => {
    writeLegacy()
    const { getCheckTextUrl } = loadNetwork()
    const url = await getCheckTextUrl('slim/1.4.8-beta19')
    const file =
      process.platform === 'win32' ? 'yak-slim_windows_legacy_amd64.exe' : `yak-slim_${platformFile()}`
    expect(url).toBe(`https://yaklang.oss-accelerate.aliyuncs.com/yak/1.4.8-beta19/${file}.sha256.txt`)
  })

  it('falls back to the full version when the slim checksum is missing', async () => {
    writeLegacy()
    flags.axiosGet = (requestUrl) => {
      if (String(requestUrl).includes('yak-slim_')) {
        const err = new Error('missing')
        err.response = { status: 404 }
        return Promise.reject(err)
      }
      return Promise.resolve({ data: 'abc\n', status: 200 })
    }
    const { resolveEngineDownloadVersion, fetchSpecifiedYakVersionHash } = loadNetwork()
    await expect(resolveEngineDownloadVersion('slim/1.4.8-beta19')).resolves.toBe('1.4.8-beta19')
    await expect(fetchSpecifiedYakVersionHash('slim/1.4.8-beta19')).resolves.toBe('abc')
    await expect(resolveEngineDownloadVersion('1.4.8-beta19')).resolves.toBe('1.4.8-beta19')
  })

  it('keeps dev downloads off the legacy artifact', async () => {
    writeLegacy()
    flags.dev = true
    const { getYakEngineDownloadUrl, isLegacyEnginePack } = loadNetwork()
    expect(isLegacyEnginePack(true)).toBe(false)
    const url = await getYakEngineDownloadUrl('slim/1.4.8-beta19')
    expect(url).toBe(`https://yaklang.oss-accelerate.aliyuncs.com/yak/1.4.8-beta19/yak-slim_${platformFile()}`)
  })
})
