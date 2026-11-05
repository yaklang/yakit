import { appendFile, mkdir, readdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  artifactName,
  assertReady,
  assertSourceRun,
  assertVersion,
  products,
  readJson,
  targetFromEnv,
  writeJson,
} from './model.mjs'
import { hashFile, run } from './io.mjs'
import { uploadOss } from './oss.mjs'
import { assertChannelPromotion, shouldMarkGitHubLatest } from './channels.mjs'

const ghJson = async (args) => JSON.parse(await run('gh', args, { capture: true }))
const isPublic = (edition) => ['yakit', 'irify', 'memfit'].includes(edition)

async function readReleaseAsset(tag, name) {
  await mkdir('.release/metadata', { recursive: true })
  await run('gh', ['release', 'download', tag, '--pattern', name, '--dir', '.release/metadata', '--clobber'])
  return readJson(path.join('.release/metadata', name))
}

function planSnapshotName(env) {
  if (!/^\d+$/.test(env.PREPARE_RUN_ID || '') || !/^\d+$/.test(env.GITHUB_RUN_ID || ''))
    throw new Error('Supply valid prepare and finalize workflow run IDs')
  return `finalize-plan-${env.GITHUB_RUN_ID}.json`
}

function assertPlanSnapshot(snapshot, env) {
  if (
    snapshot.schema !== 1 ||
    snapshot.finalizeRunId !== env.GITHUB_RUN_ID ||
    snapshot.engineVersion !== env.ENGINE_VERSION ||
    snapshot.publish !== (env.RELEASE_PUBLISH === 'true') ||
    snapshot.testOss !== (env.RELEASE_TEST_OSS === 'true') ||
    snapshot.plan?.candidate !== `ci-release-${env.PREPARE_RUN_ID}` ||
    snapshot.plan?.repository !== env.GITHUB_REPOSITORY
  )
    throw new Error('Saved finalize plan does not match this workflow run and its inputs')
  assertReady(snapshot.plan, snapshot.plan.prepared)
  return snapshot.plan
}

async function savePlanSnapshot(plan, env) {
  const name = planSnapshotName(env)
  const snapshot = {
    schema: 1,
    finalizeRunId: env.GITHUB_RUN_ID,
    engineVersion: env.ENGINE_VERSION,
    publish: env.RELEASE_PUBLISH === 'true',
    testOss: env.RELEASE_TEST_OSS === 'true',
    plan,
  }
  await writeJson(path.join('.release', name), snapshot)
  try {
    await run('gh', ['release', 'upload', plan.candidate, path.join('.release', name)])
  } catch (error) {
    if (error.code !== 1) throw error
    const saved = await readReleaseAsset(plan.candidate, name)
    assertPlanSnapshot(saved, env)
    if (JSON.stringify(saved) !== JSON.stringify(snapshot)) throw new Error('Saved finalize plan changed')
  }
}

export async function restoreFinalizationPlan(env = process.env) {
  const name = planSnapshotName(env)
  assertVersion(env.ENGINE_VERSION, 'engine version')
  const plan = assertPlanSnapshot(await readReleaseAsset(`ci-release-${env.PREPARE_RUN_ID}`, name), env)
  if (env.RELEASE_PUBLISH === 'true') await assertReleaseOwner(plan, env)
  await writeJson('.release/plan.json', plan)
  return plan
}

export function testOssObject(plan, target, name, env = process.env) {
  if (plan.tag || env.RELEASE_PUBLISH === 'true' || !/^\d+$/.test(env.GITHUB_RUN_ID || '')) {
    throw new Error('Isolated OSS verification requires an unpublished branch candidate')
  }
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(name)) throw new Error('Invalid test artifact name')
  return `${products[target.edition].oss}/ci-release-tests/${env.GITHUB_RUN_ID}/${name}`
}

export function assertReleaseBinding(plan, binding, engineVersion, finalizeRunId) {
  if (
    binding.candidate !== plan.candidate ||
    binding.sha !== plan.sha ||
    binding.version !== plan.version ||
    binding.engineVersion !== engineVersion ||
    !/^\d+$/.test(finalizeRunId || '') ||
    binding.finalizeRunId !== finalizeRunId
  ) {
    throw new Error(
      'This release version is already bound to a different candidate, engine or finalize run; retry its original failed jobs',
    )
  }
}

async function assertReleaseOwner(plan, env) {
  assertReleaseBinding(
    plan,
    await readReleaseAsset(plan.tag, 'release-binding.json'),
    env.ENGINE_VERSION,
    env.GITHUB_RUN_ID,
  )
}

