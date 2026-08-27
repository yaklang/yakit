import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { SEED_FILES } from './audit-local-react-icons.mjs'
import { readJson, sha256, writeJson } from './build-source-manifest.mjs'

export const SCHEMA_VERSION = 'icon-migration-reconciliation/v1'
export const TOOL_VERSION = '1.0.0'

const loadRequired = (file, schemaVersion) => {
  if (!fs.existsSync(file)) throw new Error(`required artifact does not exist: ${file}`)
  const value = readJson(file)
  if (value.schema_version !== schemaVersion) throw new Error(`unsupported schema in ${file}: ${value.schema_version}`)
  return value
}

const countBy = (rows, keyFor) => {
  const counts = new Map()
  for (const row of rows) counts.set(keyFor(row), (counts.get(keyFor(row)) || 0) + 1)
  return counts
}

const approvedAbsentRow = (row) =>
  row.source_presence === 'absent' &&
  ['migrated', 'deleted'].includes(row.terminal_state) &&
  row.deletion_evidence?.approved === true &&
  typeof row.deletion_evidence?.id === 'string' &&
  row.deletion_evidence.id.length > 0

export function reconcileUniverse({ phase, runDir, command = process.argv, seedFiles = SEED_FILES }) {
  if (!['initial', 'terminal'].includes(phase)) throw new Error('--phase must be initial or terminal')
  const manifestPath = path.join(runDir, `source-manifest.${phase}.json`)
  const censusPath = path.join(runDir, `raw-census.${phase}.json`)
  const universePath = path.join(runDir, `universe.${phase}.json`)
  const manifest = loadRequired(manifestPath, 'icon-migration-source-manifest/v1')
  const census = loadRequired(censusPath, 'icon-migration-raw-census/v1')
  const universe = loadRequired(universePath, 'icon-migration-universe/v1')
  const findings = []

  if (!manifest.status?.pass) findings.push({ severity: 'fatal', code: 'source-manifest-failed' })
  if (!census.status?.pass) findings.push({ severity: 'fatal', code: 'raw-census-failed' })
  if (!universe.status?.pass) findings.push({ severity: 'fatal', code: 'semantic-audit-failed' })
  if (census.manifest_artifact_hash !== manifest.artifact_hash)
    findings.push({ severity: 'fatal', code: 'census-manifest-mismatch' })
  if (universe.source_manifest_artifact_hash !== manifest.artifact_hash)
    findings.push({ severity: 'fatal', code: 'universe-manifest-mismatch' })
  if (universe.raw_census_artifact_hash !== census.artifact_hash)
    findings.push({ severity: 'fatal', code: 'universe-census-mismatch' })

  for (const file of manifest.files) {
    const expected = `scan:v1:${sha256(`${file.path}\0${file.hash}\0${file.renderer_membership.join(',')}`)}`
    if (file.scan_receipt !== expected)
      findings.push({ severity: 'fatal', code: 'invalid-scan-receipt', file: file.path })
  }
  const consumptionCounts = countBy(universe.raw_signal_consumption, (row) => row.raw_signal_id)
  for (const signal of census.signals) {
    const count = consumptionCounts.get(signal.id) || 0
    if (count !== 1)
      findings.push({
        severity: 'fatal',
        code: count === 0 ? 'orphaned-raw-signal' : 'multiply-consumed-raw-signal',
        raw_signal_id: signal.id,
        count,
      })
  }
  const rawIds = new Set(census.signals.map((signal) => signal.id))
  for (const row of universe.raw_signal_consumption) {
    if (!rawIds.has(row.raw_signal_id))
      findings.push({ severity: 'fatal', code: 'unknown-consumed-raw-signal', raw_signal_id: row.raw_signal_id })
  }
  const definitionCounts = countBy(universe.definitions, (row) => row.id)
  for (const [id, count] of definitionCounts)
    if (count !== 1) findings.push({ severity: 'fatal', code: 'canonical-id-collision', definition_id: id, count })
  const definitionIds = new Set(universe.definitions.map((row) => row.id))
  for (const edge of universe.consumer_graph) {
    if (!definitionIds.has(edge.definition_id))
      findings.push({ severity: 'fatal', code: 'consumer-edge-missing-definition', edge_id: edge.id })
  }
  for (const definition of universe.definitions) {
    if (!['local-react-icon', 'excluded-non-icon-react-visual'].includes(definition.scope_decision)) {
      findings.push({ severity: 'fatal', code: 'unclassified-scope', definition_id: definition.id })
    }
    if (
      definition.scope_decision === 'excluded-non-icon-react-visual' &&
      (!definition.rationale || !definition.evidence?.length)
    ) {
      findings.push({ severity: 'fatal', code: 'unsupported-exclusion', definition_id: definition.id })
    }
  }

  const seedCoverage = seedFiles.map((file) => ({
    file,
    manifest_present: manifest.files.some((row) => row.path === file),
    definition_count: universe.definitions.filter((row) => row.file === file).length,
  }))
  for (const seed of seedCoverage) {
    if (!seed.manifest_present)
      findings.push({ severity: 'fatal', code: 'missing-seed-manifest-file', file: seed.file })
    if (seed.definition_count === 0)
      findings.push({ severity: 'fatal', code: 'missing-seed-candidate', file: seed.file })
  }

  const equations = {
    scan_receipts: {
      manifest_files: manifest.files.length,
      valid_receipts: manifest.files.filter(
        (file) =>
          file.scan_receipt ===
          `scan:v1:${sha256(`${file.path}\0${file.hash}\0${file.renderer_membership.join(',')}`)}`,
      ).length,
    },
    raw_signal_consumption: {
      raw_signals: census.signals.length,
      exactly_once: census.signals.filter((signal) => consumptionCounts.get(signal.id) === 1).length,
    },
    seeds: {
      expected_files: seedFiles.length,
      covered_files: seedCoverage.filter((row) => row.manifest_present && row.definition_count > 0).length,
    },
  }

  if (phase === 'terminal') {
    const initial = loadRequired(path.join(runDir, 'universe.initial.json'), 'icon-migration-universe/v1')
    const ledgerCandidates = ['terminal-ledger.json', 'terminal-dispositions.json'].map((file) =>
      path.join(runDir, file),
    )
    const ledgerPath = ledgerCandidates.find(fs.existsSync)
    const ledger = ledgerPath ? readJson(ledgerPath) : { rows: [] }
    const freshIds = new Set(universe.definitions.map((row) => row.id))
    const initialIds = new Set(initial.definitions.map((row) => row.id))
    const terminalRows = [
      ...universe.definitions.map((row) => ({
        ...row,
        source_presence: 'present',
        terminal_state: row.terminal_state || 'retained',
      })),
      ...(ledger.rows || []).filter((row) => row.source_presence === 'absent'),
    ]
    const terminalCounts = countBy(terminalRows, (row) => row.id)
    for (const initialRow of initial.definitions) {
      const rows = terminalRows.filter((row) => row.id === initialRow.id)
      if (rows.length !== 1)
        findings.push({
          severity: 'fatal',
          code: 'initial-definition-terminal-cardinality',
          definition_id: initialRow.id,
          count: rows.length,
        })
      else if (!freshIds.has(initialRow.id) && !approvedAbsentRow(rows[0]))
        findings.push({
          severity: 'fatal',
          code: 'absent-initial-without-approved-deletion',
          definition_id: initialRow.id,
        })
    }
    for (const freshRow of universe.definitions) {
      if (!initialIds.has(freshRow.id) && !(freshRow.newly_discovered_evidence || freshRow.predecessor_ids?.length)) {
        findings.push({ severity: 'fatal', code: 'unclassified-new-terminal-key', definition_id: freshRow.id })
      }
      for (const predecessor of freshRow.predecessor_ids || []) {
        if (!initialIds.has(predecessor))
          findings.push({
            severity: 'fatal',
            code: 'unknown-predecessor',
            definition_id: freshRow.id,
            predecessor_id: predecessor,
          })
      }
    }
    for (const row of terminalRows) {
      for (const successor of row.successor_ids || []) {
        if (!terminalCounts.has(successor))
          findings.push({
            severity: 'fatal',
            code: 'unknown-successor',
            definition_id: row.id,
            successor_id: successor,
          })
      }
    }
    equations.terminal = {
      fresh_final_candidates: freshIds.size,
      terminal_present: terminalRows.filter((row) => row.source_presence === 'present').length,
      initial_definitions: initial.definitions.length,
      initial_exactly_one_terminal: initial.definitions.filter((row) => terminalCounts.get(row.id) === 1).length,
      approved_absent: terminalRows.filter(approvedAbsentRow).length,
      explicitly_classified_new: universe.definitions.filter(
        (row) => !initialIds.has(row.id) && Boolean(row.newly_discovered_evidence || row.predecessor_ids?.length),
      ).length,
    }
    if (equations.terminal.fresh_final_candidates !== equations.terminal.terminal_present)
      findings.push({ severity: 'fatal', code: 'fresh-terminal-present-equation-failed' })
  }

  const result = {
    schema_version: SCHEMA_VERSION,
    tool: {
      name: 'reconcile-universe',
      version: TOOL_VERSION,
      hash: sha256(fs.readFileSync(fileURLToPath(import.meta.url))),
    },
    phase,
    command,
    cwd: process.cwd(),
    generated_at: new Date().toISOString(),
    input_hashes: {
      manifest: sha256(JSON.stringify(manifest)),
      census: sha256(JSON.stringify(census)),
      universe: sha256(JSON.stringify(universe)),
    },
    seed_coverage: seedCoverage,
    equations,
    findings,
    status: { pass: findings.length === 0, exit_code: findings.length === 0 ? 0 : 1 },
  }
  result.artifact_hash = sha256(JSON.stringify({ ...result, generated_at: undefined, artifact_hash: undefined }))
  return result
}

const parseArgs = (argv) =>
  Object.fromEntries(
    argv
      .slice(2)
      .flatMap((value, index, values) => (value.startsWith('--') ? [[value.slice(2), values[index + 1]]] : [])),
  )

function main() {
  const args = parseArgs(process.argv)
  if (!args.phase || !args['run-dir'])
    throw new Error('usage: reconcile-universe.mjs --phase initial|terminal --run-dir <dir>')
  const runDir = path.resolve(process.cwd(), args['run-dir'])
  const result = reconcileUniverse({ phase: args.phase, runDir })
  writeJson(path.join(runDir, `reconciliation.${args.phase}.json`), result)
  if (!result.status.pass) process.exitCode = 1
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    main()
  } catch (error) {
    process.stderr.write(`${error.stack || error.message || error}\n`)
    process.exitCode = 1
  }
}
