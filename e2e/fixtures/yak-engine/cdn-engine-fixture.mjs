import { createRequire } from 'node:module'
import { createHash } from 'node:crypto'
import { copyFile, chmod, mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'

const require = createRequire(import.meta.url)
const manifest = require('../../../scripts/engine-startup/engines.json')
const { download } = require('../../../scripts/engine-startup/download-engine.cjs')

// Install only a verified, pinned artifact into the runner's disposable home.
// Yakit itself owns check/start/auth/stop; this fixture never pre-starts Yak.
export async function prepareCdnEngine({ repoRoot, userDataDir, yakitHomeDir }) {
  const artifact = manifest.ipc[`${process.platform}-${process.arch}`]
  if (!artifact) throw new Error('No pinned IPC engine for this platform')
  const binary = process.env.YAKIT_E2E_CDN_BINARY
    ? path.resolve(process.env.YAKIT_E2E_CDN_BINARY)
    : download('ipc', path.join(repoRoot, 'reports/e2e-electron/cdn-cache'))
  const sha256 = createHash('sha256')
    .update(await readFile(binary))
    .digest('hex')
  if (sha256 !== artifact.sha256) throw new Error('IPC engine checksum mismatch; refusing execution')
  const engineDir = path.join(yakitHomeDir, 'yak-engine')
  const configuration = path.join(userDataDir, 'configuration')
  await mkdir(engineDir, { recursive: true })
  await mkdir(configuration, { recursive: true })
  const target = path.join(engineDir, process.platform === 'win32' ? 'yak.exe' : 'yak')
  await copyFile(binary, target)
  if (process.platform !== 'win32') await chmod(target, 0o700)
  await writeFile(
    path.join(configuration, 'config.json'),
    JSON.stringify({
      YAKIT_HOME: yakitHomeDir,
      autoStart: false,
      softLange: 'zh',
      yakitMode: 'classic',
      workspaceHistory: [yakitHomeDir],
    }),
  )
  return { version: manifest.ipc.version, sha256, file: artifact.file, source: 'pinned-cdn' }
}