function assertPublicationState(plan, state, env, manifestSha256, status = 'publishing') {
  assertReleaseBinding(plan, state, env.ENGINE_VERSION, env.GITHUB_RUN_ID)
  if (
    state.schema !== 1 ||
    state.status !== status ||
    state.manifestSha256 !== manifestSha256 ||
    !/^[a-f0-9]{64}$/.test(manifestSha256 || '')
  )
    throw new Error('Publication state or manifest differs from the original finalize run')
}

async function assertReleaseWritable(plan, env, { release, manifestSha256 } = {}) {
  release ??= await ghJson(['release', 'view', plan.tag, '--json', 'isDraft,assets'])
  if (!release.isDraft) throw new Error('This software release is already public; prepare a new version')
  if (release.assets.some((asset) => asset.name === 'release-complete.json'))
    throw new Error('This software release is already completed; prepare a new version')
  if (!release.assets.some((asset) => asset.name === 'release-state.json')) return null
  const state = await readReleaseAsset(plan.tag, 'release-state.json')
  // Once promotion starts, installers are frozen. Only the original publish job
  // may resume a partial promotion, using exactly the same verified manifest.
  if (state.finalizeRunId === env.GITHUB_RUN_ID && manifestSha256) {
    assertPublicationState(plan, state, env, manifestSha256)
    return state
  }
  throw new Error('This software release is already publishing or completed; retry only its original publish job')
}

async function recoverPublicCompletion(plan, env, release, manifestSha256) {
  if (!plan.editions.some(isPublic)) throw new Error('Cannot recover a public release for private editions')
  const state = await readReleaseAsset(plan.tag, 'release-state.json')
  assertPublicationState(plan, state, env, manifestSha256)
  await readReleaseAsset(plan.tag, 'release-manifest.json')
  if ((await hashFile('.release/metadata/release-manifest.json')) !== manifestSha256)
    throw new Error('Public release manifest differs from this finalize run')
  if (release.assets.some((asset) => asset.name === 'release-complete.json')) {
    assertPublicationState(
      plan,
      await readReleaseAsset(plan.tag, 'release-complete.json'),
      env,
      manifestSha256,
      'complete',
    )
    return
  }
  // Recovery after publication may only add the missing marker. Installers,
  // manifests, update channels and GitHub latest must remain untouched.
  await writeJson('.release/release-complete.json', { ...state, status: 'complete' })
  await run('gh', ['release', 'upload', plan.tag, '.release/release-complete.json'])
}

export async function loadCandidate(env = process.env) {
  planSnapshotName(env)
  assertVersion(env.ENGINE_VERSION, 'engine version')
  const candidate = `ci-release-${env.PREPARE_RUN_ID}`
  const release = await ghJson(['release', 'view', candidate, '--json', 'isDraft'])
  if (!release.isDraft) throw new Error('Internal candidate must remain a draft')
  await mkdir('.release', { recursive: true })
  await run('gh', ['release', 'download', candidate, '--pattern', 'candidate.json', '--dir', '.release', '--clobber'])
  const plan = await readJson('.release/candidate.json')
  assertReady(plan, plan.prepared)
  const source = await ghJson(['api', `repos/${env.GITHUB_REPOSITORY}/actions/runs/${env.PREPARE_RUN_ID}`])
  assertSourceRun(plan, source, env.GITHUB_REPOSITORY)
  if (plan.candidate !== candidate) throw new Error('Candidate belongs to a different prepare run')
  if (env.RELEASE_TEST_OSS === 'true') {
    testOssObject(plan, plan.targets[0], 'preflight', env)
    if (!env.OSS_KEY_ID || !env.OSS_KEY_SECRET) throw new Error('Missing OSS test credentials')
  }
  if (env.RELEASE_PUBLISH === 'true') {
    if (!plan.tag)
      throw new Error('Only a candidate prepared from a release tag may be published; branch builds are dry runs')
    const commit = await ghJson(['api', `repos/${env.GITHUB_REPOSITORY}/commits/${plan.tag}`])
    if (commit.sha !== plan.sha) throw new Error('Release tag moved after preassembly')
    if (!env.OSS_KEY_ID || !env.OSS_KEY_SECRET) throw new Error('Missing OSS publishing credentials')
    let current
    try {
      current = await ghJson(['release', 'view', plan.tag, '--json', 'isDraft,assets'])
    } catch (error) {
      if (error.code !== 1) throw error
    }
    if (current) await assertReleaseWritable(plan, env, { release: current })
    if (!current)
      await run('gh', [
        'release',
        'create',
        plan.tag,
        '--verify-tag',
        '--draft',
        '--title',
        `Release ${plan.tag}`,
        '--notes',
        `Engine ${env.ENGINE_VERSION}; frontend ${plan.sha}`,
      ])
    const binding = {
      candidate: plan.candidate,
      sha: plan.sha,
      version: plan.version,
      engineVersion: env.ENGINE_VERSION,
      finalizeRunId: env.GITHUB_RUN_ID,
    }
    await writeJson('.release/release-binding.json', binding)
    try {
      // Asset creation is atomic. The first candidate reserves this software version;
      // another finalization cannot race its platform uploads, even before the publish job.
      await run('gh', ['release', 'upload', plan.tag, '.release/release-binding.json'])
    } catch (error) {
      if (error.code !== 1) throw error
      await run('gh', [
        'release',
        'download',
        plan.tag,
        '--pattern',
        'release-binding.json',
        '--dir',
        '.release/binding',
        '--clobber',
      ])
      assertReleaseBinding(
        plan,
        await readJson('.release/binding/release-binding.json'),
        env.ENGINE_VERSION,
        env.GITHUB_RUN_ID,
      )
    }
  }
  await writeJson('.release/plan.json', plan)
  await savePlanSnapshot(plan, env)
  await appendFile(
    env.GITHUB_OUTPUT,
    `matrix=${JSON.stringify({ include: plan.targets })}\nsha=${plan.sha}\nversion=${plan.version}\ncandidate=${plan.candidate}\n`,
  )
  return plan
}

