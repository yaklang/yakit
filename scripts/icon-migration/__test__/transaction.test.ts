// @ts-nocheck
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { execFileSync } from 'node:child_process'
import { afterEach, describe, expect, it } from 'vitest'
import { applyTransaction, captureTransaction, reverseTransaction, verifyTransaction } from '../transaction.mjs'

const fixtureRoot = path.resolve(import.meta.dirname, '../__fixtures__/transaction')
const transactionTool = path.resolve(import.meta.dirname, '../transaction.mjs')
const temporaryDirectories: string[] = []

const git = (repoRoot: string, args: string[]) =>
  execFileSync('git', args, { cwd: repoRoot, encoding: 'utf8', maxBuffer: 8 * 1024 * 1024 })

const write = (file: string, value: string) => {
  fs.mkdirSync(path.dirname(file), { recursive: true })
  fs.writeFileSync(file, value)
}

const setup = ({ evidenceInsideRepository = false } = {}) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'yakit-icon-transaction-test-'))
  temporaryDirectories.push(root)
  fs.cpSync(fixtureRoot, root, { recursive: true })
  git(root, ['init', '-q'])
  git(root, ['config', 'user.email', 'test@example.invalid'])
  git(root, ['config', 'user.name', 'Transaction Test'])
  git(root, ['add', '.'])
  git(root, ['commit', '-qm', 'fixture'])

  const evidence = evidenceInsideRepository
    ? path.join(root, '.transaction-evidence')
    : fs.mkdtempSync(path.join(os.tmpdir(), 'yakit-icon-transaction-evidence-'))
  if (!evidenceInsideRepository) temporaryDirectories.push(evidence)
  const forwardPatchFile = path.join(evidence, 'batch.input.patch')
  write(path.join(root, 'base.txt'), 'package icon after migration\n')
  write(forwardPatchFile, git(root, ['diff', '--', 'base.txt']))
  write(path.join(root, 'base.txt'), 'local icon before migration\n')
  const filesFile = path.join(evidence, 'batch.files.txt')
  const definitionsFile = path.join(evidence, 'batch.definitions.json')
  const consumersFile = path.join(evidence, 'batch.consumers.json')
  const helpersFile = path.join(evidence, 'batch.helpers.json')
  const universeFile = path.join(evidence, 'batch.universe.json')
  const matrixFile = path.join(evidence, 'batch.matrix.json')
  const ledgerFile = path.join(evidence, 'batch.ledger.json')
  const manifestFile = path.join(evidence, 'batch.json')
  write(filesFile, 'base.txt\n')
  write(definitionsFile, JSON.stringify(['icon-def:v1:test']))
  write(consumersFile, JSON.stringify([{ file: 'consumer.tsx', flow: 'jsx-use' }]))
  write(helpersFile, JSON.stringify([]))
  write(universeFile, JSON.stringify({ total: 1, ids: ['icon-def:v1:test'] }))
  write(matrixFile, JSON.stringify({ cells: [{ mode: 'default', renderer: 'main', theme: 'light' }] }))
  write(ledgerFile, JSON.stringify({ migrated: ['icon-def:v1:test'], retained: [] }))

  return {
    root,
    evidence,
    manifestFile,
    forwardPatchFile,
    filesFile,
    definitionsFile,
    consumersFile,
    helpersFile,
    universeFile,
    matrixFile,
    ledgerFile,
    capture: () =>
      captureTransaction({
        repoRoot: root,
        manifestFile,
        forwardPatchFile,
        filesFile,
        definitionsFile,
        consumersFile,
        helpersFile,
        universeFile,
        matrixFile,
        ledgerFile,
        command: ['fixture'],
      }),
  }
}

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) fs.rmSync(directory, { recursive: true, force: true })
})

