const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('fs')
const os = require('os')
const path = require('path')
const crypto = require('crypto')
const { execFileSync } = require('child_process')
const AdmZip = require('adm-zip')
const { createHelper, context, flatName } = require('../ci-release-assets')

const target = { id: 'linux-x64', platform: 'linux', arch: 'x64', legacy: false }
function fixture(t, inheritedEnv = process.env) {
  const cwd = fs.mkdtempSync(path.join(os.tmpdir(), 'release-assets-test-'))
  t.after(() => fs.rmSync(cwd, { recursive: true, force: true }))
  const env = {
    ...inheritedEnv,
    BUILD_VERSION: '1.4.8-1008',
    BUILD_EDITION: 'memfit',
    GITHUB_REPOSITORY: 'why-2018/AISenso',
    GITHUB_SHA: 'a'.repeat(40),
    GITHUB_RUN_ID: '123456',
    GITHUB_RUN_ATTEMPT: '1',
    BUILD_TARGET_ID: target.id,
    BUILD_MATRIX: JSON.stringify({ include: [target] }),
    BUILD_RELEASE_TAG: undefined,
    BUILD_ARTIFACT_DIR: undefined,
    GITHUB_OUTPUT: path.join(cwd, 'github-output'),
  }
  env.BUILD_RELEASE_TAG = context(env).tag
  const release = {
    id: 42,
    tag_name: env.BUILD_RELEASE_TAG,
    target_commitish: env.GITHUB_SHA,
    draft: true,
    prerelease: true,
    html_url: 'https://github.com/why-2018/AISenso/releases/tag/' + env.BUILD_RELEASE_TAG,
  }
  const name = 'AI Senso-1.4.8-1008-linux-amd64.AppImage'
  const data = Buffer.from('a native installation package')
  const manifest = {
    version: env.BUILD_VERSION,
    target: target.id,
    platform: target.platform,
    arch: target.arch,
    legacy: false,
    commit: env.GITHUB_SHA,
    run: env.GITHUB_RUN_ID,
    files: [{ name, size: data.length, sha256: crypto.createHash('sha256').update(data).digest('hex') }],
  }
  const calls = []
  const exec = (file, args, options) => {
    calls.push({ file, args, options })
    assert.equal(file, 'gh')
    if (args[0] === 'api') return JSON.stringify(release)
    return ''
  }
  function writePackages(dir = 'release/ci-artifacts') {
    const root = path.join(cwd, dir)
    fs.mkdirSync(root, { recursive: true })
    fs.writeFileSync(path.join(root, name), data)
    fs.writeFileSync(path.join(root, 'build-linux-x64.json'), JSON.stringify(manifest))
    return root
  }
  function archive() {
    const zip = new AdmZip()
    zip.addFile(name, data)
    zip.addFile('build-linux-x64.json', Buffer.from(JSON.stringify(manifest)))
    return zip.toBuffer()
  }
  return { cwd, env, release, name, manifest, calls, exec, writePackages, archive }
}

test('fixtures isolate their release identity and package directory from a real CI environment', (t) => {
  const inheritedEnv = {
    ...process.env,
    BUILD_RELEASE_TAG: 'ci-memfit-1.4.8-1008-37761366144-1',
    GITHUB_RUN_ID: '37761366144',
    GITHUB_RUN_ATTEMPT: '1',
    BUILD_ARTIFACT_DIR: 'ci-collection-directory',
  }
  const f = fixture(t, inheritedEnv)
  assert.equal(f.env.BUILD_RELEASE_TAG, 'ci-memfit-1.4.8-1008-123456-1')
  assert.equal(f.env.BUILD_ARTIFACT_DIR, undefined)
  assert.equal(inheritedEnv.BUILD_RELEASE_TAG, 'ci-memfit-1.4.8-1008-37761366144-1')
  createHelper(f).create()
  assert.equal(f.calls.length, 1)
})

test('release tags are unique per run/attempt and failed-job retries accept the original plan tag', (t) => {
  const f = fixture(t)
  assert.equal(context(f.env).tag, 'ci-memfit-1.4.8-1008-123456-1')
  assert.equal(
    context({ ...f.env, BUILD_RELEASE_TAG: undefined, GITHUB_RUN_ATTEMPT: '2' }).tag,
    'ci-memfit-1.4.8-1008-123456-2',
  )
  assert.equal(context({ ...f.env, GITHUB_RUN_ATTEMPT: '2' }).tag, f.env.BUILD_RELEASE_TAG)
  assert.throws(() => context({ ...f.env, BUILD_RELEASE_TAG: 'ci-memfit-1.4.8-1008-999-1' }), /build plan/)
  assert.throws(() => context({ ...f.env, BUILD_RELEASE_TAG: 'ci-memfit-1.4.8-1008-123456-2' }), /build plan/)
  assert.throws(() => context({ ...f.env, GITHUB_SHA: 'abc' }), /full commit SHA/)
})

