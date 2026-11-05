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
import { dependencyKey, packagingManifest } from '../../../scripts/release/toolchain.mjs'
import {
  downloadEngine,
  engineFile,
  injectEngine,
  notarizeApp,
  signWithTimestampRetry,
  validateStapledTicket,
} from '../../../scripts/release/engine.mjs'
import { makeConfig } from '../../../scripts/release/package.mjs'
import { assertReleaseBinding, assertResults, testOssObject } from '../../../scripts/release/finalize.mjs'
import { ossAuthorization, verifyOssEtag } from '../../../scripts/release/oss.mjs'

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
    const candidate = createPlan({
      ...plan(),
      editions: 'yakit,yakitEE,irify,irifyEE,memfit',
      ref: 'test-all-products',
      refType: 'branch',
    })
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

describe('release dependency caches', () => {
  const manifest = {
    version: '1.4.9-1030',
    dependencies: { '@grpc/grpc-js': '^1.3.6' },
    devDependencies: {
      '@electron/notarize': '^2.5.0',
      electron: '27.0.0',
      'electron-builder': '26.15.3',
      esbuild: '0.28.1',
      typescript: '6.0.3',
      webdriverio: '9.30.0',
    },
    resolutions: { 'some-transitive-dependency': '1.0.0' },
  }
  it('preserves production dependencies and pinned packaging tools without test and compiler packages', () => {
    const tools = packagingManifest(manifest)
    expect(tools.dependencies).toEqual({
      ...manifest.dependencies,
      '@electron/notarize': '^2.5.0',
      electron: '27.0.0',
      'electron-builder': '26.15.3',
      esbuild: '0.28.1',
    })
    expect(tools.resolutions).toEqual(manifest.resolutions)
    expect(tools).not.toHaveProperty('scripts')
    expect(manifest.devDependencies).toHaveProperty('webdriverio')
  })
  it('reuses installed dependencies across software version bumps', () => {
    expect(dependencyKey({ ...manifest, version: '1.4.9-1106' }, 'locked bytes')).toBe(
      dependencyKey(manifest, 'locked bytes'),
    )
  })
  it('invalidates dependencies when direct versions, resolutions, or lockfile bytes change', () => {
    const key = dependencyKey(manifest, 'locked bytes')
    expect(dependencyKey({ ...manifest, dependencies: { '@grpc/grpc-js': '^1.4.0' } }, 'locked bytes')).not.toBe(key)
    expect(dependencyKey({ ...manifest, resolutions: {} }, 'locked bytes')).not.toBe(key)
    expect(dependencyKey(manifest, 'new locked bytes')).not.toBe(key)
  })
  it('gives full build tools and packaging-only tools different identities', () => {
    expect(dependencyKey(packagingManifest(manifest), 'locked bytes')).not.toBe(dependencyKey(manifest, 'locked bytes'))
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
  it('reserves a release version for one candidate, engine and finalize run before platform uploads', () => {
    const candidate = plan()
    const binding = {
      candidate: candidate.candidate,
      sha: candidate.sha,
      version: candidate.version,
      engineVersion: '1.4.9-beta5',
      finalizeRunId: '456',
    }
    expect(() => assertReleaseBinding(candidate, binding, '1.4.9-beta5', '456')).not.toThrow()
    for (const change of [
      { candidate: 'ci-release-124' },
      { sha: 'b'.repeat(40) },
      { version: '1.4.9-1103' },
      { engineVersion: '1.4.9-beta6' },
      { finalizeRunId: '789' },
      { finalizeRunId: undefined },
    ]) {
      expect(() => assertReleaseBinding(candidate, { ...binding, ...change }, '1.4.9-beta5', '456')).toThrow()
    }
  })
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
  it('requires matching isolated OSS receipts when exercising real test uploads', () => {
    const candidate = { ...plan(), tag: null }
    const env = { ...environment, RELEASE_TEST_OSS: 'true' }
    const valid = receipts(candidate)
    expect(() => assertResults(candidate, valid, env)).toThrow('OSS verification receipt missing')
    for (const [index, result] of valid.entries()) {
      result.testObjects = result.files.map((file) => ({
        object: testOssObject(candidate, candidate.targets[index], file.name, env),
        etag: 'a'.repeat(32),
      }))
    }
    expect(() => assertResults(candidate, valid, env)).not.toThrow()
    valid[0].testObjects[0].object = 'yak/latest/yakit-version.txt'
    expect(() => assertResults(candidate, valid, env)).toThrow('OSS verification receipt missing')
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

describe('isolated branch upload boundaries', () => {
  it('places CE and EE files under run-specific test directories', () => {
    const candidate = { ...plan(), tag: null }
    const env = { GITHUB_RUN_ID: '456', RELEASE_PUBLISH: 'false' }
    const ce = candidate.targets[0]
    const ee = candidate.targets.find((target) => target.edition === 'yakitEE')
    expect(testOssObject(candidate, ce, artifactName(candidate, ce), env)).toBe(
      'yak/ci-release-tests/456/Yakit-1.4.9-1030-windows-amd64.exe',
    )
    expect(testOssObject(candidate, ee, artifactName(candidate, ee), env)).toBe(
      'vip/ci-release-tests/456/EnpriTrace-1.4.9-1030-windows-amd64.exe',
    )
  })
  it('rejects test writes from production tags or with production publishing enabled', () => {
    const candidate = plan()
    const env = { GITHUB_RUN_ID: '456' }
    expect(() => testOssObject(candidate, candidate.targets[0], 'Yakit.exe', env)).toThrow()
    candidate.tag = null
    expect(() =>
      testOssObject(candidate, candidate.targets[0], 'Yakit.exe', { ...env, RELEASE_PUBLISH: 'true' }),
    ).toThrow()
    expect(() => testOssObject(candidate, candidate.targets[0], 'Yakit.exe', { GITHUB_RUN_ID: '../latest' })).toThrow()
  })
  it.each(['../latest/yakit-version.txt', 'a/b.exe', 'a\\b.exe', '.hidden'])(
    'rejects an unsafe test filename: %s',
    (name) => {
      const candidate = { ...plan(), tag: null }
      expect(() => testOssObject(candidate, candidate.targets[0], name, { GITHUB_RUN_ID: '456' })).toThrow()
    },
  )
})

describe('OSS remote object checksums', () => {
  const md5 = '1B2M2Y8AsgTpgAmY7PhCfg=='
  it('validates a quoted ETag from a CRLF HTTP HEAD response', () => {
    expect(verifyOssEtag('HTTP/1.1 200 OK\r\nETag: "D41D8CD98F00B204E9800998ECF8427E"\r\n\r\n', md5)).toBe(
      'd41d8cd98f00b204e9800998ecf8427e',
    )
  })
  it.each(['', 'ETag: "invalid"', `ETag: "${'0'.repeat(32)}"`])(
    'refuses absent or corrupt remote checksums: %s',
    (headers) => {
      expect(() => verifyOssEtag(headers, md5)).toThrow('checksum differs')
    },
  )
})

describe('Apple signing timestamps', () => {
  const unavailable = Object.assign(new Error('codesign: The timestamp service is not available.'), { code: 1 })
  it('retries temporary timestamp failures while preserving the signing result', async () => {
    const sign = vi
      .fn()
      .mockRejectedValueOnce(unavailable)
      .mockRejectedValueOnce(unavailable)
      .mockResolvedValue('signed')
    const wait = vi.fn().mockResolvedValue()
    expect(await signWithTimestampRetry(sign, { wait })).toBe('signed')
    expect(sign).toHaveBeenCalledTimes(3)
    expect(wait.mock.calls).toEqual([[2000], [4000]])
  })
  it('fails certificate or signature errors immediately', async () => {
    const invalid = Object.assign(new Error('The specified item could not be found in the keychain.'), { code: 1 })
    const sign = vi.fn().mockRejectedValue(invalid)
    const wait = vi.fn()
    await expect(signWithTimestampRetry(sign, { wait })).rejects.toBe(invalid)
    expect(sign).toHaveBeenCalledOnce()
    expect(wait).not.toHaveBeenCalled()
  })
  it('fails closed when the timestamp service stays unavailable', async () => {
    const sign = vi.fn().mockRejectedValue(unavailable)
    await expect(signWithTimestampRetry(sign, { wait: vi.fn().mockResolvedValue() })).rejects.toBe(unavailable)
    expect(sign).toHaveBeenCalledTimes(3)
  })
})

describe('Apple ticket validation', () => {
  it('retries a transient network disconnect without resubmitting notarization', async () => {
    const network = Object.assign(new Error('NSURLErrorDomain: network connection was lost'), { code: 68 })
    const execute = vi.fn().mockRejectedValueOnce(network).mockRejectedValueOnce(network).mockResolvedValue('valid')
    const wait = vi.fn().mockResolvedValue()
    await validateStapledTicket('/Yakit.app', { execute, wait })
    expect(execute).toHaveBeenCalledTimes(3)
    expect(execute).toHaveBeenLastCalledWith('xcrun', ['stapler', 'validate', '/Yakit.app'], { capture: true })
    expect(wait.mock.calls).toEqual([[2000], [4000]])
  })
  it('does not retry or ignore an invalid ticket', async () => {
    const invalid = Object.assign(new Error('Invalid ticket'), { code: 65 })
    const execute = vi.fn().mockRejectedValue(invalid)
    const wait = vi.fn()
    await expect(validateStapledTicket('/Yakit.app', { execute, wait })).rejects.toBe(invalid)
    expect(execute).toHaveBeenCalledTimes(1)
    expect(wait).not.toHaveBeenCalled()
  })
  it('fails closed after three failed Apple network lookups', async () => {
    const network = Object.assign(new Error('NSURLErrorDomain: network connection was lost'), { code: 68 })
    const execute = vi.fn().mockRejectedValue(network)
    await expect(validateStapledTicket('/Yakit.app', { execute, wait: vi.fn().mockResolvedValue() })).rejects.toBe(
      network,
    )
    expect(execute).toHaveBeenCalledTimes(3)
  })
})

it('recovers a staple disconnect after acceptance without resubmitting to Apple', async () => {
  const submit = vi
    .fn()
    .mockRejectedValue(
      new Error('Failed to staple your application with code: 68\nNSURLErrorDomain: network connection lost'),
    )
  const execute = vi.fn().mockResolvedValue('success')
  await notarizeApp('/Yakit.app', { appleId: 'example' }, { submit, execute, wait: vi.fn() })
  expect(submit).toHaveBeenCalledOnce()
  expect(execute.mock.calls.map((call) => call[1])).toEqual([
    ['stapler', 'staple', '/Yakit.app'],
    ['stapler', 'validate', '/Yakit.app'],
  ])
})

it('fails a rejected notarization without attempting to staple an unaccepted app', async () => {
  const rejected = new Error('Notarization status Invalid')
  const submit = vi.fn().mockRejectedValue(rejected)
  const execute = vi.fn()
  await expect(notarizeApp('/Yakit.app', {}, { submit, execute })).rejects.toBe(rejected)
  expect(execute).not.toHaveBeenCalled()
})
