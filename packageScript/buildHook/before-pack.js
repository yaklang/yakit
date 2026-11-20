const fs = require('fs')
const packageJson = require('../../package.json')
const writeEngineBuildTypeFile = require('./write-engine-build-type')

const ENGINE_MODE = (process.env.YAKIT_BUILTIN_ENGINE || 'off').toLowerCase()
if (!['on', 'off'].includes(ENGINE_MODE)) {
  throw new Error(`YAKIT_BUILTIN_ENGINE must be on or off, got ${process.env.YAKIT_BUILTIN_ENGINE}`)
}
const withBuiltinEngine = ENGINE_MODE === 'on'

const engineArchiveFor = (platform, arch) => {
  if (platform === 'win32') return 'bins/yak_windows_amd64.zip'
  const cpu = arch === 'arm64' ? 'arm64' : 'amd64'
  if (platform === 'linux') return `bins/yak_linux_${cpu}.zip`
  if (platform === 'darwin') return `bins/yak_darwin_${cpu}.zip`
  return ''
}

const assertEngineArchive = (archive) => {
  if (!withBuiltinEngine || !archive) return
  if (!fs.existsSync(archive)) {
    throw new Error(`YAKIT_BUILTIN_ENGINE=on but ${archive} is missing; prepare the built-in engine before packing`)
  }
}

module.exports = async function (context) {
  const { prepareElectronPack } = await import('../../scripts/build-electron.mjs')
  await prepareElectronPack(context)

  const isLegacy = process.env.YAKIT_LEGACY == 'true'

  const archMap = {
    1: 'x64',
    3: 'arm64',
  }
  const arch = archMap[context.arch]
  const engineArchive = engineArchiveFor(context.electronPlatformName, arch)
  assertEngineArchive(engineArchive)

  if (withBuiltinEngine) {
    writeEngineBuildTypeFile({
      platform: context.electronPlatformName,
      arch,
      isLegacy,
    })
  }

  const baseInfo = context.packager.appInfo
  let productVersion = packageJson.version || baseInfo.version
  // CE
  if (productVersion.endsWith('-ce')) {
    productVersion = productVersion.replace('-ce', '')
  }
  // EE
  if (productVersion.endsWith('-ee')) {
    productVersion = productVersion.replace('-ee', '')
  }

  const productName = baseInfo.productName

  const artifactName = productName === 'Memfit AI' ? 'MemfitAI' : productName

  /** win32 */
  const win32Config = context.electronPlatformName === 'win32' ? context.packager.config.win : null
  if (win32Config) {
    const win32ExtraFiles = [
      {
        from: 'bins/flag.windows.txt',
        to: 'bins/flag.windows.txt',
      },
      {
        from: 'LICENSE.md',
        to: 'LICENSE.md',
      },
    ]
    if (withBuiltinEngine) {
      win32ExtraFiles.push({
        from: engineArchive,
        to: 'bins/yak.zip',
      })
    }
    win32Config.extraFiles = win32ExtraFiles
    win32Config.artifactName = `${artifactName}-${productVersion}-windows${isLegacy ? '-legacy' : ''}-amd64.${'${ext}'}`
    context.packager.config.win = win32Config
  }

  /**linux */
  /** 1:x64 3:arm64 */
  const linuxConfig = context.electronPlatformName === 'linux' ? context.packager.config.linux : null
  if (linuxConfig) {
    const linuxExtraFiles = [
      {
        from: 'bins/flag.linux.txt',
        to: 'bins/flag.linux.txt',
      },
      {
        from: 'LICENSE.md',
        to: 'LICENSE.md',
      },
    ]
    if (withBuiltinEngine) {
      linuxExtraFiles.push({
        from: engineArchive,
        to: 'bins/yak.zip',
      })
    }
    switch (arch) {
      case 'arm64':
        linuxConfig.artifactName = `${artifactName}-${productVersion}-linux${
          isLegacy ? '-legacy' : ''
        }-arm64.${'${ext}'}`
        linuxConfig.extraFiles = linuxExtraFiles
        break
      case 'x64':
        linuxConfig.artifactName = `${artifactName}-${productVersion}-linux${
          isLegacy ? '-legacy' : ''
        }-amd64.${'${ext}'}`
        linuxConfig.extraFiles = linuxExtraFiles
        break

      default:
        break
    }
    context.packager.config.linux = linuxConfig
  }

  /**mac */
  /** 1:x64 3:arm64 */
  const macConfig = context.electronPlatformName === 'darwin' ? context.packager.config.mac : null
  if (macConfig) {
    const darwinExtraFiles = [
      {
        from: 'bins/flag.darwin.txt',
        to: 'bins/flag.darwin.txt',
      },
    ]
    if (withBuiltinEngine) {
      darwinExtraFiles.push({
        from: engineArchive,
        to: 'bins/yak.zip',
      })
      darwinExtraFiles.push({
        from: engineArchive.replace(/\.zip$/, '.sha256.txt'),
        to: 'bins/engine-sha256.txt',
      })
    }
    macConfig.artifactName = `${artifactName}-${productVersion}-darwin${
      isLegacy ? '-legacy' : ''
    }-${'${arch}'}.${'${ext}'}`
    switch (arch) {
      case 'arm64':
        macConfig.extraFiles = darwinExtraFiles
        break
      case 'x64':
        macConfig.extraFiles = darwinExtraFiles
        break

      default:
        break
    }
    context.packager.config.mac = macConfig
  }
}
