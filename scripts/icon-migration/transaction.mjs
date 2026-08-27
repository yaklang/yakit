import crypto from 'node:crypto'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

export const SCHEMA_VERSION = 'icon-migration-transaction/v2'
export const TOOL_VERSION = '1.1.0'

const sha256 = (value) => crypto.createHash('sha256').update(value).digest('hex')
const normalizePath = (value) => value.split(path.sep).join('/')
const readJson = (file) => JSON.parse(fs.readFileSync(file, 'utf8'))
const writeJson = (file, value) => {
  fs.mkdirSync(path.dirname(file), { recursive: true })
  fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`)
}

const hashDirectory = (directory) => {
  const entries = []
  const visit = (current) => {
    for (const name of fs.readdirSync(current).sort()) {
      const absolute = path.join(current, name)
      const relative = normalizePath(path.relative(directory, absolute))
      const stat = fs.statSync(absolute)
      if (stat.isDirectory()) visit(absolute)
      else entries.push({ path: relative, mode: stat.mode & 0o777, sha256: sha256(fs.readFileSync(absolute)) })
    }
  }
  visit(directory)
  return sha256(JSON.stringify(entries))
}

const runGit = (repoRoot, args, options = {}) =>
  execFileSync('git', args, {
    cwd: repoRoot,
    encoding: options.encoding === null ? null : 'utf8',
    maxBuffer: 64 * 1024 * 1024,
    stdio: options.stdio || ['ignore', 'pipe', 'pipe'],
  })

const gitText = (repoRoot, args) => runGit(repoRoot, args).trim()
const rawStatus = (repoRoot, files = null, exclude = false) => {
  const pathspec = files
    ? exclude
      ? ['.', ...files.map((file) => `:(exclude,literal)${file}`)]
      : files.map((file) => `:(literal)${file}`)
    : []
  return runGit(
    repoRoot,
    ['status', '--porcelain=v2', '-z', '--untracked-files=all', ...(pathspec.length ? ['--', ...pathspec] : [])],
    { encoding: null },
  )
}

const statusSnapshot = (repoRoot, files, transactionOutputs = []) => ({
  all: sha256(rawStatus(repoRoot)),
  scoped: sha256(rawStatus(repoRoot, files)),
  external: sha256(rawStatus(repoRoot, [...files, ...transactionOutputs], true)),
})

const repositoryRelativePaths = (repoRoot, values) => [
  ...new Set(
    values
      .map((value) => path.resolve(value))
      .filter((absolute) => absolute === repoRoot || absolute.startsWith(`${repoRoot}${path.sep}`))
      .map((absolute) => normalizePath(path.relative(repoRoot, absolute)))
      .filter(Boolean),
  ),
]

const assertRelativeFile = (repoRoot, value) => {
  const normalized = normalizePath(path.posix.normalize(normalizePath(value).trim()))
  if (!normalized || normalized === '.' || normalized.startsWith('../') || path.posix.isAbsolute(normalized)) {
    throw new Error(`unsafe transaction path: ${value}`)
  }
  const absolute = path.resolve(repoRoot, normalized)
  if (absolute !== repoRoot && !absolute.startsWith(`${repoRoot}${path.sep}`)) {
    throw new Error(`transaction path escapes repository: ${value}`)
  }
  let parent = path.dirname(absolute)
  while (parent !== repoRoot && !fs.existsSync(parent)) parent = path.dirname(parent)
  if (fs.existsSync(parent)) {
    const realRepository = fs.realpathSync(repoRoot)
    const realParent = fs.realpathSync(parent)
    if (realParent !== realRepository && !realParent.startsWith(`${realRepository}${path.sep}`)) {
      throw new Error(`transaction path crosses a symlink outside the repository: ${value}`)
    }
  }
  if (fs.existsSync(absolute) && fs.lstatSync(absolute).isSymbolicLink()) {
    throw new Error(`transaction path is a symlink: ${value}`)
  }
  return normalized
}

const fileFingerprint = (repoRoot, relative) => {
  const absolute = path.resolve(repoRoot, relative)
  if (!fs.existsSync(absolute)) return { exists: false, sha256: null, size: 0, mode: null }
  const stat = fs.statSync(absolute)
  if (!stat.isFile()) throw new Error(`transaction scope is not a regular file: ${relative}`)
  const bytes = fs.readFileSync(absolute)
  return {
    exists: true,
    sha256: sha256(bytes),
    size: bytes.length,
    mode: stat.mode & 0o777,
  }
}

const fingerprints = (repoRoot, files) =>
  Object.fromEntries(files.map((file) => [file, fileFingerprint(repoRoot, file)]))

const sameFingerprint = (left, right) =>
  left?.exists === right?.exists &&
  left?.sha256 === right?.sha256 &&
  left?.size === right?.size &&
  left?.mode === right?.mode

const assertFingerprints = (repoRoot, expected, label) => {
  const mismatches = []
  for (const [file, fingerprint] of Object.entries(expected)) {
    const actual = fileFingerprint(repoRoot, file)
    if (!sameFingerprint(actual, fingerprint)) mismatches.push({ file, expected: fingerprint, actual })
  }
  if (mismatches.length) {
    const error = new Error(`${label} file hash/status mismatch: ${mismatches.map((row) => row.file).join(', ')}`)
    error.details = mismatches
    throw error
  }
}

const patchPaths = (patch) => {
  if (/^GIT binary patch$/m.test(patch) || /^Binary files /m.test(patch)) {
    throw new Error('binary patches are not supported by scoped icon transactions')
  }
  if (/^(?:rename|copy) (?:from|to) /m.test(patch)) {
    throw new Error('rename/copy patches are not supported; use explicit delete/create paths')
  }
  const result = new Set()
  for (const match of patch.matchAll(/^diff --git [ab]\/(.+) [ab]\/(.+)$/gm)) {
    result.add(match[1])
    result.add(match[2])
  }
  if (!result.size) throw new Error('forward patch has no diff --git file headers')
  return [...result].sort()
}

const copyFileState = (fromRoot, toRoot, files) => {
  for (const file of files) {
    const source = path.resolve(fromRoot, file)
    if (!fs.existsSync(source)) continue
    const target = path.resolve(toRoot, file)
    fs.mkdirSync(path.dirname(target), { recursive: true })
    fs.copyFileSync(source, target)
    fs.chmodSync(target, fs.statSync(source).mode & 0o777)
  }
}

const artifactPaths = (manifestFile) => {
  const extension = path.extname(manifestFile)
  const base = extension ? manifestFile.slice(0, -extension.length) : manifestFile
  return {
    forward_patch: `${base}.forward.patch`,
    reverse_patch: `${base}.reverse.patch`,
    preimages: `${base}.preimages`,
    postimages: `${base}.postimages`,
    rollback_log: `${base}.rollback.jsonl`,
  }
}

const saveImages = (repoRoot, destination, files) => {
  fs.rmSync(destination, { recursive: true, force: true })
  fs.mkdirSync(destination, { recursive: true })
  copyFileState(repoRoot, destination, files)
  const absent = files.filter((file) => !fs.existsSync(path.resolve(repoRoot, file)))
  writeJson(path.join(destination, '.absent.json'), absent)
}

const derivePatches = (repoRoot, files, suppliedPatch) => {
  const temporaryRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'yakit-icon-transaction-'))
  try {
    runGit(temporaryRoot, ['init', '-q'])
    runGit(temporaryRoot, ['config', 'user.email', 'icon-transaction@example.invalid'])
    runGit(temporaryRoot, ['config', 'user.name', 'Icon Transaction'])
    copyFileState(repoRoot, temporaryRoot, files)
    runGit(temporaryRoot, ['add', '-A', '--', '.'])
    runGit(temporaryRoot, ['commit', '-qm', 'transaction baseline', '--allow-empty'])
    const supplied = path.join(temporaryRoot, '.supplied.patch')
    fs.writeFileSync(supplied, suppliedPatch)
    runGit(temporaryRoot, ['apply', '--check', '--whitespace=nowarn', supplied])
    runGit(temporaryRoot, ['apply', '--whitespace=nowarn', supplied])
    runGit(temporaryRoot, ['add', '-A', '--', ...files])
    const forward = runGit(temporaryRoot, ['diff', '--cached', '--binary', '--full-index', 'HEAD', '--', ...files])
    const reverse = runGit(temporaryRoot, [
      'diff',
      '--cached',
      '-R',
      '--binary',
      '--full-index',
      'HEAD',
      '--',
      ...files,
    ])
    const post = fingerprints(temporaryRoot, files)
    return { forward, reverse, post, temporaryRoot }
  } catch (error) {
    fs.rmSync(temporaryRoot, { recursive: true, force: true })
    throw error
  }
}

const readOwnedJson = (file, label) => {
  if (!file) throw new Error(`capture requires --${label}-from`)
  const absolute = path.resolve(file)
  const bytes = fs.readFileSync(absolute)
  return { path: absolute, sha256: sha256(bytes), value: JSON.parse(bytes.toString('utf8')) }
}

const boundEvidenceHashes = (manifest) =>
  Object.fromEntries(Object.entries(manifest.evidence).map(([name, evidence]) => [name, evidence.sha256]))

const manifestArtifactHash = (manifest) =>
  sha256(JSON.stringify({ ...manifest, generated_at: undefined, updated_at: undefined, artifact_hash: undefined }))

const persistManifest = (manifestFile, manifest) => {
  manifest.updated_at = new Date().toISOString()
  manifest.artifact_hash = manifestArtifactHash(manifest)
  writeJson(manifestFile, manifest)
}

const appendLog = (manifestFile, manifest, action, verdict, details = {}) => {
  const logFile = manifest?.artifacts?.rollback_log || artifactPaths(manifestFile).rollback_log
  fs.mkdirSync(path.dirname(logFile), { recursive: true })
  const existing = fs.existsSync(logFile) ? fs.readFileSync(logFile, 'utf8').trim().split('\n').filter(Boolean) : []
  const parsed = existing.map((line) => JSON.parse(line))
  for (const [index, record] of parsed.entries()) {
    const expectedPrevious = index ? parsed[index - 1].record_hash : null
    const expectedHash = sha256(JSON.stringify({ ...record, record_hash: undefined }))
    if (
      record.sequence !== index + 1 ||
      record.previous_record_hash !== expectedPrevious ||
      record.record_hash !== expectedHash
    ) {
      throw new Error('rollback log hash chain mismatch')
    }
  }
  const previous = parsed.at(-1) || null
  const entry = {
    schema_version: 'icon-migration-rollback-log/v1',
    sequence: existing.length + 1,
    timestamp: new Date().toISOString(),
    manifest_id: manifest?.manifest_id || null,
    action,
    verdict,
    expected: details.expected || null,
    actual: details.actual || null,
    refusal_reason: details.refusal_reason || null,
    scoped_definitions: manifest?.ownership?.definitions?.value || null,
    scoped_consumers: manifest?.ownership?.consumers?.value || null,
    scoped_helpers: manifest?.ownership?.helpers?.value || null,
    resulting_hashes: details.resulting_hashes || null,
    previous_record_hash: previous?.record_hash || null,
  }
  entry.record_hash = sha256(JSON.stringify(entry))
  fs.appendFileSync(logFile, `${JSON.stringify(entry)}\n`)
  return entry
}

const validateManifest = (manifestFile) => {
  const manifest = readJson(manifestFile)
  if (manifest.schema_version !== SCHEMA_VERSION)
    throw new Error(`unsupported transaction schema: ${manifest.schema_version}`)
  if (manifest.artifact_hash !== manifestArtifactHash(manifest))
    throw new Error('transaction manifest artifact hash mismatch')
  const currentToolHash = sha256(fs.readFileSync(fileURLToPath(import.meta.url)))
  if (manifest.tool?.hash !== currentToolHash) throw new Error('transaction tool hash mismatch')
  for (const [name, file] of Object.entries(manifest.artifacts)) {
    if (name === 'rollback_log') continue
    const expected = manifest.input_hashes?.[name]
    const actual = name === 'preimages' || name === 'postimages' ? hashDirectory(file) : sha256(fs.readFileSync(file))
    if (expected && actual !== expected) throw new Error(`${name} input hash mismatch`)
  }
  if (sha256(fs.readFileSync(manifest.scope.files_source.path)) !== manifest.scope.files_source.sha256) {
    throw new Error('declared files input hash mismatch')
  }
  for (const [name, owned] of Object.entries(manifest.ownership)) {
    if (sha256(fs.readFileSync(owned.path)) !== owned.sha256) throw new Error(`${name} ownership input hash mismatch`)
  }
  for (const [name, evidence] of Object.entries(manifest.evidence)) {
    const actual = sha256(fs.readFileSync(evidence.path))
    if (actual !== evidence.sha256 || manifest.input_hashes?.[name] !== evidence.sha256) {
      throw new Error(`${name} evidence input hash mismatch`)
    }
  }
  return manifest
}

const assertRepositoryCheckpoint = (repoRoot, manifest, state) => {
  const head = gitText(repoRoot, ['rev-parse', 'HEAD'])
  if (head !== manifest.git.head) throw new Error(`HEAD mismatch: expected ${manifest.git.head}, received ${head}`)
  const actualStatus = statusSnapshot(repoRoot, manifest.files, manifest.scope.transaction_outputs)
  if (actualStatus.external !== manifest.git.status_hashes.external) {
    throw new Error('batch-external worktree status mismatch')
  }
  assertFingerprints(repoRoot, manifest.file_states[state], state)
  const expectedScoped = manifest.git.scoped_status_hashes[state]
  if (expectedScoped && actualStatus.scoped !== expectedScoped) {
    throw new Error(`${state} scoped porcelain-v2 status mismatch`)
  }
  return actualStatus
}

const applyPatch = (repoRoot, patchFile) => {
  runGit(repoRoot, ['apply', '--check', '--whitespace=nowarn', patchFile])
  runGit(repoRoot, ['apply', '--whitespace=nowarn', patchFile])
}

const captureTransactionUnsafe = ({
  repoRoot,
  manifestFile,
  forwardPatchFile,
  filesFile,
  definitionsFile,
  consumersFile,
  helpersFile,
  universeFile,
  matrixFile,
  ledgerFile,
  command = process.argv,
}) => {
  const artifacts = artifactPaths(manifestFile)
  const transactionOutputs = repositoryRelativePaths(repoRoot, [
    path.dirname(manifestFile),
    manifestFile,
    ...Object.values(artifacts),
  ])
  const protectedOutputs = [
    manifestFile,
    artifacts.reverse_patch,
    artifacts.preimages,
    artifacts.postimages,
    artifacts.rollback_log,
  ]
  const existing = protectedOutputs.filter((file) => fs.existsSync(file))
  if (existing.length) throw new Error(`transaction outputs already exist: ${existing.join(', ')}`)
  const files = fs
    .readFileSync(filesFile, 'utf8')
    .split(/\r?\n/)
    .map((file) => file.trim())
    .filter(Boolean)
    .map((file) => assertRelativeFile(repoRoot, file))
  if (!files.length) throw new Error('transaction file set is empty')
  if (new Set(files).size !== files.length) throw new Error('transaction file set contains duplicates')
  files.sort()

  const suppliedPatch = fs.readFileSync(forwardPatchFile, 'utf8')
  const touchedFiles = patchPaths(suppliedPatch).map((file) => assertRelativeFile(repoRoot, file))
  if (JSON.stringify(touchedFiles) !== JSON.stringify(files)) {
    throw new Error(
      `forward patch paths differ from declared files: patch=${touchedFiles.join(',')} declared=${files.join(',')}`,
    )
  }

  const beforeStatus = statusSnapshot(repoRoot, files, transactionOutputs)
  const before = fingerprints(repoRoot, files)
  const ownership = {
    definitions: readOwnedJson(definitionsFile, 'definitions'),
    consumers: readOwnedJson(consumersFile, 'consumers'),
    helpers: readOwnedJson(helpersFile, 'helpers'),
  }
  const evidence = {
    universe: readOwnedJson(universeFile, 'universe'),
    matrix: readOwnedJson(matrixFile, 'matrix'),
    ledger: readOwnedJson(ledgerFile, 'ledger'),
  }
  const derived = derivePatches(repoRoot, files, suppliedPatch)
  try {
    fs.mkdirSync(path.dirname(manifestFile), { recursive: true })
    fs.writeFileSync(artifacts.forward_patch, derived.forward)
    fs.writeFileSync(artifacts.reverse_patch, derived.reverse)
    saveImages(repoRoot, artifacts.preimages, files)
    saveImages(derived.temporaryRoot, artifacts.postimages, files)
  } finally {
    fs.rmSync(derived.temporaryRoot, { recursive: true, force: true })
  }

  const toolHash = sha256(fs.readFileSync(fileURLToPath(import.meta.url)))
  const manifest = {
    schema_version: SCHEMA_VERSION,
    tool: { name: 'transaction', version: TOOL_VERSION, hash: toolHash },
    manifest_id: `icon-transaction:v2:${sha256(
      `${gitText(repoRoot, ['rev-parse', 'HEAD'])}\0${files.join('\0')}\0${sha256(derived.forward)}`,
    )}`,
    command,
    cwd: repoRoot,
    generated_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    git: {
      head: gitText(repoRoot, ['rev-parse', 'HEAD']),
      status_hashes: { reversed: beforeStatus.scoped, applied: null, external: beforeStatus.external },
      scoped_status_hashes: { reversed: beforeStatus.scoped, applied: null },
    },
    files,
    scope: {
      files_source: { path: path.resolve(filesFile), sha256: sha256(fs.readFileSync(filesFile)) },
      transaction_outputs: transactionOutputs,
    },
    file_states: { reversed: before, applied: derived.post },
    ownership,
    evidence,
    artifacts,
    input_hashes: {
      supplied_forward_patch: sha256(suppliedPatch),
      forward_patch: sha256(derived.forward),
      reverse_patch: sha256(derived.reverse),
      preimages: hashDirectory(artifacts.preimages),
      postimages: hashDirectory(artifacts.postimages),
      files: sha256(fs.readFileSync(filesFile)),
      definitions: ownership.definitions.sha256,
      consumers: ownership.consumers.sha256,
      helpers: ownership.helpers.sha256,
      universe: evidence.universe.sha256,
      matrix: evidence.matrix.sha256,
      ledger: evidence.ledger.sha256,
    },
    last_observed_state: 'reversed',
    status: { pass: true, exit_code: 0 },
  }
  persistManifest(manifestFile, manifest)
  appendLog(manifestFile, manifest, 'capture', 'pass', {
    actual: { status: beforeStatus, files: before },
    resulting_hashes: { product: sha256(JSON.stringify(before)), evidence: boundEvidenceHashes(manifest) },
  })
  return manifest
}

export function captureTransaction(options) {
  try {
    return captureTransactionUnsafe(options)
  } catch (error) {
    appendLog(options.manifestFile, null, 'capture', 'refused', { refusal_reason: error.message })
    throw error
  }
}

const mutateTransaction = ({ repoRoot, manifestFile, action }) => {
  let manifest
  try {
    manifest = validateManifest(manifestFile)
    const sourceState = action === 'apply' ? 'reversed' : 'applied'
    const targetState = action === 'apply' ? 'applied' : 'reversed'
    const beforeStatus = assertRepositoryCheckpoint(repoRoot, manifest, sourceState)
    const patchFile = action === 'apply' ? manifest.artifacts.forward_patch : manifest.artifacts.reverse_patch
    applyPatch(repoRoot, patchFile)
    try {
      assertFingerprints(repoRoot, manifest.file_states[targetState], targetState)
      const afterStatus = statusSnapshot(repoRoot, manifest.files, manifest.scope.transaction_outputs)
      if (afterStatus.external !== manifest.git.status_hashes.external) {
        throw new Error('batch-external worktree status changed during transaction')
      }
      const expectedTargetStatus = manifest.git.scoped_status_hashes[targetState]
      if (expectedTargetStatus && afterStatus.scoped !== expectedTargetStatus) {
        throw new Error(`${targetState} scoped porcelain-v2 status mismatch after mutation`)
      }
      if (!expectedTargetStatus) {
        manifest.git.status_hashes[targetState] = afterStatus.scoped
        manifest.git.scoped_status_hashes[targetState] = afterStatus.scoped
      }
      manifest.last_observed_state = targetState
      persistManifest(manifestFile, manifest)
      appendLog(manifestFile, manifest, action, 'pass', {
        expected: { state: sourceState, status: beforeStatus },
        actual: { state: targetState, status: afterStatus, files: fingerprints(repoRoot, manifest.files) },
        resulting_hashes: {
          product: sha256(JSON.stringify(manifest.file_states[targetState])),
          evidence: boundEvidenceHashes(manifest),
        },
      })
      return manifest
    } catch (error) {
      const recoveryPatch = action === 'apply' ? manifest.artifacts.reverse_patch : manifest.artifacts.forward_patch
      try {
        applyPatch(repoRoot, recoveryPatch)
        assertFingerprints(repoRoot, manifest.file_states[sourceState], `${sourceState} recovery`)
      } catch (recoveryError) {
        error.message = `${error.message}; scoped recovery failed: ${recoveryError.message}`
      }
      throw error
    }
  } catch (error) {
    appendLog(manifestFile, manifest, action, 'refused', {
      refusal_reason: error.message,
      actual: error.details || null,
    })
    throw error
  }
}

export const applyTransaction = (options) => mutateTransaction({ ...options, action: 'apply' })
export const reverseTransaction = (options) => mutateTransaction({ ...options, action: 'reverse' })

export function verifyTransaction({ repoRoot, manifestFile, state }) {
  let manifest
  try {
    if (!['applied', 'reversed'].includes(state)) throw new Error('verify requires --state applied|reversed')
    manifest = validateManifest(manifestFile)
    const status = assertRepositoryCheckpoint(repoRoot, manifest, state)
    const actual = fingerprints(repoRoot, manifest.files)
    appendLog(manifestFile, manifest, 'verify', 'pass', {
      expected: { state, status_hash: manifest.git.status_hashes[state], files: manifest.file_states[state] },
      actual: { state, status, files: actual },
      resulting_hashes: { product: sha256(JSON.stringify(actual)), evidence: boundEvidenceHashes(manifest) },
    })
    return { pass: true, state, status, files: actual }
  } catch (error) {
    appendLog(manifestFile, manifest, 'verify', 'refused', {
      expected: { state },
      refusal_reason: error.message,
      actual: error.details || null,
    })
    throw error
  }
}

const parseArgs = (argv) => {
  const result = { _: [] }
  for (let index = 2; index < argv.length; index += 1) {
    const value = argv[index]
    if (!value.startsWith('--')) {
      result._.push(value)
      continue
    }
    result[value.slice(2)] = argv[index + 1]
    index += 1
  }
  return result
}

function main() {
  const args = parseArgs(process.argv)
  const action = args._[0]
  if (!['capture', 'apply', 'reverse', 'verify'].includes(action) || !args.manifest) {
    throw new Error('usage: transaction.mjs capture|apply|reverse|verify --manifest <file> [scoped inputs]')
  }
  const repoRoot = process.cwd()
  const manifestFile = path.resolve(repoRoot, args.manifest)
  if (action === 'capture') {
    captureTransaction({
      repoRoot,
      manifestFile,
      forwardPatchFile: path.resolve(repoRoot, args['forward-patch-from']),
      filesFile: path.resolve(repoRoot, args['files-from']),
      definitionsFile: path.resolve(repoRoot, args['definitions-from']),
      consumersFile: path.resolve(repoRoot, args['consumers-from']),
      helpersFile: path.resolve(repoRoot, args['helpers-from']),
      universeFile: path.resolve(repoRoot, args['universe-from']),
      matrixFile: path.resolve(repoRoot, args['matrix-from']),
      ledgerFile: path.resolve(repoRoot, args['ledger-from']),
    })
  } else if (action === 'apply') {
    applyTransaction({ repoRoot, manifestFile })
  } else if (action === 'reverse') {
    reverseTransaction({ repoRoot, manifestFile })
  } else {
    verifyTransaction({ repoRoot, manifestFile, state: args.state })
  }
  process.stdout.write(`${manifestFile}\n`)
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    main()
  } catch (error) {
    process.stderr.write(`${error.stack || error.message || error}\n`)
    process.exitCode = 1
  }
}
