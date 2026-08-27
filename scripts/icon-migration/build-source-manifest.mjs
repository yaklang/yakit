import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { execFileSync } from 'node:child_process'
import { fileURLToPath, pathToFileURL } from 'node:url'

export const SCHEMA_VERSION = 'icon-migration-source-manifest/v1'
export const TOOL_VERSION = '1.0.0'

const SOURCE_EXTENSIONS = ['.ts', '.tsx', '.js', '.jsx', '.mts', '.mjs', '.cts', '.cjs']

export const sha256 = (value) => crypto.createHash('sha256').update(value).digest('hex')
export const normalizePath = (value) => value.split(path.sep).join('/')
export const readJson = (file) => JSON.parse(fs.readFileSync(file, 'utf8'))
export const writeJson = (file, value) => {
  fs.mkdirSync(path.dirname(file), { recursive: true })
  fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`)
}

const resolveLocalModule = (fromFile, specifier) => {
  if (!specifier.startsWith('.') && !specifier.startsWith('@/')) return null
  const base = specifier.startsWith('@/')
    ? path.resolve(
        fromFile.includes('/engine-link-startup/')
          ? fromFile.slice(0, fromFile.indexOf('/engine-link-startup/') + '/engine-link-startup/'.length)
          : fromFile.slice(0, fromFile.indexOf('/src/main/') + '/src/main/'.length),
        'src',
        specifier.slice(2),
      )
    : path.resolve(path.dirname(fromFile), specifier)
  const candidates = [
    base,
    ...SOURCE_EXTENSIONS.map((extension) => `${base}${extension}`),
    ...SOURCE_EXTENSIONS.map((extension) => path.join(base, `index${extension}`)),
  ]
  return candidates.find((candidate) => fs.existsSync(candidate) && fs.statSync(candidate).isFile()) || null
}

const importSpecifiers = (source) => {
  const result = []
  const patterns = [
    /(?:import|export)\s+(?:[\s\S]*?\s+from\s+)?['"]([^'"]+)['"]/g,
    /import\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
    /require\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
  ]
  for (const pattern of patterns) {
    let match
    while ((match = pattern.exec(source))) result.push(match[1])
  }
  return [...new Set(result)]
}

const gitValue = (repoRoot, args, fallback = '') => {
  try {
    return execFileSync('git', args, { cwd: repoRoot, encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 }).trim()
  } catch {
    return fallback
  }
}

const loadTypeScript = async (repoRoot) => {
  const candidates = [
    path.join(repoRoot, 'app/renderer/src/main/node_modules/typescript/lib/typescript.js'),
    path.join(repoRoot, 'node_modules/typescript/lib/typescript.js'),
    path.resolve(import.meta.dirname, '../../app/renderer/src/main/node_modules/typescript/lib/typescript.js'),
    path.resolve(import.meta.dirname, '../../node_modules/typescript/lib/typescript.js'),
  ]
  const target = candidates.find(fs.existsSync)
  if (!target) throw new Error('TypeScript runtime not found; install renderer dependencies first')
  return (await import(pathToFileURL(target).href)).default
}

export const DEFAULT_RENDERERS = [
  {
    name: 'main',
    root: 'app/renderer/src/main',
    tsconfig: 'app/renderer/src/main/tsconfig.app.json',
    configs: ['app/renderer/src/main/vite.config.mts', 'app/renderer/src/main/vitest.config.mts'],
  },
  {
    name: 'link',
    root: 'app/renderer/engine-link-startup',
    tsconfig: 'app/renderer/engine-link-startup/tsconfig.app.json',
    configs: ['app/renderer/engine-link-startup/vite.config.ts', 'app/renderer/engine-link-startup/vitest.config.ts'],
  },
]

export async function buildSourceManifest({ repoRoot, phase, renderers = DEFAULT_RENDERERS, command = process.argv }) {
  if (!['initial', 'terminal'].includes(phase)) throw new Error('--phase must be initial or terminal')
  const ts = await loadTypeScript(repoRoot)
  const records = new Map()
  const inputFiles = new Set()

  const addFile = (absoluteFile, renderer, reason, parent = null) => {
    if (!fs.existsSync(absoluteFile) || !fs.statSync(absoluteFile).isFile()) return false
    if (!SOURCE_EXTENSIONS.includes(path.extname(absoluteFile))) return false
    const relative = normalizePath(path.relative(repoRoot, absoluteFile))
    if (relative.startsWith('..') || relative.includes('/node_modules/')) return false
    const content = fs.readFileSync(absoluteFile)
    const existing = records.get(relative) || {
      path: relative,
      hash: sha256(content),
      renderer_membership: [],
      inclusion: [],
    }
    if (!existing.renderer_membership.includes(renderer)) existing.renderer_membership.push(renderer)
    const inclusion = { reason, parent: parent ? normalizePath(path.relative(repoRoot, parent)) : null }
    if (!existing.inclusion.some((row) => row.reason === inclusion.reason && row.parent === inclusion.parent)) {
      existing.inclusion.push(inclusion)
    }
    records.set(relative, existing)
    return true
  }

  for (const renderer of renderers) {
    const configPath = path.resolve(repoRoot, renderer.tsconfig)
    inputFiles.add(configPath)
    for (const config of renderer.configs || []) {
      const absolute = path.resolve(repoRoot, config)
      if (fs.existsSync(absolute)) inputFiles.add(absolute)
    }
    const config = ts.readConfigFile(configPath, ts.sys.readFile)
    if (config.error) throw new Error(ts.flattenDiagnosticMessageText(config.error.messageText, '\n'))
    const parsed = ts.parseJsonConfigFileContent(config.config, ts.sys, path.dirname(configPath))
    if (parsed.errors.length) {
      throw new Error(parsed.errors.map((error) => ts.flattenDiagnosticMessageText(error.messageText, '\n')).join('\n'))
    }
    for (const fileName of parsed.fileNames) {
      if (SOURCE_EXTENSIONS.includes(path.extname(fileName))) addFile(path.resolve(fileName), renderer.name, 'tsconfig')
    }
    for (const config of renderer.configs || [])
      addFile(path.resolve(repoRoot, config), renderer.name, 'build-or-test-config')
  }

  const queue = [...records.keys()]
  for (let index = 0; index < queue.length; index += 1) {
    const relative = queue[index]
    const record = records.get(relative)
    const absolute = path.resolve(repoRoot, relative)
    const source = fs.readFileSync(absolute, 'utf8')
    for (const specifier of importSpecifiers(source)) {
      const resolved = resolveLocalModule(absolute, specifier)
      if (!resolved) continue
      for (const renderer of record.renderer_membership) {
        const wasNew = !records.has(normalizePath(path.relative(repoRoot, resolved)))
        const added = addFile(resolved, renderer, 'reachable-import', absolute)
        if (wasNew && added) queue.push(normalizePath(path.relative(repoRoot, resolved)))
      }
    }
  }

  const files = [...records.values()]
    .map((record) => {
      record.renderer_membership.sort()
      record.inclusion.sort((left, right) => JSON.stringify(left).localeCompare(JSON.stringify(right)))
      return {
        ...record,
        scan_receipt: `scan:v1:${sha256(`${record.path}\0${record.hash}\0${record.renderer_membership.join(',')}`)}`,
      }
    })
    .sort((left, right) => left.path.localeCompare(right.path))
  const porcelain = gitValue(repoRoot, ['status', '--porcelain=v2', '-z'])
  const inputHashes = [...inputFiles].sort().map((file) => ({
    path: normalizePath(path.relative(repoRoot, file)),
    hash: sha256(fs.readFileSync(file)),
  }))
  const toolHash = sha256(fs.readFileSync(fileURLToPath(import.meta.url)))
  const result = {
    schema_version: SCHEMA_VERSION,
    tool: { name: 'build-source-manifest', version: TOOL_VERSION, hash: toolHash },
    phase,
    command,
    cwd: repoRoot,
    generated_at: new Date().toISOString(),
    git: {
      head: gitValue(repoRoot, ['rev-parse', 'HEAD'], 'unavailable'),
      porcelain_v2_sha256: sha256(porcelain),
    },
    input_hashes: inputHashes,
    files,
    summary: {
      files: files.length,
      main_files: files.filter((file) => file.renderer_membership.includes('main')).length,
      link_files: files.filter((file) => file.renderer_membership.includes('link')).length,
      shared_files: files.filter((file) => file.renderer_membership.length > 1).length,
    },
    status: { pass: true, exit_code: 0 },
  }
  result.artifact_hash = sha256(JSON.stringify({ ...result, generated_at: undefined, artifact_hash: undefined }))
  return result
}

const parseArgs = (argv) =>
  Object.fromEntries(
    argv
      .slice(2)
      .flatMap((value, index, values) => (value.startsWith('--') ? [[value.slice(2), values[index + 1]]] : [])),
  )

async function main() {
  const args = parseArgs(process.argv)
  if (!args.phase || !args['run-dir'])
    throw new Error('usage: build-source-manifest.mjs --phase initial|terminal --run-dir <dir>')
  const repoRoot = process.cwd()
  const result = await buildSourceManifest({ repoRoot, phase: args.phase })
  const output = path.resolve(repoRoot, args['run-dir'], `source-manifest.${args.phase}.json`)
  writeJson(output, result)
  process.stdout.write(`${output}\n`)
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    process.stderr.write(`${error.stack || error.message || error}\n`)
    process.exitCode = 1
  })
}
