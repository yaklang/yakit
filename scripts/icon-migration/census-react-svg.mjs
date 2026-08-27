import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { normalizePath, readJson, sha256, writeJson } from './build-source-manifest.mjs'

export const SCHEMA_VERSION = 'icon-migration-raw-census/v1'
export const TOOL_VERSION = '1.0.0'

const loadTypeScript = async (repoRoot) => {
  const target = [
    path.join(repoRoot, 'app/renderer/src/main/node_modules/typescript/lib/typescript.js'),
    path.join(repoRoot, 'node_modules/typescript/lib/typescript.js'),
    path.resolve(import.meta.dirname, '../../app/renderer/src/main/node_modules/typescript/lib/typescript.js'),
    path.resolve(import.meta.dirname, '../../node_modules/typescript/lib/typescript.js'),
  ].find(fs.existsSync)
  if (!target) throw new Error('TypeScript runtime not found')
  return (await import(pathToFileURL(target).href)).default
}

const normalizeSyntax = (value) =>
  value
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\/\/[^\n]*/g, '')
    .replace(/\s+/g, ' ')
    .trim()

const ownerAnchor = (node, ts) => {
  let current = node
  const roles = []
  while (current) {
    const parent = current.parent
    if (!parent) break
    const children = parent.getChildren()
    roles.unshift(`${ts.SyntaxKind[parent.kind]}[${Math.max(0, children.indexOf(current))}]`)
    if ((ts.isFunctionDeclaration(parent) || ts.isClassDeclaration(parent)) && parent.name) {
      return { owner: parent.name.text, role_path: roles.join('/') }
    }
    if (ts.isVariableDeclaration(parent) && ts.isIdentifier(parent.name)) {
      return { owner: parent.name.text, role_path: roles.join('/') }
    }
    if (ts.isPropertyAssignment(parent) && (ts.isIdentifier(parent.name) || ts.isStringLiteral(parent.name))) {
      return { owner: parent.name.text, role_path: roles.join('/') }
    }
    current = parent
  }
  return { owner: '<module>', role_path: roles.join('/') || 'SourceFile' }
}

const hasSvgDescendant = (node, ts) => {
  let found = false
  const visit = (child) => {
    if (found) return
    if (
      (ts.isJsxElement(child) && child.openingElement.tagName.getText() === 'svg') ||
      (ts.isJsxSelfClosingElement(child) && child.tagName.getText() === 'svg')
    )
      found = true
    else child.forEachChild(visit)
  }
  node.forEachChild(visit)
  return found
}

