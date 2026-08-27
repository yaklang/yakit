import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { normalizePath, readJson, sha256, writeJson } from './build-source-manifest.mjs'

export const SCHEMA_VERSION = 'icon-migration-universe/v1'
export const TOOL_VERSION = '1.0.0'
export const DISPOSITIONS = [
  'safe-match',
  'semantic-match-needs-visual-review',
  'no-package-equivalent',
  'runtime-or-brand-risk',
]

export const SEED_FILES = [
  'app/renderer/src/main/src/assets/newIcon.tsx',
  'app/renderer/src/main/src/assets/commonProcessIcons.tsx',
  'app/renderer/src/main/src/assets/icon/colors.tsx',
  'app/renderer/src/main/src/assets/icons.tsx',
  'app/renderer/src/main/src/assets/icon/bespokeOutline.tsx',
  'app/renderer/src/main/src/assets/icon/bespokeSolid.tsx',
  'app/renderer/engine-link-startup/src/assets/newIcon.tsx',
  'app/renderer/engine-link-startup/src/assets/colors.tsx',
  'app/renderer/engine-link-startup/src/assets/bespokeIcons.tsx',
  'app/renderer/engine-link-startup/src/components/yakitUI/YakitModal/icon.tsx',
]

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

const ORIGIN_BY_SIGNAL = {
  'icon-factory-call': 'factory-output',
  'svg-wrapper-root': 'wrapper',
  'icon-re-export-root': 're-export',
  'svg-react-import': 'imported-svg-react-component',
  'jsx-svg': 'react-svg-definition',
  'jsx-svg-self-closing': 'react-svg-definition',
  'create-element-svg': 'react-create-element-definition',
}

export const canonicalDefinitionId = (physicalPath, anchor, originKind) =>
  `icon-def:v1:${sha256(`${normalizePath(physicalPath)}\0${anchor}\0${originKind}`)}`

const resolveLocalModule = (repoRoot, fromFile, specifier) => {
  if (!specifier.startsWith('.') && !specifier.startsWith('@/')) return null
  const absoluteFrom = path.resolve(repoRoot, fromFile)
  let base
  if (specifier.startsWith('@/')) {
    const rendererRoot = fromFile.startsWith('app/renderer/engine-link-startup/')
      ? path.resolve(repoRoot, 'app/renderer/engine-link-startup')
      : path.resolve(repoRoot, 'app/renderer/src/main')
    base = path.resolve(rendererRoot, 'src', specifier.slice(2))
  } else base = path.resolve(path.dirname(absoluteFrom), specifier)
  const extensions = ['', '.ts', '.tsx', '.js', '.jsx', '.mts', '.mjs', '.cts', '.cjs']
  const candidates = [
    ...extensions.map((extension) => `${base}${extension}`),
    ...extensions.slice(1).map((extension) => path.join(base, `index${extension}`)),
  ]
  const resolved = candidates.find((candidate) => fs.existsSync(candidate) && fs.statSync(candidate).isFile())
  return resolved ? normalizePath(path.relative(repoRoot, resolved)) : null
}

const textForSignals = (repoRoot, signals) => {
  if (!signals.length) return ''
  const source = fs.readFileSync(path.resolve(repoRoot, signals[0].file), 'utf8')
  return signals.map((signal) => source.slice(signal.span.start, signal.span.end)).join('\n')
}

const isRuntimeOrBrandRisk = (name, text) =>
  /logo|brand|product|yaklang|yakit/i.test(name) ||
  /<defs|gradient|mask|clipPath|useId|Math\.random|Date\.|props\.|\{\s*(?:color|theme|mode)\s*\}/i.test(text)

