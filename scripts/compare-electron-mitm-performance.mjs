import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { compareMITMPerformanceReports } from '../e2e/reporters/mitm-performance-compare.mjs'

const args = process.argv.slice(2)
const valueAfter = (name) => {
  const index = args.indexOf(name)
  return index >= 0 ? args[index + 1] : undefined
}
const baselinePath = valueAfter('--baseline')
const candidatePath = valueAfter('--candidate')
const outputPath = valueAfter('--out')
const maxRegressionPercent = Number(valueAfter('--max-regression') || 15)

if (!baselinePath || !candidatePath || !Number.isFinite(maxRegressionPercent) || maxRegressionPercent < 0) {
  console.error(
    'Usage: node scripts/compare-electron-mitm-performance.mjs --baseline <report> --candidate <report> [--max-regression 15] [--out <comparison.json>]',
  )
  process.exit(2)
}

try {
  const [baseline, candidate] = await Promise.all([
    readFile(path.resolve(baselinePath), 'utf8').then(JSON.parse),
    readFile(path.resolve(candidatePath), 'utf8').then(JSON.parse),
  ])
  const comparison = compareMITMPerformanceReports(baseline, candidate, { maxRegressionPercent })
  for (const item of comparison.comparisons) {
    const regression = Number.isFinite(item.relativeRegressionPercent)
      ? `${item.relativeRegressionPercent.toFixed(1)}%`
      : 'infinite'
    console.info(
      `${item.status.padEnd(10)} ${item.name}: ${item.baseline.toFixed(3)} -> ${item.candidate.toFixed(3)} ${item.unit} (${regression})`,
    )
  }
  if (outputPath) {
    const resolvedOutputPath = path.resolve(outputPath)
    await mkdir(path.dirname(resolvedOutputPath), { recursive: true })
    await writeFile(resolvedOutputPath, `${JSON.stringify(comparison, null, 2)}\n`)
  }
  process.exit(comparison.status === 'passed' ? 0 : 1)
} catch (error) {
  console.error(`[mitm-performance-compare] ${error?.stack || error}`)
  process.exit(2)
}
