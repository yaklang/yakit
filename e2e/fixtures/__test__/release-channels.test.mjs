import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { complete, loadCandidate, restoreFinalizationPlan, uploadResult } from '../../../scripts/release/finalize.mjs'
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
let releases

function releaseFor(tag) {
  if (!releases.has(tag)) releases.set(tag, { isDraft: true, assets: new Map() })
  return releases.get(tag)
}

beforeEach(async () => {
  previousDirectory = process.cwd()
  directory = await mkdtemp(path.join(os.tmpdir(), 'release-channels-'))
  process.chdir(directory)
  channels = new Map()
  releases = new Map()
  latestTag = null
  environment = {
    GITHUB_RUN_ID: '456',
    ENGINE_VERSION: '1.4.9-beta5',
    RELEASE_PUBLISH: 'true',
    GITHUB_REPOSITORY: 'yaklang/yakit',
    GITHUB_STEP_SUMMARY: path.join(directory, 'summary'),
    GH_TOKEN: 'test-token',
    PREPARE_RUN_ID: '123',
    GITHUB_OUTPUT: path.join(directory, 'outputs'),
    OSS_KEY_ID: 'test-key',
    OSS_KEY_SECRET: 'test-secret',
  }
  vi.mocked(run)
    .mockReset()
    .mockImplementation(async (command, args) => {
      if (command !== 'gh') throw new Error(`Unexpected command: ${command}`)
      if (args[0] === 'api') {
        return JSON.stringify(
          args[1].includes('/commits/')
            ? { sha: 'a'.repeat(40) }
            : {
                id: 123,
                head_sha: 'a'.repeat(40),
                conclusion: 'success',
                status: 'completed',
                event: 'push',
                path: '.github/workflows/release-prepare.yml',
              },
        )
      }
      const release = releaseFor(args[2])
      if (args[1] === 'view')
        return JSON.stringify({
          isDraft: release.isDraft,
          assets: [...release.assets.keys()].map((name) => ({ name })),
        })
      if (args[1] === 'download') {
        const name = args[args.indexOf('--pattern') + 1]
        if (!name.startsWith('result-')) {
          const destination = args[args.indexOf('--dir') + 1]
          await mkdir(destination, { recursive: true })
          if (!release.assets.has(name)) throw new Error(`Missing mock asset: ${name}`)
          await writeFile(path.join(destination, name), release.assets.get(name))
        }
      }
      if (args[1] === 'upload') {
        for (const file of args.slice(3).filter((arg) => arg !== '--clobber')) {
          const name = path.basename(file)
          if (release.assets.has(name) && !args.includes('--clobber'))
            throw Object.assign(new Error('Asset already exists'), { code: 1 })
          release.assets.set(name, await readFile(file))
        }
      }
      if (args[1] === 'edit' && args.includes('--draft=false')) release.isDraft = false
      return ''
    })
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
  if (!releaseFor(plan.tag).assets.has('release-binding.json')) {
    releaseFor(plan.tag).assets.set(
      'release-binding.json',
      Buffer.from(
        JSON.stringify({
          candidate: plan.candidate,
          sha: plan.sha,
          version: plan.version,
          engineVersion: environment.ENGINE_VERSION,
          finalizeRunId: environment.GITHUB_RUN_ID,
        }),
      ),
    )
  }
  return plan
}

async function prepareCandidate(plan) {
  plan.prepared = plan.targets.map((target) => ({
    target: target.id,
    sha: plan.sha,
    version: plan.version,
    sha256: 'b'.repeat(64),
  }))
  releaseFor(plan.candidate).assets.set('candidate.json', Buffer.from(JSON.stringify(plan)))
  if (!releaseFor(plan.tag).assets.has('release-binding.json'))
    releaseFor(plan.tag).assets.set(
      'release-binding.json',
      Buffer.from(
        JSON.stringify({
          candidate: plan.candidate,
          sha: plan.sha,
          version: plan.version,
          engineVersion: environment.ENGINE_VERSION,
          finalizeRunId: environment.GITHUB_RUN_ID,
        }),
      ),
    )
}

async function upload(plan, env = environment, bytes = 'signed installer bytes') {
  const target = plan.targets[0]
  await mkdir('.release/output', { recursive: true })
  await writeFile(`.release/output/${artifactName(plan, target)}`, bytes)
  await writeFile(`.release/result-${target.id}.json`, await readFile(`.release/results/${target.id}.json`))
  await uploadResult(plan, target, env)
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
    const coordinator = finalize.jobs.package.steps.find((step) => step.with?.path === '.release/coordinator')
    expect(coordinator.uses).toBe('actions/checkout@v4')
    expect(coordinator.with.ref).toBeUndefined()
    expect(coordinator.with['sparse-checkout']).toBe('scripts/release')
    expect(finalize.jobs.package.steps.find((step) => step.name?.startsWith('Upload this platform')).run).toBe(
      'node .release/coordinator/scripts/release/finalize.mjs upload',
    )
  })
})