const classify = (group, repoRoot) => {
  const name = group.owner_anchor
  const text = textForSignals(repoRoot, group.signals)
  const iconPath = /(?:^|\/)(?:icon|icons|assets)(?:\/|\.|$)/i.test(group.file)
  const explicitIcon =
    /icon|glyph|logo|symbol|mark/i.test(name) ||
    ['factory-output', 'imported-svg-react-component', 're-export'].includes(group.origin_kind)
  const explicitNonIconVisual =
    /chart|graph|illustration|diagram|canvas|map(?:visual)?/i.test(name) && !/icon/i.test(name)
  if (explicitNonIconVisual || (!explicitIcon && !iconPath)) {
    return {
      scope_decision: 'excluded-non-icon-react-visual',
      disposition: null,
      rationale: `SVG visual owned by ${name}; no icon semantic/path signal`,
      evidence: [`semantic-exclusion:v1:${sha256(`${group.file}\0${name}\0non-icon-visual`)}`],
    }
  }
  const risk = isRuntimeOrBrandRisk(name, text)
  return {
    scope_decision: 'local-react-icon',
    disposition: risk ? 'runtime-or-brand-risk' : 'no-package-equivalent',
    rationale: risk
      ? 'Retained pending runtime/brand equivalence evidence'
      : 'Discovered local React icon; no package-equivalence proof is attached to this semantic audit',
    evidence: [`semantic-evidence:v1:${sha256(`${group.file}\0${name}\0${risk ? 'runtime-risk' : 'unmatched'}`)}`],
  }
}

const candidateGroups = (census) => {
  const groups = new Map()
  const anonymousOrdinals = new Map()
  for (const signal of census.signals) {
    const originKind = ORIGIN_BY_SIGNAL[signal.syntax_kind]
    if (!originKind) throw new Error(`unsupported census signal kind: ${signal.syntax_kind}`)
    const named = signal.owner_anchor && signal.owner_anchor !== '<module>'
    let anchor
    if (named) anchor = `binding:${signal.owner_anchor}`
    else {
      const ordinalKey = `${signal.file}\0${signal.ast_role_path}\0${signal.normalized_fingerprint}`
      const ordinal = (anonymousOrdinals.get(ordinalKey) || 0) + 1
      anonymousOrdinals.set(ordinalKey, ordinal)
      anchor = `anonymous:<module>:${signal.ast_role_path}:${signal.normalized_fingerprint}:${ordinal}`
    }
    if (originKind === 'factory-output') anchor = `factory-output:${anchor}`
    if (originKind === 'wrapper') anchor = `wrapper:${anchor}`
    if (originKind === 're-export') anchor = `re-export:${anchor}:${signal.module_specifier || ''}`
    if (originKind === 'imported-svg-react-component') anchor = `svg-import:${anchor}:${signal.module_specifier || ''}`
    const key = `${signal.file}\0${anchor}\0${originKind}`
    const group = groups.get(key) || {
      file: signal.file,
      renderer_membership: [...signal.renderer_membership],
      anchor,
      owner_anchor: signal.owner_anchor,
      origin_kind: originKind,
      signals: [],
    }
    group.signals.push(signal)
    group.renderer_membership = [...new Set([...group.renderer_membership, ...signal.renderer_membership])].sort()
    groups.set(key, group)
  }
  return [...groups.values()]
}

