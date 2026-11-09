// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { execFileSync, spawnSync } from 'node:child_process'
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'
import { createPlan } from '../../../scripts/release/model.mjs'

const require = createRequire(import.meta.url)
const { parse } = require('yaml')
const matches = require('picomatch')

const root = fileURLToPath(new URL('../../../', import.meta.url))
const temporary = []
const manifests = [
  'package.json',
  'app/renderer/src/main/package.json',
  'app/renderer/engine-link-startup/package.json',
]
let gitEnv
beforeEach(async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'yakit-git-config-'))
  temporary.push(directory)
  const config = path.join(directory, 'empty.gitconfig')
  await writeFile(config, '')
  // Use a real file on every OS: Node's Windows os.devNull is not accepted by Git.
  gitEnv = { ...process.env, HUSKY: '0', GIT_CONFIG_NOSYSTEM: '1', GIT_CONFIG_GLOBAL: config }
})

const git = (cwd, ...args) =>
  execFileSync('git', args, { cwd, env: gitEnv, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim()
const execute = (cwd, script, args = []) =>
  spawnSync(process.execPath, [path.join(root, script), ...args], {
    cwd,
    encoding: 'utf8',
    env: gitEnv,
  })

async function fixture() {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'yakit-release-command-'))
  temporary.push(directory)
  const remote = path.join(directory, 'origin.git')
  const repo = path.join(directory, 'repo')
  git(directory, 'init', '--bare', remote)
  git(directory, 'init', '-b', 'master', repo)
  git(repo, 'config', 'user.name', 'Release Test')
  git(repo, 'config', 'user.email', 'release@example.invalid')
  for (const [index, file] of manifests.entries()) {
    await mkdir(path.dirname(path.join(repo, file)), { recursive: true })
    await writeFile(
      path.join(repo, file),
      JSON.stringify({ name: `fixture-${index}`, version: index ? '2.10.30' : '1.4.9-1030' }, null, 2) + '\n',
    )
  }
  git(repo, 'add', '.')
  git(repo, 'commit', '-m', 'Initial source')
  git(repo, 'remote', 'add', 'origin', remote)
  git(repo, 'push', '-u', 'origin', 'master')
  return { repo, remote }
}

afterEach(async () => {
  await Promise.all(temporary.splice(0).map((directory) => rm(directory, { recursive: true, force: true })))
})

