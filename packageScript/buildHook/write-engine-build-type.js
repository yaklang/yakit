const fs = require('fs')
const path = require('path')

const markerName = (platform, arch, isLegacy) => {
  const cpu = arch === 'arm64' ? 'arm64' : 'amd64'
  if (platform === 'win32' || platform === 'windows') {
    return isLegacy ? 'engine-build-type.windows-legacy' : 'engine-build-type.windows'
  }
  if (platform === 'linux') return `engine-build-type.linux.${cpu}`
  if (platform === 'darwin') return `engine-build-type.darwin.${cpu}`
  return ''
}

const readDownloadedBuildType = (platform, arch, isLegacy) => {
  const name = markerName(platform, arch, isLegacy)
  if (!name) return ''
  try {
    const text = fs.readFileSync(path.join(process.cwd(), 'bins', name), 'utf8').trim()
    if (text === 'slim' || text === 'full') return text
  } catch (e) {}
  return ''
}

/**
 * 仅社区版 Yakit 使用轻量标记。macOS / Linux / Windows（含 legacy）先按下载结果：
 * 下到轻量就是 slim，没有轻量包退回全量时是 full。其它发行版保持 full。
 * 没有探测文件时，社区版默认 slim。
 */
const writeEngineBuildTypeFile = (options = {}) => {
  const edition = process.env.YAKIT_EDITION || 'yakit'
  const isLegacy = options.isLegacy ?? process.env.YAKIT_LEGACY == 'true'
  const downloaded = edition === 'yakit' ? readDownloadedBuildType(options.platform, options.arch, isLegacy) : ''
  const type = edition === 'yakit' ? downloaded || 'slim' : 'full'
  const dir = path.join(process.cwd(), 'bins')
  fs.mkdirSync(dir, { recursive: true })
  fs.writeFileSync(path.join(dir, 'engine-build-type.txt'), type)
  return type
}

module.exports = writeEngineBuildTypeFile
