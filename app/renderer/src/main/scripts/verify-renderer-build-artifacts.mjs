/**
 * 构建产物冒烟：确认 Electron 生产加载所需的关键文件存在。
 * 用法（在 app/renderer/src/main）：node scripts/verify-renderer-build-artifacts.mjs
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const rootDir = path.dirname(fileURLToPath(import.meta.url))
const outDir = path.resolve(rootDir, '../../../pages/main')

const requiredFiles = ['index.html', 'yakit-aux.html']
const requiredGlobs = [
  { label: 'main entry js', pattern: /^main-.+\.js$/ },
  { label: 'aux entry js', pattern: /^aux-.+\.js$/ },
  { label: 'css bundle', pattern: /^style-.+\.css$/ },
  { label: 'monaco editor worker', pattern: /^editor\.worker-.+\.js$/ },
]

const missing = []

for (const name of requiredFiles) {
  const p = path.join(outDir, name)
  if (!fs.existsSync(p)) missing.push(name)
}

const assetsDir = path.join(outDir, 'assets')
if (!fs.existsSync(assetsDir)) {
  missing.push('assets/')
} else {
  const assets = fs.readdirSync(assetsDir)
  for (const { label, pattern } of requiredGlobs) {
    if (!assets.some((f) => pattern.test(f))) missing.push(`assets/${label}`)
  }
}

if (missing.length) {
  console.error(`[verify-renderer] missing artifacts under ${outDir}:`)
  missing.forEach((m) => console.error(`  - ${m}`))
  process.exit(1)
}

console.log(`[verify-renderer] ok: ${outDir}`)
