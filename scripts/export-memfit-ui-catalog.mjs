import fs from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { catalog } from '../app/renderer/src/main/src/pages/ai-re-act/interactive-ui/catalog.mjs'

const output = fileURLToPath(
  new URL('../app/renderer/src/main/src/pages/ai-re-act/interactive-ui/catalog.manifest.json', import.meta.url),
)
const content = `${JSON.stringify(catalog, null, 2)}\n`
if (process.argv.includes('--check')) {
  if ((await fs.readFile(output, 'utf8')) !== content)
    throw new Error('UI catalog manifest is stale; run node scripts/export-memfit-ui-catalog.mjs')
} else {
  await fs.writeFile(output, content)
}
