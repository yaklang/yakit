import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import {
  getRendererBuildIdentity,
  RENDERER_BUILD_METADATA_SCHEMA_VERSION,
} from '../e2e/fixtures/electron/renderer-build-metadata.mjs'

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(scriptDirectory, '..')
const mode = process.argv[2]
if (!['production-unminified', 'production-minified'].includes(mode)) {
  console.error('Usage: node scripts/write-e2e-renderer-build-metadata.mjs <production-unminified|production-minified>')
  process.exit(2)
}

const outputPath = path.join(repoRoot, 'app/renderer/pages/main/yakit-e2e-build.json')
const source = await getRendererBuildIdentity(repoRoot)
await mkdir(path.dirname(outputPath), { recursive: true })
await writeFile(
  outputPath,
  `${JSON.stringify(
    {
      schemaVersion: RENDERER_BUILD_METADATA_SCHEMA_VERSION,
      mode,
      node: process.version,
      reactMode: 'production',
      minified: mode === 'production-minified',
      builtAt: new Date().toISOString(),
      source,
    },
    null,
    2,
  )}\n`,
)
console.info(`[electron-e2e] Renderer build metadata: ${outputPath}`)