test('create reuses an identical draft without a second mutation and emits the tag and URL', (t) => {
  const f = fixture(t)
  f.release.html_url = 'https://github.com/why-2018/AISenso/releases/untagged-deadbeef'
  createHelper(f).create()
  assert.equal(f.calls.length, 1)
  assert.match(
    fs.readFileSync(f.env.GITHUB_OUTPUT, 'utf8'),
    /release_tag=ci-memfit-1.4.8-1008-123456-1\nrelease_url=https:\/\/github\.com\/why-2018\/AISenso\/releases\/tag\/ci-memfit-1.4.8-1008-123456-1\n/,
  )
})

test('draft lookup falls back to paginated release listings and create binds SHA without latest promotion', (t) => {
  const f = fixture(t)
  const calls = []
  const exec = (file, args) => {
    calls.push(args)
    if (args.some((arg) => arg.includes('/releases/tags/')))
      throw Object.assign(new Error('hidden'), { status: 1, stderr: 'gh: Not Found (HTTP 404)' })
    if (args.includes('--slurp')) return '[[],[]]'
    return JSON.stringify(f.release)
  }
  createHelper({ ...f, exec }).create()
  assert.equal(calls.length, 3)
  assert.ok(calls[1].includes('--paginate'))
  assert.ok(calls[2].includes('target_commitish=' + f.env.GITHUB_SHA))
  assert.ok(calls[2].includes('draft=true'))
  assert.ok(calls[2].includes('prerelease=true'))
  assert.ok(calls[2].includes('make_latest=false'))
  calls.length = 0
  createHelper({
    ...f,
    exec(file, args) {
      if (args.includes('--slurp')) return JSON.stringify([[], [f.release]])
      return exec(file, args)
    },
  }).create()
  assert.equal(calls.length, 1)
})

test('wrong commit and published release are rejected before upload or overwrite', (t) => {
  const f = fixture(t)
  f.release.target_commitish = 'b'.repeat(40)
  assert.throws(() => createHelper(f).upload(), /identity/)
  f.release.target_commitish = f.env.GITHUB_SHA
  f.release.draft = false
  assert.throws(() => createHelper(f).upload(), /published release/)
  assert.equal(f.calls.filter((call) => call.args[0] === 'release').length, 0)
})

test('upload produces one flat target ZIP and preserves spaces in the original installer name', (t) => {
  const f = fixture(t)
  f.writePackages()
  const filename = createHelper(f).upload()
  assert.equal(path.basename(filename), 'native-linux-x64.zip')
  const zip = new AdmZip(filename)
  assert.deepEqual(
    zip
      .getEntries()
      .map((entry) => entry.entryName)
      .sort(),
    [f.name, 'build-linux-x64.json'].sort(),
  )
  const upload = f.calls.find((call) => call.args[0] === 'release')
  assert.ok(upload.args.includes('--clobber'))
  assert.equal(upload.args[3], filename)
  assert.ok(!upload.args.includes(f.name))
  assert.equal(upload.options.shell, undefined)
})

test('unsafe names, unexpected files and bad checksums fail before uploading', (t) => {
  const f = fixture(t)
  const root = f.writePackages()
  fs.writeFileSync(path.join(root, 'unexpected'), 'file')
  assert.throws(() => createHelper(f).upload(), /Unexpected files/)
  fs.unlinkSync(path.join(root, 'unexpected'))
  fs.writeFileSync(path.join(root, f.name), 'tampered')
  assert.throws(() => createHelper(f).upload(), /checksum/)
  for (const name of ['../bad', '..\\bad', 'dir/file', 'C:bad', '/absolute', 'bad\nname', 'trailing ', '.', '..'])
    assert.throws(() => flatName(name), /Unsafe/)
  assert.equal(f.calls.filter((call) => call.args[0] === 'release').length, 0)
})

