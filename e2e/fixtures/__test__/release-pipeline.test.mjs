// @vitest-environment node
import { afterEach, describe, expect, it, vi } from 'vitest'
import { mkdtemp, mkdir, readFile, readlink, rm, stat, symlink, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { createRequire } from 'node:module'
import {
  artifactName,
  assertPlan,
  assertReady,
  assertSourceRun,
  assertVersion,
  createPlan,
  sha256,
} from '../../../scripts/release/model.mjs'
import { archive, extract } from '../../../scripts/release/io.mjs'
import { downloadEngine, engineFile, injectEngine } from '../../../scripts/release/engine.mjs'
import { makeConfig } from '../../../scripts/release/package.mjs'
import { assertResults } from '../../../scripts/release/finalize.mjs'
import { ossAuthorization } from '../../../scripts/release/oss.mjs'

const require = createRequire(import.meta.url)
const temporary = []
const plan = (editions = 'yakit,yakitEE') =>
  createPlan({
    editions,
    version: '1.4.9-1030',
    sha: 'a'.repeat(40),
    runId: '123',
    repository: 'yaklang/yakit',
    ref: 'v1.4.9-1030',
    refType: 'tag',
  })
const descriptor = (target) => ({
  target: target.id,
  sha: 'a'.repeat(40),
  version: '1.4.9-1030',
  sha256: 'b'.repeat(64),
})
async function directory() {
  const value = await mkdtemp(path.join(os.tmpdir(), 'yakit-release-'))
  temporary.push(value)
  return value
}
afterEach(async () => {
  vi.unstubAllEnvs()
  await Promise.all(temporary.splice(0).map((file) => rm(file, { recursive: true, force: true })))
})

describe('release identity and native matrix', () => {
  it('prepares both editions for five native targets and two Electron versions without latest', () => {
    const candidate = plan()
    expect(candidate.targets).toHaveLength(20)
    expect(new Set(candidate.targets.map((target) => target.id)).size).toBe(20)
    expect(new Set(candidate.targets.map((target) => target.runner)).size).toBe(5)
    expect(candidate.targets.filter((target) => target.platform === 'darwin')).toHaveLength(8)
    expect(candidate.targets.every((target) => target.electronVersion === (target.legacy ? '22.3.27' : '27.0.0'))).toBe(
      true,
    )
    expect(assertPlan(candidate)).toBe(candidate)
  })
  it.each(['latest', '', '1.4', 'dev/1.4.9', '1.4.9/../../latest', '1.4.9;echo x', 'https://host/engine'])(
    'rejects an ambiguous engine version: %s',
    (version) => {
      expect(() => assertVersion(version)).toThrow()
    },
  )
  it.each(['1.4.9-beta5', '1.4.9-1030', '1.4.9'])('accepts an explicit published version: %s', (version) => {
    expect(assertVersion(version)).toBe(version)
  })
  it('rejects unknown or repeated editions and moved version tags', () => {
    expect(() => plan('yakit,yakit')).toThrow()
    expect(() => plan('unknown')).toThrow()
    expect(() => createPlan({ ...plan(), editions: 'yakit', ref: 'v1.4.9-1023', refType: 'tag' })).toThrow()
  })
  it('keeps existing installer names across all products and targets', () => {
    const candidate = plan('yakit,yakitEE,irify,irifyEE,memfit')
    for (const target of candidate.targets) expect(artifactName(candidate, target)).not.toContain('undefined')
    expect(artifactName(candidate, candidate.targets[0])).toBe('Yakit-1.4.9-1030-windows-amd64.exe')
    const mac = candidate.targets.find(
      (target) =>
        target.edition === 'memfit' && target.platform === 'darwin' && target.arch === 'arm64' && !target.legacy,
    )
    expect(artifactName(candidate, mac)).toBe('MemfitAI-1.4.9-1030-darwin-arm64.dmg')
  })
  it('only seals a candidate when every target is present exactly once and from the same source', () => {
    const candidate = plan()
    const descriptors = candidate.targets.map(descriptor)
    expect(assertReady(candidate, descriptors).prepared).toHaveLength(20)
    expect(() => assertReady(candidate, descriptors.slice(1))).toThrow()
    expect(() => assertReady(candidate, [descriptors[0], ...descriptors.slice(0, -1)])).toThrow()
    expect(() =>
      assertReady(
        candidate,
        descriptors.map((item, index) => (index ? item : { ...item, sha: 'c'.repeat(40) })),
      ),
    ).toThrow()
    expect(() => assertPlan({ ...candidate, targets: candidate.targets.slice(1) })).toThrow()
  })
  it('rejects failed, foreign, PR, and unrelated source workflows', () => {
    const candidate = plan()
    const source = {
      id: 123,
      head_sha: candidate.sha,
      status: 'completed',
      conclusion: 'success',
      event: 'push',
      path: '.github/workflows/build-multi-prod.yml',
    }
    expect(() => assertSourceRun(candidate, source, 'yaklang/yakit')).not.toThrow()
    for (const change of [
      { conclusion: 'failure' },
      { head_sha: 'b'.repeat(40) },
      { event: 'pull_request' },
      { path: '.github/workflows/pull-request-test.yml' },
      { id: 124 },
    ]) {
      expect(() => assertSourceRun(candidate, { ...source, ...change }, 'yaklang/yakit')).toThrow()
    }
    expect(() => assertSourceRun(candidate, source, 'someone/fork')).toThrow()
  })
})

describe('engine-free preassembly', () => {
  it('keeps runtime and application files, removes engine placeholders, and uses explicit Electron versions', () => {
    vi.stubEnv('YAKIT_EDITION', '')
    vi.stubEnv('YAKIT_LEGACY', '')
    vi.stubEnv('CSC_IDENTITY_AUTO_DISCOVERY', '')
    const candidate = plan()
    for (const target of candidate.targets) {
      const config = makeConfig(candidate, target)
      const platform = { win32: 'win', darwin: 'mac', linux: 'linux' }[target.platform]
      expect(config.electronVersion).toBe(target.electronVersion)
      expect(config.extraFiles.some((file) => file.to.startsWith('bins/engine-'))).toBe(false)
      expect(config[platform].extraFiles.some((file) => file.to === 'bins/yak.zip')).toBe(false)
      expect(config[platform].artifactName).toBe(artifactName(candidate, target))
      expect(config.files).toContain('dist/electron/**/*')
      expect(config.files).toContain('!.release{,/**/*}')
      expect(config.afterSign).toBeNull()
    }
  })
  it('retains executable permissions and framework symlinks in the archive', async () => {
    const temporary = await directory()
    const source = path.join(temporary, 'source')
    await mkdir(source)
    await writeFile(path.join(source, 'binary'), 'engine-free application', { mode: 0o755 })
    await symlink('binary', path.join(source, 'framework-current'))
    const file = path.join(temporary, 'app.tgz')
    await archive(source, file)
    const restored = path.join(temporary, 'restored')
    await extract(file, restored)
    expect(await readFile(path.join(restored, 'binary'), 'utf8')).toBe('engine-free application')
    expect((await stat(path.join(restored, 'binary'))).mode & 0o111).toBe(0o111)
    expect(await readlink(path.join(restored, 'framework-current'))).toBe('binary')
  })
})

describe('pinned engine download and offline payload', () => {
  const target = { edition: 'yakit', platform: 'linux', arch: 'x64', legacy: false }
  const bytes = Buffer.from('verified engine bytes')
  function mockFetch({ missingSlim = false, corrupt = false, unavailable = false } = {}) {
    return vi.fn(async (url, file, options) => {
      if (unavailable) throw new Error('HTTP 503')
      if (missingSlim && url.includes('yak-slim_') && options?.optional) return false
      await writeFile(file, url.endsWith('.sha256.txt') ? (corrupt ? '0'.repeat(64) : sha256(bytes)) : bytes)
      return true
    })
  }
  it('pins slim bytes and their own SHA256 without resolving latest', async () => {
    const fetch = mockFetch()
    const engine = await downloadEngine(target, '1.4.9-beta5', await directory(), { fetch })
    expect(engine.type).toBe('slim')
    expect(engine.sourceSha256).toBe(sha256(bytes))
    expect(fetch.mock.calls.map(([url]) => url)).toEqual([
      'https://yaklang.oss-accelerate.aliyuncs.com/yak/1.4.9-beta5/yak-slim_linux_amd64',
      'https://yaklang.oss-accelerate.aliyuncs.com/yak/1.4.9-beta5/yak-slim_linux_amd64.sha256.txt',
    ])
  })
  it('records full when a slim artifact is genuinely missing', async () => {
    const fetch = mockFetch({ missingSlim: true })
    const engine = await downloadEngine(target, '1.4.9-beta5', await directory(), { fetch })
    expect(engine.type).toBe('full')
    expect(fetch.mock.calls[2][0]).toMatch(/yak_linux_amd64.sha256.txt$/)
  })
  it('does not silently fall back on network failure and refuses corrupt bytes', async () => {
    await expect(
      downloadEngine(target, '1.4.9-beta5', await directory(), { fetch: mockFetch({ unavailable: true }) }),
    ).rejects.toThrow('503')
    await expect(
      downloadEngine(target, '1.4.9-beta5', await directory(), { fetch: mockFetch({ corrupt: true }) }),
    ).rejects.toThrow('SHA256 mismatch')
  })
  it('uses Windows legacy upstream names but retains the runtime ZIP entry name', async () => {
    const windows = { ...target, platform: 'win32', legacy: true }
    expect(engineFile(windows, true)).toBe('yak-slim_windows_legacy_amd64.exe')
    const engine = await downloadEngine(windows, '1.4.9-beta5', await directory(), {
      fetch: mockFetch({ missingSlim: true }),
    })
    const app = await directory()
    await injectEngine(engine, app, windows)
    const zip = new (require('adm-zip'))(path.join(app, 'bins/yak.zip'))
    expect(zip.getEntries().map((entry) => entry.entryName)).toEqual(['bins/yak_windows_amd64.exe'])
    expect(zip.readFile('bins/yak_windows_amd64.exe')).toEqual(bytes)
    expect(await readFile(path.join(app, 'bins/engine-version.txt'), 'utf8')).toBe('1.4.9-beta5\n')
    expect(await readFile(path.join(app, 'bins/engine-build-type.txt'), 'utf8')).toBe('full\n')
  })
  it('retains the macOS upstream checksum alongside signed-byte provenance', async () => {
    const mac = { ...target, platform: 'darwin', arch: 'arm64' }
    const engine = await downloadEngine(mac, '1.4.9-beta5', await directory(), { fetch: mockFetch() })
    await writeFile(engine.binary, 'signed engine bytes')
    const app = await directory()
    const receipt = await injectEngine(engine, app, mac)
    expect(receipt.sha256).toBe(sha256('signed engine bytes'))
    expect(await readFile(path.join(app, 'bins/engine-sha256.txt'), 'utf8')).toBe(`${sha256(bytes)}\n`)
  })
})

describe('publish gate', () => {
  const environment = { GITHUB_RUN_ID: '456', ENGINE_VERSION: '1.4.9-beta5' }
  function receipts(candidate) {
    return candidate.targets.map((target) => ({
      target: target.id,
      sha: candidate.sha,
      version: candidate.version,
      signed: true,
      finalizeRunId: '456',
      engine: { version: environment.ENGINE_VERSION, sha256: 'd'.repeat(64) },
      files: [
        artifactName(candidate, target),
        ...(target.edition === 'yakitEE' && target.platform === 'linux' && target.legacy
          ? [artifactName(candidate, target).replace(/\.AppImage$/, '.run')]
          : []),
      ].map((name) => ({ name, sha256: 'e'.repeat(64) })),
    }))
  }
  it('requires receipts for every signed platform from this finalization and this engine', () => {
    const candidate = plan()
    const valid = receipts(candidate)
    expect(() => assertResults(candidate, valid, environment)).not.toThrow()
    expect(() => assertResults(candidate, valid.slice(1), environment)).toThrow()
    for (const change of [
      { signed: false },
      { finalizeRunId: 'old-run' },
      { engine: { version: '1.4.9-beta4' } },
      { files: [] },
    ]) {
      expect(() => assertResults(candidate, [{ ...valid[0], ...change }, ...valid.slice(1)], environment)).toThrow()
    }
  })
  it('constructs OSS authorization with the content checksum and exact versioned object path', () => {
    const value = ossAuthorization({
      keyId: 'test-key',
      keySecret: 'test-secret',
      object: 'yak/1.4.9-1030/Yakit.exe',
      md5: '1B2M2Y8AsgTpgAmY7PhCfg==',
      date: 'Tue, 03 Nov 2026 00:00:00 GMT',
    })
    expect(value).toBe('OSS test-key:nJ1kelCMeB2QwMaFyGRkfSsjgro=')
  })
})