describe('dirty-worktree-safe icon migration transaction', () => {
  it('captures, applies, verifies, reverses, and reapplies only the declared scope', () => {
    const fixture = setup()
    write(
      path.join(fixture.root, 'consumer.tsx'),
      `${fs.readFileSync(path.join(fixture.root, 'consumer.tsx'))}\n// unrelated dirty edit\n`,
    )
    const unrelatedBefore = fs.readFileSync(path.join(fixture.root, 'consumer.tsx'), 'utf8')

    const manifest = fixture.capture()
    expect(manifest.file_states.reversed['base.txt'].sha256).not.toBe(manifest.file_states.applied['base.txt'].sha256)
    expect(fs.readFileSync(manifest.artifacts.preimages + '/base.txt', 'utf8')).toBe('local icon before migration\n')
    expect(manifest.evidence).toEqual({
      universe: expect.objectContaining({ path: fixture.universeFile, sha256: expect.any(String) }),
      matrix: expect.objectContaining({ path: fixture.matrixFile, sha256: expect.any(String) }),
      ledger: expect.objectContaining({ path: fixture.ledgerFile, sha256: expect.any(String) }),
    })

    applyTransaction({ repoRoot: fixture.root, manifestFile: fixture.manifestFile })
    expect(fs.readFileSync(path.join(fixture.root, 'base.txt'), 'utf8')).toBe('package icon after migration\n')
    expect(
      verifyTransaction({ repoRoot: fixture.root, manifestFile: fixture.manifestFile, state: 'applied' }).pass,
    ).toBe(true)

    reverseTransaction({ repoRoot: fixture.root, manifestFile: fixture.manifestFile })
    expect(fs.readFileSync(path.join(fixture.root, 'base.txt'), 'utf8')).toBe('local icon before migration\n')
    expect(
      verifyTransaction({ repoRoot: fixture.root, manifestFile: fixture.manifestFile, state: 'reversed' }).pass,
    ).toBe(true)

    applyTransaction({ repoRoot: fixture.root, manifestFile: fixture.manifestFile })
    expect(
      verifyTransaction({ repoRoot: fixture.root, manifestFile: fixture.manifestFile, state: 'applied' }).pass,
    ).toBe(true)
    expect(fs.readFileSync(path.join(fixture.root, 'consumer.tsx'), 'utf8')).toBe(unrelatedBefore)

    const log = fs.readFileSync(manifest.artifacts.rollback_log, 'utf8').trim().split('\n').map(JSON.parse)
    expect(log.map((entry) => `${entry.action}:${entry.verdict}`)).toEqual([
      'capture:pass',
      'apply:pass',
      'verify:pass',
      'reverse:pass',
      'verify:pass',
      'apply:pass',
      'verify:pass',
    ])
    expect(log.every((entry, index) => index === 0 || entry.previous_record_hash === log[index - 1].record_hash)).toBe(
      true,
    )
    expect(log.every((entry) => entry.resulting_hashes?.evidence?.universe === manifest.evidence.universe.sha256)).toBe(
      true,
    )
  })

  it('excludes repository-local transaction outputs from the external dirty-worktree checkpoint', () => {
    const fixture = setup({ evidenceInsideRepository: true })
    const manifest = fixture.capture()

    applyTransaction({ repoRoot: fixture.root, manifestFile: fixture.manifestFile })
    verifyTransaction({ repoRoot: fixture.root, manifestFile: fixture.manifestFile, state: 'applied' })
    reverseTransaction({ repoRoot: fixture.root, manifestFile: fixture.manifestFile })
    verifyTransaction({ repoRoot: fixture.root, manifestFile: fixture.manifestFile, state: 'reversed' })

    expect(manifest.scope.transaction_outputs).toContain('.transaction-evidence/batch.json')
  })

  it('refuses scoped hash mismatches before mutation and appends a refusal record', () => {
    const fixture = setup()
    const manifest = fixture.capture()
    write(path.join(fixture.root, 'base.txt'), 'concurrent scoped edit\n')

    expect(() => applyTransaction({ repoRoot: fixture.root, manifestFile: fixture.manifestFile })).toThrow(
      /file hash\/status mismatch/,
    )
    expect(fs.readFileSync(path.join(fixture.root, 'base.txt'), 'utf8')).toBe('concurrent scoped edit\n')
    const log = fs.readFileSync(manifest.artifacts.rollback_log, 'utf8').trim().split('\n').map(JSON.parse)
    expect(log.at(-1)).toEqual(expect.objectContaining({ action: 'apply', verdict: 'refused' }))
  })

  it('refuses batch-external status changes and patches outside the declared set', () => {
    const fixture = setup()
    const manifest = fixture.capture()
    write(path.join(fixture.root, 'consumer.tsx'), 'external edit after capture\n')

    expect(() => applyTransaction({ repoRoot: fixture.root, manifestFile: fixture.manifestFile })).toThrow(
      /batch-external worktree status mismatch/,
    )
    expect(fs.readFileSync(path.join(fixture.root, 'base.txt'), 'utf8')).toBe('local icon before migration\n')

    const second = setup()
    const undeclaredPatch = path.join(second.evidence, 'undeclared.patch')
    write(path.join(second.root, 'consumer.tsx'), 'changed\n')
    write(undeclaredPatch, git(second.root, ['diff', '--', 'consumer.tsx']))
    write(path.join(second.root, 'consumer.tsx'), fs.readFileSync(path.join(fixtureRoot, 'consumer.tsx')))

    expect(() =>
      captureTransaction({
        repoRoot: second.root,
        manifestFile: second.manifestFile,
        forwardPatchFile: undeclaredPatch,
        filesFile: path.join(second.evidence, 'batch.files.txt'),
        definitionsFile: path.join(second.evidence, 'batch.definitions.json'),
        consumersFile: path.join(second.evidence, 'batch.consumers.json'),
        helpersFile: path.join(second.evidence, 'batch.helpers.json'),
      }),
    ).toThrow(/patch paths differ from declared files/)
    const refusalLog = `${second.manifestFile.slice(0, -'.json'.length)}.rollback.jsonl`
    expect(JSON.parse(fs.readFileSync(refusalLog, 'utf8').trim())).toEqual(
      expect.objectContaining({ action: 'capture', verdict: 'refused' }),
    )
  })

  it('refuses mutation when a bound universe, matrix, or ledger artifact changes', () => {
    const fixture = setup()
    fixture.capture()
    write(fixture.matrixFile, JSON.stringify({ cells: [] }))

    expect(() => applyTransaction({ repoRoot: fixture.root, manifestFile: fixture.manifestFile })).toThrow(
      /matrix evidence input hash mismatch/,
    )
    expect(fs.readFileSync(path.join(fixture.root, 'base.txt'), 'utf8')).toBe('local icon before migration\n')
  })

  it('reverses a scoped file deletion without restoring any whole-worktree snapshot', () => {
    const fixture = setup()
    fs.rmSync(path.join(fixture.root, 'base.txt'))
    write(fixture.forwardPatchFile, git(fixture.root, ['diff', '--', 'base.txt']))
    write(path.join(fixture.root, 'base.txt'), 'local icon before migration\n')
    const manifest = fixture.capture()

    applyTransaction({ repoRoot: fixture.root, manifestFile: fixture.manifestFile })
    expect(fs.existsSync(path.join(fixture.root, 'base.txt'))).toBe(false)
    expect(manifest.file_states.applied['base.txt']).toEqual({ exists: false, sha256: null, size: 0, mode: null })

    reverseTransaction({ repoRoot: fixture.root, manifestFile: fixture.manifestFile })
    expect(fs.readFileSync(path.join(fixture.root, 'base.txt'), 'utf8')).toBe('local icon before migration\n')
  })

  it('supports the documented capture, apply, verify, and reverse CLI contract', () => {
    const fixture = setup()
    const run = (args: string[]) => execFileSync(process.execPath, [transactionTool, ...args], { cwd: fixture.root })

    run([
      'capture',
      '--manifest',
      fixture.manifestFile,
      '--forward-patch-from',
      fixture.forwardPatchFile,
      '--files-from',
      fixture.filesFile,
      '--definitions-from',
      fixture.definitionsFile,
      '--consumers-from',
      fixture.consumersFile,
      '--helpers-from',
      fixture.helpersFile,
      '--universe-from',
      fixture.universeFile,
      '--matrix-from',
      fixture.matrixFile,
      '--ledger-from',
      fixture.ledgerFile,
    ])
    run(['apply', '--manifest', fixture.manifestFile])
    run(['verify', '--manifest', fixture.manifestFile, '--state', 'applied'])
    run(['reverse', '--manifest', fixture.manifestFile])
    run(['verify', '--manifest', fixture.manifestFile, '--state', 'reversed'])
    expect(fs.readFileSync(path.join(fixture.root, 'base.txt'), 'utf8')).toBe('local icon before migration\n')
  })
})
