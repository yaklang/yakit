const fs = require('fs')

const targets = [
  { platform: 'windows', arch: 'x64', runner: 'windows-latest' },
  { platform: 'linux', arch: 'x64', runner: 'ubuntu-22.04' },
  { platform: 'linux', arch: 'arm64', runner: 'ubuntu-24.04-arm' },
  { platform: 'darwin', arch: 'x64', runner: 'macos-15-intel' },
  { platform: 'darwin', arch: 'arm64', runner: 'macos-15' },
]

function buildVersion(base, now = new Date()) {
  const match = /^(?:v)?(\d+\.\d+\.\d+)(?:-|$)/.exec(base)
  if (!match) throw new Error('Invalid base version: ' + base)
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Shanghai',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now)
  return match[1] + '-' + parts.find((p) => p.type === 'month').value + parts.find((p) => p.type === 'day').value
}

function buildMatrix(platform = 'mwl', legacy = false, includeLegacy = false) {
  if (!['mwl', 'windows', 'linux', 'darwin', 'uos'].includes(platform)) throw new Error('Unknown platform: ' + platform)
  const selected = targets.filter((t) => platform === 'mwl' || t.platform === (platform === 'uos' ? 'linux' : platform))
  return {
    include: selected.flatMap((t) =>
      (includeLegacy ? [false, true] : [legacy]).map((old) => ({
        ...t,
        legacy: old,
        id: t.platform + '-' + t.arch + (old ? '-legacy' : ''),
      })),
    ),
  }
}

if (require.main === module) {
  ;(async () => {
    const base =
      process.env.GITHUB_REF_TYPE === 'tag' ? process.env.GITHUB_REF_NAME : require('../package.json').version
    const version = buildVersion(base)
    const matrix = buildMatrix(
      process.env.BUILD_PLATFORM || 'mwl',
      process.env.BUILD_LEGACY === 'true',
      process.env.BUILD_INCLUDE_LEGACY === 'true',
    )
    let engine = ''
    if (process.env.BUILD_WITH_ENGINE === 'true') {
      engine =
        process.env.BUILD_ENGINE_VERSION ||
        (
          await require('./ci-desktop-build').download(
            'https://yaklang.oss-accelerate.aliyuncs.com/yak/latest/version.txt',
          )
        )
          .toString()
          .trim()
      if (!/^[\w.-]+$/.test(engine)) throw new Error('Invalid engine version')
    }
    fs.appendFileSync(
      process.env.GITHUB_OUTPUT,
      'version=' + version + '\nmatrix=' + JSON.stringify(matrix) + '\nengine=' + engine + '\n',
    )
    console.log('Build version: ' + version + '; targets: ' + matrix.include.map((t) => t.id).join(', '))
  })().catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
}

module.exports = { buildVersion, buildMatrix }
