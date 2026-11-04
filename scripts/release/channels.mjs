import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { assertReleaseIdentity, assertVersion, products, releaseVersion } from './model.mjs'
import { uploadOss } from './oss.mjs'

// Compare numeric version fields without losing precision. Numeric prerelease
// identifiers sort before text, and a stable version sorts after its prereleases.
export function compareVersions(left, right) {
  const parse = (value) => {
    assertVersion(value)
    const [core, ...suffix] = value.split('-')
    const prerelease = suffix.length ? suffix.join('-').split('.') : []
    if (prerelease.some((part) => !/^[0-9A-Za-z-]+$/.test(part))) throw new Error(`Invalid version: ${value}`)
    return { core: core.split('.'), prerelease }
  }
  const a = parse(left)
  const b = parse(right)
  const compare = (x, y) => (x === y ? 0 : x > y ? 1 : -1)
  for (let index = 0; index < 3; index++) {
    const order = compare(BigInt(a.core[index]), BigInt(b.core[index]))
    if (order) return order
  }
  if (!a.prerelease.length || !b.prerelease.length)
    return compare(Number(!a.prerelease.length), Number(!b.prerelease.length))
  for (let index = 0; index < Math.max(a.prerelease.length, b.prerelease.length); index++) {
    if (index === a.prerelease.length) return -1
    if (index === b.prerelease.length) return 1
    const x = a.prerelease[index]
    const y = b.prerelease[index]
    const numericX = /^\d+$/.test(x)
    const numericY = /^\d+$/.test(y)
    const order =
      numericX && numericY ? compare(BigInt(x), BigInt(y)) : numericX !== numericY ? (numericX ? -1 : 1) : compare(x, y)
    if (order) return order
  }
  return 0
}

async function readChannel(url, headers = {}) {
  const response = await fetch(url, { headers, cache: 'no-store', signal: AbortSignal.timeout(30000) })
  if (response.status === 404) return null
  if (!response.ok) throw new Error(`Cannot read release channel: HTTP ${response.status}`)
  return response
}

// Call inside the shared release-channel-promotion job lock, before any remote
// writes. Check every edition first so a rejected EE promotion cannot change CE.
export async function assertChannelPromotion(plan) {
  assertReleaseIdentity(plan.tag, plan.editions, plan.version)
  compareVersions(plan.version, plan.version)
  await Promise.all(
    plan.editions.map(async (edition) => {
      const object = `${products[edition].oss}/latest/yakit-version.txt`
      // Read the bucket origin, not an accelerator/CDN that may serve stale latest.
      const response = await readChannel(`https://yaklang.oss-cn-beijing.aliyuncs.com/${object}`)
      if (response === null) return
      const current = (await response.text()).trim()
      if (compareVersions(plan.version, current) < 0)
        throw new Error(`Refusing channel downgrade for ${edition}: ${current} -> ${plan.version}`)
    }),
  )
}

export async function shouldMarkGitHubLatest(version, env = process.env) {
  const response = await readChannel(
    `${env.GITHUB_API_URL || 'https://api.github.com'}/repos/${env.GITHUB_REPOSITORY}/releases/latest`,
    { Accept: 'application/vnd.github+json', Authorization: `Bearer ${env.GH_TOKEN}` },
  )
  if (response === null) return true
  const release = await response.json()
  return compareVersions(version, releaseVersion(release.tag_name)) >= 0
}

// The legacy manual entry point uses the same identity and monotonicity guard.
// Its workflow must hold the same job lock as Finalize for this entire command.
export async function publishVersionTag(env = process.env) {
  if (env.GITHUB_REF_TYPE !== 'tag') throw new Error('Select a formal release tag')
  const edition = { ce: 'yakit', ee: 'yakitEE', irify: 'irify', irifyee: 'irifyEE', memfit: 'memfit' }[
    env.RELEASE_EDITION
  ]
  if (!edition) throw new Error('Select a supported product edition')
  const plan = { tag: env.GITHUB_REF_NAME, version: releaseVersion(env.GITHUB_REF_NAME), editions: [edition] }
  await assertChannelPromotion(plan)
  await mkdir('.release', { recursive: true })
  const file = `.release/latest-${edition}.txt`
  await writeFile(file, `${plan.version}\n`)
  await uploadOss(file, `${products[edition].oss}/latest/yakit-version.txt`)
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) await publishVersionTag()
