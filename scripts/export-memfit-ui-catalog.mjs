import fs from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { format, resolveConfig } from 'prettier'
import { catalog } from '../app/renderer/src/main/src/pages/ai-re-act/interactive-ui/catalog.mjs'

const output = fileURLToPath(
  new URL('../app/renderer/src/main/src/pages/ai-re-act/interactive-ui/catalog.manifest.json', import.meta.url),
)
const content = await format(JSON.stringify(catalog), { ...(await resolveConfig(output)), parser: 'json' })
if (process.argv.includes('--check')) {
  if ((await fs.readFile(output, 'utf8')) !== content)
    throw new Error('UI catalog manifest is stale; run node scripts/export-memfit-ui-catalog.mjs')
} else {
  await fs.writeFile(output, content)
}
