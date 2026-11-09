import { assertReleaseIdentity, assertVersion } from './model.mjs'
import { run } from './io.mjs'
import { setVersion } from './prepare.mjs'

// Only label the subcommand; arbitrary command arguments may contain credentials.
const git = (args, options) => run('git', args, { ...options, label: `git ${args[0]}` })

export async function main(product) {
  try {
    const [version, ...extra] = process.argv.slice(2)
    assertVersion(version, 'software version (without v or product suffix)')
    if (extra.length) throw new Error('Supply exactly one software version')
    // Retain Yarn's package-version checks without adding a runtime dependency.
    const [core, ...prerelease] = version.split('-')
    if (
      version.length > 256 ||
      core.split('.').some((part) => /^0\d/.test(part) || !Number.isSafeInteger(Number(part))) ||
      (prerelease.length &&
        prerelease
          .join('-')
          .split('.')
          .some((part) => !part || /^0\d+$/.test(part)))
    ) {
      throw new Error('Supply a valid package version without leading zeroes or empty identifiers')
    }
    const suffix = product === 'yakit' ? '' : `-${product}`
    const tag = `v${version}${suffix}`
    assertReleaseIdentity(tag, [product], version)
    if (/-(irify|memfit)$/.test(version)) throw new Error('The release command adds the product suffix')

    const root = await git(['rev-parse', '--show-toplevel'], { capture: true })
    process.chdir(root)
    if (await git(['status', '--porcelain'], { capture: true })) {
      throw new Error('Commit or stash local changes before preparing a release')
    }
    await git(['fetch', 'origin'])
    if (await git(['tag', '--list', tag], { capture: true })) {
      throw new Error(`Release tag already exists: ${tag}`)
    }
    // Also reject tags not fetched automatically (for example on another product branch).
    if (await git(['ls-remote', '--tags', 'origin', `refs/tags/${tag}`], { capture: true })) {
      throw new Error(`Release tag already exists on origin: ${tag}`)
    }
    const branch = `update/${product === 'yakit' ? '' : `${product}-`}pack-${version}`
    await git(['checkout', '-b', branch, 'origin/master'])
    await setVersion(version)
    await git(['add', '--', 'package.json'])
    // A separate version commit also avoids inheriting CI-skip text from the source commit.
    await git(['commit', '--allow-empty', '-m', `${product} Version To v${version}`])
    await git(['tag', tag])
    console.log(`\nCreated ${branch} and ${tag}. Push to start Prepare Release:\ngit push origin refs/tags/${tag}`)
    console.log(`To retain the version change on master, push ${branch} and merge it through a PR.`)
    console.log('After Prepare succeeds and the engine is released, run Finalize Release with the Prepare run ID.')
  } catch (error) {
    console.error(`Preparing ${product} release failed:`, error.message)
    process.exitCode = 1
  }
}
