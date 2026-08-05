// @vitest-environment node

import { execFile } from 'node:child_process'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { promisify } from 'node:util'
import { afterEach, describe, expect, it } from 'vitest'
import {
  getRendererBuildIdentity,
  RENDERER_BUILD_INPUT_CONTRACT,
  RENDERER_BUILD_METADATA_SCHEMA_VERSION,
  validateRendererBuildMetadata,
} from '../electron/renderer-build-metadata.mjs'

const execFileAsync = promisify(execFile)
const temporaryDirectories = []

afterEach(async () => {
  await Promise.all(temporaryDirectories.splice(0).map((directory) => rm(directory, { recursive: true, force: true })))
})

const identity = {
  head: 'abc123',
  dirty: true,
  inputContract: RENDERER_BUILD_INPUT_CONTRACT,
  stateFingerprint: 'current-fingerprint',
}

const metadata = {
  schemaVersion: RENDERER_BUILD_METADATA_SCHEMA_VERSION,
  mode: 'production-unminified',
  source: {
    head: identity.head,
    inputContract: identity.inputContract,
    stateFingerprint: identity.stateFingerprint,
  },
}

describe('Renderer E2E build metadata', () => {
  it('accepts only an artifact built from the current worktree state', () => {
    expect(validateRendererBuildMetadata(metadata, identity)).toBe(metadata)
  })

  it('rejects legacy or stale artifacts before Electron starts', () => {
    expect(() => validateRendererBuildMetadata({ ...metadata, schemaVersion: 1 }, identity)).toThrow(
      /yarn test:e2e:build/,
    )
    expect(() =>
      validateRendererBuildMetadata(
        {
          ...metadata,
          source: { ...metadata.source, stateFingerprint: 'stale-fingerprint' },
        },
        identity,
      ),
    ).toThrow(/artifacts are stale/)
  })

  it('invalidates Renderer inputs without rebuilding for unrelated documentation', async () => {
    const root = await mkdtemp(path.join(tmpdir(), 'yakit-renderer-build-identity-'))
    temporaryDirectories.push(root)
    await mkdir(path.join(root, 'app/renderer/src/main/src'), { recursive: true })
    await mkdir(path.join(root, 'docs'), { recursive: true })
    await Promise.all([
      writeFile(path.join(root, 'app/renderer/src/main/src/index.tsx'), 'export const value = 1\n'),
      writeFile(path.join(root, 'package.json'), '{}\n'),
      writeFile(path.join(root, 'yarn.lock'), ''),
      writeFile(path.join(root, 'docs/roadmap.md'), 'before\n'),
    ])
    await execFileAsync('git', ['init'], { cwd: root })
    await execFileAsync('git', ['add', '.'], { cwd: root })
    await execFileAsync(
      'git',
      ['-c', 'user.name=Yakit E2E', '-c', 'user.email=yakit-e2e@example.invalid', 'commit', '-m', 'fixture'],
      { cwd: root },
    )

    const baseline = await getRendererBuildIdentity(root)
    await writeFile(path.join(root, 'docs/roadmap.md'), 'after\n')
    const documentationOnly = await getRendererBuildIdentity(root)
    expect(documentationOnly.stateFingerprint).toBe(baseline.stateFingerprint)

    await writeFile(path.join(root, 'app/renderer/src/main/src/index.tsx'), 'export const value = 2\n')
    const rendererChanged = await getRendererBuildIdentity(root)
    expect(rendererChanged.stateFingerprint).not.toBe(baseline.stateFingerprint)
  })
})
