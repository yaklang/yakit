const fs = require('node:fs')
const path = require('node:path')
const { createHash } = require('node:crypto')
const { spawnSync } = require('node:child_process')
const manifest = require('./engines.json')

function download(kind, directory, platform = process.platform, arch = process.arch) {
  const release = manifest[kind]
  const artifact = release?.[`${platform}-${arch}`]
  if (!artifact || !/^[a-f0-9]{64}$/.test(artifact.sha256)) throw new Error('No pinned artifact/hash for this platform')
  fs.mkdirSync(directory, { recursive: true })
  const target = path.join(path.resolve(directory), `${release.version}-${artifact.file}`)
  const hash = () => createHash('sha256').update(fs.readFileSync(target)).digest('hex')
  if (!fs.existsSync(target) || hash() !== artifact.sha256) {
    const url = `https://yaklang.oss-accelerate.aliyuncs.com/yak/${release.version}/${artifact.file}`
    const result = spawnSync(
      process.platform === 'win32' ? 'curl.exe' : 'curl',
      [
        '--fail',
        '--location',
        '--silent',
        '--show-error',
        '--proto',
        '=https',
        '--proto-redir',
        '=https',
        '--retry',
        '2',
        '--retry-max-time',
        '120',
        '--connect-timeout',
        '15',
        '--max-time',
        '120',
        '--output',
        target,
        url,
      ],
      { windowsHide: true, timeout: 180000, stdio: ['ignore', 'ignore', 'pipe'] },
    )
    if (result.error || result.status !== 0) throw new Error(`Pinned ${kind} engine download failed (${result.status})`)
    if (hash() !== artifact.sha256) throw new Error(`Pinned ${kind} engine checksum mismatch; refusing execution`)
  }
  if (platform !== 'win32') fs.chmodSync(target, 0o700)
  return target
}

if (require.main === module)
  console.log(download(process.argv[2] || 'ipc', process.argv[3], process.argv[4], process.argv[5]))
module.exports = { download }
