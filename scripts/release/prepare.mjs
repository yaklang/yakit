import { appendFile, mkdir, readdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { assertReady, createPlan, readJson, releaseVersion, writeJson } from './model.mjs'
import { run } from './io.mjs'

export async function setVersion(version) {
  const manifest = await readJson('package.json')
  manifest.version = version
  await writeJson('package.json', manifest)
}

export async function createReleasePlan(env = process.env) {
  const manifest = await readJson('package.json')
  const plan = createPlan({
    editions: env.RELEASE_EDITIONS || 'yakit,yakitEE',
    version:
      env.RELEASE_VERSION || (env.GITHUB_REF_TYPE === 'tag' ? releaseVersion(env.GITHUB_REF_NAME) : manifest.version),
    sha: env.SOURCE_SHA || env.GITHUB_SHA,
    runId: env.GITHUB_RUN_ID,
    repository: env.GITHUB_REPOSITORY,
    ref: env.GITHUB_REF_NAME,
    refType: env.GITHUB_REF_TYPE,
  })
  await mkdir('.release', { recursive: true })
  await writeJson('.release/plan.json', plan)
  if (env.GITHUB_OUTPUT) {
    await appendFile(
      env.GITHUB_OUTPUT,
      `matrix=${JSON.stringify({ include: plan.targets })}\neditions=${JSON.stringify(plan.editions)}\nversion=${plan.version}\ncandidate=${plan.candidate}\n`,
    )
  }
  return plan
}

async function initCandidate(plan) {
  let existing
  try {
    existing = JSON.parse(
      await run('gh', ['release', 'view', plan.candidate, '--json', 'isDraft,targetCommitish'], { capture: true }),
    )
  } catch (error) {
    if (error.code !== 1) throw error
  }
  if (existing) {
    if (!existing.isDraft || existing.targetCommitish !== plan.sha)
      throw new Error('Candidate release identity changed')
    return
  }
  await writeFile(
    '.release/notes.md',
    `Prepared ${plan.editions.join(', ')} ${plan.version}\n\nSource: ${plan.sha}\n\nWaiting for preassembly. Do not publish this internal draft.\n`,
  )
  await run('gh', [
    'release',
    'create',
    plan.candidate,
    '--draft',
    '--target',
    plan.sha,
    '--title',
    `CI candidate ${plan.runId} · ${plan.version}`,
    '--notes-file',
    '.release/notes.md',
  ])
}

async function sealCandidate(plan) {
  await run('gh', [
    'release',
    'download',
    plan.candidate,
    '--pattern',
    'prepared-*.json',
    '--dir',
    '.release/descriptors',
    '--clobber',
  ])
  const descriptors = await Promise.all(
    (await readdir('.release/descriptors')).map((file) => readJson(path.join('.release/descriptors', file))),
  )
  const candidate = assertReady(plan, descriptors)
  await writeJson('.release/candidate.json', candidate)
  // This is the readiness marker: it is only written after every matrix job succeeds.
  await run('gh', ['release', 'upload', plan.candidate, '.release/candidate.json', '--clobber'])
  await appendFile(
    process.env.GITHUB_STEP_SUMMARY,
    `## Frontend is ready\n\nCandidate: **${plan.runId}**\n\nVersion: ${plan.version}\n\nCommit: ${plan.sha}\n\nRun **Finalize Release** with this prepare run ID and an explicit released engine version. All ${plan.targets.length} targets are preassembled; no runner waits for the backend.\n`,
  )
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const command = process.argv[2]
  if (command === 'plan') await createReleasePlan()
  else if (command === 'version') await setVersion(process.env.RELEASE_VERSION)
  else if (command === 'init') await initCandidate(await readJson('.release/plan.json'))
  else if (command === 'seal') await sealCandidate(await readJson('.release/plan.json'))
  else throw new Error('Usage: prepare.mjs plan|version|init|seal')
}