export async function uploadResult(plan, target, env = process.env) {
  const receiptPath = `.release/result-${target.id}.json`
  const receipt = await readJson(receiptPath)
  const expected = artifactName(plan, target)
  const files = [expected]
  if (target.edition === 'yakitEE' && target.platform === 'linux' && target.legacy)
    files.push(expected.replace(/\.AppImage$/, '.run'))
  receipt.files = await Promise.all(
    files.map(async (name) => ({ name, sha256: await hashFile(path.join('.release/output', name)) })),
  )
  receipt.finalizeRunId = env.GITHUB_RUN_ID
  const result = `.release/result-${env.GITHUB_RUN_ID}-${target.id}.json`
  if (env.RELEASE_PUBLISH === 'true') {
    // A failed-job rerun can reuse a successful plan from before another run published.
    await assertReleaseWritable(plan, env)
    await assertReleaseOwner(plan, env)
    const uploads = files.map((name) =>
      uploadOss(path.join('.release/output', name), `${products[target.edition].oss}/${plan.version}/${name}`),
    )
    if (isPublic(target.edition))
      uploads.push(
        run('gh', [
          'release',
          'upload',
          plan.tag,
          ...files.map((name) => path.join('.release/output', name)),
          '--clobber',
        ]),
      )
    await Promise.all(uploads)
  } else {
    // A dry run keeps signed installers in the private candidate, never in the public release or OSS channels.
    await run('gh', [
      'release',
      'upload',
      plan.candidate,
      ...files.map((name) => path.join('.release/output', name)),
      '--clobber',
    ])
    if (env.RELEASE_TEST_OSS === 'true') {
      receipt.testObjects = await Promise.all(
        files.map(async (name) => {
          const object = testOssObject(plan, target, name, env)
          return { object, etag: await uploadOss(path.join('.release/output', name), object) }
        }),
      )
    }
  }
  await writeJson(result, receipt)
  await run('gh', ['release', 'upload', plan.candidate, result, '--clobber'])
}

export function assertResults(plan, results, env = process.env) {
  if (results.length !== plan.targets.length) throw new Error('Missing finalized targets')
  for (const target of plan.targets) {
    const matches = results.filter((item) => item.target === target.id)
    const result = matches[0]
    const names = [artifactName(plan, target)]
    if (target.edition === 'yakitEE' && target.platform === 'linux' && target.legacy)
      names.push(names[0].replace(/\.AppImage$/, '.run'))
    if (
      matches.length !== 1 ||
      result.sha !== plan.sha ||
      result.version !== plan.version ||
      result.finalizeRunId !== env.GITHUB_RUN_ID ||
      result.engine?.version !== env.ENGINE_VERSION ||
      !result.signed ||
      !/^[a-f0-9]{64}$/.test(result.engine?.sha256 || '') ||
      JSON.stringify(result.files?.map((file) => file.name)) !== JSON.stringify(names) ||
      result.files.some((file) => !/^[a-f0-9]{64}$/.test(file.sha256))
    )
      throw new Error(`Final verification failed: ${target.id}`)
    if (
      env.RELEASE_TEST_OSS === 'true' &&
      (JSON.stringify(result.testObjects?.map((item) => item.object)) !==
        JSON.stringify(names.map((name) => testOssObject(plan, target, name, env))) ||
        result.testObjects.some((item) => !/^[a-f0-9]{32}$/.test(item.etag)))
    )
      throw new Error(`OSS verification receipt missing: ${target.id}`)
  }
}

