import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import {
  compareMITMBodyMatrices,
  renderMITMBodyMatrixComparisonMarkdown,
} from '../e2e/reporters/mitm-matrix-compare.mjs'

const args = process.argv.slice(2)
const valueAfter = (name) => {
  const index = args.indexOf(name)
  if (index < 0) return undefined
  if (!args[index + 1] || args[index + 1].startsWith('--')) throw new Error(`${name} requires a value`)
  return args[index + 1]
}
const valuesAfter = (name) =>
  args.flatMap((argument, index) => (argument === name && args[index + 1] ? [args[index + 1]] : []))

const baselinePath = valueAfter('--baseline')
const candidatePath = valueAfter('--candidate')
const caseName = valueAfter('--case')
const outputPath = valueAfter('--out')
const markdownOutputPath = valueAfter('--markdown-out')
const allowedDiagnosticDifferences = valuesAfter('--allow-diagnostic')
const allowedCaseConfigDifferences = valuesAfter('--allow-case-config')

if (!baselinePath || !candidatePath) {
  console.error(
    'Usage: node scripts/compare-electron-mitm-matrices.mjs --baseline <summary.json> --candidate <summary.json> [--case <name>] [--allow-diagnostic <field>] [--allow-case-config <field>] [--out <comparison.json>] [--markdown-out <comparison.md>]',
  )
  process.exit(2)
}

try {
  const [baseline, candidate] = await Promise.all([
    readFile(path.resolve(baselinePath), 'utf8').then(JSON.parse),
    readFile(path.resolve(candidatePath), 'utf8').then(JSON.parse),
  ])
  const comparison = compareMITMBodyMatrices(baseline, candidate, {
    caseName,
    allowedDiagnosticDifferences,
    allowedCaseConfigDifferences,
  })
  for (const entry of comparison.comparisons) {
    if (entry.direction === 'diagnostic') continue
    if (!Number.isFinite(entry.improvementPercent)) {
      console.info(
        `${entry.metric.padEnd(48)} ${entry.baselineMedian.toFixed(3)} -> ${entry.candidateMedian.toFixed(3)} (percent unavailable: zero baseline)`,
      )
      continue
    }
    const favorable = entry.improvementPercent >= 0
    console.info(
      `${entry.metric.padEnd(48)} ${entry.baselineMedian.toFixed(3)} -> ${entry.candidateMedian.toFixed(3)} (${Math.abs(entry.improvementPercent).toFixed(1)}% ${favorable ? 'improvement' : 'regression'})`,
    )
  }
  const writes = []
  if (outputPath) {
    const resolved = path.resolve(outputPath)
    writes.push(
      mkdir(path.dirname(resolved), { recursive: true }).then(() =>
        writeFile(resolved, `${JSON.stringify(comparison, null, 2)}\n`),
      ),
    )
  }
  if (markdownOutputPath) {
    const resolved = path.resolve(markdownOutputPath)
    writes.push(
      mkdir(path.dirname(resolved), { recursive: true }).then(() =>
        writeFile(resolved, renderMITMBodyMatrixComparisonMarkdown(comparison)),
      ),
    )
  }
  await Promise.all(writes)
} catch (error) {
  console.error(`[mitm-matrix-compare] ${error?.stack || error}`)
  process.exit(2)
}