test('publish refuses unaggregated or altered packages and checks every target before publishing', (t) => {
  const f = fixture(t)
  const dir = f.writePackages('packages')
  assert.throws(() => createHelper(f).publish(), /ENOENT/)
  fs.writeFileSync(path.join(dir, 'build-version.txt'), '1.4.8-9999\n')
  assert.throws(() => createHelper(f).publish(), /build version/)
  fs.writeFileSync(path.join(dir, 'build-version.txt'), f.env.BUILD_VERSION + '\n')
  fs.writeFileSync(path.join(dir, f.name), 'tampered')
  assert.throws(() => createHelper(f).publish(), /checksum/)
  assert.equal(f.calls.filter((call) => call.args.includes('PATCH')).length, 0)
})

test('publish uploads the aggregate marker then creates a prerelease without latest promotion', (t) => {
  const f = fixture(t)
  const dir = f.writePackages('packages')
  fs.writeFileSync(path.join(dir, 'build-version.txt'), f.env.BUILD_VERSION + '\n')
  createHelper(f).publish()
  const mutations = f.calls.slice(1)
  assert.equal(mutations.length, 2)
  assert.equal(mutations[0].args[3], path.join(dir, 'build-version.txt'))
  assert.ok(mutations[1].args.includes('PATCH'))
  assert.ok(mutations[1].args.includes('draft=false'))
  assert.ok(mutations[1].args.includes('prerelease=true'))
  assert.ok(mutations[1].args.includes('make_latest=false'))
})

test('already published immutable releases are verified read-only without requiring local packages', (t) => {
  const f = fixture(t)
  f.release.draft = false
  f.release.immutable = true
  assert.equal(createHelper(f).publish().id, 42)
  assert.equal(f.calls.length, 1)
  f.release.target_commitish = 'b'.repeat(40)
  assert.throws(() => createHelper(f).publish(), /identity/)
})

const unzip = process.platform === 'win32' ? 'C:/Program Files/Git/usr/bin/unzip.exe' : 'unzip'
test('download checks real ZIPs and safely collects filenames with spaces without root dependencies', (t) => {
  const f = fixture(t)
  const exec = (file, args, options) => {
    if (file === 'unzip') return execFileSync(unzip, args, options)
    if (args[0] === 'api') return JSON.stringify(f.release)
    const dir = args[args.indexOf('--dir') + 1]
    fs.writeFileSync(path.join(dir, 'native-linux-x64.zip'), f.archive())
    return ''
  }
  const output = createHelper({ ...f, exec }).download()
  assert.ok(fs.existsSync(path.join(output, f.name)))
  assert.equal(fs.readdirSync(f.cwd).filter((name) => name.startsWith('.ci-release-download-')).length, 0)
})

test('download rejects missing/extra matrix archives and unsafe entries before any extraction', (t) => {
  const f = fixture(t)
  let extraction = false
  let extra = true
  const exec = (file, args) => {
    if (file === 'gh' && args[0] === 'api') return JSON.stringify(f.release)
    if (file === 'gh') {
      const dir = args[args.indexOf('--dir') + 1]
      fs.writeFileSync(path.join(dir, extra ? 'native-linux-arm64.zip' : 'native-linux-x64.zip'), f.archive())
      return ''
    }
    if (args[0] === '-Z1') return '../escape\nbuild-linux-x64.json\n'
    extraction = true
    return ''
  }
  assert.throws(() => createHelper({ ...f, exec }).download(), /build matrix/)
  extra = false
  assert.throws(() => createHelper({ ...f, exec }).download(), /Unsafe asset filename/)
  assert.equal(extraction, false)
  assert.equal(fs.existsSync(path.join(f.cwd, 'escape')), false)
})

test('download refuses to overwrite a package already present in the collection directory', (t) => {
  const f = fixture(t)
  f.writePackages('packages')
  let extracted = false
  const exec = (file, args, options) => {
    if (file === 'unzip') {
      if (args[0] === '-q') extracted = true
      return execFileSync(unzip, args, options)
    }
    if (args[0] === 'api') return JSON.stringify(f.release)
    fs.writeFileSync(path.join(args[args.indexOf('--dir') + 1], 'native-linux-x64.zip'), f.archive())
    return ''
  }
  assert.throws(() => createHelper({ ...f, exec }).download(), /overwrite another package/)
  assert.equal(extracted, false)
})

test('CLI errors retain the failing step without disclosing tokens or child output', (t) => {
  const f = fixture(t)
  const secret = 'a-secret-token-that-must-stay-private'
  const exec = () => {
    throw Object.assign(new Error(secret), { status: 1, stderr: secret, stdout: secret })
  }
  assert.throws(
    () => createHelper({ ...f, exec }).create(),
    (error) => {
      assert.match(error.message, /Read release failed \(exit 1\)/)
      assert.ok(!String(error.stack).includes(secret))
      return true
    },
  )
})