export async function complete(plan, env = process.env) {
  await run('gh', [
    'release',
    'download',
    plan.candidate,
    '--pattern',
    `result-${env.GITHUB_RUN_ID}-*.json`,
    '--dir',
    '.release/results',
    '--clobber',
  ])
  const results = await Promise.all(
    (await readdir('.release/results')).sort().map((file) => readJson(path.join('.release/results', file))),
  )
  assertResults(plan, results, env)
  await writeJson('.release/release-manifest.json', { ...plan, engineVersion: env.ENGINE_VERSION, results })
  if (env.RELEASE_PUBLISH !== 'true') {
    await run('gh', ['release', 'upload', plan.candidate, '.release/release-manifest.json', '--clobber'])
  }
  if (env.RELEASE_PUBLISH === 'true') {
    const manifestSha256 = await hashFile('.release/release-manifest.json')
    const release = await ghJson(['release', 'view', plan.tag, '--json', 'isDraft,assets'])
    // Check the durable upload owner even when a successful plan is reused.
    if (!release.isDraft) {
      await assertReleaseOwner(plan, env)
      await recoverPublicCompletion(plan, env, release, manifestSha256)
      await appendFile(
        env.GITHUB_STEP_SUMMARY,
        `## Published\n\nRecovered completion for ${plan.version}; installers and channels were not rewritten.\n`,
      )
      return
    }
    const previousState = await assertReleaseWritable(plan, env, { release, manifestSha256 })
    await assertReleaseOwner(plan, env)
    // The workflow holds the shared promotion lock across these reads and all
    // channel writes. A late older run must not replace a newer channel pointer.
    await assertChannelPromotion(plan)
    const publicRelease = plan.editions.some(isPublic)
    const markLatest = publicRelease && (await shouldMarkGitHubLatest(plan.version, env))
    const state = previousState || {
      schema: 1,
      status: 'publishing',
      candidate: plan.candidate,
      sha: plan.sha,
      version: plan.version,
      engineVersion: env.ENGINE_VERSION,
      finalizeRunId: env.GITHUB_RUN_ID,
      manifestSha256,
    }
    if (!previousState) {
      await writeJson('.release/release-state.json', state)
      // Reserve promotion before the first channel changes; never replace another owner.
      await run('gh', ['release', 'upload', plan.tag, '.release/release-state.json'])
    }
    await run('gh', ['release', 'upload', plan.tag, '.release/release-manifest.json', '--clobber'])
    // No channel is changed until every native package, signature, engine check and upload succeeded.
    for (const edition of plan.editions) {
      const file = `.release/latest-${edition}.txt`
      await writeFile(file, `${plan.version}\n`)
      await uploadOss(file, `${products[edition].oss}/latest/yakit-version.txt`)
    }
    if (publicRelease) await run('gh', ['release', 'edit', plan.tag, '--draft=false', `--latest=${markLatest}`])
    // EE-only releases remain private drafts and use this durable terminal state.
    // Keep the reservation immutable: --clobber deletes before uploading, which
    // could lose the only protection if the replacement upload failed.
    await writeJson('.release/release-complete.json', { ...state, status: 'complete' })
    await run('gh', ['release', 'upload', plan.tag, '.release/release-complete.json'])
  }
  await appendFile(
    env.GITHUB_STEP_SUMMARY,
    `## ${env.RELEASE_PUBLISH === 'true' ? 'Published' : 'Dry run passed'}\n\nFrontend: ${plan.version} (${plan.sha})\n\nEngine: ${env.ENGINE_VERSION}\n\nTargets: ${results.length}\n\nAll app.asar files were reused from the prepared candidate.\n`,
  )
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const command = process.argv[2]
  if (command === 'plan') await loadCandidate()
  else if (command === 'restore-plan') await restoreFinalizationPlan()
  else {
    const plan = await readJson('.release/plan.json')
    if (command === 'upload') await uploadResult(plan, targetFromEnv(plan))
    else if (command === 'complete') await complete(plan)
    else throw new Error('Usage: finalize.mjs plan|restore-plan|upload|complete')
  }
}
