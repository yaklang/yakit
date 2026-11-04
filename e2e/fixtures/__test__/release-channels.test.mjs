import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { complete } from '../../../scripts/release/finalize.mjs'
import { artifactName, createPlan } from '../../../scripts/release/model.mjs'
import { run } from '../../../scripts/release/io.mjs'
import { uploadOss } from '../../../scripts/release/oss.mjs'
import { compareVersions, publishVersionTag } from '../../../scripts/release/channels.mjs'
import { parse } from 'yaml'

vi.mock('../../../scripts/release/io.mjs', async (original) => ({ ...(await original()), run: vi.fn() }))
vi.mock('../../../scripts/release/oss.mjs', () => ({ uploadOss: vi.fn() }))

let directory
let previousDirectory
let channels
let latestTag
let environment
beforeEach(async () => {
  previousDirectory = process.cwd()
  directory = await mkdtemp(path.join(os.tmpdir(), 'release-channels-'))
  process.chdir(directory)
  channels = new Map()
  latestTag = null
  environment = {
    GITHUB_RUN_ID: '456',
    ENGINE_VERSION: '1.4.9-beta5',
    RELEASE_PUBLISH: 'true',
    GITHUB_REPOSITORY: 'yaklang/yakit',
    GITHUB_STEP_SUMMARY: path.join(directory, 'summary'),
    GH_TOKEN: 'test-token',
  }
  vi.mocked(run).mockReset().mockResolvedValue('')
  vi.mocked(uploadOss)
    .mockReset()
    .mockImplementation(async (file, object) => {
      channels.set(object, (await readFile(file, 'utf8')).trim())
    })
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url) => {
      if (String(url).includes('api.github.com')) {
        return latestTag ? new Response(JSON.stringify({ tag_name: latestTag })) : new Response('', { status: 404 })
      }
      const object = new URL(url).pathname.slice(1)
      return channels.has(object) ? new Response(channels.get(object)) : new Response('', { status: 404 })
    }),
  )
})
afterEach(async () => {
  process.chdir(previousDirectory)
  vi.unstubAllGlobals()
  await rm(directory, { recursive: true, force: true })
})

async function candidate(version, editions = 'yakit') {
  const suffix = editions.startsWith('irify') ? '-irify' : editions === 'memfit' ? '-memfit' : ''
  const plan = createPlan({
    editions,
    version,
    sha: 'a'.repeat(40),
    runId: '123',
    repository: 'yaklang/yakit',
    ref: `v${version}${suffix}`,
    refType: 'tag',
  })
  await rm('.release/results', { recursive: true, force: true })
  await mkdir('.release/results', { recursive: true })
  for (const target of plan.targets) {
    const names = [artifactName(plan, target)]
    if (target.edition === 'yakitEE' && target.platform === 'linux' && target.legacy)
      names.push(names[0].replace(/\.AppImage$/, '.run'))
    await writeFile(
      `.release/results/${target.id}.json`,
      JSON.stringify({
        target: target.id,
        sha: plan.sha,
        version,
        signed: true,
        finalizeRunId: environment.GITHUB_RUN_ID,
        engine: { version: environment.ENGINE_VERSION, sha256: 'b'.repeat(64) },
        files: names.map((name) => ({ name, sha256: 'c'.repeat(64) })),
      }),
    )
  }
  return plan
}

describe('final release channel promotion', () => {
  it('rejects an older finalization after a newer version completes', async () => {
    await complete(await candidate('1.4.9-1104'), environment)
    expect(channels.get('yak/latest/yakit-version.txt')).toBe('1.4.9-1104')
    vi.mocked(uploadOss).mockClear()
    vi.mocked(run).mockClear()
    await expect(complete(await candidate('1.4.9-1103'), environment)).rejects.toThrow(/downgrade/i)
    expect(uploadOss).not.toHaveBeenCalled()
    expect(run.mock.calls.some(([, args]) => ['upload', 'edit'].includes(args[1]))).toBe(false)
    expect(channels.get('yak/latest/yakit-version.txt')).toBe('1.4.9-1104')
  })
  it('checks every edition before changing the first channel', async () => {
    channels.set('yak/latest/yakit-version.txt', '1.4.9-1102')
    channels.set('vip/latest/yakit-version.txt', '1.4.9-1104')
    await expect(complete(await candidate('1.4.9-1103', 'yakit,yakitEE'), environment)).rejects.toThrow(/downgrade/i)
    expect(uploadOss).not.toHaveBeenCalled()
    expect(channels.get('yak/latest/yakit-version.txt')).toBe('1.4.9-1102')
  })
  it('allows the same version to retry after a partial promotion', async () => {
    channels.set('yak/latest/yakit-version.txt', '1.4.9-1103')
    await complete(await candidate('1.4.9-1103', 'yakit,yakitEE'), environment)
    expect(channels.get('vip/latest/yakit-version.txt')).toBe('1.4.9-1103')
  })
  it('publishes another product without moving GitHub latest backwards', async () => {
    latestTag = 'v1.4.9-1104'
    await complete(await candidate('1.4.9-1103', 'irify'), environment)
    expect(channels.get('irify/latest/yakit-version.txt')).toBe('1.4.9-1103')
    expect(run).toHaveBeenCalledWith('gh', ['release', 'edit', 'v1.4.9-1103-irify', '--draft=false', '--latest=false'])
  })
  it('marks a newer GitHub release as latest', async () => {
    latestTag = 'v1.4.9-1103-irify'
    await complete(await candidate('1.4.9-1104'), environment)
    expect(run).toHaveBeenCalledWith('gh', ['release', 'edit', 'v1.4.9-1104', '--draft=false', '--latest=true'])
  })
  it.each([403, 429, 500])('does not treat HTTP %s as a missing OSS channel', async (status) => {
    vi.mocked(fetch).mockResolvedValue(new Response('', { status }))
    await expect(complete(await candidate('1.4.9-1104'), environment)).rejects.toThrow(`HTTP ${status}`)
    expect(uploadOss).not.toHaveBeenCalled()
    expect(run.mock.calls.some(([, args]) => ['upload', 'edit'].includes(args[1]))).toBe(false)
  })
  it.each(['', 'latest', '<html>error</html>', '1.4.9-rc..1'])(
    'fails closed for an invalid channel value: %j',
    async (value) => {
      channels.set('yak/latest/yakit-version.txt', value)
      await expect(complete(await candidate('1.4.9-1104'), environment)).rejects.toThrow(/Invalid/)
      expect(uploadOss).not.toHaveBeenCalled()
    },
  )
  it('does not promote when a channel read loses its connection', async () => {
    vi.mocked(fetch).mockRejectedValue(new Error('network disconnected'))
    await expect(complete(await candidate('1.4.9-1104'), environment)).rejects.toThrow('network disconnected')
    expect(uploadOss).not.toHaveBeenCalled()
  })
  it('checks GitHub latest before changing OSS channels', async () => {
    vi.mocked(fetch).mockImplementation(
      async (url) =>
        new Response('', {
          status: String(url).includes('api.github.com') ? 500 : 404,
        }),
    )
    await expect(complete(await candidate('1.4.9-1104'), environment)).rejects.toThrow('HTTP 500')
    expect(uploadOss).not.toHaveBeenCalled()
    expect(run.mock.calls.some(([, args]) => ['upload', 'edit'].includes(args[1]))).toBe(false)
  })
  it('does not read or change production channels during a dry run', async () => {
    await complete(await candidate('1.4.9-1104'), { ...environment, RELEASE_PUBLISH: 'false' })
    expect(fetch).not.toHaveBeenCalled()
    expect(uploadOss).not.toHaveBeenCalled()
  })
})