const collectConsumerGraph = async ({ repoRoot, manifest, definitions, ts }) => {
  const byFileAndSymbol = new Map()
  for (const definition of definitions) {
    if (!definition.symbol || definition.symbol === '<module>') continue
    byFileAndSymbol.set(`${definition.file}\0${definition.symbol}`, definition)
  }
  const edges = new Map()
  const addEdge = (definition, consumerFile, kind, localName, props = []) => {
    const key = `${definition.id}\0${consumerFile}\0${kind}\0${localName}`
    const existing = edges.get(key) || {
      id: `consumer-edge:v1:${sha256(key)}`,
      definition_id: definition.id,
      consumer_file: consumerFile,
      kind,
      local_name: localName,
      occurrences: 0,
      jsx_props: [],
    }
    existing.occurrences += 1
    existing.jsx_props = [...new Set([...existing.jsx_props, ...props])].sort()
    edges.set(key, existing)
  }
  for (const file of manifest.files) {
    const source = fs.readFileSync(path.resolve(repoRoot, file.path), 'utf8')
    const sourceFile = ts.createSourceFile(
      file.path,
      source,
      ts.ScriptTarget.Latest,
      true,
      file.path.endsWith('.tsx') || file.path.endsWith('.jsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
    )
    const bindings = new Map()
    for (const definition of definitions.filter(
      (candidate) => candidate.file === file.path && candidate.symbol !== '<module>',
    )) {
      bindings.set(definition.symbol, { definition, declaration: true })
    }
    sourceFile.forEachChild((node) => {
      if (!ts.isImportDeclaration(node) || !node.importClause || !ts.isStringLiteral(node.moduleSpecifier)) return
      const targetFile = resolveLocalModule(repoRoot, file.path, node.moduleSpecifier.text)
      if (!targetFile) return
      if (node.importClause.name) {
        const definition = byFileAndSymbol.get(`${targetFile}\0default`)
        if (definition) bindings.set(node.importClause.name.text, { definition, declaration: true })
      }
      const named = node.importClause.namedBindings
      if (named && ts.isNamedImports(named)) {
        for (const specifier of named.elements) {
          const imported = specifier.propertyName?.text || specifier.name.text
          const definition = byFileAndSymbol.get(`${targetFile}\0${imported}`)
          if (definition) bindings.set(specifier.name.text, { definition, declaration: true })
        }
      }
    })
    const visit = (node) => {
      if (ts.isIdentifier(node)) {
        const binding = bindings.get(node.text)
        if (binding) {
          const declarationName =
            (ts.isVariableDeclaration(node.parent) ||
              ts.isFunctionDeclaration(node.parent) ||
              ts.isClassDeclaration(node.parent) ||
              ts.isImportSpecifier(node.parent) ||
              ts.isImportClause(node.parent)) &&
            node.parent.name === node
          if (!declarationName) {
            const jsx = ts.isJsxOpeningElement(node.parent) || ts.isJsxSelfClosingElement(node.parent)
            const props = jsx
              ? node.parent.attributes.properties.flatMap((property) => property.name?.getText(sourceFile) || [])
              : []
            addEdge(binding.definition, file.path, jsx ? 'jsx-use' : 'component-value-use', node.text, props)
          }
        }
      }
      node.forEachChild(visit)
    }
    sourceFile.forEachChild(visit)
  }
  return [...edges.values()].sort(
    (left, right) =>
      left.definition_id.localeCompare(right.definition_id) || left.consumer_file.localeCompare(right.consumer_file),
  )
}

export async function auditLocalReactIcons({ repoRoot, manifest, census, command = process.argv }) {
  if (manifest.schema_version !== 'icon-migration-source-manifest/v1')
    throw new Error('unsupported source manifest schema')
  if (census.schema_version !== 'icon-migration-raw-census/v1') throw new Error('unsupported raw census schema')
  if (census.manifest_artifact_hash !== manifest.artifact_hash) throw new Error('census/manifest input mismatch')
  const ts = await loadTypeScript(repoRoot)
  const definitions = candidateGroups(census)
    .map((group) => {
      const decision = classify(group, repoRoot)
      const spans = group.signals.map((signal) => signal.span)
      const id = canonicalDefinitionId(group.file, group.anchor, group.origin_kind)
      return {
        id,
        file: group.file,
        symbol: group.owner_anchor,
        canonical_anchor: group.anchor,
        origin_kind: group.origin_kind,
        renderer_membership: group.renderer_membership,
        source_span: {
          start: Math.min(...spans.map((span) => span.start)),
          end: Math.max(...spans.map((span) => span.end)),
        },
        source_fingerprint: `source:v1:${sha256(
          group.signals
            .map((signal) => signal.normalized_fingerprint)
            .sort()
            .join('\0'),
        )}`,
        raw_signal_ids: group.signals.map((signal) => signal.id).sort(),
        seed: SEED_FILES.includes(group.file),
        source_presence: 'present',
        predecessor_ids: [],
        successor_ids: [],
        ...decision,
      }
    })
    .sort((left, right) => left.id.localeCompare(right.id))
  const consumerGraph = await collectConsumerGraph({ repoRoot, manifest, definitions, ts })
  for (const definition of definitions) {
    definition.consumer_ids = consumerGraph
      .filter((edge) => edge.definition_id === definition.id)
      .map((edge) => edge.id)
    definition.inbound_count = definition.consumer_ids.length
  }
  const consumption = definitions.flatMap((definition) =>
    definition.raw_signal_ids.map((rawSignalId) => ({ raw_signal_id: rawSignalId, definition_id: definition.id })),
  )
  const counts = new Map(
    consumption.map((row) => [
      row.raw_signal_id,
      consumption.filter((candidate) => candidate.raw_signal_id === row.raw_signal_id).length,
    ]),
  )
  const findings = census.signals.flatMap((signal) =>
    counts.get(signal.id) === 1
      ? []
      : [
          {
            severity: 'fatal',
            code: counts.has(signal.id) ? 'multiply-consumed-raw-signal' : 'orphaned-raw-signal',
            raw_signal_id: signal.id,
            count: counts.get(signal.id) || 0,
          },
        ],
  )
  const collisionIds = definitions.filter(
    (definition, index) => definitions.findIndex((candidate) => candidate.id === definition.id) !== index,
  )
  findings.push(
    ...collisionIds.map((definition) => ({
      severity: 'fatal',
      code: 'canonical-id-collision',
      definition_id: definition.id,
    })),
  )
  for (const definition of definitions) {
    if (definition.scope_decision === 'local-react-icon' && !DISPOSITIONS.includes(definition.disposition)) {
      findings.push({ severity: 'fatal', code: 'missing-terminal-disposition', definition_id: definition.id })
    }
    if (
      definition.scope_decision === 'excluded-non-icon-react-visual' &&
      (!definition.rationale || !definition.evidence.length)
    ) {
      findings.push({ severity: 'fatal', code: 'unsupported-exclusion', definition_id: definition.id })
    }
  }
  const result = {
    schema_version: SCHEMA_VERSION,
    tool: {
      name: 'audit-local-react-icons',
      version: TOOL_VERSION,
      hash: sha256(fs.readFileSync(fileURLToPath(import.meta.url))),
    },
    command,
    cwd: repoRoot,
    generated_at: new Date().toISOString(),
    input_hashes: {
      manifest: sha256(JSON.stringify(manifest)),
      census: sha256(JSON.stringify(census)),
    },
    source_manifest_artifact_hash: manifest.artifact_hash,
    raw_census_artifact_hash: census.artifact_hash,
    definitions,
    raw_signal_consumption: consumption,
    consumer_graph: consumerGraph,
    dependency_graph: definitions.flatMap((definition) =>
      definition.origin_kind === 'wrapper' || definition.origin_kind === 're-export'
        ? [
            {
              from_definition_id: definition.id,
              to_definition_id: null,
              status: 'unresolved-target',
              evidence: definition.evidence[0],
            },
          ]
        : [],
    ),
    summary: {
      definitions: definitions.length,
      local_react_icons: definitions.filter((row) => row.scope_decision === 'local-react-icon').length,
      exclusions: definitions.filter((row) => row.scope_decision === 'excluded-non-icon-react-visual').length,
      seed_definitions: definitions.filter((row) => row.seed).length,
      consumer_edges: consumerGraph.length,
    },
    findings,
    status: { pass: findings.length === 0, exit_code: findings.length === 0 ? 0 : 1 },
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
  if (!args.manifest || !args.census || !args.out)
    throw new Error('usage: audit-local-react-icons.mjs --manifest <json> --census <json> --out <json>')
  const repoRoot = process.cwd()
  const result = await auditLocalReactIcons({
    repoRoot,
    manifest: readJson(path.resolve(repoRoot, args.manifest)),
    census: readJson(path.resolve(repoRoot, args.census)),
  })
  writeJson(path.resolve(repoRoot, args.out), result)
  if (!result.status.pass) process.exitCode = 1
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    process.stderr.write(`${error.stack || error.message || error}\n`)
    process.exitCode = 1
  })
}
