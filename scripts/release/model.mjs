import { createHash } from 'node:crypto'
import { readFile, writeFile } from 'node:fs/promises'

export const products = {
  yakit: { name: 'Yakit', oss: 'yak' },
  yakitEE: { name: 'EnpriTrace', oss: 'vip' },
  irify: { name: 'IRify', oss: 'irify' },
  irifyEE: { name: 'IRifyEnpriTrace', oss: 'svip' },
  memfit: { name: 'Memfit AI', artifact: 'MemfitAI', oss: 'memfit' },
}

export const platforms = [
  { platform: 'win32', arch: 'x64', runner: 'windows-2022' },
  { platform: 'linux', arch: 'x64', runner: 'ubuntu-24.04' },
  { platform: 'linux', arch: 'arm64', runner: 'ubuntu-24.04-arm' },
  { platform: 'darwin', arch: 'x64', runner: 'macos-15-intel' },
  { platform: 'darwin', arch: 'arm64', runner: 'macos-15' },
]

export function assertVersion(value, label = 'version') {
  if (!/^\d+\.\d+\.\d+(?:-[0-9A-Za-z][0-9A-Za-z.-]*)?$/.test(value || '')) {
    throw new Error(`Invalid ${label}: supply an explicit version, never latest or a URL`)
  }
  return value
}

export function releaseVersion(tag) {
  return assertVersion(tag.replace(/^v/, '').replace(/-(irify|memfit)$/, ''), 'release version')
}

export function assertReleaseIdentity(tag, editions, version) {
  assertVersion(version, 'release version')
  const suffix = /-(irify|memfit)$/.exec(tag)?.[0] || ''
  const allowed = suffix === '-irify' ? ['irify', 'irifyEE'] : suffix === '-memfit' ? ['memfit'] : ['yakit', 'yakitEE']
  // One canonical tag must own each product/version OSS directory. A different
  // product's tag must not bypass the release binding for the same installers.
  if (
    tag !== `v${version}${suffix}` ||
    /-render$/.test(tag) ||
    !editions.length ||
    editions.some((edition) => !allowed.includes(edition))
  ) {
    throw new Error('Release tag must match the canonical tag and selected product editions')
  }
}

export function createPlan({ editions, version, sha, runId, repository, ref, refType }) {
  assertVersion(version)
  if (!/^[a-f0-9]{40}$/.test(sha || '')) throw new Error('Invalid source commit')
  if (!/^\d+$/.test(String(runId))) throw new Error('Invalid prepare run ID')
  const selected = editions.split(',')
  if (
    !selected.length ||
    new Set(selected).size !== selected.length ||
    selected.some((edition) => !products[edition])
  ) {
    throw new Error('Select supported, unique editions')
  }
  if (refType === 'tag') assertReleaseIdentity(ref, selected, version)
  const targets = selected.flatMap((edition) =>
    platforms.flatMap((platform) =>
      [false, true].map((legacy) => ({
        ...platform,
        edition,
        legacy,
        electronVersion: legacy ? '22.3.27' : '27.0.0',
        id: `${edition}-${platform.platform}-${platform.arch}-${legacy ? 'legacy' : 'normal'}`,
      })),
    ),
  )
  return {
    schema: 1,
    version,
    sha,
    runId: String(runId),
    repository,
    tag: refType === 'tag' ? ref : null,
    candidate: `ci-release-${runId}`,
    editions: selected,
    targets,
  }
}

export function assertPlan(plan) {
  const expected = createPlan({
    editions: plan.editions.join(','),
    version: plan.version,
    sha: plan.sha,
    runId: plan.runId,
    repository: plan.repository,
    ref: plan.tag,
    refType: plan.tag ? 'tag' : 'branch',
  })
  if (plan.schema !== 1 || JSON.stringify(plan.targets) !== JSON.stringify(expected.targets)) {
    throw new Error('Candidate target matrix does not match the supported release matrix')
  }
  if (plan.candidate !== expected.candidate) throw new Error('Candidate ID differs from prepare run')
  return plan
}

export function targetFromEnv(plan, env = process.env) {
  const target = plan.targets.find((item) => item.id === env.RELEASE_TARGET)
  if (!target) throw new Error('Target is not part of the prepared candidate')
  return target
}

export function artifactName(plan, target) {
  const product = products[target.edition]
  const platform = { win32: 'windows', darwin: 'darwin', linux: 'linux' }[target.platform]
  const arch = target.platform === 'darwin' ? target.arch : target.arch.replace('x64', 'amd64')
  const extension = { win32: 'exe', darwin: 'dmg', linux: 'AppImage' }[target.platform]
  return `${product.artifact || product.name}-${plan.version}-${platform}${target.legacy ? '-legacy' : ''}-${arch}.${extension}`
}

export const readJson = async (file) => JSON.parse(await readFile(file, 'utf8'))
export const writeJson = async (file, data) => writeFile(file, JSON.stringify(data, null, 2) + '\n')
export const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex')

export function assertReady(plan, descriptors) {
  assertPlan(plan)
  if (descriptors.length !== plan.targets.length) throw new Error('Candidate is missing prepared targets')
  for (const target of plan.targets) {
    const matches = descriptors.filter((item) => item.target === target.id)
    if (
      matches.length !== 1 ||
      matches[0].sha !== plan.sha ||
      matches[0].version !== plan.version ||
      !/^[a-f0-9]{64}$/.test(matches[0].sha256 || '')
    ) {
      throw new Error(`Invalid or missing prepared target: ${target.id}`)
    }
  }
  return { ...plan, prepared: descriptors }
}

export function assertSourceRun(plan, run, repository) {
  assertPlan(plan)
  if (
    plan.repository !== repository ||
    String(run.id) !== plan.runId ||
    run.head_sha !== plan.sha ||
    run.conclusion !== 'success' ||
    run.status !== 'completed' ||
    !['push', 'workflow_dispatch'].includes(run.event) ||
    !/^\.github\/workflows\/(build-multi-(prod|irify-prod|memfit-prod)|release-prepare)\.yml(?:@.*)?$/.test(
      run.path || '',
    )
  ) {
    throw new Error('Candidate must come from a successful prepare workflow in this repository')
  }
}
