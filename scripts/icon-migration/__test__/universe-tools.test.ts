// @ts-nocheck
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { buildSourceManifest, sha256, writeJson } from '../build-source-manifest.mjs'
import { censusReactSvg } from '../census-react-svg.mjs'
import { auditLocalReactIcons, canonicalDefinitionId } from '../audit-local-react-icons.mjs'
import { reconcileUniverse } from '../reconcile-universe.mjs'

const fixtureRoot = path.resolve(import.meta.dirname, '../__fixtures__/universe')
const renderers = [
  { name: 'main', root: 'main', tsconfig: 'main/tsconfig.json', configs: [] },
  { name: 'link', root: 'link', tsconfig: 'link/tsconfig.json', configs: [] },
]
const seedFiles = ['main/src/icons.tsx', 'shared/shared-icon.tsx']
const temporaryDirectories: string[] = []

const pipeline = async (phase: 'initial' | 'terminal') => {
  const manifest = await buildSourceManifest({ repoRoot: fixtureRoot, phase, renderers, command: ['fixture'] })
  const census = await censusReactSvg({ repoRoot: fixtureRoot, manifest, command: ['fixture'] })
  const universe = await auditLocalReactIcons({ repoRoot: fixtureRoot, manifest, census, command: ['fixture'] })
  return { manifest, census, universe }
}

const writePipeline = (runDir: string, phase: 'initial' | 'terminal', result: Awaited<ReturnType<typeof pipeline>>) => {
  writeJson(path.join(runDir, `source-manifest.${phase}.json`), result.manifest)
  writeJson(path.join(runDir, `raw-census.${phase}.json`), result.census)
  writeJson(path.join(runDir, `universe.${phase}.json`), result.universe)
}

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) fs.rmSync(directory, { recursive: true, force: true })
})

describe('universe source manifest and independent census', () => {
  it('merges renderer membership for a shared physical source and emits receipts', async () => {
    const { manifest } = await pipeline('initial')
    const shared = manifest.files.find((file) => file.path === 'shared/shared-icon.tsx')

    expect(shared?.renderer_membership).toEqual(['link', 'main'])
    expect(shared?.scan_receipt).toBe(`scan:v1:${sha256(`${shared.path}\0${shared.hash}\0link,main`)}`)
    expect(manifest.files.every((file) => file.scan_receipt && file.inclusion.length > 0)).toBe(true)
  })

  it('detects raw SVG, wrapper, and factory syntax without semantic dispositions', async () => {
    const { census } = await pipeline('initial')
    const kinds = new Set(census.signals.map((signal) => signal.syntax_kind))

    expect(kinds).toContain('jsx-svg')
    expect(kinds).toContain('svg-wrapper-root')
    expect(kinds).toContain('icon-factory-call')
    expect(census.signals.every((signal) => !('scope_decision' in signal) && !('disposition' in signal))).toBe(true)
  })
})

describe('universe semantic audit and identity', () => {
  it('consumes every raw signal exactly once and builds canonical definitions and consumers', async () => {
    const first = await pipeline('initial')
    const second = await pipeline('initial')
    const counts = new Map<string, number>()
    for (const row of first.universe.raw_signal_consumption)
      counts.set(row.raw_signal_id, (counts.get(row.raw_signal_id) || 0) + 1)

    expect(first.census.signals.every((signal) => counts.get(signal.id) === 1)).toBe(true)
    expect(first.universe.definitions.map((row) => row.id)).toEqual(second.universe.definitions.map((row) => row.id))
    const named = first.universe.definitions.find(
      (row) => row.file === 'main/src/icons.tsx' && row.symbol === 'NamedIcon',
    )
    expect(named?.id).toBe(canonicalDefinitionId(named.file, named.canonical_anchor, named.origin_kind))
    expect(
      first.universe.consumer_graph.some(
        (edge) =>
          edge.definition_id === named?.id && edge.consumer_file === 'main/src/consumer.tsx' && edge.kind === 'jsx-use',
      ),
    ).toBe(true)
    const chart = first.universe.definitions.find((row) => row.symbol === 'ChartVisual')
    expect(chart?.scope_decision).toBe('excluded-non-icon-react-visual')
    expect(chart?.rationale).toBeTruthy()
    expect(chart?.evidence.length).toBeGreaterThan(0)
  })
})

describe('universe reconciliation', () => {
  it('closes unchanged initial and terminal equations', async () => {
    const runDir = fs.mkdtempSync(path.join(os.tmpdir(), 'yakit-icon-universe-'))
    temporaryDirectories.push(runDir)
    const initial = await pipeline('initial')
    const terminal = await pipeline('terminal')
    writePipeline(runDir, 'initial', initial)
    writePipeline(runDir, 'terminal', terminal)

    const initialResult = reconcileUniverse({ phase: 'initial', runDir, seedFiles, command: ['fixture'] })
    const terminalResult = reconcileUniverse({ phase: 'terminal', runDir, seedFiles, command: ['fixture'] })

    expect(initialResult.status).toEqual({ pass: true, exit_code: 0 })
    expect(terminalResult.status).toEqual({ pass: true, exit_code: 0 })
    expect(terminalResult.equations.terminal.initial_exactly_one_terminal).toBe(initial.universe.definitions.length)
    expect(terminalResult.equations.terminal.fresh_final_candidates).toBe(
      terminalResult.equations.terminal.terminal_present,
    )
  })

  it('fails closed when a raw signal is consumed more than once', async () => {
    const runDir = fs.mkdtempSync(path.join(os.tmpdir(), 'yakit-icon-universe-'))
    temporaryDirectories.push(runDir)
    const initial = await pipeline('initial')
    initial.universe.raw_signal_consumption.push({ ...initial.universe.raw_signal_consumption[0] })
    writePipeline(runDir, 'initial', initial)

    const result = reconcileUniverse({ phase: 'initial', runDir, seedFiles, command: ['fixture'] })

    expect(result.status.pass).toBe(false)
    expect(result.findings).toContainEqual(expect.objectContaining({ code: 'multiply-consumed-raw-signal' }))
  })
})
