const fs = require('fs')
const path = require('path')
const crypto = require('crypto')
const { execFileSync } = require('child_process')

const MAX_ASSET_SIZE = 2 * 1024 * 1024 * 1024

function flatName(name) {
  if (
    typeof name !== 'string' ||
    !name ||
    name === '.' ||
    name === '..' ||
    /[\\/:\x00-\x1f\x7f]/.test(name) ||
    /[. ]$/.test(name)
  )
    throw new Error('Unsafe asset filename')
  return name
}

function context(env) {
  const version = env.BUILD_VERSION
  const edition = env.BUILD_EDITION || 'memfit'
  if (!/^\d+\.\d+\.\d+-\d{4}$/.test(version || '')) throw new Error('Invalid build version')
  if (!/^[a-z][a-z0-9]*$/.test(edition)) throw new Error('Invalid build edition')
  if (!/^[\w.-]+\/[\w.-]+$/.test(env.GITHUB_REPOSITORY || '')) throw new Error('Invalid GitHub repository')
  if (!/^[a-f\d]{40}$/i.test(env.GITHUB_SHA || '')) throw new Error('A full commit SHA is required')
  if (!/^\d+$/.test(env.GITHUB_RUN_ID || '') || !/^\d+$/.test(env.GITHUB_RUN_ATTEMPT || ''))
    throw new Error('Invalid workflow run identity')
  const prefix = `ci-${edition}-${version}-${env.GITHUB_RUN_ID}-`
  const tag = env.BUILD_RELEASE_TAG || prefix + env.GITHUB_RUN_ATTEMPT
  // Re-running failed jobs retains the successful plan job's tag from an earlier attempt.
  const attempt = tag.startsWith(prefix) ? tag.slice(prefix.length) : ''
  if (!/^\d+$/.test(attempt) || BigInt(attempt) > BigInt(env.GITHUB_RUN_ATTEMPT))
    throw new Error('Release tag does not match the build plan')
  return { version, edition, tag, repo: env.GITHUB_REPOSITORY, sha: env.GITHUB_SHA, run: env.GITHUB_RUN_ID }
}

function matrix(env) {
  const include = JSON.parse(env.BUILD_MATRIX || '{}').include
  if (!Array.isArray(include) || !include.length) throw new Error('A nonempty build matrix is required')
  const ids = include.map((target) => {
    if (!/^(windows|linux|darwin)-(x64|arm64)(-legacy)?$/.test(target.id || '')) throw new Error('Invalid build target')
    return target.id
  })
  if (new Set(ids).size !== ids.length) throw new Error('Duplicate build targets')
  return include
}

function checkRelease(release, ctx, draftRequired = true) {
  if (
    !Number.isSafeInteger(release.id) ||
    release.tag_name !== ctx.tag ||
    release.target_commitish !== ctx.sha ||
    typeof release.draft !== 'boolean' ||
    release.prerelease !== true
  )
    throw new Error('Release identity does not match this workflow run')
  if (draftRequired && release.draft !== true) throw new Error('Refusing to overwrite a published release')
  return release
}