describe('release state across fresh and failed-job reruns', () => {
  it('uploads installers while the release is still unpublished', async () => {
    const plan = await candidate('1.4.9-1104')
    await upload(plan)
    expect(uploadOss).toHaveBeenCalledTimes(1)
    expect(releaseFor(plan.tag).assets.has(artifactName(plan, plan.targets[0]))).toBe(true)
  })

  it.each(['plan', 'upload', 'complete'])('rejects a stale %s after a different run publishes', async (step) => {
    const plan = await candidate('1.4.9-1104')
    await prepareCandidate(plan)
    await complete(plan, { ...environment, RELEASE_PUBLISH: 'true' })
    const published = Buffer.from(releaseFor(plan.tag).assets.get('release-manifest.json'))
    // A has an already-successful plan; only its failed package/publish jobs rerun.
    environment.GITHUB_RUN_ID = '789'
    await candidate(plan.version)
    vi.mocked(uploadOss).mockClear()
    vi.mocked(run).mockClear()
    const execution =
      step === 'plan' ? loadCandidate(environment) : step === 'upload' ? upload(plan) : complete(plan, environment)
    await expect(execution).rejects.toThrow(/already public|already bound/)
    expect(uploadOss).not.toHaveBeenCalled()
    expect(run.mock.calls.some(([, args]) => ['upload', 'edit'].includes(args[1]))).toBe(false)
    expect(releaseFor(plan.tag).assets.get('release-manifest.json')).toEqual(published)
  })

  it.each(['yakitEE', 'irifyEE'])(
    'persists private completion and refuses %s reruns at every entry',
    async (edition) => {
      const plan = await candidate('1.4.9-1104', edition)
      await prepareCandidate(plan)
      await complete(plan, environment)
      const release = releaseFor(plan.tag)
      expect(release.isDraft).toBe(true)
      expect(JSON.parse(release.assets.get('release-complete.json'))).toMatchObject({
        status: 'complete',
        finalizeRunId: '456',
        candidate: plan.candidate,
        engineVersion: environment.ENGINE_VERSION,
      })
      expect(channels.get(`${edition === 'yakitEE' ? 'vip' : 'svip'}/latest/yakit-version.txt`)).toBe(plan.version)
      environment.GITHUB_RUN_ID = '789'
      await candidate(plan.version, edition)
      vi.mocked(uploadOss).mockClear()
      vi.mocked(run).mockClear()
      await expect(loadCandidate(environment)).rejects.toThrow(/completed/)
      await expect(upload(plan)).rejects.toThrow(/completed/)
      await expect(complete(plan, environment)).rejects.toThrow(/completed/)
      expect(uploadOss).not.toHaveBeenCalled()
      expect(run.mock.calls.some(([, args]) => ['upload', 'edit'].includes(args[1]))).toBe(false)
    },
  )

  it('allows the same candidate and engine to retry before promotion starts', async () => {
    const plan = await candidate('1.4.9-1104')
    await prepareCandidate(plan)
    await expect(loadCandidate(environment)).resolves.toMatchObject({ candidate: plan.candidate })
    await upload(plan)
    expect(uploadOss).toHaveBeenCalledTimes(1)
  })

  it('refuses even the original publish job after an EE-only release completed', async () => {
    const plan = await candidate('1.4.9-1104', 'yakitEE')
    await complete(plan, environment)
    vi.mocked(uploadOss).mockClear()
    vi.mocked(run).mockClear()
    await expect(complete(plan, environment)).rejects.toThrow(/completed/)
    expect(uploadOss).not.toHaveBeenCalled()
    expect(run.mock.calls.some(([, args]) => ['upload', 'edit'].includes(args[1]))).toBe(false)
  })

  it('does not publish a manifest or channel if the atomic state reservation fails', async () => {
    const plan = await candidate('1.4.9-1104')
    const normalRun = run.getMockImplementation()
    vi.mocked(run).mockImplementation(async (command, args, options) => {
      if (args[1] === 'upload' && args.includes('.release/release-state.json')) throw new Error('Reservation failed')
      return normalRun(command, args, options)
    })
    await expect(complete(plan, environment)).rejects.toThrow('Reservation failed')
    expect(uploadOss).not.toHaveBeenCalled()
    expect(releaseFor(plan.tag).assets.has('release-manifest.json')).toBe(false)
  })

  it('freezes packages before channel writes and lets only the owner resume a partial promotion', async () => {
    const plan = await candidate('1.4.9-1104', 'yakit,yakitEE')
    await prepareCandidate(plan)
    const normalUpload = uploadOss.getMockImplementation()
    vi.mocked(uploadOss).mockImplementation(async (file, object) => {
      expect(JSON.parse(releaseFor(plan.tag).assets.get('release-state.json')).status).toBe('publishing')
      if (object.startsWith('vip/')) throw new Error('OSS interrupted')
      return normalUpload(file, object)
    })
    await expect(complete(plan, environment)).rejects.toThrow('OSS interrupted')
    expect(channels.get('yak/latest/yakit-version.txt')).toBe(plan.version)
    expect(channels.has('vip/latest/yakit-version.txt')).toBe(false)
    vi.mocked(uploadOss).mockClear().mockImplementation(normalUpload)
    vi.mocked(run).mockClear()
    await expect(loadCandidate({ ...environment, GITHUB_RUN_ID: '789' })).rejects.toThrow(/already publishing/)
    await expect(upload(plan)).rejects.toThrow(/already publishing/)
    environment.GITHUB_RUN_ID = '789'
    await candidate(plan.version, 'yakit,yakitEE')
    await expect(complete(plan, environment)).rejects.toThrow(/already publishing/)
    expect(uploadOss).not.toHaveBeenCalled()
    expect(run.mock.calls.some(([, args]) => ['upload', 'edit'].includes(args[1]))).toBe(false)
    environment.GITHUB_RUN_ID = '456'
    await candidate(plan.version, 'yakit,yakitEE')
    await expect(complete(plan, environment)).resolves.toBeUndefined()
    expect(channels.get('vip/latest/yakit-version.txt')).toBe(plan.version)
    expect(JSON.parse(releaseFor(plan.tag).assets.get('release-complete.json')).status).toBe('complete')
  })

  it('refuses an owner retry if the verified manifest changed after promotion started', async () => {
    const plan = await candidate('1.4.9-1104', 'yakitEE')
    vi.mocked(uploadOss).mockRejectedValueOnce(new Error('OSS interrupted'))
    await expect(complete(plan, environment)).rejects.toThrow('OSS interrupted')
    const file = `.release/results/${plan.targets[0].id}.json`
    const receipt = JSON.parse(await readFile(file, 'utf8'))
    receipt.files[0].sha256 = 'd'.repeat(64)
    await writeFile(file, JSON.stringify(receipt))
    vi.mocked(uploadOss).mockClear()
    vi.mocked(run).mockClear()
    await expect(complete(plan, environment)).rejects.toThrow(/manifest/)
    expect(uploadOss).not.toHaveBeenCalled()
    expect(run.mock.calls.some(([, args]) => ['upload', 'edit'].includes(args[1]))).toBe(false)
  })

  it('retains the immutable reservation if the completion marker upload fails', async () => {
    const plan = await candidate('1.4.9-1104', 'yakitEE')
    await prepareCandidate(plan)
    const normalRun = run.getMockImplementation()
    vi.mocked(run).mockImplementation(async (command, args, options) => {
      if (args[1] === 'upload' && args.includes('.release/release-complete.json'))
        throw new Error('Completion upload failed')
      return normalRun(command, args, options)
    })
    await expect(complete(plan, environment)).rejects.toThrow('Completion upload failed')
    const release = releaseFor(plan.tag)
    const reservation = Buffer.from(release.assets.get('release-state.json'))
    expect(JSON.parse(reservation).status).toBe('publishing')
    expect(release.assets.has('release-complete.json')).toBe(false)
    vi.mocked(uploadOss).mockClear()
    await expect(loadCandidate({ ...environment, GITHUB_RUN_ID: '789' })).rejects.toThrow(/already publishing/)
    await expect(upload(plan)).rejects.toThrow(/already publishing/)
    expect(uploadOss).not.toHaveBeenCalled()
    vi.mocked(run).mockImplementation(normalRun)
    await expect(complete(plan, environment)).resolves.toBeUndefined()
    expect(release.assets.get('release-state.json')).toEqual(reservation)
    expect(JSON.parse(release.assets.get('release-complete.json')).status).toBe('complete')
    const markerWrites = run.mock.calls.filter(
      ([, args]) => args[1] === 'upload' && args.some((arg) => /release-(state|complete)\.json$/.test(arg)),
    )
    expect(markerWrites).toHaveLength(3)
    expect(markerWrites.every(([, args]) => !args.includes('--clobber'))).toBe(true)
  })

  it('fails closed if the release state cannot be read', async () => {
    const plan = await candidate('1.4.9-1104')
    vi.mocked(run).mockRejectedValueOnce(new Error('GitHub unavailable'))
    await expect(upload(plan)).rejects.toThrow('GitHub unavailable')
    expect(uploadOss).not.toHaveBeenCalled()
  })
})

