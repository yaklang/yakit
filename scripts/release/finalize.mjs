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

const ghJson = async (args) => JSON.parse(await run('gh', args, { capture: true }))
const isPublic = (edition) => ['yakit', 'irify', 'memfit'].includes(edition)

export function testOssObject(plan, target, name, env = process.env) {
  if (plan.tag || env.RELEASE_PUBLISH === 'true' || !/^\d+$/.test(env.GITHUB_RUN_ID || '')) {
    throw new Error('Isolated OSS verification requires an unpublished branch candidate')
  }
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(name)) throw new Error('Invalid test artifact name')
  return `${products[target.edition].oss}/ci-release-tests/${env.GITHUB_RUN_ID}/${name}`
}

export function assertReleaseBinding(plan, binding, engineVersion) {
  if (
    binding.candidate !== plan.candidate ||
    binding.sha !== plan.sha ||
    binding.version !== plan.version ||
    binding.engineVersion !== engineVersion
  ) {
    throw new Error('This release version is already bound to a different candidate or engine')
  }
}

export async function loadCandidate(env = process.env) {
  if (!/^\d+$/.test(env.PREPARE_RUN_ID || '')) throw new Error('Supply a prepare workflow run ID')
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
      current = await ghJson(['release', 'view', plan.tag, '--json', 'isDraft'])
    } catch (error) {
      if (error.code !== 1) throw error
    }
    if (current && !current.isDraft) throw new Error('This software release is already public; prepare a new version')
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
      assertReleaseBinding(plan, await readJson('.release/binding/release-binding.json'), env.ENGINE_VERSION)
    }
  }
  await writeJson('.release/plan.json', plan)
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

async function complete(plan, env = process.env) {
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
    (await readdir('.release/results')).map((file) => readJson(path.join('.release/results', file))),
  )
  assertResults(plan, results, env)
  await writeJson('.release/release-manifest.json', { ...plan, engineVersion: env.ENGINE_VERSION, results })
  if (env.RELEASE_PUBLISH !== 'true') {
    await run('gh', ['release', 'upload', plan.candidate, '.release/release-manifest.json', '--clobber'])
  }
  if (env.RELEASE_PUBLISH === 'true') {
    await run('gh', ['release', 'upload', plan.tag, '.release/release-manifest.json', '--clobber'])
    // No channel is changed until every native package, signature, engine check and upload succeeded.
    for (const edition of plan.editions) {
      const file = `.release/latest-${edition}.txt`
      await writeFile(file, `${plan.version}\n`)
      await uploadOss(file, `${products[edition].oss}/latest/yakit-version.txt`)
    }
    if (plan.editions.some(isPublic)) await run('gh', ['release', 'edit', plan.tag, '--draft=false', '--latest'])
  }
  await appendFile(
    env.GITHUB_STEP_SUMMARY,
    `## ${env.RELEASE_PUBLISH === 'true' ? 'Published' : 'Dry run passed'}\n\nFrontend: ${plan.version} (${plan.sha})\n\nEngine: ${env.ENGINE_VERSION}\n\nTargets: ${results.length}\n\nAll app.asar files were reused from the prepared candidate.\n`,
  )
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const command = process.argv[2]
  if (command === 'plan') await loadCandidate()
  else {
    const plan = await readJson('.release/plan.json')
    if (command === 'upload') await uploadResult(plan, targetFromEnv(plan))
    else if (command === 'complete') await complete(plan)
    else throw new Error('Usage: finalize.mjs plan|upload|complete')
  }
}
