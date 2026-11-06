import { appendFile, mkdir, readFile, writeFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { sha256 } from './model.mjs'

const require = createRequire(import.meta.url)
const packagingTools = ['@electron/notarize', 'electron', 'electron-builder', 'esbuild']

export function packagingManifest(manifest) {
  return {
    name: 'yakit-release-tools',
    version: '1.0.0',
    private: true,
    dependencies: {
      ...manifest.dependencies,
      ...Object.fromEntries(packagingTools.map((name) => [name, manifest.devDependencies[name]])),
    },
    ...(manifest.resolutions ? { resolutions: manifest.resolutions } : {}),
  }
}

// Software versions do not change the dependency graph. Lockfile bytes still
// invalidate the cache when a transitive dependency changes.
export function dependencyKey(manifest, lockfile) {
  const fields = [
    'dependencies',
    'devDependencies',
    'optionalDependencies',
    'peerDependencies',
    'resolutions',
    'engines',
    'packageManager',
    'os',
    'cpu',
  ]
  return sha256(JSON.stringify(fields.map((field) => [field, manifest[field] ?? null])) + '\0' + lockfile)
}

async function dependencyFiles(directory) {
  const manifest = JSON.parse(await readFile(path.join(directory, 'package.json'), 'utf8'))
  const lockfile = await readFile(path.join(directory, 'yarn.lock'), 'utf8')
  return { manifest, lockfile }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const command = process.argv[2]
  if (command === 'keys') {
    const mode = process.env.RELEASE_TOOLCHAIN_MODE
    if (!['build', 'packaging'].includes(mode)) throw new Error('Expected build or packaging toolchain')
    const root = await dependencyFiles('.')
    const main = await dependencyFiles('app/renderer/src/main')
    const link = await dependencyFiles('app/renderer/engine-link-startup')
    const manifest = mode === 'packaging' ? packagingManifest(root.manifest) : root.manifest
    await appendFile(
      process.env.GITHUB_OUTPUT,
      `tools=${dependencyKey(manifest, root.lockfile)}\nrenderers=${sha256(
        dependencyKey(main.manifest, main.lockfile) + dependencyKey(link.manifest, link.lockfile),
      )}\n`,
    )
  } else if (command === 'manifest') {
    const { manifest, lockfile } = await dependencyFiles('.')
    await mkdir('.release/toolchain', { recursive: true })
    await writeFile('.release/toolchain/package.json', JSON.stringify(packagingManifest(manifest), null, 2) + '\n')
    await writeFile('.release/toolchain/yarn.lock', lockfile)
  } else if (command === 'electron') {
    const { downloadArtifact } = require('@electron/get')
    await downloadArtifact({
      version: process.env.RELEASE_ELECTRON_VERSION,
      artifactName: 'electron',
      platform: process.platform,
      arch: process.env.RELEASE_ELECTRON_ARCH || process.arch,
    })
  } else throw new Error('Usage: toolchain.mjs keys|manifest|electron')
}