describe('durable finalize plans and upload ownership', () => {
  it('restores a frozen plan from Draft after the Actions artifact and local files are gone', async () => {
    const plan = await candidate('1.4.9-1105')
    await prepareCandidate(plan)
    await loadCandidate(environment)
    const frozen = Buffer.from(releaseFor(plan.candidate).assets.get('finalize-plan-456.json'))
    await rm('.release', { recursive: true, force: true })
    vi.mocked(run).mockClear()
    await expect(restoreFinalizationPlan(environment)).resolves.toEqual(plan)
    expect(JSON.parse(await readFile('.release/plan.json', 'utf8'))).toEqual(plan)
    expect(releaseFor(plan.candidate).assets.get('finalize-plan-456.json')).toEqual(frozen)
    expect(run.mock.calls.every(([, args]) => args[0] === 'release' && args[1] === 'download')).toBe(true)
  })

  it('restores and completes the original partial promotion without rerunning plan or native jobs', async () => {
    const plan = await candidate('1.4.9-1105', 'yakitEE')
    await prepareCandidate(plan)
    await loadCandidate(environment)
    const receipts = await Promise.all(
      plan.targets.map(async (target) => [
        `result-456-${target.id}.json`,
        await readFile(`.release/results/${target.id}.json`),
      ]),
    )
    const normalUpload = uploadOss.getMockImplementation()
    vi.mocked(uploadOss).mockRejectedValueOnce(new Error('OSS interrupted'))
    await expect(complete(plan, environment)).rejects.toThrow('OSS interrupted')
    await rm('.release', { recursive: true, force: true })
    const normalRun = run.getMockImplementation()
    vi.mocked(run)
      .mockClear()
      .mockImplementation(async (command, args, options) => {
        if (args[1] === 'download' && args.includes('result-456-*.json')) {
          await mkdir('.release/results', { recursive: true })
          for (const [name, bytes] of receipts) await writeFile(path.join('.release/results', name), bytes)
        }
        return normalRun(command, args, options)
      })
    vi.mocked(uploadOss).mockImplementation(normalUpload)
    const restored = await restoreFinalizationPlan(environment)
    await expect(complete(restored, environment)).resolves.toBeUndefined()
    expect(JSON.parse(releaseFor(plan.tag).assets.get('release-complete.json')).status).toBe('complete')
    expect(run.mock.calls.some(([, args]) => args[0] === 'api')).toBe(false)
    expect(
      run.mock.calls
        .filter(([, args]) => args[1] === 'upload')
        .every(
          ([, args]) =>
            args[2] === plan.tag &&
            ['.release/release-manifest.json', '.release/release-complete.json'].includes(args[3]),
        ),
    ).toBe(true)
  })

  it.each([
    { GITHUB_RUN_ID: '789' },
    { ENGINE_VERSION: '1.4.9-beta6' },
    { RELEASE_PUBLISH: 'false' },
    { RELEASE_TEST_OSS: 'true' },
    { PREPARE_RUN_ID: '124' },
  ])('rejects a saved plan with different workflow inputs: %j', async (change) => {
    const plan = await candidate('1.4.9-1105')
    await prepareCandidate(plan)
    await loadCandidate(environment)
    if (change.GITHUB_RUN_ID)
      releaseFor(plan.candidate).assets.set(
        'finalize-plan-789.json',
        releaseFor(plan.candidate).assets.get('finalize-plan-456.json'),
      )
    if (change.PREPARE_RUN_ID)
      releaseFor('ci-release-124').assets.set(
        'finalize-plan-456.json',
        releaseFor(plan.candidate).assets.get('finalize-plan-456.json'),
      )
    await expect(restoreFinalizationPlan({ ...environment, ...change })).rejects.toThrow(/does not match/)
  })

  it('keeps the first immutable snapshot when the same plan job retries', async () => {
    const plan = await candidate('1.4.9-1105')
    await prepareCandidate(plan)
    await loadCandidate(environment)
    const frozen = Buffer.from(releaseFor(plan.candidate).assets.get('finalize-plan-456.json'))
    await expect(loadCandidate(environment)).resolves.toEqual(plan)
    expect(releaseFor(plan.candidate).assets.get('finalize-plan-456.json')).toEqual(frozen)
    const writes = run.mock.calls.filter(
      ([, args]) => args[1] === 'upload' && args[3].endsWith('finalize-plan-456.json'),
    )
    expect(writes).toHaveLength(2)
    expect(writes.every(([, args]) => !args.includes('--clobber'))).toBe(true)
  })

  it('does not depend on an expiring Actions artifact in packaging or publication', async () => {
    const workflow = parse(
      await readFile(new URL('../../../.github/workflows/release-finalize.yml', import.meta.url), 'utf8'),
    )
    for (const job of Object.values(workflow.jobs)) {
      expect(job.steps.some((step) => /^actions\/(upload|download)-artifact@/.test(step.uses || ''))).toBe(false)
    }
    expect(workflow.env.PREPARE_RUN_ID).toBe('${{ inputs.prepare_run_id }}')
    for (const job of [workflow.jobs.package, workflow.jobs.publish])
      expect(job.steps.some((step) => step.run?.endsWith('finalize.mjs restore-plan'))).toBe(true)
  })

  it('blocks A -> B -> retry A interleaving before B can replace any signed installers', async () => {
    const plan = await candidate('1.4.9-1105')
    await prepareCandidate(plan)
    releaseFor(plan.tag).assets.delete('release-binding.json')
    await loadCandidate(environment)
    expect(JSON.parse(releaseFor(plan.tag).assets.get('release-binding.json')).finalizeRunId).toBe('456')
    await upload(plan, environment, 'installer signed by A')
    const target = plan.targets[0]
    const name = artifactName(plan, target)
    const aReceipt = releaseFor(plan.candidate).assets.get(`result-456-${target.id}.json`)
    const second = { ...environment, GITHUB_RUN_ID: '789' }
    vi.mocked(uploadOss).mockClear()
    await expect(loadCandidate(second)).rejects.toThrow(/already bound/)
    // A previously successful plan for B must not bypass the ownership check.
    await expect(upload(plan, second, 'installer resigned by B')).rejects.toThrow(/already bound/)
    for (const current of plan.targets) {
      const file = `.release/results/${current.id}.json`
      const receipt = JSON.parse(await readFile(file, 'utf8'))
      await writeFile(file, JSON.stringify({ ...receipt, finalizeRunId: '789' }))
    }
    await expect(complete(plan, second)).rejects.toThrow(/already bound/)
    expect(uploadOss).not.toHaveBeenCalled()
    expect(releaseFor(plan.tag).assets.get(name).toString()).toBe('installer signed by A')
    expect(channels.get(`yak/${plan.version}/${name}`)).toBe('installer signed by A')
    for (const current of plan.targets) {
      const file = `.release/results/${current.id}.json`
      const receipt = JSON.parse(await readFile(file, 'utf8'))
      await writeFile(file, JSON.stringify({ ...receipt, finalizeRunId: '456' }))
    }
    await writeFile(`.release/results/${target.id}.json`, aReceipt)
    await complete(plan, environment)
    const manifest = JSON.parse(releaseFor(plan.tag).assets.get('release-manifest.json'))
    expect(manifest.results.find((item) => item.target === target.id).files[0].sha256).toBe(
      JSON.parse(aReceipt).files[0].sha256,
    )
  })

  it('fails closed on legacy bindings without a unique owner', async () => {
    const plan = await candidate('1.4.9-1105')
    const binding = JSON.parse(releaseFor(plan.tag).assets.get('release-binding.json'))
    delete binding.finalizeRunId
    releaseFor(plan.tag).assets.set('release-binding.json', Buffer.from(JSON.stringify(binding)))
    await expect(upload(plan)).rejects.toThrow(/already bound/)
    expect(uploadOss).not.toHaveBeenCalled()
  })
})

