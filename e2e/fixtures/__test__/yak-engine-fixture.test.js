// @vitest-environment node

import { execFile } from 'node:child_process'
import { createHash } from 'node:crypto'
import { chmod, mkdtemp, mkdir, readdir, rm, stat, utimes, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { promisify } from 'node:util'
import { afterEach, describe, expect, it } from 'vitest'
import {
  buildYakEngine,
  getYakBuildIdentity,
  parseYakGRPCReadyLine,
  parseYakGRPCPProfReadyLine,
  pruneYakEngineBuildCache,
  resolveYakBuildCacheMaxEntries,
  resolveYakBuildCacheFingerprint,
  resolveYakCPUProfileDurationSeconds,
  resolveYakHeapProfileEnabled,
  resolveYakPProfDiagnostics,
  resolveYaklangMainDirectory,
  YAK_GRPC_PPROF_READY_PREFIX,
  YAK_GRPC_READY_PREFIX,
} from '../yak-engine/yak-engine-fixture.mjs'

const temporaryDirectories = []
const execFileAsync = promisify(execFile)

afterEach(async () => {
  await Promise.all(temporaryDirectories.splice(0).map((directory) => rm(directory, { recursive: true, force: true })))
})

describe('parseYakGRPCReadyLine', () => {
  it('ignores unrelated output and parses a versioned loopback address', () => {
    expect(parseYakGRPCReadyLine('yak grpc ok')).toBeUndefined()
    expect(
      parseYakGRPCReadyLine(
        `[stdout] ${YAK_GRPC_READY_PREFIX}${JSON.stringify({ schemaVersion: 1, address: '127.0.0.1:54321' })}`,
      ),
    ).toEqual({
      schemaVersion: 1,
      address: '127.0.0.1:54321',
      host: '127.0.0.1',
      port: 54321,
    })
  })

  it('rejects malformed, unsupported, or externally bound ready events', () => {
    expect(() => parseYakGRPCReadyLine(`${YAK_GRPC_READY_PREFIX}not-json`)).toThrow(/Invalid Yak gRPC ready JSON/)
    expect(() =>
      parseYakGRPCReadyLine(
        `${YAK_GRPC_READY_PREFIX}${JSON.stringify({ schemaVersion: 2, address: '127.0.0.1:54321' })}`,
      ),
    ).toThrow(/Unsupported Yak gRPC ready schema/)
    expect(() =>
      parseYakGRPCReadyLine(
        `${YAK_GRPC_READY_PREFIX}${JSON.stringify({ schemaVersion: 1, address: '0.0.0.0:54321' })}`,
      ),
    ).toThrow(/must listen on 127.0.0.1/)
  })
})

describe('Yak pprof fixture contract', () => {
  it('parses only a versioned loopback pprof endpoint', () => {
    expect(
      parseYakGRPCPProfReadyLine(
        `${YAK_GRPC_PPROF_READY_PREFIX}${JSON.stringify({ schemaVersion: 1, address: '127.0.0.1:43210' })}`,
      ),
    ).toEqual({ schemaVersion: 1, address: '127.0.0.1:43210', host: '127.0.0.1', port: 43210 })
    expect(parseYakGRPCPProfReadyLine('yak grpc ok')).toBeUndefined()
    expect(() =>
      parseYakGRPCPProfReadyLine(
        `${YAK_GRPC_PPROF_READY_PREFIX}${JSON.stringify({ schemaVersion: 1, address: '0.0.0.0:43210' })}`,
      ),
    ).toThrow(/must listen on 127\.0\.0\.1/)
  })

  it('keeps CPU profiling opt-in and bounds its duration', () => {
    expect(resolveYakCPUProfileDurationSeconds({})).toBe(0)
    expect(resolveYakCPUProfileDurationSeconds({ YAKIT_E2E_YAK_CPU_PROFILE_SECONDS: '5' })).toBe(5)
    expect(() => resolveYakCPUProfileDurationSeconds({ YAKIT_E2E_YAK_CPU_PROFILE_SECONDS: '0' })).toThrow(
      /between 1 and 60/,
    )
    expect(() => resolveYakCPUProfileDurationSeconds({ YAKIT_E2E_YAK_CPU_PROFILE_SECONDS: '61' })).toThrow(
      /between 1 and 60/,
    )
  })

  it('keeps forced-GC heap profiling explicit and separate from CPU profiling', () => {
    expect(resolveYakHeapProfileEnabled({})).toBe(false)
    expect(resolveYakHeapProfileEnabled({ YAKIT_E2E_YAK_HEAP_PROFILE: '0' })).toBe(false)
    expect(resolveYakHeapProfileEnabled({ YAKIT_E2E_YAK_HEAP_PROFILE: '1' })).toBe(true)
    expect(() => resolveYakHeapProfileEnabled({ YAKIT_E2E_YAK_HEAP_PROFILE: 'true' })).toThrow(/must be 0 or 1/)
    expect(
      resolveYakPProfDiagnostics({
        YAKIT_E2E_YAK_HEAP_PROFILE: '1',
      }),
    ).toEqual({ enabled: true, cpuProfileDurationSeconds: 0, heapProfileEnabled: true })
    expect(() =>
      resolveYakPProfDiagnostics({
        YAKIT_E2E_YAK_CPU_PROFILE_SECONDS: '5',
        YAKIT_E2E_YAK_HEAP_PROFILE: '1',
      }),
    ).toThrow(/mutually exclusive/)
  })
})

describe('Yak build cache bounds', () => {
  it('accepts only an exact managed-cache fingerprint', () => {
    expect(resolveYakBuildCacheFingerprint({})).toBeUndefined()
    expect(resolveYakBuildCacheFingerprint({ YAKIT_E2E_YAK_BUILD_FINGERPRINT: '' })).toBeUndefined()
    expect(resolveYakBuildCacheFingerprint({ YAKIT_E2E_YAK_BUILD_FINGERPRINT: '0123456789abcdefabcd' })).toBe(
      '0123456789abcdefabcd',
    )
    expect(() => resolveYakBuildCacheFingerprint({ YAKIT_E2E_YAK_BUILD_FINGERPRINT: '../0123456789abcdef' })).toThrow(
      /exactly 20 lowercase hexadecimal/,
    )
    expect(() => resolveYakBuildCacheFingerprint({ YAKIT_E2E_YAK_BUILD_FINGERPRINT: '0123456789ABCDEFABCD' })).toThrow(
      /exactly 20 lowercase hexadecimal/,
    )
  })

  it('defaults to six entries and rejects unbounded values', () => {
    expect(resolveYakBuildCacheMaxEntries({})).toBe(6)
    expect(resolveYakBuildCacheMaxEntries({ YAKIT_E2E_YAK_BUILD_CACHE_MAX_ENTRIES: '3' })).toBe(3)
    expect(() => resolveYakBuildCacheMaxEntries({ YAKIT_E2E_YAK_BUILD_CACHE_MAX_ENTRIES: '0' })).toThrow(
      /between 1 and 32/,
    )
    expect(() => resolveYakBuildCacheMaxEntries({ YAKIT_E2E_YAK_BUILD_CACHE_MAX_ENTRIES: '33' })).toThrow(
      /between 1 and 32/,
    )
  })

  it('keeps a protected entry plus the newest entries and ignores unrelated directories', async () => {
    const root = await mkdtemp(path.join(tmpdir(), 'yakit-yak-cache-prune-test-'))
    temporaryDirectories.push(root)
    const cacheDir = path.join(root, 'yak-engine')
    await mkdir(cacheDir, { recursive: true })

    const cacheNames = Array.from({ length: 6 }, (_, index) => index.toString(16).padStart(20, '0'))
    for (const [index, name] of cacheNames.entries()) {
      const directory = path.join(cacheDir, name)
      await mkdir(directory)
      await writeFile(path.join(directory, 'yak'), name)
      const modifiedAt = new Date(1_700_000_000_000 + index * 1000)
      await utimes(directory, modifiedAt, modifiedAt)
    }
    await mkdir(path.join(cacheDir, 'do-not-delete'))

    const protectedDirectory = path.join(cacheDir, cacheNames[0])
    const result = await pruneYakEngineBuildCache({ cacheDir, keepDirectories: [protectedDirectory], maxEntries: 3 })
    const remaining = await readdir(cacheDir)
    expect(remaining.sort()).toEqual([cacheNames[0], cacheNames[4], cacheNames[5], 'do-not-delete'].sort())
    expect(result.retained.sort()).toEqual([cacheNames[0], cacheNames[4], cacheNames[5]].sort())
    expect(result.removed).toHaveLength(3)
    await expect(stat(path.join(cacheDir, 'do-not-delete'))).resolves.toBeDefined()
  })
})

describe('Yak explicit managed build cache selection', () => {
  it('reuses only the requested executable and records source mismatch metadata', async () => {
    const root = await mkdtemp(path.join(tmpdir(), 'yakit-yak-explicit-cache-test-'))
    temporaryDirectories.push(root)
    const sourceDir = path.join(root, 'yaklang-main')
    const cacheDir = path.join(root, 'cache', 'yak-engine')
    const artifactsDir = path.join(root, 'artifacts')
    const requestedFingerprint = '0123456789abcdefabcd'
    const cachedBinary = path.join(cacheDir, requestedFingerprint, process.platform === 'win32' ? 'yak.exe' : 'yak')
    await Promise.all([
      mkdir(path.join(sourceDir, 'common/yak/cmd'), { recursive: true }),
      mkdir(path.dirname(cachedBinary), { recursive: true }),
      mkdir(artifactsDir, { recursive: true }),
    ])
    await Promise.all([
      writeFile(path.join(sourceDir, 'go.mod'), 'module fixture\n\ngo 1.22\n'),
      writeFile(path.join(sourceDir, 'common/yak/cmd/yak.go'), 'package main\nfunc main() {}\n'),
      writeFile(cachedBinary, 'managed cache fixture\n'),
    ])
    if (process.platform !== 'win32') await chmod(cachedBinary, 0o755)
    await execFileAsync('git', ['init'], { cwd: sourceDir })
    await execFileAsync('git', ['add', '.'], { cwd: sourceDir })
    await execFileAsync(
      'git',
      ['-c', 'user.name=Yakit E2E', '-c', 'user.email=yakit-e2e@example.invalid', 'commit', '-m', 'fixture'],
      { cwd: sourceDir },
    )

    const build = await buildYakEngine({
      sourceDir,
      cacheDir,
      temporaryRoot: root,
      artifactsDir,
      env: { ...process.env, YAKIT_E2E_YAK_BUILD_FINGERPRINT: requestedFingerprint },
    })

    expect(build.binaryPath).toBe(cachedBinary)
    expect(build.cacheHit).toBe(true)
    expect(build.fingerprint).toBe(requestedFingerprint)
    expect(build.currentSourceFingerprint).toMatch(/^[a-f0-9]{20}$/)
    expect(build.cacheSelection).toBe('explicit-managed-cache')
    expect(build.sourceMatchesBinary).toBe(false)
  })
})

describe('resolveYaklangMainDirectory', () => {
  it('requires an absolute configured worktree path', async () => {
    await expect(
      resolveYaklangMainDirectory({ repoRoot: process.cwd(), configuredPath: '../yaklang-main' }),
    ).rejects.toThrow(/must be an absolute path/)
  })

  it('accepts a worktree containing go.mod and the Yak CLI entrypoint', async () => {
    const root = await mkdtemp(path.join(tmpdir(), 'yakit-yak-fixture-test-'))
    temporaryDirectories.push(root)
    await mkdir(path.join(root, 'common/yak/cmd'), { recursive: true })
    await Promise.all([
      writeFile(path.join(root, 'go.mod'), 'module fixture\n'),
      writeFile(path.join(root, 'common/yak/cmd/yak.go'), 'package main\n'),
    ])

    await expect(resolveYaklangMainDirectory({ repoRoot: process.cwd(), configuredPath: root })).resolves.toBe(root)
  })
})

describe('getYakBuildIdentity', () => {
  it('invalidates the content-addressed fingerprint for tracked and untracked changes', async () => {
    const root = await mkdtemp(path.join(tmpdir(), 'yakit-yak-build-identity-test-'))
    temporaryDirectories.push(root)
    await mkdir(path.join(root, 'common/yak/cmd'), { recursive: true })
    await Promise.all([
      writeFile(path.join(root, 'go.mod'), 'module fixture\n\ngo 1.22\n'),
      writeFile(path.join(root, 'common/yak/cmd/yak.go'), 'package main\nfunc main() {}\n'),
    ])
    await execFileAsync('git', ['init'], { cwd: root })
    await execFileAsync('git', ['add', '.'], { cwd: root })
    await execFileAsync(
      'git',
      ['-c', 'user.name=Yakit E2E', '-c', 'user.email=yakit-e2e@example.invalid', 'commit', '-m', 'fixture'],
      { cwd: root },
    )

    const clean = await getYakBuildIdentity(root)
    expect(clean.dirty).toBe(false)

    const diagnostic = await getYakBuildIdentity(root, undefined, { diagnosticSymbols: true })
    expect(diagnostic.diagnosticSymbols).toBe(true)
    expect(diagnostic.fingerprint).not.toBe(clean.fingerprint)

    await writeFile(path.join(root, 'common/yak/cmd/yak.go'), 'package main\nfunc main() { println("changed") }\n')
    const tracked = await getYakBuildIdentity(root)
    expect(tracked.dirty).toBe(true)
    expect(tracked.fingerprint).not.toBe(clean.fingerprint)

    await writeFile(path.join(root, 'untracked.go'), 'package fixture\n')
    const untracked = await getYakBuildIdentity(root)
    expect(untracked.fingerprint).not.toBe(tracked.fingerprint)
  })

  it('waits for a large tracked diff before hashing the build identity', async () => {
    const root = await mkdtemp(path.join(tmpdir(), 'yakit-yak-build-large-diff-test-'))
    temporaryDirectories.push(root)
    await mkdir(path.join(root, 'common/yak/cmd'), { recursive: true })
    await Promise.all([
      writeFile(path.join(root, 'go.mod'), 'module fixture\n\ngo 1.22\n'),
      writeFile(path.join(root, 'common/yak/cmd/yak.go'), 'package main\nfunc main() {}\n'),
      writeFile(path.join(root, 'large.txt'), '请求体'.repeat(128 * 1024)),
    ])
    await execFileAsync('git', ['init'], { cwd: root })
    await execFileAsync('git', ['add', '.'], { cwd: root })
    await execFileAsync(
      'git',
      ['-c', 'user.name=Yakit E2E', '-c', 'user.email=yakit-e2e@example.invalid', 'commit', '-m', 'fixture'],
      { cwd: root },
    )
    await writeFile(path.join(root, 'large.txt'), '响应体'.repeat(128 * 1024))

    const [head, diff] = await Promise.all([
      execFileAsync('git', ['rev-parse', 'HEAD'], { cwd: root, maxBuffer: 8 * 1024 * 1024 }),
      execFileAsync('git', ['diff', '--binary', 'HEAD'], { cwd: root, maxBuffer: 8 * 1024 * 1024 }),
    ])
    const expectedStateFingerprint = createHash('sha256')
      .update(head.stdout.trim())
      .update('\0')
      .update(diff.stdout.trim())
      .digest('hex')

    const identities = await Promise.all(Array.from({ length: 4 }, () => getYakBuildIdentity(root)))
    expect(new Set(identities.map(({ stateFingerprint }) => stateFingerprint))).toHaveLength(1)
    expect(new Set(identities.map(({ fingerprint }) => fingerprint))).toHaveLength(1)
    expect(identities[0].stateFingerprint).toBe(expectedStateFingerprint)
  })
})