describe('release version ordering', () => {
  it.each([
    ['1.4.9-1104', '1.4.9-1103', 1],
    ['1.4.10-0101', '1.4.9-1231', 1],
    ['1.4.9-9', '1.4.9-10', -1],
    ['1.4.9-rc.10', '1.4.9-rc.2', 1],
    ['1.4.9-1', '1.4.9-alpha', -1],
    ['1.4.9', '1.4.9-rc.1', 1],
    ['1.4.9-rc', '1.4.9-rc.1', -1],
    ['1.4.9-alpha', '1.4.9-beta', -1],
    ['1.4.9-1104', '1.4.9-1104', 0],
    ['1.4.9', '1.4.9', 0],
    ['1.4.9-9007199254740993', '1.4.9-9007199254740992', 1],
  ])('compares %s to %s', (left, right, expected) => {
    expect(compareVersions(left, right)).toBe(expected)
    expect(compareVersions(right, left)).toBe(expected === 0 ? 0 : -expected)
  })
})

describe('legacy manual channel entry point', () => {
  const env = { GITHUB_REF_TYPE: 'tag', GITHUB_REF_NAME: 'v1.4.9-1103', RELEASE_EDITION: 'ce' }
  it('uses the same downgrade protection', async () => {
    channels.set('yak/latest/yakit-version.txt', '1.4.9-1104')
    await expect(publishVersionTag(env)).rejects.toThrow(/downgrade/i)
    expect(uploadOss).not.toHaveBeenCalled()
  })
  it('rejects a mismatched product tag before reading or writing channels', async () => {
    await expect(publishVersionTag({ ...env, GITHUB_REF_NAME: 'v1.4.9-1103-irify' })).rejects.toThrow(/canonical/)
    expect(fetch).not.toHaveBeenCalled()
    expect(uploadOss).not.toHaveBeenCalled()
  })
  it('allows a valid channel promotion', async () => {
    await publishVersionTag(env)
    expect(channels.get('yak/latest/yakit-version.txt')).toBe('1.4.9-1103')
  })
  it('rejects branch dispatches', async () => {
    await expect(publishVersionTag({ ...env, GITHUB_REF_TYPE: 'branch' })).rejects.toThrow(/formal release tag/)
    expect(uploadOss).not.toHaveBeenCalled()
  })
  it('holds the same cross-version lock as Finalize for the whole promotion job', async () => {
    const workflow = async (name) =>
      parse(await readFile(new URL(`../../../.github/workflows/${name}.yml`, import.meta.url), 'utf8'))
    const finalize = await workflow('release-finalize')
    const manual = await workflow('publish-oss-version')
    expect(finalize.jobs.publish.concurrency).toEqual({
      group: 'release-channel-promotion',
      'cancel-in-progress': false,
    })
    expect(manual.jobs.build_yakit.concurrency).toEqual(finalize.jobs.publish.concurrency)
    // Old candidates must not replace the coordinator's new promotion guards.
    const checkout = (job) => job.steps.find((step) => step.uses === 'actions/checkout@v4')
    expect(checkout(finalize.jobs.plan).with?.ref).toBeUndefined()
    expect(checkout(finalize.jobs.publish).with?.ref).toBeUndefined()
    expect(checkout(finalize.jobs.package).with.ref).toBe('${{ needs.plan.outputs.sha }}')
  })
})