describe('marker-only recovery after public publication', () => {
  async function interruptedPublicRelease() {
    const plan = await candidate('1.4.9-1105')
    const normalRun = run.getMockImplementation()
    vi.mocked(run).mockImplementation(async (command, args, options) => {
      if (args[1] === 'upload' && args.includes('.release/release-complete.json'))
        throw new Error('Completion upload failed')
      return normalRun(command, args, options)
    })
    await expect(complete(plan, environment)).rejects.toThrow('Completion upload failed')
    expect(releaseFor(plan.tag).isDraft).toBe(false)
    vi.mocked(run).mockClear().mockImplementation(normalRun)
    vi.mocked(uploadOss).mockClear()
    vi.mocked(fetch).mockClear()
    return plan
  }

  it('only adds the missing completion marker for the original owner and manifest', async () => {
    const plan = await interruptedPublicRelease()
    const release = releaseFor(plan.tag)
    const manifest = Buffer.from(release.assets.get('release-manifest.json'))
    channels.set('yak/latest/yakit-version.txt', '1.4.9-1106')
    latestTag = 'v1.4.9-1106'
    await expect(complete(plan, environment)).resolves.toBeUndefined()
    expect(uploadOss).not.toHaveBeenCalled()
    expect(fetch).not.toHaveBeenCalled()
    expect(release.assets.get('release-manifest.json')).toEqual(manifest)
    expect(channels.get('yak/latest/yakit-version.txt')).toBe('1.4.9-1106')
    expect(
      run.mock.calls.filter(([, args]) => ['upload', 'edit'].includes(args[1])).map(([, args]) => args.slice(0, 4)),
    ).toEqual([['release', 'upload', plan.tag, '.release/release-complete.json']])
    expect(JSON.parse(release.assets.get('release-complete.json'))).toMatchObject({
      status: 'complete',
      finalizeRunId: '456',
    })
    vi.mocked(run).mockClear()
    await expect(complete(plan, environment)).resolves.toBeUndefined()
    expect(run.mock.calls.some(([, args]) => ['upload', 'edit'].includes(args[1]))).toBe(false)
  })

  it('refuses another owner even when that run has valid-looking receipts', async () => {
    const plan = await interruptedPublicRelease()
    environment.GITHUB_RUN_ID = '789'
    await candidate(plan.version)
    await expect(complete(plan, environment)).rejects.toThrow(/already bound/)
    expect(uploadOss).not.toHaveBeenCalled()
    expect(run.mock.calls.some(([, args]) => ['upload', 'edit'].includes(args[1]))).toBe(false)
  })

  it('refuses recovery if the public manifest no longer matches the sealed bytes', async () => {
    const plan = await interruptedPublicRelease()
    releaseFor(plan.tag).assets.set('release-manifest.json', Buffer.from('{"changed":true}'))
    await expect(complete(plan, environment)).rejects.toThrow(/Public release manifest differs/)
    expect(uploadOss).not.toHaveBeenCalled()
    expect(run.mock.calls.some(([, args]) => ['upload', 'edit'].includes(args[1]))).toBe(false)
  })

  it('refuses changed receipts rather than rewriting the public version', async () => {
    const plan = await interruptedPublicRelease()
    const file = `.release/results/${plan.targets[0].id}.json`
    const receipt = JSON.parse(await readFile(file, 'utf8'))
    receipt.files[0].sha256 = 'd'.repeat(64)
    await writeFile(file, JSON.stringify(receipt))
    await expect(complete(plan, environment)).rejects.toThrow(/manifest/)
    expect(uploadOss).not.toHaveBeenCalled()
    expect(run.mock.calls.some(([, args]) => ['upload', 'edit'].includes(args[1]))).toBe(false)
  })
})
