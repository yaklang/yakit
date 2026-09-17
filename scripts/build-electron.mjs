import { build } from 'esbuild'
import { cp, mkdir, rm, rename, readFile } from 'node:fs/promises'
import { execFileSync } from 'node:child_process'
import { createRequire } from 'node:module'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const require = createRequire(import.meta.url)
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const destination = path.join(root, 'dist/electron')
const staging = path.join(root, 'dist/.electron-build')
const production = process.argv.includes('--production')
// A failed check/build throws before CLI starts Electron or electron-builder.
execFileSync(process.execPath, [require.resolve('typescript/bin/tsc'), '-p', 'tsconfig.electron.json'], {
  cwd: root,
  stdio: 'inherit',
})
if (production)
  execFileSync(process.execPath, ['scripts/generate-grpc-types.mjs', '--check'], { cwd: root, stdio: 'inherit' })
await rm(staging, { force: true, recursive: true })
await mkdir(staging, { recursive: true })
try {
  const result = await build({
    absWorkingDir: root,
    entryPoints: {
      'main/index': 'app/main/index.ts',
      'preload/main': 'app/main/preload/main.ts',
      'preload/engine-link': 'app/main/preload/engine-link.ts',
      'preload/screenshots': 'app/main/preload/screenshots.ts',
    },
    outdir: staging,
    bundle: true,
    platform: 'node',
    format: 'cjs',
    target: 'node16.17',
    packages: 'external',
    sourcemap: production ? false : 'linked',
    metafile: true,
    logLevel: 'info',
  })
  await build({
    absWorkingDir: root,
    entryPoints: ['app/renderer/screenshots-bridge.ts'],
    outfile: path.join(staging, 'renderer', 'screenshots.js'),
    bundle: true,
    platform: 'browser',
    format: 'iife',
    target: 'chrome106',
    sourcemap: production ? false : 'linked',
    logLevel: 'info',
  })
  // Explicit runtime resources: never copy first-party JS/TS sources into the package.
  for (const [from, to] of [
    ['app/protos/grpc.proto', 'grpc.proto'],
    ['app/main/resources/native', 'native'],
    ['app/main/resources/libs', 'libs'],
    ['app/main/resources/child-window', 'child-window'],
  ]) {
    await cp(path.join(root, from), path.join(staging, 'resources', to), {
      recursive: true,
      filter: (source) => !['ps-yak-process.js', 'ps-yak-process.ts'].includes(path.basename(source)),
    })
  }
  // Sandboxed preloads can only require Electron (all project helpers must be inlined).
  for (const [file, output] of Object.entries(result.metafile.outputs)) {
    if (!file.includes('/preload/') || !file.endsWith('.js')) continue
    const unexpected = output.imports.filter((entry) => entry.external && entry.path !== 'electron')
    if (unexpected.length)
      throw new Error(
        `Sandboxed preload has external imports: ${file}: ${unexpected.map((entry) => entry.path).join(', ')}`,
      )
  }
  await rm(destination, { force: true, recursive: true })
  await rename(staging, destination)
  const pkg = JSON.parse(await readFile(path.join(root, 'package.json'), 'utf8'))
  console.log(`Electron compiled once: ${pkg.main}`)
} finally {
  await rm(staging, { force: true, recursive: true })
}