export async function censusReactSvg({ repoRoot, manifest, command = process.argv }) {
  if (manifest.schema_version !== 'icon-migration-source-manifest/v1')
    throw new Error('unsupported source manifest schema')
  const ts = await loadTypeScript(repoRoot)
  const signals = []
  for (const file of manifest.files) {
    if (!file.scan_receipt) throw new Error(`manifest file has no scan receipt: ${file.path}`)
    const absolute = path.resolve(repoRoot, file.path)
    if (!fs.existsSync(absolute)) throw new Error(`manifest file no longer exists: ${file.path}`)
    const source = fs.readFileSync(absolute, 'utf8')
    if (sha256(source) !== file.hash) throw new Error(`manifest input hash mismatch: ${file.path}`)
    const sourceFile = ts.createSourceFile(
      file.path,
      source,
      ts.ScriptTarget.Latest,
      true,
      file.path.endsWith('.tsx') || file.path.endsWith('.jsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
    )
    const add = (node, syntaxKind, extra = {}) => {
      const start = node.getStart(sourceFile)
      const end = node.getEnd()
      const startPosition = sourceFile.getLineAndCharacterOfPosition(start)
      const endPosition = sourceFile.getLineAndCharacterOfPosition(end)
      const fingerprint = sha256(normalizeSyntax(source.slice(start, end)))
      const owner = ownerAnchor(node, ts)
      signals.push({
        id: `raw-svg:v1:${sha256(`${file.path}\0${syntaxKind}\0${start}\0${fingerprint}`)}`,
        file: file.path,
        renderer_membership: file.renderer_membership,
        span: {
          start,
          end,
          start_line: startPosition.line + 1,
          start_column: startPosition.character + 1,
          end_line: endPosition.line + 1,
          end_column: endPosition.character + 1,
        },
        syntax_kind: syntaxKind,
        normalized_fingerprint: fingerprint,
        owner_anchor: owner.owner,
        ast_role_path: owner.role_path,
        ...extra,
      })
    }
    const visit = (node) => {
      if (ts.isJsxElement(node) && node.openingElement.tagName.getText(sourceFile) === 'svg') add(node, 'jsx-svg')
      if (ts.isJsxSelfClosingElement(node) && node.tagName.getText(sourceFile) === 'svg')
        add(node, 'jsx-svg-self-closing')
      if (ts.isCallExpression(node)) {
        const callee = node.expression.getText(sourceFile)
        const first = node.arguments[0]
        if (
          (callee === 'createElement' || callee.endsWith('.createElement')) &&
          first &&
          ts.isStringLiteral(first) &&
          first.text === 'svg'
        ) {
          add(node, 'create-element-svg')
        }
        if (/(?:^|\.)(?:createIcon|makeIcon|iconFactory|createSvgIcon)$/i.test(callee))
          add(node, 'icon-factory-call', { callee })
        if (/(?:^|\.)(?:memo|forwardRef)$/.test(callee) && hasSvgDescendant(node, ts))
          add(node, 'svg-wrapper-root', { callee })
      }
      if (ts.isImportDeclaration(node) && ts.isStringLiteral(node.moduleSpecifier)) {
        const specifier = node.moduleSpecifier.text
        if (/\.svg(?:\?react)?$/i.test(specifier)) add(node, 'svg-react-import', { module_specifier: specifier })
      }
      if (ts.isExportDeclaration(node) && node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier)) {
        const text = node.getText(sourceFile)
        if (/icon/i.test(text) || /(?:icon|svg)/i.test(node.moduleSpecifier.text)) {
          add(node, 'icon-re-export-root', { module_specifier: node.moduleSpecifier.text })
        }
      }
      node.forEachChild(visit)
    }
    sourceFile.forEachChild(visit)
  }
  signals.sort(
    (left, right) =>
      left.file.localeCompare(right.file) ||
      left.span.start - right.span.start ||
      left.syntax_kind.localeCompare(right.syntax_kind),
  )
  const duplicateIds = signals.filter(
    (signal, index) => signals.findIndex((candidate) => candidate.id === signal.id) !== index,
  )
  const result = {
    schema_version: SCHEMA_VERSION,
    tool: {
      name: 'census-react-svg',
      version: TOOL_VERSION,
      hash: sha256(fs.readFileSync(fileURLToPath(import.meta.url))),
    },
    command,
    cwd: repoRoot,
    generated_at: new Date().toISOString(),
    input_hashes: { manifest: sha256(JSON.stringify(manifest)) },
    manifest_artifact_hash: manifest.artifact_hash,
    signals,
    summary: {
      files_scanned: manifest.files.length,
      signals: signals.length,
      by_kind: Object.fromEntries(
        [...new Set(signals.map((signal) => signal.syntax_kind))]
          .sort()
          .map((kind) => [kind, signals.filter((signal) => signal.syntax_kind === kind).length]),
      ),
    },
    findings: duplicateIds.map((signal) => ({
      severity: 'fatal',
      code: 'duplicate-raw-signal-id',
      signal_id: signal.id,
    })),
    status: { pass: duplicateIds.length === 0, exit_code: duplicateIds.length === 0 ? 0 : 1 },
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
  if (!args.manifest || !args.out) throw new Error('usage: census-react-svg.mjs --manifest <json> --out <json>')
  const repoRoot = process.cwd()
  const manifest = readJson(path.resolve(repoRoot, args.manifest))
  const result = await censusReactSvg({ repoRoot, manifest })
  writeJson(path.resolve(repoRoot, args.out), result)
  if (!result.status.pass) process.exitCode = 1
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    process.stderr.write(`${error.stack || error.message || error}\n`)
    process.exitCode = 1
  })
}