describe('legacy release commands feed the two-stage pipeline', () => {
  it.each([
    ['scripts/prod-pack.js', '1.4.9-1106', '', 'pack'],
    ['scripts/prod-pack.js', '1.4.9', '', 'pack'],
    ['scripts/release-irify.js', '1.4.9-1106', '-irify', 'irify-pack'],
    ['scripts/release-memfit.js', '1.1.1-1106', '-memfit', 'memfit-pack'],
  ])(
    '%s commits only the root version and creates the canonical local tag',
    async (script, version, suffix, branch) => {
      const { repo, remote } = await fixture()
      const rendererBytes = await Promise.all(manifests.slice(1).map((file) => readFile(path.join(repo, file), 'utf8')))
      const result = execute(repo, script, [version])
      expect(result.status, result.stdout + result.stderr).toBe(0)
      expect(git(repo, 'branch', '--show-current')).toBe(`update/${branch}-${version}`)
      expect(git(repo, 'diff-tree', '--no-commit-id', '--name-only', '-r', 'HEAD')).toBe('package.json')
      expect(JSON.parse(git(repo, 'show', `v${version}${suffix}:package.json`)).version).toBe(version)
      expect(git(repo, 'rev-parse', `v${version}${suffix}^{commit}`)).toBe(git(repo, 'rev-parse', 'HEAD'))
      expect(git(remote, 'tag', '--list')).toBe('')
      expect(git(repo, 'status', '--porcelain')).toBe('')
      expect(await Promise.all(manifests.slice(1).map((file) => readFile(path.join(repo, file), 'utf8')))).toEqual(
        rendererBytes,
      )
      expect(git(repo, 'log', '-1', '--format=%B')).not.toMatch(/\[(skip ci|ci skip)\]/i)
      const tag = `v${version}${suffix}`
      const workflows = ['build-multi-prod.yml', 'build-multi-irify-prod.yml', 'build-multi-memfit-prod.yml']
      const triggered = []
      for (const file of workflows) {
        const workflow = parse(await readFile(path.join(root, '.github/workflows', file), 'utf8'))
        const patterns = workflow.on.push.tags
        if (
          patterns.filter((value) => !value.startsWith('!')).some((value) => matches(value)(tag)) &&
          !patterns.filter((value) => value.startsWith('!')).some((value) => matches(value.slice(1))(tag))
        ) {
          triggered.push(workflow)
        }
      }
      expect(triggered).toHaveLength(1)
      const editions = suffix === '-irify' ? 'irify,irifyEE' : suffix === '-memfit' ? 'memfit' : 'yakit,yakitEE'
      expect(triggered[0].jobs.prepare.uses).toBe('./.github/workflows/release-prepare.yml')
      const plan = createPlan({
        editions,
        version,
        ref: tag,
        refType: 'tag',
        sha: git(repo, 'rev-parse', 'HEAD'),
        runId: '123',
        repository: 'yaklang/yakit',
      })
      expect(plan.version).toBe(version)
      expect(plan.tag).toBe(tag)
    },
  )

  it('identifies the failing Git command without dumping the process error object', async () => {
    const { repo } = await fixture()
    git(repo, 'remote', 'remove', 'origin')
    const head = git(repo, 'rev-parse', 'HEAD')
    const result = execute(repo, 'scripts/prod-pack.js', ['1.4.9-1113'])
    expect(result.status).toBe(1)
    expect(result.stderr).toContain('Preparing yakit release failed: git fetch failed (128)')
    expect(result.stderr).not.toMatch(/signal: null|output: \[|pid: \d/)
    expect(git(repo, 'rev-parse', 'HEAD')).toBe(head)
    expect(git(repo, 'branch', '--show-current')).toBe('master')
    expect(git(repo, 'status', '--porcelain')).toBe('')
    expect(git(repo, 'tag', '--list')).toBe('')
  })

  it.each([
    ['v-test', false],
    ['v-next', false],
    ['v1.4.9', true],
    ['v1.4.9-1113', true],
    ['v2.10.30', true],
    ['v2.10.30-render', false],
    ['v2.10.30-link-render', false],
    ['v1.4.9-irify', false],
    ['v1.1.1-memfit', false],
  ])('filters Yakit tag %s with expected trigger %s', async (tag, expected) => {
    const workflow = parse(await readFile(path.join(root, '.github/workflows/build-multi-prod.yml'), 'utf8'))
    const patterns = workflow.on.push.tags
    expect(
      patterns.filter((value) => !value.startsWith('!')).some((value) => matches(value)(tag)) &&
        !patterns.filter((value) => value.startsWith('!')).some((value) => matches(value.slice(1))(tag)),
    ).toBe(expected)
  })

  it('creates a fresh version commit when the root version already matches', async () => {
    const { repo } = await fixture()
    git(repo, 'commit', '--allow-empty', '-m', 'Old formatting [skip ci]')
    git(repo, 'push', 'origin', 'master')
    const head = git(repo, 'rev-parse', 'HEAD')
    const result = execute(repo, 'scripts/prod-pack.js', ['1.4.9-1030'])
    expect(result.status, result.stdout + result.stderr).toBe(0)
    expect(git(repo, 'rev-parse', 'HEAD')).not.toBe(head)
    expect(git(repo, 'diff', 'HEAD~', 'HEAD')).toBe('')
    expect(git(repo, 'log', '-1', '--format=%B')).not.toContain('[skip ci]')
    expect(git(repo, 'rev-parse', 'v1.4.9-1030^{commit}')).toBe(git(repo, 'rev-parse', 'HEAD'))
  })

  it('refuses a dirty worktree without committing or switching branches', async () => {
    const { repo } = await fixture()
    await writeFile(path.join(repo, 'unrelated.txt'), 'do not release me\n')
    const head = git(repo, 'rev-parse', 'HEAD')
    const result = execute(repo, 'scripts/release-memfit.js', ['1.1.1-1106'])
    expect(result.status).not.toBe(0)
    expect(git(repo, 'branch', '--show-current')).toBe('master')
    expect(git(repo, 'rev-parse', 'HEAD')).toBe(head)
    expect(git(repo, 'tag', '--list')).toBe('')
    expect(await readFile(path.join(repo, 'unrelated.txt'), 'utf8')).toBe('do not release me\n')
  })

  it('rejects an existing release tag before changing the version or branch', async () => {
    const { repo } = await fixture()
    git(repo, 'tag', 'v1.1.1-1106-memfit')
    const head = git(repo, 'rev-parse', 'HEAD')
    const result = execute(repo, 'scripts/release-memfit.js', ['1.1.1-1106'])
    expect(result.status).not.toBe(0)
    expect(git(repo, 'rev-parse', 'HEAD')).toBe(head)
    expect(git(repo, 'branch', '--show-current')).toBe('master')
    expect(git(repo, 'status', '--porcelain')).toBe('')
  })

  it('rejects a remote-only release tag that fetch does not automatically retrieve', async () => {
    const { repo, remote } = await fixture()
    const tag = 'v1.1.1-1106-memfit'
    const head = git(repo, 'rev-parse', 'HEAD')
    const manifest = await readFile(path.join(repo, 'package.json'), 'utf8')
    // This release commit exists only on origin, outside the fetched master history.
    const remoteCommit = git(
      remote,
      '-c',
      'user.name=Release Test',
      '-c',
      'user.email=release@example.invalid',
      'commit-tree',
      `${head}^{tree}`,
      '-p',
      head,
      '-m',
      'Other product release',
    )
    git(remote, 'tag', tag, remoteCommit)
    git(repo, 'fetch', 'origin')
    expect(git(repo, 'tag', '--list', tag)).toBe('')
    expect(git(repo, 'ls-remote', '--tags', 'origin', `refs/tags/${tag}`)).toBe(`${remoteCommit}\trefs/tags/${tag}`)

    const result = execute(repo, 'scripts/release-memfit.js', ['1.1.1-1106'])
    expect(result.status).toBe(1)
    expect(result.stderr).toContain(`Release tag already exists on origin: ${tag}`)
    expect(git(repo, 'branch', '--show-current')).toBe('master')
    expect(git(repo, 'branch', '--list', 'update/memfit-pack-1.1.1-1106')).toBe('')
    expect(git(repo, 'rev-parse', 'HEAD')).toBe(head)
    expect(await readFile(path.join(repo, 'package.json'), 'utf8')).toBe(manifest)
    expect(git(repo, 'tag', '--list', tag)).toBe('')
    expect(git(remote, 'rev-parse', `refs/tags/${tag}`)).toBe(remoteCommit)
    expect(git(repo, 'status', '--porcelain')).toBe('')
  })

  it.each([
    'v1.4.9-1106',
    '1.4.9;touch injected',
    '1.4.9-render',
    '1.4.9-1106-memfit',
    '01.4.9',
    '1.4.9-01',
    '1.4.9-a.',
    '1.4.9-a..b',
    '',
  ])('rejects invalid Yakit version %s before git operations', async (version) => {
    const { repo } = await fixture()
    const result = execute(repo, 'scripts/prod-pack.js', [version])
    expect(result.status).not.toBe(0)
    expect(git(repo, 'branch', '--show-current')).toBe('master')
    expect(git(repo, 'status', '--porcelain')).toBe('')
  })

  it('stamps only the root manifest during CI and rejects a missing version', async () => {
    const { repo } = await fixture()
    const before = await Promise.all(manifests.slice(1).map((file) => readFile(path.join(repo, file), 'utf8')))
    const run = (version) =>
      spawnSync(process.execPath, [path.join(root, 'scripts/release/prepare.mjs'), 'version'], {
        cwd: repo,
        encoding: 'utf8',
        env: { ...process.env, RELEASE_VERSION: version },
      })
    expect(run('1.1.1-1106').status).toBe(0)
    expect(JSON.parse(await readFile(path.join(repo, 'package.json'), 'utf8')).version).toBe('1.1.1-1106')
    const stamped = await readFile(path.join(repo, 'package.json'), 'utf8')
    expect(run('').status).not.toBe(0)
    expect(await readFile(path.join(repo, 'package.json'), 'utf8')).toBe(stamped)
    expect(await Promise.all(manifests.slice(1).map((file) => readFile(path.join(repo, file), 'utf8')))).toEqual(before)
  })
})
