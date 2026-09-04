import { execFile } from 'node:child_process'
import { mkdtemp, readFile, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { resolve } from 'node:path'
import { promisify } from 'node:util'
import { describe, expect, it } from 'vitest'

const execFileAsync = promisify(execFile)
const classifier = resolve(process.cwd(), 'scripts/icon-migration/classify-changes.mjs')
const genericSelector = resolve(process.cwd(), 'scripts/ci-select-vitest-tests.js')

async function classify(paths: string[]) {
  const dir = await mkdtemp(resolve(tmpdir(), 'icon-migration-classifier-'))
  const changedFilesPath = resolve(dir, 'changed.txt')
  const outputPath = resolve(dir, 'github-output.txt')
  const artifactPath = resolve(dir, 'artifact.json')
  await writeFile(changedFilesPath, paths.join('\0'))
  let exitCode = 0
  try {
    await execFileAsync(process.execPath, [classifier], {
      env: {
        ...process.env,
        CHANGED_FILES_PATH: changedFilesPath,
        GITHUB_OUTPUT: outputPath,
        ICON_MIGRATION_CLASSIFIER_ARTIFACT: artifactPath,
      },
    })
  } catch (error) {
    exitCode = (error as { code?: number }).code ?? 1
  }
  return {
    exitCode,
    output: await readFile(outputPath, 'utf8'),
    artifact: JSON.parse(await readFile(artifactPath, 'utf8')),
  }
}

describe('icon migration CI classifier', () => {
  it.each([
    'app/renderer/src/main/src/pages/example.tsx',
    'app/renderer/src/main/vitest.config.mts',
    'scripts/ci-select-vitest-tests.js',
    '.github/actions/pr-ci-setup-node-yarn/action.yml',
  ])('runs the full gate for relevant change %s', async (path) => {
    const result = await classify([path])
    expect(result.exitCode).toBe(0)
    expect(result.output).toContain('run_full=true')
    expect(result.artifact).toMatchObject({ status: 'valid', run_full: true })
  })

  it('emits false only for a validated noop', async () => {
    const result = await classify(['docs/release-notes.md'])
    expect(result.exitCode).toBe(0)
    expect(result.output).toContain('run_full=false')
    expect(result.artifact).toMatchObject({ status: 'valid', run_full: false, reason: 'validated noop' })
  })

  it('fails closed and leaves an artifact when classification is invalid', async () => {
    const result = await classify([])
    expect(result.exitCode).not.toBe(0)
    expect(result.output).toContain('run_full=true')
    expect(result.output).toContain('classification_status=error')
    expect(result.artifact).toMatchObject({ status: 'error', run_full: true })
  })
})

describe('icon migration test ownership', () => {
  it('keeps dedicated tests out of the generic selector', async () => {
    const dir = await mkdtemp(resolve(tmpdir(), 'icon-migration-selector-'))
    const changedFilesPath = resolve(dir, 'changed.txt')
    const outputPath = resolve(dir, 'github-output.txt')
    await writeFile(
      changedFilesPath,
      [
        'scripts/icon-migration/__test__/colorful-plugin.test.ts',
        'app/renderer/src/main/src/__test__/yakitUiIconsPurePlugin.test.ts',
        'app/renderer/engine-link-startup/src/__test__/yakitUiIconsPurePlugin.test.ts',
        'app/renderer/engine-link-startup/src/__test__/iconMigrationConsumerContract.test.tsx',
      ].join('\n'),
    )
    await execFileAsync(process.execPath, [genericSelector], {
      env: { ...process.env, CHANGED_FILES_PATH: changedFilesPath, GITHUB_OUTPUT: outputPath },
    })
    expect(await readFile(outputPath, 'utf8')).toBe('tests=none\n')
  })

  it('wires the only runner to the dedicated config and always-present workflow', async () => {
    const [packageJson, config, workflow] = await Promise.all([
      readFile(resolve(process.cwd(), 'package.json'), 'utf8'),
      readFile(resolve(process.cwd(), 'scripts/icon-migration/vitest.config.mts'), 'utf8'),
      readFile(resolve(process.cwd(), '.github/workflows/icon-migration-gate.yml'), 'utf8'),
    ])
    expect(JSON.parse(packageJson).scripts['test:icon-migration']).toBe(
      'vitest run --config scripts/icon-migration/vitest.config.mts',
    )
    expect(config).toContain('iconMigrationConsumerContract.test.tsx')
    expect(workflow).toContain('name: ci-icon-migration')
    expect(workflow).toContain('yarn test:icon-migration')
    expect(workflow.match(/if-no-files-found: error/g)).toHaveLength(2)
  })
})