function createHelper({ env = process.env, cwd = process.cwd(), exec = execFileSync } = {}) {
  const ctx = context(env)
  function run(file, args, step) {
    try {
      return exec(file, args, {
        cwd,
        env,
        encoding: 'utf8',
        maxBuffer: 16 * 1024 * 1024,
        stdio: ['ignore', 'pipe', 'pipe'],
      })
    } catch (error) {
      // Child-process exceptions contain env/options and captured output. Never print them or chain them.
      const safe = new Error(`${step} failed${Number.isInteger(error.status) ? ' (exit ' + error.status + ')' : ''}`)
      safe.notFound = /(?:HTTP[ :]*404|\(HTTP 404\)|Not Found)/i.test(String(error.stderr || ''))
      throw safe
    }
  }
  function gh(args, step) {
    return run('gh', args, step)
  }
  function api(args, step) {
    return JSON.parse(gh(['api', ...args], step))
  }
  function getRelease() {
    try {
      return api([`repos/${ctx.repo}/releases/tags/${ctx.tag}`], 'Read release')
    } catch (error) {
      if (!error.notFound) throw error
      // Draft tags may not exist yet. Authenticated users with push access can list drafts.
      const pages = api(['--paginate', '--slurp', `repos/${ctx.repo}/releases?per_page=100`], 'Find draft release')
      return pages.flat().find((release) => release.tag_name === ctx.tag)
    }
  }
  function currentRelease(draftRequired = true) {
    if (env.BUILD_RELEASE_TAG !== ctx.tag) throw new Error('Release tag does not match the build plan')
    const release = getRelease()
    if (!release) throw new Error('Build release was not found')
    return checkRelease(release, ctx, draftRequired)
  }
  function create() {
    let release = getRelease()
    if (!release) {
      release = api(
        [
          '--method',
          'POST',
          `repos/${ctx.repo}/releases`,
          '-f',
          `tag_name=${ctx.tag}`,
          '-f',
          `target_commitish=${ctx.sha}`,
          '-f',
          `name=${ctx.edition} ${ctx.version} — build ${env.GITHUB_RUN_ID}.${env.GITHUB_RUN_ATTEMPT}`,
          '-f',
          `body=Native desktop packages from ${ctx.sha}. Workflow run: https://github.com/${ctx.repo}/actions/runs/${ctx.run}. Published only after every selected target passes validation.`,
          '-F',
          'draft=true',
          '-F',
          'prerelease=true',
          '-f',
          'make_latest=false',
        ],
        'Create draft release',
      )
    }
    checkRelease(release, ctx)
    // Draft html_url uses a temporary untagged URL that changes at publication.
    const url = `https://github.com/${ctx.repo}/releases/tag/${ctx.tag}`
    if (env.GITHUB_OUTPUT) fs.appendFileSync(env.GITHUB_OUTPUT, `release_tag=${ctx.tag}\nrelease_url=${url}\n`)
    console.log(`Build release: ${url}`)
    return release
  }
  function manifestNames(manifest, id) {
    if (
      manifest.version !== ctx.version ||
      manifest.target !== id ||
      manifest.commit !== ctx.sha ||
      String(manifest.run) !== ctx.run ||
      !Array.isArray(manifest.files) ||
      !manifest.files.length
    )
      throw new Error(`Build manifest identity mismatch: ${id}`)
    const names = manifest.files.map((file) => {
      flatName(file.name)
      if (
        !file.name.includes(`-${ctx.version}-`) ||
        !Number.isSafeInteger(file.size) ||
        file.size <= 0 ||
        file.size >= MAX_ASSET_SIZE ||
        !/^[a-f\d]{64}$/i.test(file.sha256 || '')
      )
        throw new Error(`Invalid build manifest file: ${id}`)
      return file.name
    })
    names.push(`build-${id}.json`)
    if (new Set(names.map((name) => name.toLowerCase())).size !== names.length)
      throw new Error('Duplicate package filenames')
    return names
  }
  function validateFiles(dir, manifest, id) {
    const names = manifestNames(manifest, id)
    for (const file of manifest.files) {
      const filename = path.join(dir, file.name)
      const stat = fs.lstatSync(filename)
      if (
        !stat.isFile() ||
        stat.size !== file.size ||
        crypto.createHash('sha256').update(fs.readFileSync(filename)).digest('hex') !== file.sha256
      )
        throw new Error(`Package checksum mismatch: ${file.name}`)
    }
    return names
  }
  function upload() {
    currentRelease()
    const id = env.BUILD_TARGET_ID
    if (!/^(windows|linux|darwin)-(x64|arm64)(-legacy)?$/.test(id || '')) throw new Error('Invalid build target')
    const dir = path.join(cwd, 'release', 'ci-artifacts')
    const manifest = JSON.parse(fs.readFileSync(path.join(dir, `build-${id}.json`), 'utf8'))
    const names = validateFiles(dir, manifest, id)
    if (fs.readdirSync(dir).sort().join('\n') !== [...names].sort().join('\n'))
      throw new Error('Unexpected files in target artifact directory')
    if (manifest.files.reduce((size, file) => size + file.size, 0) >= MAX_ASSET_SIZE)
      throw new Error('Target archive exceeds the 2 GiB release asset limit')
    const zip = new (require('adm-zip'))()
    for (const name of names) zip.addLocalFile(path.join(dir, name), '', name)
    const archive = path.join(cwd, 'release', `native-${id}.zip`)
    zip.writeZip(archive)
    if (fs.statSync(archive).size >= MAX_ASSET_SIZE) throw new Error('Release asset must be smaller than 2 GiB')
    gh(['release', 'upload', ctx.tag, archive, '--repo', ctx.repo, '--clobber'], `Upload ${id} packages`)
    return archive
  }
  function download() {
    currentRelease(false)
    const targets = matrix(env)
    const temp = fs.mkdtempSync(path.join(cwd, '.ci-release-download-'))
    const output = path.resolve(cwd, env.BUILD_ARTIFACT_DIR || 'packages')
    try {
      gh(
        ['release', 'download', ctx.tag, '--repo', ctx.repo, '--pattern', 'native-*.zip', '--dir', temp],
        'Download build archives',
      )
      const expected = targets.map((target) => `native-${target.id}.zip`).sort()
      if (fs.readdirSync(temp).sort().join('\n') !== expected.join('\n'))
        throw new Error('Downloaded archives do not exactly match the build matrix')
      const claimed = new Set()
      const plans = targets.map((target) => {
        const archive = path.join(temp, `native-${target.id}.zip`)
        if (!fs.lstatSync(archive).isFile() || fs.statSync(archive).size >= MAX_ASSET_SIZE)
          throw new Error('Invalid downloaded archive')
        const entries = run('unzip', ['-Z1', archive], 'Inspect build archive')
          .trimEnd()
          .split('\n')
          .map((name) => flatName(name.replace(/\r$/, '')))
        if (new Set(entries).size !== entries.length) throw new Error('Duplicate archive entries')
        const manifestName = `build-${target.id}.json`
        if (!entries.includes(manifestName)) throw new Error('Build archive is missing its manifest')
        const manifest = JSON.parse(run('unzip', ['-p', archive, manifestName], 'Read archive manifest'))
        const names = manifestNames(manifest, target.id)
        if (manifest.platform !== target.platform || manifest.arch !== target.arch || manifest.legacy !== target.legacy)
          throw new Error('Archive target does not match the build matrix')
        if ([...entries].sort().join('\n') !== [...names].sort().join('\n'))
          throw new Error('Unexpected archive entries')
        for (const name of names) {
          if (claimed.has(name.toLowerCase()) || fs.existsSync(path.join(output, name)))
            throw new Error('Archive would overwrite another package')
          claimed.add(name.toLowerCase())
        }
        return { target, archive, manifest, names }
      })
      // Preflight every archive before extracting anything. Use isolated directories and reject symlinks.
      for (const plan of plans) {
        const stage = path.join(temp, plan.target.id)
        fs.mkdirSync(stage)
        run('unzip', ['-q', plan.archive, '-d', stage], 'Extract build archive')
        for (const name of plan.names)
          if (!fs.lstatSync(path.join(stage, name)).isFile()) throw new Error('Archive entries must be regular files')
        validateFiles(stage, plan.manifest, plan.target.id)
      }
      fs.mkdirSync(output, { recursive: true })
      for (const plan of plans)
        for (const name of plan.names)
          fs.copyFileSync(path.join(temp, plan.target.id, name), path.join(output, name), fs.constants.COPYFILE_EXCL)
      return output
    } finally {
      fs.rmSync(temp, { recursive: true, force: true })
    }
  }
  function publish() {
    const release = currentRelease(false)
    // An immutable published release may be revisited on a retry, but never overwritten.
    if (release.draft === false) return release
    const dir = path.resolve(cwd, env.BUILD_ARTIFACT_DIR || 'packages')
    const versionFile = path.join(dir, 'build-version.txt')
    if (fs.readFileSync(versionFile, 'utf8').trim() !== ctx.version)
      throw new Error('Aggregated build version is missing or mismatched')
    for (const target of matrix(env)) {
      const manifest = JSON.parse(fs.readFileSync(path.join(dir, `build-${target.id}.json`), 'utf8'))
      validateFiles(dir, manifest, target.id)
      if (manifest.platform !== target.platform || manifest.arch !== target.arch || manifest.legacy !== target.legacy)
        throw new Error('Aggregated target does not match the build matrix')
    }
    gh(['release', 'upload', ctx.tag, versionFile, '--repo', ctx.repo, '--clobber'], 'Upload verified build version')
    return api(
      [
        '--method',
        'PATCH',
        `repos/${ctx.repo}/releases/${release.id}`,
        '-F',
        'draft=false',
        '-F',
        'prerelease=true',
        '-f',
        'make_latest=false',
      ],
      'Publish verified build release',
    )
  }
  return { create, upload, download, publish }
}

if (require.main === module) {
  try {
    const command = process.argv[2]
    if (!['create', 'upload', 'download', 'publish'].includes(command))
      throw new Error('Unknown release assets command')
    createHelper()[command]()
  } catch (error) {
    console.error(error.message)
    process.exitCode = 1
  }
}

module.exports = { createHelper, context, checkRelease, flatName }
